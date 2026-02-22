import React, { useState, useEffect, useCallback } from "react";
import styled from "styled-components";
import { FiExternalLink, FiRefreshCw } from "react-icons/fi";
import { IoSend } from "react-icons/io5";
import useAdmin from "../lib/useAdmin";
import { Link } from "react-router-dom";
import ChatSearch from "./AdminChatSearch";
import { PageLayout } from "../components/PageLayout";
import { PageHero } from "../components/ui";

const RELAY_URL =
  import.meta.env.VITE_CHAT_RELAY_URL || "https://4v4gg-chat-relay.fly.dev";

const RelayUrl = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
  margin-bottom: var(--space-8);
  opacity: 0.7;
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
  color: var(--white);
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
  font-size: var(--text-xxxs);
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
  color: var(--text-body);
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
  color: ${(p) => p.$color || "var(--white)"};
  font-weight: 700;
`;

const HealthLabel = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
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
  color: var(--text-body);
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
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

const ToggleButton = styled.button`
  padding: 6px 16px;
  border: 1px solid ${(p) => (p.$active ? "var(--green)" : "rgba(160, 130, 80, 0.3)")};
  border-radius: var(--radius-sm);
  background: ${(p) => (p.$active ? "rgba(76, 175, 80, 0.15)" : "rgba(255, 255, 255, 0.04)")};
  color: ${(p) => (p.$active ? "var(--green)" : "var(--grey-light)")};
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    border-color: ${(p) => (p.$active ? "var(--red)" : "var(--green)")};
    color: ${(p) => (p.$active ? "var(--red)" : "var(--green)")};
  }

  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`;

const StatusText = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: ${(p) => p.$color || "var(--grey-light)"};
`;

const TopChatterRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px var(--space-4);
  border-bottom: 1px solid rgba(160, 130, 80, 0.08);

  &:last-child {
    border-bottom: none;
  }
`;

const ChatterRank = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-mid);
  width: 24px;
`;

const ChatterName = styled.span`
  font-family: var(--font-display);
  font-size: var(--text-xs);
  color: var(--gold);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ChatterCount = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--white);
  font-weight: 700;
`;

const TopChattersCard = styled.div`
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(160, 130, 80, 0.15);
  border-radius: var(--radius-md);
  padding: var(--space-2) 0;
  margin-top: var(--space-2);
`;

const SubLabel = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  color: var(--grey-light);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: var(--space-2) var(--space-4) var(--space-1);
`;

const ChartContainer = styled.div`
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(160, 130, 80, 0.15);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  margin-top: var(--space-2);
`;

const BarChart = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 80px;
  padding-top: var(--space-2);
`;

const Bar = styled.div`
  flex: 1;
  min-width: 0;
  background: ${(p) => p.$color || "rgba(252, 219, 51, 0.5)"};
  border-radius: 2px 2px 0 0;
  height: ${(p) => p.$height || "0%"};
  transition: height 0.3s ease;
  position: relative;

  &:hover::after {
    content: "${(p) => p.$tooltip || ""}";
    position: absolute;
    bottom: calc(100% + 4px);
    left: 50%;
    transform: translateX(-50%);
    font-family: var(--font-mono);
    font-size: var(--text-xxxs);
    color: var(--white);
    background: rgba(0, 0, 0, 0.85);
    padding: 2px 6px;
    border-radius: 3px;
    white-space: nowrap;
    pointer-events: none;
  }
`;

const ChartLabels = styled.div`
  display: flex;
  gap: 2px;
  margin-top: 4px;
`;

const ChartLabel = styled.span`
  flex: 1;
  min-width: 0;
  text-align: center;
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  color: var(--grey-mid);
  overflow: hidden;
`;

const BusiestDayText = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--grey-light);
  margin-top: var(--space-2);
`;

const WordCloud = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: var(--space-2) 0;
`;

const WordTag = styled.span`
  font-family: var(--font-mono);
  font-size: ${(p) => p.$size || "var(--text-xs)"};
  color: ${(p) => p.$color || "var(--text-body)"};
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(160, 130, 80, 0.15);
  border-radius: var(--radius-sm);
  padding: 3px 8px;
  white-space: nowrap;
`;

const DigestCard = styled.div`
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid ${(p) => p.$error ? "rgba(255, 80, 80, 0.2)" : "rgba(160, 130, 80, 0.15)"};
  border-radius: var(--radius-md);
  padding: var(--space-4);
  margin-bottom: var(--space-2);
  opacity: ${(p) => p.$error ? 0.6 : 1};
`;

const DigestDate = styled.div`
  font-family: var(--font-display);
  font-size: var(--text-xs);
  color: var(--gold);
  margin-bottom: var(--space-2);
`;

const DigestText = styled.pre`
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--grey-light);
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.5;
  margin: 0;
`;

const DigestPreview = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
  cursor: pointer;
  display: flex;
  align-items: baseline;
  gap: var(--space-2);

  &:hover {
    color: var(--white);
  }
`;

const DigestToggle = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  color: var(--grey-mid);
  flex-shrink: 0;
`;

const GenerateButton = styled.button`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--gold);
  background: rgba(252, 219, 51, 0.06);
  border: 1px solid rgba(252, 219, 51, 0.25);
  border-radius: var(--radius-sm);
  padding: 4px 12px;
  cursor: pointer;
  transition: all 0.15s;

  &:hover:not(:disabled) {
    background: rgba(252, 219, 51, 0.12);
    border-color: var(--gold);
  }

  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`;

const DigestActions = styled.div`
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
  margin-bottom: var(--space-4);
`;

const SearchForm = styled.form`
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
`;

const SearchInput = styled.input`
  flex: 1;
  min-width: 0;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(160, 130, 80, 0.2);
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-4);
  color: var(--text-body);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  outline: none;

  &:focus {
    border-color: rgba(252, 219, 51, 0.4);
  }

  &::placeholder {
    color: var(--grey-mid);
  }
`;

const SearchToolbar = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 4px var(--space-4);
  border-top: 1px solid rgba(160, 130, 80, 0.08);
  background: rgba(0, 0, 0, 0.15);
`;

const ContextBtn = styled.button`
  background: none;
  border: none;
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  color: var(--grey-mid);
  cursor: pointer;
  padding: 2px 6px;

  &:hover {
    color: var(--gold);
  }
`;

const PaddingBtn = styled.button`
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(160, 130, 80, 0.15);
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  color: var(--grey-light);
  cursor: pointer;
  padding: 1px 8px;
  min-width: 24px;

  &:hover {
    border-color: var(--gold);
    color: var(--gold);
  }

  &:disabled {
    opacity: 0.3;
    cursor: default;
  }
`;

const PaddingLabel = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  color: var(--grey-mid);
  min-width: 38px;
  text-align: center;
`;

const ScrollEdgeBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  width: 100%;
  padding: 8px;
  background: var(--surface-2);
  border: none;
  border-bottom: ${(p) => p.$top ? "1px solid rgba(160, 130, 80, 0.08)" : "none"};
  border-top: ${(p) => p.$top ? "none" : "1px solid rgba(160, 130, 80, 0.08)"};
  color: var(--grey-mid);
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background: var(--gold-tint);
    color: var(--gold);
  }

  &:disabled {
    opacity: 0.3;
    cursor: default;
  }
`;

const HighlightMark = styled.mark`
  background: rgba(252, 219, 51, 0.25);
  color: var(--gold);
  border-radius: 2px;
  padding: 0 1px;
`;

const SearchMeta = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-mid);
  margin-bottom: var(--space-2);
`;

const HistoryRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: var(--space-4);
  align-items: center;
`;

const HistoryChip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(160, 130, 80, 0.15);
  border-radius: var(--radius-full);
  padding: 3px 10px;
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  color: var(--grey-light);
  cursor: pointer;
  transition: all 0.15s;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &:hover {
    border-color: var(--gold);
    color: var(--gold);
    background: rgba(252, 219, 51, 0.06);
  }
`;

const HistoryX = styled.span`
  font-size: 10px;
  opacity: 0.5;
  margin-left: 2px;

  &:hover {
    opacity: 1;
    color: var(--red);
  }
`;

const HistoryLabel = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  color: var(--grey-mid);
  text-transform: uppercase;
  letter-spacing: 0.06em;
`;

const LoadMoreButton = styled.button`
  width: 100%;
  padding: var(--space-2);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(160, 130, 80, 0.15);
  border-radius: var(--radius-sm);
  color: var(--grey-light);
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    border-color: var(--gold);
    color: var(--gold);
  }

  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
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
    title: "Replicate Billing",
    desc: "FLUX Dev image generation cost",
    url: "https://replicate.com/account/billing",
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

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso) {
  if (!iso) return "...";
  const d = new Date(iso);
  return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

function AdminGate() {
  const [draft, setDraft] = useState("");
  const { adminKey, setAdminKey } = useAdmin();

  function handleSubmit(e) {
    e.preventDefault();
    const key = draft.trim();
    if (key) {
      setAdminKey(key);
      setDraft("");
    }
  }

  if (adminKey) return <AdminDashboard />;

  return (
    <PageLayout bare overlay>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <PageHero eyebrow="Dev Tools" title="Admin" />
        <StatusText>Enter API key to access the admin dashboard.</StatusText>
        <TokenForm onSubmit={handleSubmit} style={{ marginTop: 16 }}>
          <TokenInput
            type="password"
            placeholder="API key..."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
          />
          <SubmitButton type="submit" disabled={!draft.trim()}>
            <IoSend size={14} />
          </SubmitButton>
        </TokenForm>
      </div>
    </PageLayout>
  );
}

export default function Admin() {
  return <AdminGate />;
}

function AdminDashboard() {
  const [health, setHealth] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [digestLoading, setDigestLoading] = useState(null);
  const [tokenDraft, setTokenDraft] = useState("");
  const [tokenStatus, setTokenStatus] = useState(null);
  const [expandedDigests, setExpandedDigests] = useState(new Set());
  const { adminKey: apiKey } = useAdmin();

  const fetchHealth = useCallback(() => {
    fetch(`${RELAY_URL}/api/admin/health`)
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setHealth({ status: "error" }));
  }, []);

  const fetchAnalytics = useCallback(() => {
    fetch(`${RELAY_URL}/api/admin/analytics`)
      .then((r) => r.json())
      .then(setAnalytics)
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchHealth();
    fetchAnalytics();
  }, [fetchHealth, fetchAnalytics]);

  async function handleGenerateDigest(date) {
    setDigestLoading(date);
    try {
      const res = await fetch(`${RELAY_URL}/api/admin/digest/${date}`);
      const data = await res.json();
      if (data.digest) {
        setAnalytics((prev) => {
          if (!prev) return prev;
          const existing = prev.digests || [];
          const filtered = existing.filter((d) => d.date !== date);
          return {
            ...prev,
            digests: [{ date, digest: data.digest, created_at: new Date().toISOString() }, ...filtered]
              .sort((a, b) => b.date.localeCompare(a.date)),
          };
        });
      } else {
        setAnalytics((prev) => {
          if (!prev) return prev;
          const existing = prev.digests || [];
          return {
            ...prev,
            digests: [{ date, digest: null, reason: data.reason || "Failed to generate" }, ...existing.filter((d) => d.date !== date)]
              .sort((a, b) => b.date.localeCompare(a.date)),
          };
        });
      }
    } catch {
      setAnalytics((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          digests: [{ date, digest: null, reason: "Request failed" }, ...(prev.digests || []).filter((d) => d.date !== date)]
            .sort((a, b) => b.date.localeCompare(a.date)),
        };
      });
    }
    setDigestLoading(null);
  }

  function handleTokenSubmit(e) {
    e.preventDefault();
    const token = tokenDraft.trim();
    if (!token || !apiKey) return;
    setTokenDraft("");
    setTokenStatus("Token updated");
    setHealth((prev) => prev ? { ...prev, signalr: { ...prev.signalr, hasToken: true } } : prev);
    fetch(`${RELAY_URL}/api/admin/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
      body: JSON.stringify({ token }),
    }).then((res) => {
      if (!res.ok) {
        setTokenStatus("Error: update failed");
        setHealth((prev) => prev ? { ...prev, signalr: { ...prev.signalr, hasToken: false } } : prev);
      } else {
        setTimeout(() => setTokenStatus(null), 2000);
      }
    }).catch((err) => {
      setTokenStatus(`Error: ${err.message}`);
      setHealth((prev) => prev ? { ...prev, signalr: { ...prev.signalr, hasToken: false } } : prev);
    });
  }

  function handleBotToggle() {
    if (!apiKey) return;
    const prev = health?.botEnabled;
    const newEnabled = !prev;
    setHealth((h) => h ? { ...h, botEnabled: newEnabled } : h);
    fetch(`${RELAY_URL}/api/admin/bot`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
      body: JSON.stringify({ enabled: newEnabled }),
    }).then((res) => {
      if (!res.ok) setHealth((h) => h ? { ...h, botEnabled: prev } : h);
    }).catch(() => {
      setHealth((h) => h ? { ...h, botEnabled: prev } : h);
    });
  }

  const statusColor =
    health?.status === "ok"
      ? "var(--green)"
      : health?.status === "error"
        ? "var(--red)"
        : "var(--gold)";

  const tokenColor = health?.signalr?.hasToken ? "var(--green)" : "var(--red)";

  const db = health?.db;
  const daysSinceOldest = db?.oldestMessage
    ? Math.max(1, Math.floor((Date.now() - new Date(db.oldestMessage).getTime()) / 86400000))
    : null;
  const avgPerDay = daysSinceOldest ? Math.round(db.totalMessages / daysSinceOldest) : null;

  return (
    <PageLayout bare overlay>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <PageHero eyebrow="Dev Tools" title="Admin" lead="Chat relay dashboard, analytics, and server management." />
      <RelayUrl>{RELAY_URL}</RelayUrl>

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
              {health?.uptime ? `${Math.floor(health.uptime / 3600)}h ${Math.floor((health.uptime % 3600) / 60)}m` : "..."}
            </HealthValue>
            <HealthLabel>Uptime</HealthLabel>
          </HealthCard>
        </HealthGrid>
      </Section>

      <ChatSearch />

      <Section>
        <SectionTitle>Replays</SectionTitle>
        <LinkCard as={Link} to="/replay-lab">
          <LinkInfo>
            <LinkTitle>Replay Lab</LinkTitle>
            <LinkDesc>Upload, import from W3C, and analyze replays</LinkDesc>
          </LinkInfo>
          <LinkIcon size={16} />
        </LinkCard>
      </Section>

      <Section>
        <SectionTitle>Bot</SectionTitle>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 8 }}>
          <ToggleButton
            $active={health?.botEnabled}
            onClick={handleBotToggle}
            disabled={!apiKey}
          >
            {health?.botEnabled ? "ENABLED" : "DISABLED"}
          </ToggleButton>
          <StatusText>
            {health?.botEnabled
              ? "Bot responses are sent to W3C chat."
              : "Bot is in preview mode. Responses shown in frontend only."}
          </StatusText>
        </div>
        {!apiKey && (
          <StatusText style={{ display: "block", marginTop: 8 }} $color="var(--grey-mid)">
            Set API key in chat panel to toggle bot.
          </StatusText>
        )}
      </Section>

      <Section>
        <SectionTitle>Database</SectionTitle>
        <HealthGrid>
          <HealthCard>
            <HealthValue>{db?.totalMessages?.toLocaleString() ?? "..."}</HealthValue>
            <HealthLabel>Messages</HealthLabel>
          </HealthCard>
          <HealthCard>
            <HealthValue>{db?.uniqueUsers?.toLocaleString() ?? "..."}</HealthValue>
            <HealthLabel>Unique Users</HealthLabel>
          </HealthCard>
          <HealthCard>
            <HealthValue>{db?.messagesLast24h?.toLocaleString() ?? "..."}</HealthValue>
            <HealthLabel>Last 24h</HealthLabel>
          </HealthCard>
          <HealthCard>
            <HealthValue>{db?.messagesLast7d?.toLocaleString() ?? "..."}</HealthValue>
            <HealthLabel>Last 7d</HealthLabel>
          </HealthCard>
          <HealthCard>
            <HealthValue>{avgPerDay?.toLocaleString() ?? "..."}</HealthValue>
            <HealthLabel>Avg / Day</HealthLabel>
          </HealthCard>
          <HealthCard>
            <HealthValue>{db?.avgMessageLength ?? "..."}</HealthValue>
            <HealthLabel>Avg Length</HealthLabel>
          </HealthCard>
          <HealthCard>
            <HealthValue>{db?.deletedMessages?.toLocaleString() ?? "..."}</HealthValue>
            <HealthLabel>Deleted</HealthLabel>
          </HealthCard>
          <HealthCard>
            <HealthValue>{formatBytes(db?.dbSizeBytes)}</HealthValue>
            <HealthLabel>DB Size</HealthLabel>
          </HealthCard>
          <HealthCard>
            <HealthValue>{formatDate(db?.oldestMessage)}</HealthValue>
            <HealthLabel>Since</HealthLabel>
          </HealthCard>
        </HealthGrid>
        {db?.busiestDay && (
          <BusiestDayText>
            Busiest day: <strong style={{ color: "var(--gold)" }}>{db.busiestDay.day}</strong> with{" "}
            <strong style={{ color: "var(--white)" }}>{db.busiestDay.count.toLocaleString()}</strong> messages
          </BusiestDayText>
        )}
        {db?.perDay?.length > 0 && (
          <ChartContainer>
            <SubLabel>Messages per Day (last 14d)</SubLabel>
            <BarChart>
              {db.perDay.map((d) => {
                const max = Math.max(...db.perDay.map((x) => x.count));
                const pct = max > 0 ? (d.count / max) * 100 : 0;
                return (
                  <Bar
                    key={d.day}
                    $height={`${Math.max(pct, 2)}%`}
                    $tooltip={`${d.day.slice(5)}: ${d.count}`}
                  />
                );
              })}
            </BarChart>
            <ChartLabels>
              {db.perDay.map((d, i) => (
                <ChartLabel key={d.day}>
                  {i === 0 || i === db.perDay.length - 1 ? d.day.slice(5) : ""}
                </ChartLabel>
              ))}
            </ChartLabels>
          </ChartContainer>
        )}
        {db?.byHour?.length > 0 && (
          <ChartContainer>
            <SubLabel>Activity by Hour (UTC)</SubLabel>
            <BarChart>
              {Array.from({ length: 24 }, (_, h) => {
                const entry = db.byHour.find((x) => x.hour === h);
                const count = entry?.count || 0;
                const max = Math.max(...db.byHour.map((x) => x.count));
                const pct = max > 0 ? (count / max) * 100 : 0;
                return (
                  <Bar
                    key={h}
                    $height={`${Math.max(pct, 2)}%`}
                    $tooltip={`${h}:00 — ${count}`}
                    $color={count === max && max > 0 ? "var(--gold)" : undefined}
                  />
                );
              })}
            </BarChart>
            <ChartLabels>
              {Array.from({ length: 24 }, (_, h) => (
                <ChartLabel key={h}>{h % 6 === 0 ? `${h}` : ""}</ChartLabel>
              ))}
            </ChartLabels>
          </ChartContainer>
        )}
        {db?.topChatters?.length > 0 && (
          <TopChattersCard>
            <SubLabel>Top Chatters</SubLabel>
            {db.topChatters.map((c, i) => (
              <TopChatterRow key={c.battle_tag}>
                <ChatterRank>{i + 1}.</ChatterRank>
                <ChatterName>{c.user_name}</ChatterName>
                <ChatterCount>{c.count.toLocaleString()}</ChatterCount>
              </TopChatterRow>
            ))}
          </TopChattersCard>
        )}
      </Section>

      <Section>
        <SectionTitle>Top Words (7d)</SectionTitle>
        {analytics?.topWords?.length > 0 ? (
          <WordCloud>
            {analytics.topWords.map((w, i) => {
              const max = analytics.topWords[0].count;
              const ratio = w.count / max;
              const size = Math.round(11 + ratio * 10);
              const color = ratio > 0.7 ? "var(--gold)" : ratio > 0.4 ? "var(--white)" : "var(--grey-light)";
              return (
                <WordTag key={w.word} $size={`${size}px`} $color={color} title={`${w.count} uses`}>
                  {w.word}
                </WordTag>
              );
            })}
          </WordCloud>
        ) : (
          <StatusText>Loading...</StatusText>
        )}
      </Section>

      <Section>
        <SectionHeader>
          <SectionTitle>Daily Digests</SectionTitle>
        </SectionHeader>
        <DigestActions>
          {(() => {
            const dates = [];
            for (let i = 1; i <= 3; i++) {
              const d = new Date();
              d.setDate(d.getDate() - i);
              dates.push(d.toISOString().slice(0, 10));
            }
            const existingDates = new Set((analytics?.digests || []).map((d) => d.date));
            return dates
              .filter((d) => !existingDates.has(d))
              .map((d) => (
                <GenerateButton
                  key={d}
                  onClick={() => handleGenerateDigest(d)}
                  disabled={digestLoading === d}
                >
                  {digestLoading === d ? "Generating..." : `Generate ${d}`}
                </GenerateButton>
              ));
          })()}
        </DigestActions>
        {analytics?.digests?.length > 0 ? (
          analytics.digests.map((d) => {
            const isExpanded = expandedDigests.has(d.date);
            const toggleDigest = () => setExpandedDigests(prev => {
              const next = new Set(prev);
              if (next.has(d.date)) next.delete(d.date);
              else next.add(d.date);
              return next;
            });
            return (
              <DigestCard key={d.date} $error={!d.digest}>
                {d.digest ? (
                  isExpanded ? (
                    <>
                      <DigestDate onClick={toggleDigest} style={{ cursor: "pointer" }}>{d.date} <DigestToggle>collapse</DigestToggle></DigestDate>
                      <DigestText>{d.digest}</DigestText>
                    </>
                  ) : (
                    <DigestPreview onClick={toggleDigest}>
                      <DigestDate style={{ marginBottom: 0 }}>{d.date}</DigestDate>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.digest.slice(0, 80)}...</span>
                      <DigestToggle>expand</DigestToggle>
                    </DigestPreview>
                  )
                ) : (
                  <>
                    <DigestDate>{d.date}</DigestDate>
                    <StatusText $color="var(--grey-mid)">{d.reason || "No digest available"}</StatusText>
                  </>
                )}
              </DigestCard>
            );
          })
        ) : (
          <StatusText>No digests yet. Generate one for a recent day.</StatusText>
        )}
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
      </div>
    </PageLayout>
  );
}
