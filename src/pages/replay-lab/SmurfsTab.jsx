import React, { useState, useEffect, useMemo, useRef, useLayoutEffect } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import PeonLoader from "../../components/PeonLoader";
import { CountryFlag } from "../../components/ui";
import { chartColors } from "../../lib/design-tokens";
import { raceIcons } from "../../lib/constants";
import useAdmin from "../../lib/useAdmin";
import usePlayerMeta from "../../lib/usePlayerMeta";
import { getPlayerStatsBatch } from "../../lib/api";
import { season as currentSeason } from "../../lib/params";
import { ActivityTimeline } from "./InvestigateTab";
import TransitionGlyph from "../../components/replay-lab/TransitionGlyph";
import { GroupRoster } from "../../components/replay-lab/PlaystyleReport";
import QuoteBlock from "../../components/chat/QuoteBlock";

const RELAY_URL =
  import.meta.env.VITE_CHAT_RELAY_URL || "https://4v4gg-chat-relay.fly.dev";

const RED = chartColors.red;
const GOLD = chartColors.gold;
const GREY = "var(--grey-light)";

// The relay's verdict for a pair: how far it stands out on playstyle, raised
// to "possible" by side evidence (a rare shared country or the closest lobby chat, never in the same
// ladder game). Pairs where both agree rank first.
function getVerdict(pair) {
  if (pair.verdict === "confident") return { label: "Likely same player", color: RED };
  if (pair.verdict === "possible") return { label: "Possible", color: GOLD };
  return { label: "Lookalike", color: GREY };
}

const pct = (share) => `${(share * 100).toFixed(share < 0.01 ? 1 : 0)}%`;

/** Why the relay flagged a pair, as short reasons. */
function getReasons(pair) {
  const reasons = [];
  if (pair.clickVerdict === "confident") reasons.push("Playstyle stands out more than 99% of best matches");
  else if (pair.clickVerdict === "possible") reasons.push("Playstyle stands out more than 95% of best matches");
  const ev = pair.evidence || {};
  if (ev.sameCountry && ev.country) {
    const share = ev.countryShare != null ? `, ${pct(ev.countryShare)} of players` : "";
    reasons.push(`Both ${ev.country}${share}${ev.supports ? "" : " (too common to count)"}`);
  }
  if (pair.chat?.supports) reasons.push("Closest lobby chat style");
  reasons.push("Never in the same ladder game");
  return reasons;
}

/** "AE 52/52" style connection summary for one account, or null. */
function connectionLabel(conn) {
  if (!conn) return null;
  const others = Object.entries(conn.countries || {})
    .filter(([c]) => c !== conn.country)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([c, n]) => `${c} ${n}`);
  const main = `${conn.country} ${Math.round(conn.share * conn.games)}/${conn.games}`;
  return others.length ? `${main} (${others.join(", ")})` : main;
}

const pairKey = (pair) => `${pair.tagA}|${pair.tagB}`;

const RACE_ICON = { Human: raceIcons.human, Orc: raceIcons.orc, "Night Elf": raceIcons.elf, Undead: raceIcons.undead, Random: raceIcons.random };

/**
 * MMR from the latest of the last three seasons for players with none this
 * season, so a collapsed row still shows how strong the account is. Waits for
 * this season's stats to land, then asks only for the players still missing,
 * one season at a time. -> Map(tag -> {mmr, season})
 */
export function usePastMmr(tags, stats) {
  const [past, setPast] = useState(() => new Map());
  const asked = useRef(new Set());
  const statsRef = useRef(stats);
  statsRef.current = stats;
  useEffect(() => {
    const timer = setTimeout(async () => {
      let missing = [...new Set(tags)].filter(t => !statsRef.current.has(t) && !asked.current.has(t));
      missing.forEach(t => asked.current.add(t));
      for (let s = currentSeason - 1; s >= currentSeason - 3 && missing.length; s--) {
        const found = await getPlayerStatsBatch(missing, s).catch(() => new Map());
        const hits = [...found].filter(([, v]) => v?.mmr != null);
        if (hits.length) {
          setPast(prev => {
            const next = new Map(prev);
            for (const [t, v] of hits) if (!next.has(t)) next.set(t, { mmr: v.mmr, season: s });
            return next;
          });
        }
        missing = missing.filter(t => !found.get(t)?.mmr);
      }
    }, 2500);
    return () => clearTimeout(timer);
  }, [tags]);
  return past;
}

/** One account in the collapsed row: avatar, name, country, MMR. MMR is this
 *  season's, else the latest of the last three seasons. */
function Account({ tag, race, conn, meta, activity, pastMmr }) {
  const profile = meta.avatars.get(tag);
  const stats = meta.stats.get(tag);
  const country = conn?.country || profile?.country;
  const past = pastMmr?.get(tag) || (activity?.mmr != null ? { mmr: activity.mmr, season: activity.season } : null);
  const mmr = stats?.mmr != null
    ? `${Math.round(stats.mmr)} MMR`
    : past ? `${Math.round(past.mmr)} MMR (S${past.season})` : "unranked recently";
  return (
    <AccountBox>
      <Avatar src={profile?.profilePicUrl || RACE_ICON[race] || raceIcons.random} alt="" />
      <div style={{ minWidth: 0 }}>
        <PlayerName as={Link} to={`/player/${encodeURIComponent(tag)}`} onClick={e => e.stopPropagation()}>
          {tag.split("#")[0]}
        </PlayerName>
        <AccountFacts>
          {country && <CountryFlag name={country.toLowerCase()} />}
          {RACE_ICON[race] && <img src={RACE_ICON[race]} alt={race} />}
          <span>{mmr}</span>
        </AccountFacts>
      </div>
    </AccountBox>
  );
}

/** Loads both accounts' fingerprints and season activity when a drawer opens.
 *  Cached per tag for the life of the page. */
const detailCache = new Map();
function useAccountDetail(tag, open) {
  const [detail, setDetail] = useState(() => detailCache.get(tag) || null);
  useEffect(() => {
    if (!open || !tag || detailCache.has(tag)) return;
    let cancelled = false;
    const enc = encodeURIComponent(tag);
    Promise.all([
      fetch(`${RELAY_URL}/api/fingerprints/profile/${enc}`).then(r => (r.ok ? r.json() : null)).catch(() => null),
      fetch(`${RELAY_URL}/api/fingerprints/activity/${enc}`).then(r => (r.ok ? r.json() : null)).catch(() => null),
    ]).then(([profile, activity]) => {
      const d = { profile, activity };
      detailCache.set(tag, d);
      if (!cancelled) setDetail(d);
    });
    return () => { cancelled = true; };
  }, [tag, open]);
  return detail;
}

/** How the two accounts' lobby chat matches: shared distinctive words, each
 *  quoted from both accounts, then a few recent lines from each. */
function ChatCompare({ pair, nameA, nameB }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    const qs = `a=${encodeURIComponent(pair.tagA)}&b=${encodeURIComponent(pair.tagB)}`;
    fetch(`${RELAY_URL}/api/fingerprints/chat-compare?${qs}`)
      .then(r => (r.ok ? r.json() : null)).then(setData).catch(() => setData({}));
  }, [pair.tagA, pair.tagB]);
  if (!data) return <DrawerNote>Loading lobby chat…</DrawerNote>;
  if (!data.shared) return null;
  // Each line quoted, with its stored English translation under it if any
  const cell = (lines) => (
    <div>
      {lines.map(line => (
        <React.Fragment key={line}>
          <QuoteBlock quotes={[line]} />
          {data.translations?.[line] && <Translation>{data.translations[line]}</Translation>}
        </React.Fragment>
      ))}
    </div>
  );
  return (
    <section>
      <SectionTitle>
        Lobby chat · {data.countA} vs {data.countB} messages
        {pair.chat?.supports && " · closest writer to each other"}
      </SectionTitle>
      <ChatTable>
        <span />
        <ChatHead>{nameA}</ChatHead>
        <ChatHead>{nameB}</ChatHead>
        {data.shared.map(s => (
          <React.Fragment key={s.term}>
            <div><TermChip>{s.term}</TermChip></div>
            {cell([s.exampleA])}
            {cell([s.exampleB])}
          </React.Fragment>
        ))}
        {data.shared.length === 0 && <DrawerNote style={{ gridColumn: "1 / -1" }}>No distinctive words in common.</DrawerNote>}
        <RecentLabel>Recent</RecentLabel>
        {cell(data.recentA)}
        {cell(data.recentB)}
      </ChatTable>
    </section>
  );
}

/** Did the two accounts ever play in the same 4v4 game? One person can't
 *  play both sides of one game, so a shared game points to two people. */
function SharedGames({ pair }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    const qs = `a=${encodeURIComponent(pair.tagA)}&b=${encodeURIComponent(pair.tagB)}`;
    fetch(`${RELAY_URL}/api/fingerprints/shared-games?${qs}`)
      .then(r => (r.ok ? r.json() : {})).then(setData).catch(() => setData({}));
  }, [pair.tagA, pair.tagB]);
  if (!data) return <DrawerNote>Checking for games they played together…</DrawerNote>;
  if (!data.games) return null;
  const n = data.games.length;
  if (n === 0) {
    return (
      <SharedLine>
        {data.seasonsChecked.length
          ? `Never in the same game${data.truncated ? " (history only partly checked)" : ""}.`
          : "Never played on the same day, so never in the same game."}
      </SharedLine>
    );
  }
  const teammates = data.games.filter(g => g.sameTeam).length;
  return (
    <SharedLine $warn>
      In the same game {n} time{n === 1 ? "" : "s"}: {teammates} as teammates, {n - teammates} against.
      {" "}Likely two people, unless one person plays both accounts at once.
      <SharedGameLinks>
        {data.games.slice(0, 6).map(g => (
          <Link key={g.matchId} to={`/match/${g.matchId}`}>
            {(g.endTime || "").slice(0, 10)} · {g.sameTeam ? "team" : "vs"}
          </Link>
        ))}
      </SharedGameLinks>
    </SharedLine>
  );
}

function PairDrawer({ pair, detailA, detailB }) {
  const nameA = pair.tagA.split("#")[0];
  const nameB = pair.tagB.split("#")[0];
  const loaded = detailA && detailB;
  const players = [
    { tag: pair.tagA, name: nameA, isQuery: true, seasonActivity: detailA?.activity?.seasonActivity || [] },
    { tag: pair.tagB, name: nameB, isQuery: false, seasonActivity: detailB?.activity?.seasonActivity || [] },
  ];
  return (
    <Drawer onClick={e => e.stopPropagation()}>
      <Reasons>{pair.notes || getReasons(pair).join(" · ")}</Reasons>
      <Connections>
        <span>Games</span>
        <span>{nameA} {pair.replaysA}</span>
        <span>{nameB} {pair.replaysB}</span>
      </Connections>
      {(pair.connectionA || pair.connectionB) && (
        <Connections>
          <span>Connected from, by game</span>
          <span>{nameA} {connectionLabel(pair.connectionA) || "no history"}</span>
          <span>{nameB} {connectionLabel(pair.connectionB) || "no history"}</span>
        </Connections>
      )}


      {!loaded ? (
        <DrawerNote>Loading fingerprints and season activity…</DrawerNote>
      ) : (
        <>
          {players.some(p => p.seasonActivity.length > 0)
            ? <ActivityTimeline players={players} matchProfiles={{}} />
            : <DrawerNote>No ladder activity found for either account.</DrawerNote>}
          <SharedGames pair={pair} />
          <Glyphs>
            {[[nameA, detailA.profile], [nameB, detailB.profile]].map(([name, profile]) => (
              <GlyphCell key={name}>
                {profile ? (
                  <>
                  <TransitionGlyph
                    transitionPairs={profile.transitionPairs || []}
                    groupUsage={profile.groupUsage || []}
                    groupCompositions={profile.groupCompositions || {}}
                    segments={profile.averaged?.segments || null}
                    playerName={name}
                    replayCount={profile.replayCount}
                    sampleCount={profile.sampleCount}
                  />
                  <GroupRoster groupUsage={profile.groupUsage || []} groupCompositions={profile.groupCompositions || {}} />
                  </>
                ) : <DrawerNote>No playstyle data for {name}.</DrawerNote>}
              </GlyphCell>
            ))}
          </Glyphs>
        </>
      )}
      {pair.chat?.indexed !== false && <ChatCompare pair={pair} nameA={nameA} nameB={nameB} />}
    </Drawer>
  );
}

/** One pair of accounts: a compact row that opens into the evidence drawer.
 *  Shared by the suspects list and the confirmed pairs (ValidationTab), which
 *  pass their own verdict, score text and footer and no label buttons. */
export function PairRow({ pair, index, open, onToggle, meta, pastMmr, isAdmin, onLabel, labelError, verdict: verdictIn, scoreText, footer }) {
  const verdict = verdictIn || getVerdict(pair);
  const detailA = useAccountDetail(pair.tagA, open);
  const detailB = useAccountDetail(pair.tagB, open);
  // Opening a row closes the one above it, which would pull this row up off
  // screen; bring it back to the top once the layout has settled.
  const cardRef = useRef(null);
  useLayoutEffect(() => {
    if (!open || !cardRef.current) return;
    const top = cardRef.current.getBoundingClientRect().top;
    if (top < 80 || top > window.innerHeight * 0.6) {
      cardRef.current.scrollIntoView({ block: "start" });
    }
  }, [open]);
  return (
    <PairCard $open={open} ref={cardRef}>
      <PairHead onClick={onToggle}>
        <PairRank $color={verdict.color}>{index + 1}</PairRank>
        <PairPlayers>
          <Account tag={pair.tagA} race={pair.raceA} conn={pair.connectionA} meta={meta} pastMmr={pastMmr} activity={detailA?.activity} />
          <Vs>vs</Vs>
          <Account tag={pair.tagB} race={pair.raceB} conn={pair.connectionB} meta={meta} pastMmr={pastMmr} activity={detailB?.activity} />
        </PairPlayers>
        <PairScore>
          <ScoreValue $color={verdict.color}>{scoreText ?? `${Math.round(pair.similarity * 100)}%`}</ScoreValue>
          <VerdictLabel $color={verdict.color}>{verdict.label}</VerdictLabel>
          {pair.chat?.indexed && (
            <ChatBadge title="Both accounts have enough lobby chat to compare">
              Chat{pair.chat.supports ? " · closest match" : ""}
            </ChatBadge>
          )}
        </PairScore>
        <Chevron $open={open}>▾</Chevron>
      </PairHead>
      {pair.label && !open && <LabelledTag $label={pair.label}>{{ same: "You said: same player", different: "You said: different", unsure: "You said: not sure" }[pair.label]}</LabelledTag>}
      {open && <PairDrawer pair={pair} detailA={detailA} detailB={detailB} />}
      {open && footer}
      {open && isAdmin && onLabel && (
        <LabelRow onClick={e => e.stopPropagation()}>
          <LabelPrompt>Your call</LabelPrompt>
          <LabelButton $active={pair.label === "same"} $color="var(--gold)" onClick={() => onLabel(pair, "same")}>
            Same player
          </LabelButton>
          <LabelButton $active={pair.label === "different"} $color="var(--grey-light)" onClick={() => onLabel(pair, "different")}>
            Different players
          </LabelButton>
          <LabelButton $active={pair.label === "unsure"} $color="var(--grey-mid)" onClick={() => onLabel(pair, "unsure")}
            title="Hide it from the queue without counting it either way">
            Not sure
          </LabelButton>
          {labelError?.key === pairKey(pair) && <LabelError>{labelError.text}</LabelError>}
        </LabelRow>
      )}
    </PairCard>
  );
}

export default function SmurfsTab() {
  const [suspects, setSuspects] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openKey, setOpenKey] = useState(null);
  const [showLabelled, setShowLabelled] = useState(false);
  const [shown, setShown] = useState(50);
  const { adminKey, isAdmin } = useAdmin();
  const [labelError, setLabelError] = useState(null);

  const relabel = (pair, label) => setSuspects(s => ({
    ...s,
    pairs: s.pairs.map(p => (pairKey(p) === pairKey(pair) ? { ...p, label } : p)),
  }));

  // Your verdict on a pair: test cases for the end-to-end eval. Clicking the
  // current label again clears it. The row updates at once and moves out of
  // the queue; a failed save puts it back and says why.
  async function setLabel(pair, label) {
    const prev = pair.label ?? null;
    const next = prev === label ? null : label;
    relabel(pair, next);
    setLabelError(null);
    if (next) setOpenKey(null);
    let failure = null;
    const res = await fetch(`${RELAY_URL}/api/fingerprints/pair-label`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": adminKey.trim() },
      body: JSON.stringify({ tagA: pair.tagA, tagB: pair.tagB, label: next }),
    }).catch(err => { failure = err; return null; });
    if (!res?.ok) {
      const text = res?.status === 401 ? "Admin key rejected"
        : res ? `Couldn't save (HTTP ${res.status})`
        : `Couldn't reach the relay (${failure?.message || "network error"}). An ad blocker can cause this.`;
      console.error("[pair-label]", res?.status, failure);
      relabel(pair, prev);
      setOpenKey(pairKey(pair));
      setLabelError({ key: pairKey(pair), text });
      return;
    }
    // The confirmed list above refetches so a "same" pair shows up there
    window.dispatchEvent(new Event("pair-labelled"));
  }

  const tags = useMemo(
    () => (suspects?.pairs || []).flatMap(p => [p.tagA, p.tagB]),
    [suspects?.pairs],
  );
  const meta = usePlayerMeta(tags);
  const pastMmr = usePastMmr(tags, meta.stats);

  useEffect(() => {
    fetch(`${RELAY_URL}/api/fingerprints/suspects?limit=200`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { setSuspects(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="page-loader" style={{ minHeight: "40vh" }}>
        <PeonLoader />
      </div>
    );
  }

  if (!suspects?.pairs?.length) {
    return <NoData>No suspect pairs found yet. More replays needed to build the similarity graph.</NoData>;
  }

  const queue = suspects.pairs.filter(p => !p.label);
  const labelled = suspects.pairs.filter(p => p.label);
  const row = (pair, i) => (
    <PairRow
      key={pairKey(pair)}
      pair={pair}
      index={i}
      open={openKey === pairKey(pair)}
      onToggle={() => setOpenKey(openKey === pairKey(pair) ? null : pairKey(pair))}
      meta={meta}
      pastMmr={pastMmr}
      isAdmin={isAdmin}
      onLabel={setLabel}
      labelError={labelError}
    />
  );

  return (
    <>
      <StatsRow>
        <StatChip>{queue.length} <span>to review</span></StatChip>
        {labelled.length > 0 && <StatChip>{labelled.length} <span>labelled</span></StatChip>}
        {suspects.totalPairs != null && (
          <StatChip>{suspects.totalPairs} <span>total pairs analyzed</span></StatChip>
        )}
        {suspects.playerCount != null && (
          <StatChip>{suspects.playerCount} <span>players indexed</span></StatChip>
        )}
      </StatsRow>

      <PairsList>
        {queue.length ? queue.slice(0, shown).map(row) : <NoData>Nothing left to review.</NoData>}
      </PairsList>
      {queue.length > shown && (
        <ShowLabelled onClick={() => setShown(n => n + 50)}>
          Load more ({queue.length - shown} weaker matches)
        </ShowLabelled>
      )}

      {labelled.length > 0 && (
        <>
          <ShowLabelled onClick={() => setShowLabelled(v => !v)}>
            {showLabelled ? "Hide" : "Show"} labelled ({labelled.length})
          </ShowLabelled>
          {showLabelled && <PairsList>{labelled.map(row)}</PairsList>}
        </>
      )}
    </>
  );
}

// ── Styled Components ──────────────────────────────────

const NoData = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--grey-light);
  text-align: center;
  padding: var(--space-8) var(--space-4);
  background: var(--surface-1);
  border: var(--border-thin) solid var(--grey-mid);
  border-radius: var(--radius-md);
`;

const ListTitle = styled.h2`
  font-family: var(--font-display);
  font-size: var(--text-lg);
  color: var(--gold);
  margin: 0 0 var(--space-4);
`;

const ShowLabelled = styled.button`
  margin: var(--space-6) 0 var(--space-3);
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  font: var(--text-xxs) var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--grey-light);
  &:hover { color: var(--gold); }
`;

const StatsRow = styled.div`
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
  margin-bottom: var(--space-6);
  padding-bottom: var(--space-4);
  border-bottom: var(--border-thin) solid rgba(255, 255, 255, 0.06);
`;

const StatChip = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--gold);
  background: var(--gold-tint);
  border: var(--border-thin) solid rgba(252, 219, 51, 0.25);
  border-radius: var(--radius-sm);
  padding: 6px 12px;
  font-weight: 600;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(252, 219, 51, 0.12);
    border-color: var(--gold);
  }

  span {
    color: var(--grey-light);
    font-weight: 400;
    margin-left: 4px;
  }
`;

const PairsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
`;

const PairCard = styled.div`
  display: flex;
  flex-direction: column;
  scroll-margin-top: 90px; /* clear the fixed navbar when scrolled into view */
  background: var(--theme-bg, var(--surface-1));
  backdrop-filter: var(--theme-blur, none);
  border: var(--theme-border, var(--border-thin) solid var(--grey-mid));
  border-image: var(--theme-border-image, none);
  border-radius: var(--radius-md);
  box-shadow: var(--theme-shadow, none);
  padding: var(--space-3) var(--space-4);
  transition: border-color 0.2s ease;
  ${p => p.$open && "border-color: var(--gold);"}

  &:hover { border-color: var(--gold); }
`;

const PairHead = styled.div`
  display: grid;
  grid-template-columns: 32px 1fr auto 20px;
  gap: var(--space-4);
  align-items: center;
  cursor: pointer;

  @media (max-width: 640px) {
    grid-template-columns: 1fr auto 20px;
    > :first-child { display: none; }
  }
`;

const Chevron = styled.span`
  color: var(--grey-light);
  font-size: var(--text-sm);
  transition: transform 0.2s ease;
  transform: rotate(${p => (p.$open ? "180deg" : "0deg")});
`;

const LabelledTag = styled.div`
  margin: var(--space-2) 0 0 calc(32px + var(--space-4));
  font: var(--text-xxxs) var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: ${p => (p.$label === "same" ? "var(--gold)" : "var(--grey-light)")};
`;

const Drawer = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  margin-top: var(--space-4);
  padding-top: var(--space-4);
  border-top: var(--border-thin) solid rgba(255, 255, 255, 0.08);
  cursor: default;
`;

const Glyphs = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);

  @media (max-width: 760px) { grid-template-columns: 1fr; }
`;

const GlyphCell = styled.div`
  min-width: 0;

  svg { width: 100%; height: auto; }
`;

const SectionTitle = styled.div`
  font: var(--text-xxs) var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--grey-light);
  margin-bottom: var(--space-3);
`;

// One row per shared word: the word, then each account's message using it
const ChatTable = styled.div`
  display: grid;
  grid-template-columns: 120px 1fr 1fr;
  gap: var(--space-3) var(--space-6);
  align-items: start;

  > * { min-width: 0; }

  @media (max-width: 640px) { grid-template-columns: 80px 1fr 1fr; gap: var(--space-2) var(--space-3); }
`;

const ChatHead = styled.div`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
  padding-bottom: var(--space-1);
  border-bottom: var(--border-thin) solid rgba(255, 255, 255, 0.08);
`;

const RecentLabel = styled.div`
  font: var(--text-xxs) var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--grey-light);
  padding-top: var(--space-1);
`;

const Translation = styled.div`
  margin: -2px 0 var(--space-2) var(--space-4);
  font: var(--text-xxs) var(--font-mono);
  color: var(--grey-light);
`;

const TermChip = styled.span`
  display: inline-block;
  max-width: 100%;
  overflow-wrap: anywhere;
  font: var(--text-xs) var(--font-mono);
  color: var(--gold);
  background: var(--gold-tint);
  border: var(--border-thin) solid rgba(252, 219, 51, 0.25);
  border-radius: var(--radius-sm);
  padding: 2px var(--space-2);
`;

const SharedLine = styled.div`
  font: var(--text-xs) var(--font-mono);
  color: ${p => (p.$warn ? "var(--amber)" : "var(--grey-light)")};
`;

const SharedGameLinks = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin-top: var(--space-2);
  a { color: var(--grey-light); font-size: var(--text-xxs); }
  a:hover { color: var(--gold); }
`;

const DrawerNote = styled.div`
  font: var(--text-xxs) var(--font-mono);
  color: var(--grey-light);
`;

const PairRank = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: ${p => p.$color || "var(--gold)"};
  background: rgba(255, 255, 255, 0.04);
  border: var(--border-thin) solid ${p => p.$color || "var(--gold)"}40;
  border-radius: var(--radius-full);
  font-weight: 600;
  transition: all 0.2s ease;
`;

const LabelRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3);
  margin-top: var(--space-3);
  padding-top: var(--space-3);
  border-top: var(--border-thin) solid rgba(255, 255, 255, 0.06);
`;

const LabelPrompt = styled.span`
  font: var(--text-xxs) var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--grey-light);
`;

const LabelButton = styled.button`
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  cursor: pointer;
  border: 2px solid ${p => p.$color};
  background: ${p => (p.$active ? p.$color : "transparent")};
  color: ${p => (p.$active ? "#000" : p.$color)};
  transition: background 0.15s ease, color 0.15s ease;

  &:hover { background: ${p => p.$color}; color: #000; }
`;

const LabelError = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--red);
`;

const AccountBox = styled.div`
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: var(--space-3);
`;

const Avatar = styled.img`
  width: 36px;
  height: 36px;
  border-radius: var(--radius-full);
  object-fit: cover;
  flex-shrink: 0;
  border: var(--border-thin) solid var(--grey-mid);
`;

const AccountFacts = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px var(--space-2);
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);

  img { width: 16px; height: 16px; }
`;

const Reasons = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
`;

const Connections = styled.div`
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2) var(--space-4);
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--white);

  > span:first-child {
    color: var(--grey-light);
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }
`;

const PairPlayers = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-4);
  min-width: 0;

  @media (max-width: 640px) {
    flex-direction: column;
    align-items: stretch;
    gap: var(--space-2);
  }
`;

const PlayerName = styled.span`
  font-family: var(--font-display);
  font-size: var(--text-base);
  color: var(--gold);
  display: block;
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-shadow: 0 1px 8px rgba(0, 0, 0, 0.6);

  &:hover { text-decoration: underline; }
`;

const Vs = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-mid);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  flex-shrink: 0;
  padding: 2px 6px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: var(--radius-sm);
`;

const PairScore = styled.div`
  text-align: center;
  flex-shrink: 0;
  min-width: 80px;
`;

const ScoreValue = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-lg);
  color: ${p => p.$color || "var(--white)"};
  font-weight: 700;
  margin-bottom: var(--space-1);
`;

const ChatBadge = styled.div`
  margin-top: var(--space-1);
  font: var(--text-xxxs) var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--cyan);
`;

const VerdictLabel = styled.div`
  display: inline-block;
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  color: ${p => p.$color || "var(--grey-light)"};
  background: rgba(255, 255, 255, 0.04);
  border: var(--border-thin) solid rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-sm);
  padding: 4px 8px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  text-align: center;
  min-width: 60px;
`;
