import React, { useState, useCallback, useEffect, useRef } from "react";
import styled from "styled-components";
import { FiUpload, FiTrash2, FiChevronDown, FiChevronRight } from "react-icons/fi";
import useAdmin from "../lib/useAdmin";
import PlayerFingerprint from "../components/replay/PlayerFingerprint";

const RELAY_URL =
  import.meta.env.VITE_CHAT_RELAY_URL || "https://4v4gg-chat-relay.fly.dev";

// ── Styled Components ───────────────────────────────

const Section = styled.div`
  margin-bottom: var(--space-8);
`;

const SectionTitle = styled.h2`
  font-family: var(--font-display);
  font-size: var(--text-lg);
  color: var(--white);
  margin-bottom: var(--space-4);
`;

const DropZone = styled.div`
  border: 2px dashed ${(p) => (p.$active ? "var(--gold)" : "rgba(160, 130, 80, 0.3)")};
  border-radius: var(--radius-md);
  padding: var(--space-8) var(--space-4);
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  background: ${(p) => (p.$active ? "rgba(252, 219, 51, 0.08)" : "rgba(255, 255, 255, 0.02)")};

  &:hover {
    border-color: var(--gold);
    background: rgba(252, 219, 51, 0.06);
  }
`;

const DropLabel = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: ${(p) => (p.$active ? "var(--gold)" : "var(--grey-light)")};
  margin-top: var(--space-2);
`;

const DropIcon = styled(FiUpload)`
  color: ${(p) => (p.$active ? "var(--gold)" : "var(--grey-mid)")};
`;

const StatusText = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: ${(p) => p.$color || "var(--grey-light)"};
  margin-top: var(--space-2);
`;

const Table = styled.div`
  border: 1px solid rgba(160, 130, 80, 0.15);
  border-radius: var(--radius-md);
  overflow: hidden;
`;

const TableHeader = styled.div`
  display: grid;
  grid-template-columns: 1fr 100px 80px 60px 80px 40px;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  background: rgba(255, 255, 255, 0.04);
  border-bottom: 1px solid rgba(160, 130, 80, 0.15);
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  color: var(--grey-mid);
  text-transform: uppercase;
  letter-spacing: 0.08em;
`;

const TableRow = styled.div`
  border-bottom: 1px solid rgba(160, 130, 80, 0.08);

  &:last-child {
    border-bottom: none;
  }
`;

const RowMain = styled.div`
  display: grid;
  grid-template-columns: 1fr 100px 80px 60px 80px 40px;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  align-items: center;
  cursor: pointer;
  transition: background 0.1s;

  &:hover {
    background: rgba(252, 219, 51, 0.04);
  }
`;

const CellText = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: ${(p) => p.$color || "var(--text-body)"};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const CellName = styled.span`
  font-family: var(--font-display);
  font-size: var(--text-xs);
  color: var(--gold);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StatusBadge = styled.span`
  display: inline-block;
  padding: 1px 6px;
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: ${(p) =>
    p.$status === "parsed"
      ? "rgba(76, 175, 80, 0.15)"
      : p.$status === "error"
        ? "rgba(255, 80, 80, 0.15)"
        : "rgba(252, 219, 51, 0.15)"};
  color: ${(p) =>
    p.$status === "parsed"
      ? "var(--green)"
      : p.$status === "error"
        ? "var(--red)"
        : "var(--gold)"};
  border: 1px solid
    ${(p) =>
      p.$status === "parsed"
        ? "rgba(76, 175, 80, 0.3)"
        : p.$status === "error"
          ? "rgba(255, 80, 80, 0.3)"
          : "rgba(252, 219, 51, 0.3)"};
`;

const ExpandPanel = styled.div`
  padding: var(--space-4);
  background: rgba(0, 0, 0, 0.2);
  border-top: 1px solid rgba(160, 130, 80, 0.08);
`;

const SubSection = styled.div`
  margin-bottom: var(--space-4);

  &:last-child {
    margin-bottom: 0;
  }
`;

const SubLabel = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  color: var(--grey-mid);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: var(--space-2);
`;

const PlayerCard = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 6px var(--space-2);
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(160, 130, 80, 0.1);
  border-radius: var(--radius-sm);
  margin-bottom: 4px;
`;

const TeamIndicator = styled.span`
  width: 3px;
  height: 20px;
  border-radius: 2px;
  background: ${(p) => (p.$team === 0 ? "var(--team-blue, #4a9eff)" : "var(--team-red, #ff4a4a)")};
  flex-shrink: 0;
`;

const PlayerName = styled.span`
  font-family: var(--font-display);
  font-size: var(--text-xs);
  color: var(--gold);
  min-width: 100px;
`;

const PlayerMeta = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  color: var(--grey-light);
`;

const ActionBar = styled.div`
  display: flex;
  gap: 2px;
  height: 16px;
  align-items: flex-end;
  flex: 1;
  min-width: 100px;
`;

const ActionSegment = styled.div`
  flex: ${(p) => p.$flex || 1};
  height: ${(p) => p.$height || "100%"};
  background: ${(p) => p.$color || "var(--gold)"};
  border-radius: 1px;
  min-width: 2px;
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
    z-index: 1;
  }
`;

const ChatBubble = styled.div`
  display: flex;
  gap: var(--space-2);
  padding: 4px 0;
  align-items: baseline;
`;

const ChatTime = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  color: var(--grey-mid);
  flex-shrink: 0;
  min-width: 44px;
`;

const ChatName = styled.span`
  font-family: var(--font-display);
  font-size: var(--text-xxs);
  color: var(--gold);
  flex-shrink: 0;
`;

const ChatMsg = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--text-body);
  word-break: break-word;
`;

const DeleteBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: none;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  color: var(--grey-mid);
  cursor: pointer;
  transition: all 0.15s;
  padding: 0;

  &:hover {
    border-color: var(--red);
    color: var(--red);
    background: rgba(255, 80, 80, 0.1);
  }
`;

const EmptyState = styled.div`
  padding: var(--space-8) var(--space-4);
  text-align: center;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--grey-mid);
`;

// ── Utilities ────────────────────────────────────────

function formatDuration(seconds) {
  if (!seconds) return "--";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatSize(bytes) {
  if (!bytes) return "--";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatGameTime(ms) {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatDate(iso) {
  if (!iso) return "--";
  const d = new Date(iso);
  return d.toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

const ACTION_COLORS = {
  rightclick: "#4a9eff",
  ability: "#ff4a4a",
  buildtrain: "#ffc107",
  item: "#9c27b0",
  selecthotkey: "#4caf50",
  assigngroup: "#00bcd4",
  basic: "#607d8b",
  esc: "#795548",
};

const ACTION_LABELS = {
  rightclick: "Right Click",
  ability: "Ability",
  buildtrain: "Build/Train",
  item: "Item",
  selecthotkey: "Hotkey Use",
  assigngroup: "Group Assign",
  basic: "Basic",
  esc: "ESC",
};

// ── Components ───────────────────────────────────────

function ActionBreakdown({ actions }) {
  if (!actions) return null;
  const keys = Object.keys(ACTION_COLORS);
  const values = keys.map((k) => actions[k] || actions[k.replace("selecthotkey", "selecthotkey")] || 0);
  const total = values.reduce((a, b) => a + b, 0);
  if (total === 0) return null;

  return (
    <ActionBar>
      {keys.map((k, i) => {
        const v = values[i];
        if (v === 0) return null;
        return (
          <ActionSegment
            key={k}
            $flex={v}
            $color={ACTION_COLORS[k]}
            $tooltip={`${ACTION_LABELS[k]}: ${v}`}
          />
        );
      })}
    </ActionBar>
  );
}

function ReplayDetail({ replayId, apiKey }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${RELAY_URL}/api/replays/${replayId}`, {
      headers: { "X-API-Key": apiKey },
    })
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [replayId, apiKey]);

  if (loading) return <ExpandPanel><StatusText>Loading...</StatusText></ExpandPanel>;
  if (!data) return <ExpandPanel><StatusText $color="var(--red)">Failed to load</StatusText></ExpandPanel>;

  const { players, actions, chat } = data;

  // Build a player actions lookup
  const actionsByPlayer = {};
  for (const a of actions || []) {
    actionsByPlayer[a.player_id] = a;
  }

  // Group players by team
  const teams = {};
  for (const p of players || []) {
    const t = p.team_id ?? 0;
    if (!teams[t]) teams[t] = [];
    teams[t].push(p);
  }

  return (
    <ExpandPanel>
      <SubSection>
        <SubLabel>Players</SubLabel>
        {Object.entries(teams).map(([teamId, teamPlayers]) => (
          <div key={teamId}>
            {teamPlayers.map((p) => {
              const pa = actionsByPlayer[p.player_id];
              return (
                <React.Fragment key={p.player_id}>
                  <PlayerCard>
                    <TeamIndicator $team={parseInt(teamId) === 1 ? 1 : 0} />
                    <PlayerName>{p.player_name}</PlayerName>
                    <PlayerMeta>{p.race}</PlayerMeta>
                    <PlayerMeta>{Math.round(p.apm || 0)} APM</PlayerMeta>
                    <ActionBreakdown actions={pa} />
                  </PlayerCard>
                  <PlayerFingerprint actions={pa} />
                </React.Fragment>
              );
            })}
          </div>
        ))}
      </SubSection>

      {chat && chat.length > 0 && (
        <SubSection>
          <SubLabel>Chat ({chat.length} messages)</SubLabel>
          <div style={{ maxHeight: 200, overflow: "auto" }}>
            {chat.map((msg, i) => (
              <ChatBubble key={i}>
                <ChatTime>{formatGameTime(msg.time_ms)}</ChatTime>
                <ChatName>{msg.player_name}</ChatName>
                <ChatMsg>{msg.message}</ChatMsg>
              </ChatBubble>
            ))}
          </div>
        </SubSection>
      )}

      {chat && chat.length === 0 && (
        <SubSection>
          <SubLabel>Chat</SubLabel>
          <StatusText>No chat messages in this replay</StatusText>
        </SubSection>
      )}
    </ExpandPanel>
  );
}

export default function AdminReplays() {
  const { adminKey: apiKey } = useAdmin();
  const [replays, setReplays] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileRef = useRef(null);

  const fetchReplays = useCallback(() => {
    if (!apiKey) return;
    setLoading(true);
    fetch(`${RELAY_URL}/api/replays?limit=50`, {
      headers: { "X-API-Key": apiKey },
    })
      .then((r) => r.json())
      .then((data) => {
        setReplays(data.replays || []);
        setTotal(data.total || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [apiKey]);

  useEffect(() => {
    fetchReplays();
  }, [fetchReplays]);

  const uploadFile = useCallback(
    async (file) => {
      if (!file || !apiKey) return;
      if (!file.name.toLowerCase().endsWith(".w3g")) {
        setUploadStatus({ error: "Only .w3g files accepted" });
        return;
      }
      setUploading(true);
      setUploadStatus(null);
      const form = new FormData();
      form.append("replay", file);
      try {
        const res = await fetch(`${RELAY_URL}/api/replays/upload`, {
          method: "POST",
          headers: { "X-API-Key": apiKey },
          body: form,
        });
        const data = await res.json();
        if (data.ok) {
          setUploadStatus({ success: `Parsed: ${data.replay.filename} (${data.replay.playerCount} players, ${data.replay.chatCount} chat msgs)` });
          fetchReplays();
        } else {
          setUploadStatus({ error: data.error || data.detail || "Upload failed" });
          fetchReplays(); // Refresh to show error-status replay
        }
      } catch (err) {
        setUploadStatus({ error: err.message });
      }
      setUploading(false);
    },
    [apiKey, fetchReplays]
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragActive(false);
      const files = e.dataTransfer?.files;
      if (files?.length > 0) uploadFile(files[0]);
    },
    [uploadFile]
  );

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragActive(false);
  }, []);

  const handleFileSelect = useCallback(
    (e) => {
      const file = e.target?.files?.[0];
      if (file) uploadFile(file);
    },
    [uploadFile]
  );

  const handleDelete = useCallback(
    async (id, e) => {
      e.stopPropagation();
      if (!apiKey) return;
      try {
        await fetch(`${RELAY_URL}/api/replays/${id}`, {
          method: "DELETE",
          headers: { "X-API-Key": apiKey },
        });
        setReplays((prev) => prev.filter((r) => r.id !== id));
        setTotal((prev) => prev - 1);
        if (expandedId === id) setExpandedId(null);
      } catch {}
    },
    [apiKey, expandedId]
  );

  return (
    <Section>
      <SectionTitle>Replays</SectionTitle>

      {/* Upload area */}
      <DropZone
        $active={dragActive}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileRef.current?.click()}
      >
        <DropIcon size={24} $active={dragActive} />
        <DropLabel $active={dragActive}>
          {uploading
            ? "Uploading..."
            : dragActive
              ? "Drop .w3g file here"
              : "Drop .w3g file or click to browse"}
        </DropLabel>
        <input
          ref={fileRef}
          type="file"
          accept=".w3g"
          style={{ display: "none" }}
          onChange={handleFileSelect}
        />
      </DropZone>

      {uploadStatus?.success && <StatusText $color="var(--green)">{uploadStatus.success}</StatusText>}
      {uploadStatus?.error && <StatusText $color="var(--red)">{uploadStatus.error}</StatusText>}

      {/* Replay list */}
      {replays.length > 0 ? (
        <Table style={{ marginTop: "var(--space-4)" }}>
          <TableHeader>
            <span>Filename</span>
            <span>Map</span>
            <span>Duration</span>
            <span>Type</span>
            <span>Status</span>
            <span />
          </TableHeader>
          {replays.map((r) => {
            const isExpanded = expandedId === r.id;
            return (
              <TableRow key={r.id}>
                <RowMain onClick={() => setExpandedId(isExpanded ? null : r.id)}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, overflow: "hidden" }}>
                    {isExpanded ? <FiChevronDown size={12} style={{ flexShrink: 0, color: "var(--gold)" }} /> : <FiChevronRight size={12} style={{ flexShrink: 0, color: "var(--grey-mid)" }} />}
                    <CellName title={r.filename}>{r.filename}</CellName>
                  </div>
                  <CellText title={r.map_name}>{r.map_name || "--"}</CellText>
                  <CellText>{formatDuration(r.game_duration)}</CellText>
                  <CellText>{r.match_type || "--"}</CellText>
                  <StatusBadge $status={r.parse_status}>{r.parse_status}</StatusBadge>
                  <DeleteBtn onClick={(e) => handleDelete(r.id, e)} title="Delete replay">
                    <FiTrash2 size={12} />
                  </DeleteBtn>
                </RowMain>
                {isExpanded && r.parse_status === "parsed" && (
                  <ReplayDetail replayId={r.id} apiKey={apiKey} />
                )}
                {isExpanded && r.parse_status === "error" && (
                  <ExpandPanel>
                    <StatusText $color="var(--red)">Error: {r.parse_error || "Unknown"}</StatusText>
                  </ExpandPanel>
                )}
              </TableRow>
            );
          })}
        </Table>
      ) : loading ? (
        <EmptyState>Loading replays...</EmptyState>
      ) : (
        <EmptyState>No replays uploaded yet. Drop a .w3g file above.</EmptyState>
      )}

      {total > 0 && (
        <StatusText style={{ marginTop: "var(--space-2)", textAlign: "right" }}>
          {total} replay{total !== 1 ? "s" : ""} total
        </StatusText>
      )}
    </Section>
  );
}
