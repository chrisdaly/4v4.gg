import React, { useState, useEffect, useCallback } from "react";
import styled from "styled-components";
import { FiExternalLink, FiRefreshCw } from "react-icons/fi";
import { IoSend } from "react-icons/io5";

const RELAY_URL =
  import.meta.env.VITE_CHAT_RELAY_URL || "https://4v4gg-chat-relay.fly.dev";
const API_KEY_STORAGE = "chat_admin_key";

const Page = styled.div`
  max-width: 720px;
  margin: 0 auto;
  padding: var(--space-8) var(--space-4);
`;

const Title = styled.h1`
  font-family: var(--font-display);
  font-size: var(--text-xl);
  color: var(--gold);
  margin-bottom: var(--space-8);
`;

const Section = styled.div`
  margin-bottom: var(--space-8);
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-4);
`;

const SectionTitle = styled.h2`
  font-family: var(--font-display);
  font-size: var(--text-lg);
  color: #fff;
`;

const RefreshButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: 1px solid rgba(160, 130, 80, 0.2);
  border-radius: var(--radius-sm);
  padding: 4px 10px;
  color: var(--grey-light);
  font-family: var(--font-mono);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    border-color: var(--gold);
    color: var(--gold);
  }
`;

const LinkCard = styled.a`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4);
  margin-bottom: var(--space-2);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(160, 130, 80, 0.2);
  border-radius: var(--radius-md);
  color: #e0e0e0;
  text-decoration: none;
  transition: all 0.15s;

  &:hover {
    border-color: var(--gold);
    background: rgba(252, 219, 51, 0.06);
  }
`;

const LinkInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const LinkTitle = styled.span`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
`;

const LinkDesc = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
`;

const LinkIcon = styled(FiExternalLink)`
  color: var(--grey-light);
  flex-shrink: 0;
`;

const HealthGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: var(--space-2);
`;

const HealthCard = styled.div`
  padding: var(--space-4);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(160, 130, 80, 0.15);
  border-radius: var(--radius-md);
  text-align: center;
`;

const HealthValue = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-base);
  color: ${(p) => p.$color || "#fff"};
  font-weight: 700;
`;

const HealthLabel = styled.div`
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--grey-light);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-top: 4px;
`;

const TokenForm = styled.form`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-4);
`;

const TokenInput = styled.input`
  flex: 1;
  min-width: 0;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(160, 130, 80, 0.2);
  border-radius: var(--radius-sm);
  padding: var(--space-2);
  color: #e0e0e0;
  font-family: var(--font-mono);
  font-size: 12px;
  outline: none;

  &:focus {
    border-color: rgba(252, 219, 51, 0.4);
  }

  &::placeholder {
    color: var(--grey-mid);
  }
`;

const SubmitButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid rgba(160, 130, 80, 0.3);
  border-radius: var(--radius-sm);
  background: rgba(252, 219, 51, 0.08);
  color: var(--gold);
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s;

  &:hover:not(:disabled) {
    background: rgba(252, 219, 51, 0.15);
    border-color: var(--gold);
  }

  &:disabled {
    opacity: 0.3;
    cursor: default;
  }
`;

const StatusText = styled.span`
  font-family: var(--font-mono);
  font-size: 12px;
  color: ${(p) => p.$color || "var(--grey-light)"};
`;

const LINKS = [
  {
    title: "Anthropic API Cost",
    desc: "Monthly spend on Claude Haiku (recaps, translations)",
    url: "https://platform.claude.com/workspaces/default/cost",
  },
  {
    title: "Anthropic API Usage",
    desc: "Token counts and request volume",
    url: "https://platform.claude.com/usage",
  },
  {
    title: "Fly.io Billing",
    desc: "Relay server hosting cost",
    url: "https://fly.io/dashboard/chris-daly-727/billing",
  },
  {
    title: "Fly.io Monitoring",
    desc: "Relay server logs, metrics, and health",
    url: "https://fly.io/apps/4v4gg-chat-relay/monitoring",
  },
];

export default function Admin() {
  const [health, setHealth] = useState(null);
  const [tokenDraft, setTokenDraft] = useState("");
  const [tokenStatus, setTokenStatus] = useState(null);
  const [apiKey] = useState(() => localStorage.getItem(API_KEY_STORAGE) || "");

  const fetchHealth = useCallback(() => {
    fetch(`${RELAY_URL}/api/admin/health`)
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setHealth({ status: "error" }));
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  async function handleTokenSubmit(e) {
    e.preventDefault();
    const token = tokenDraft.trim();
    if (!token || !apiKey) return;
    setTokenStatus("updating...");
    try {
      const res = await fetch(`${RELAY_URL}/api/admin/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      setTokenDraft("");
      setTokenStatus("Token updated");
      setTimeout(() => { setTokenStatus(null); fetchHealth(); }, 2000);
    } catch (err) {
      setTokenStatus(`Error: ${err.message}`);
    }
  }

  const statusColor =
    health?.status === "ok"
      ? "var(--green)"
      : health?.status === "error"
        ? "var(--red)"
        : "var(--gold)";

  const tokenColor = health?.signalr?.hasToken ? "var(--green)" : "var(--red)";

  return (
    <Page>
      <Title>Admin</Title>

      <Section>
        <SectionHeader>
          <SectionTitle>Relay Server</SectionTitle>
          <RefreshButton onClick={fetchHealth}>
            <FiRefreshCw size={12} /> Refresh
          </RefreshButton>
        </SectionHeader>
        <HealthGrid>
          <HealthCard>
            <HealthValue $color={statusColor}>
              {health?.status || "..."}
            </HealthValue>
            <HealthLabel>Status</HealthLabel>
          </HealthCard>
          <HealthCard>
            <HealthValue>{health?.signalr?.state || "..."}</HealthValue>
            <HealthLabel>SignalR</HealthLabel>
          </HealthCard>
          <HealthCard>
            <HealthValue $color={tokenColor}>
              {health?.signalr?.hasToken ? "SET" : health?.signalr?.hasToken === false ? "MISSING" : "..."}
            </HealthValue>
            <HealthLabel>W3C Token</HealthLabel>
          </HealthCard>
          <HealthCard>
            <HealthValue>{health?.sseClients ?? "..."}</HealthValue>
            <HealthLabel>SSE Clients</HealthLabel>
          </HealthCard>
          <HealthCard>
            <HealthValue>
              {health?.botEnabled ? "ON" : health?.botEnabled === false ? "OFF" : "..."}
            </HealthValue>
            <HealthLabel>Bot</HealthLabel>
          </HealthCard>
          <HealthCard>
            <HealthValue>
              {health?.uptime ? `${Math.floor(health.uptime / 3600)}h` : "..."}
            </HealthValue>
            <HealthLabel>Uptime</HealthLabel>
          </HealthCard>
        </HealthGrid>
      </Section>

      <Section>
        <SectionTitle>Database</SectionTitle>
        <HealthGrid>
          <HealthCard>
            <HealthValue>{health?.db?.totalMessages?.toLocaleString() ?? "..."}</HealthValue>
            <HealthLabel>Messages</HealthLabel>
          </HealthCard>
          <HealthCard>
            <HealthValue>{health?.db?.uniqueUsers?.toLocaleString() ?? "..."}</HealthValue>
            <HealthLabel>Unique Users</HealthLabel>
          </HealthCard>
          <HealthCard>
            <HealthValue>{health?.db?.messagesLast24h?.toLocaleString() ?? "..."}</HealthValue>
            <HealthLabel>Last 24h</HealthLabel>
          </HealthCard>
        </HealthGrid>
      </Section>

      <Section>
        <SectionTitle>W3C Token</SectionTitle>
        <StatusText $color={tokenColor}>
          {health?.signalr?.hasToken
            ? "Token is set and active."
            : "No token set. Paste the W3ChampionsJWT cookie value below."}
        </StatusText>
        {apiKey ? (
          <TokenForm onSubmit={handleTokenSubmit}>
            <TokenInput
              type="password"
              placeholder="Paste W3ChampionsJWT cookie value..."
              value={tokenDraft}
              onChange={(e) => setTokenDraft(e.target.value)}
            />
            <SubmitButton type="submit" disabled={!tokenDraft.trim()}>
              <IoSend size={14} />
            </SubmitButton>
            {tokenStatus && (
              <StatusText $color={tokenStatus.startsWith("Error") ? "var(--red)" : "var(--green)"}>
                {tokenStatus}
              </StatusText>
            )}
          </TokenForm>
        ) : (
          <StatusText style={{ display: "block", marginTop: 8 }}>
            Set API key in chat panel to update token.
          </StatusText>
        )}
      </Section>

      <Section>
        <SectionTitle>Dashboards</SectionTitle>
        {LINKS.map((link) => (
          <LinkCard key={link.url} href={link.url} target="_blank" rel="noopener">
            <LinkInfo>
              <LinkTitle>{link.title}</LinkTitle>
              <LinkDesc>{link.desc}</LinkDesc>
            </LinkInfo>
            <LinkIcon size={16} />
          </LinkCard>
        ))}
      </Section>
    </Page>
  );
}
