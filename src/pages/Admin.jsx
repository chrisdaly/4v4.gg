import React, { useState, useEffect, useCallback } from "react";
import styled from "styled-components";
import { FiExternalLink, FiRefreshCw } from "react-icons/fi";
import { IoSend } from "react-icons/io5";
import useAdmin from "../lib/useAdmin";

const RELAY_URL =
  import.meta.env.VITE_CHAT_RELAY_URL || "https://4v4gg-chat-relay.fly.dev";

const Page = styled.div`
  max-width: 720px;
  margin: 0 auto;
  padding: var(--space-8) var(--space-4);
  background: rgba(10, 8, 6, 0.6);
  backdrop-filter: blur(12px);
  min-height: calc(100vh - 52px);
`;

const Title = styled.h1`
  font-family: var(--font-display);
  font-size: var(--text-xl);
  color: var(--gold);
  margin-bottom: var(--space-2);
`;

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

const ToggleButton = styled.button`
  padding: 6px 16px;
  border: 1px solid ${(p) => (p.$active ? "var(--green)" : "rgba(160, 130, 80, 0.3)")};
  border-radius: var(--radius-sm);
  background: ${(p) => (p.$active ? "rgba(76, 175, 80, 0.15)" : "rgba(255, 255, 255, 0.04)")};
  color: ${(p) => (p.$active ? "var(--green)" : "var(--grey-light)")};
  font-family: var(--font-mono);
  font-size: 13px;
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
  font-size: 12px;
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
  font-size: 12px;
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
  color: #fff;
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
  font-size: 11px;
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
    font-size: 10px;
    color: #fff;
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
  font-size: 9px;
  color: var(--grey-mid);
  overflow: hidden;
`;

const BusiestDayText = styled.div`
  font-family: var(--font-mono);
  font-size: 13px;
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
  font-size: ${(p) => p.$size || "13px"};
  color: ${(p) => p.$color || "#e0e0e0"};
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
  font-size: 13px;
  color: #ccc;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.5;
  margin: 0;
`;

const GenerateButton = styled.button`
  font-family: var(--font-mono);
  font-size: 12px;
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

export default function Admin() {
  const [health, setHealth] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [digestLoading, setDigestLoading] = useState(null);
  const [tokenDraft, setTokenDraft] = useState("");
  const [tokenStatus, setTokenStatus] = useState(null);
  const [botToggling, setBotToggling] = useState(false);
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

  async function handleBotToggle() {
    if (!apiKey || botToggling) return;
    const newEnabled = !health?.botEnabled;
    setBotToggling(true);
    try {
      const res = await fetch(`${RELAY_URL}/api/admin/bot`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
        body: JSON.stringify({ enabled: newEnabled }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      fetchHealth();
    } catch (err) {
      console.error("Bot toggle failed:", err.message);
    } finally {
      setBotToggling(false);
    }
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
    <Page>
      <Title>Admin</Title>
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

      <Section>
        <SectionTitle>Bot</SectionTitle>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 8 }}>
          <ToggleButton
            $active={health?.botEnabled}
            onClick={handleBotToggle}
            disabled={!apiKey || botToggling}
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
            <strong style={{ color: "#fff" }}>{db.busiestDay.count.toLocaleString()}</strong> messages
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
              const color = ratio > 0.7 ? "var(--gold)" : ratio > 0.4 ? "#fff" : "#aaa";
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
          analytics.digests.map((d) => (
            <DigestCard key={d.date} $error={!d.digest}>
              <DigestDate>{d.date}</DigestDate>
              {d.digest ? (
                <DigestText>{d.digest}</DigestText>
              ) : (
                <StatusText $color="var(--grey-mid)">{d.reason || "No digest available"}</StatusText>
              )}
            </DigestCard>
          ))
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
    </Page>
  );
}
