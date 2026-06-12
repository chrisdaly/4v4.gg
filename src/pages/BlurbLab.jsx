import React, { useState, useEffect, useCallback } from "react";
import styled from "styled-components";
import useAdmin from "../lib/useAdmin";
import { getMapImageUrl } from "../lib/formatters";

const RELAY_URL =
  import.meta.env.VITE_CHAT_RELAY_URL || "https://4v4gg-chat-relay.fly.dev";

/* ── Layout ───────────────────────────────────── */

const Page = styled.div`
  max-width: 1500px;
  margin: 0 auto;
  padding: var(--space-6) var(--space-4);
`;

const Title = styled.h1`
  font-family: var(--font-display);
  font-size: var(--text-lg);
  color: var(--gold);
  margin-bottom: var(--space-2);
`;

const Subtitle = styled.p`
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--grey-light);
  margin-bottom: var(--space-6);
`;

const Columns = styled.div`
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: var(--space-6);

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

/* ── Game list ────────────────────────────────── */

const GameList = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  max-height: 80vh;
  overflow-y: auto;
  padding-right: var(--space-1);
`;

const GameRow = styled.button`
  display: flex;
  gap: var(--space-2);
  align-items: center;
  text-align: left;
  padding: var(--space-2);
  background: ${(p) => (p.$active ? "rgba(252, 219, 51, 0.08)" : "var(--surface-1)")};
  border: 1px solid ${(p) => (p.$active ? "var(--gold)" : "var(--grey-mid)")};
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: border-color 0.15s;

  &:hover {
    border-color: rgba(252, 219, 51, 0.5);
  }
`;

const GameMap = styled.img`
  width: 40px;
  height: 40px;
  border-radius: var(--radius-sm);
  object-fit: cover;
  flex-shrink: 0;
`;

const GameInfo = styled.div`
  min-width: 0;
`;

const GameTitle = styled.div`
  font-family: var(--font-display);
  font-size: var(--text-xs);
  color: var(--white);
`;

const GamePlayers = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  color: var(--grey-light);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const GameBlurbHint = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  font-style: italic;
  color: var(--gold);
  opacity: 0.8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

/* ── Workbench ────────────────────────────────── */

const Section = styled.div`
  margin-bottom: var(--space-4);
`;

const Label = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--grey-light);
  margin-bottom: var(--space-1);
`;

const PromptArea = styled.textarea`
  width: 100%;
  min-height: 220px;
  box-sizing: border-box;
  background: var(--surface-1);
  border: 1px solid var(--grey-mid);
  border-radius: var(--radius-md);
  padding: var(--space-2);
  color: var(--white);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  line-height: 1.5;
  resize: vertical;

  &:focus {
    border-color: var(--gold);
    outline: none;
  }
`;

const FactSheet = styled.pre`
  background: var(--surface-1);
  border: 1px solid var(--grey-mid);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 320px;
  overflow-y: auto;
  margin: 0;
`;

const GenerateButton = styled.button`
  padding: var(--space-2) var(--space-6);
  background: rgba(252, 219, 51, 0.1);
  border: var(--border-thick) solid var(--gold);
  border-radius: var(--radius-md);
  color: var(--gold);
  font-family: var(--font-display);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: background 0.15s;

  &:hover:not(:disabled) {
    background: rgba(252, 219, 51, 0.2);
  }

  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
`;

const ResetButton = styled.button`
  margin-left: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: none;
  border: 1px solid var(--grey-mid);
  border-radius: var(--radius-md);
  color: var(--grey-light);
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  cursor: pointer;

  &:hover {
    border-color: var(--gold);
    color: var(--gold);
  }
`;

const Output = styled.div`
  padding: var(--space-3);
  border-left: 2px solid ${(p) => (p.$passed ? "var(--grey-mid)" : "var(--gold)")};
  background: ${(p) => (p.$passed ? "rgba(255,255,255,0.02)" : "var(--gold-tint)")};
  border-radius: 0 var(--radius-md) var(--radius-md) 0;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-style: italic;
  color: ${(p) => (p.$passed ? "var(--grey-light)" : "var(--gold)")};
`;

const History = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  margin-top: var(--space-2);
`;

const HistoryRow = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
  font-style: italic;

  &::before {
    content: "↳ ";
    opacity: 0.5;
  }
`;

const ErrorText = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--red);
`;

const KeyGate = styled.div`
  max-width: 480px;
  margin: 15vh auto;
  text-align: center;
  font-family: var(--font-mono);
  color: var(--grey-light);

  input {
    width: 100%;
    box-sizing: border-box;
    margin-top: var(--space-3);
    padding: var(--space-2);
    background: var(--surface-1);
    border: 1px solid var(--grey-mid);
    border-radius: var(--radius-md);
    color: var(--white);
    font-family: var(--font-mono);
  }
`;

/* ── Page ─────────────────────────────────────── */

export default function BlurbLab() {
  const { adminKey, setAdminKey } = useAdmin();
  const [matches, setMatches] = useState([]);
  const [defaultPrompt, setDefaultPrompt] = useState("");
  const [prompt, setPrompt] = useState("");
  const [selected, setSelected] = useState(null);
  const [factSheet, setFactSheet] = useState(null);
  const [sheetLoading, setSheetLoading] = useState(false);
  const [output, setOutput] = useState(null); // { blurb, passed }
  const [history, setHistory] = useState([]); // previous outputs for selected match
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  const authed = !!adminKey;

  const api = useCallback(
    async (path, options = {}) => {
      const res = await fetch(`${RELAY_URL}/api/admin/${path}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": adminKey,
          ...options.headers,
        },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      return data;
    },
    [adminKey]
  );

  // Load the sample of recent games
  useEffect(() => {
    if (!authed) return;
    api("blurb-lab/sample?count=20")
      .then((data) => {
        setMatches(data.matches || []);
        setDefaultPrompt(data.defaultPrompt || "");
        setPrompt((p) => p || data.defaultPrompt || "");
      })
      .catch((e) => setError(e.message));
  }, [authed, api]);

  const selectMatch = async (m) => {
    setSelected(m);
    setOutput(null);
    setHistory([]);
    setError(null);
    setFactSheet(null);
    setSheetLoading(true);
    try {
      const data = await api(`blurb-lab/fact-sheet/${m.id}`);
      setFactSheet(data.factSheet);
    } catch (e) {
      setError(e.message);
    } finally {
      setSheetLoading(false);
    }
  };

  const generate = async () => {
    if (!selected || generating) return;
    setGenerating(true);
    setError(null);
    try {
      const data = await api("blurb-lab/preview", {
        method: "POST",
        body: JSON.stringify({ matchId: selected.id, systemPrompt: prompt }),
      });
      if (output) setHistory((h) => [output, ...h].slice(0, 8));
      setOutput({ blurb: data.blurb, passed: data.passed });
    } catch (e) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  const keyRejected = !!error && /api key/i.test(error);

  if (!authed || keyRejected) {
    return (
      <KeyGate>
        {keyRejected ? (
          <ErrorText>The stored admin key was rejected by the relay — enter it again.</ErrorText>
        ) : (
          <div>Blurb Lab needs the relay admin key.</div>
        )}
        <input
          type="password"
          placeholder="Admin API key"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.target.value.trim()) {
              setError(null);
              setAdminKey(e.target.value.trim());
            }
          }}
        />
      </KeyGate>
    );
  }

  return (
    <Page>
      <Title>Blurb Lab</Title>
      <Subtitle>
        Pick a recent game, inspect the fact sheet the model sees, edit the prompt, and regenerate.
        Lab runs are never saved — production blurbs are unaffected.
      </Subtitle>
      {error && <ErrorText>{error}</ErrorText>}
      <Columns>
        <GameList>
          {matches.map((m) => (
            <GameRow key={m.id} $active={selected?.id === m.id} onClick={() => selectMatch(m)}>
              <GameMap src={getMapImageUrl(m.mapName)} alt="" onError={(e) => { e.target.style.display = "none"; }} />
              <GameInfo>
                <GameTitle>
                  {m.mapName} · {Math.round(m.durationInSeconds / 60)} min
                </GameTitle>
                <GamePlayers>{m.players?.join(" vs ")}</GamePlayers>
                {m.cachedBlurb && <GameBlurbHint>{m.cachedBlurb}</GameBlurbHint>}
              </GameInfo>
            </GameRow>
          ))}
          {matches.length === 0 && !error && <Subtitle>Loading recent games...</Subtitle>}
        </GameList>

        <div>
          <Section>
            <Label>System prompt</Label>
            <PromptArea value={prompt} onChange={(e) => setPrompt(e.target.value)} spellCheck={false} />
            <div style={{ marginTop: "var(--space-2)" }}>
              <GenerateButton onClick={generate} disabled={!selected || generating || sheetLoading}>
                {generating ? "Generating..." : selected ? "Generate blurb" : "Pick a game first"}
              </GenerateButton>
              <ResetButton onClick={() => setPrompt(defaultPrompt)}>reset to default</ResetButton>
            </div>
          </Section>

          {(output || history.length > 0) && (
            <Section>
              <Label>Output</Label>
              {output && (
                <Output $passed={output.passed}>
                  {output.passed ? "PASS — model found nothing notable" : output.blurb}
                </Output>
              )}
              {history.length > 0 && (
                <History>
                  {history.map((h, i) => (
                    <HistoryRow key={i}>{h.passed ? "PASS" : h.blurb}</HistoryRow>
                  ))}
                </History>
              )}
            </Section>
          )}

          {selected && (
            <Section>
              <Label>Fact sheet — {selected.mapName}</Label>
              {sheetLoading ? (
                <Subtitle>Building fact sheet (match detail + 8 player histories)...</Subtitle>
              ) : factSheet ? (
                <FactSheet>{factSheet}</FactSheet>
              ) : null}
            </Section>
          )}
        </div>
      </Columns>
    </Page>
  );
}
