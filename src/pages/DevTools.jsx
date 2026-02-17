import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useLocation } from "react-router-dom";
import useAdmin from "../lib/useAdmin";
import { searchLadder, getPlayerProfile } from "../lib/api";
import { raceMapping } from "../lib/constants";
import { CountryFlag } from "../components/ui";
import PeonLoader from "../components/PeonLoader";
import "../styles/pages/DevTools.css";

const RELAY_URL =
  import.meta.env.VITE_CHAT_RELAY_URL || "https://4v4gg-chat-relay.fly.dev";

const RACE_NAMES = { 0: "Random", 1: "Human", 2: "Orc", 4: "Night Elf", 8: "Undead" };

const STYLE_PRESETS = [
  {
    id: "wc3-classic",
    label: "WC3 Classic",
    style: "Warcraft III concept art by Samwise Didier, bold black outlines, chunky exaggerated proportions, vibrant saturated colors, thick visible brushstrokes, hand-painted game manual illustration, Blizzard 2002 fantasy art, rich golds and deep blues, stylized not photorealistic",
  },
  {
    id: "cel-shaded",
    label: "Cel-shaded",
    style: "digital painting in classic Warcraft III art style, cel-shaded with thick black ink outlines, flat color fills, exaggerated cartoon proportions, visible paint texture, matte colors, no photorealism, stylized 2D game illustration",
  },
  {
    id: "dark-fantasy",
    label: "Dark Fantasy",
    style: "dark fantasy illustration, dramatic chiaroscuro lighting, moody atmosphere, heavy shadows, desaturated palette with selective color accents, oil painting texture, gothic Warcraft style, ominous and cinematic",
  },
  {
    id: "comic",
    label: "Comic Book",
    style: "comic book cover art, bold ink outlines, halftone dots, dynamic action poses, dramatic perspective, bright primary colors, speech-bubble-ready composition, retro pulp fantasy style",
  },
];

// ─── Player Search ─────────────────────────────────────────────────────────────

function PlayerSearch({ selectedPlayers, onAdd, onRemove, profiles }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [localProfiles, setLocalProfiles] = useState({});
  const searchRef = useRef(null);

  const allProfiles = { ...localProfiles, ...profiles };

  useEffect(() => {
    if (!showSearch) return;
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearch(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showSearch]);

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      setShowSearch(false);
      return;
    }
    setIsSearching(true);
    const timer = setTimeout(async () => {
      const results = await searchLadder(searchQuery);
      const deduped = [];
      const seen = new Set();
      for (const r of (Array.isArray(results) ? results : [])) {
        const tag = r.playersInfo?.[0]?.battleTag || r.player?.playerIds?.[0]?.battleTag;
        if (!tag || seen.has(tag)) continue;
        seen.add(tag);
        deduped.push(r);
      }
      const sliced = deduped.slice(0, 8);
      setSearchResults(sliced);
      setShowSearch(true);
      setIsSearching(false);

      for (const r of sliced) {
        const tag = r.playersInfo?.[0]?.battleTag || r.player?.playerIds?.[0]?.battleTag;
        if (tag && !allProfiles[tag]) {
          getPlayerProfile(tag).then((p) => {
            setLocalProfiles((prev) => ({ ...prev, [tag]: p }));
          });
        }
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  function handleResultClick(tag, name, mmr, race) {
    onAdd({ tag, name, mmr, race });
    setSearchQuery("");
    setSearchResults([]);
    setShowSearch(false);
  }

  return (
    <div className="dt-player-search">
      <label className="dt-label">Cast</label>
      {selectedPlayers.length > 0 && (
        <div className="dt-player-cards">
          {selectedPlayers.map((p) => {
            const profile = allProfiles[p.tag];
            const avatarUrl = profile?.profilePicUrl;
            const country = profile?.country;
            return (
              <div key={p.tag} className="dt-player-card">
                <div className="dt-player-card-avatar">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="dt-player-card-img" />
                  ) : raceMapping[p.race] ? (
                    <img src={raceMapping[p.race]} alt="" className="dt-player-card-img dt-race-fallback" />
                  ) : (
                    <span className="dt-player-card-img dt-avatar-placeholder" />
                  )}
                </div>
                <div className="dt-player-card-info">
                  <span className="dt-player-card-name">
                    {p.name}
                    {country && (
                      <CountryFlag name={country.toLowerCase()} style={{ width: 14, height: 10, marginLeft: 6, verticalAlign: "middle" }} />
                    )}
                  </span>
                  <span className="dt-player-card-meta">
                    {RACE_NAMES[p.race] || ""}
                    {p.mmr ? ` · ${Math.round(p.mmr)} MMR` : ""}
                    {country ? ` · ${country}` : ""}
                  </span>
                  {p.archetype && (
                    <span className="dt-player-card-archetype">{p.archetype}</span>
                  )}
                </div>
                <button className="dt-player-card-remove" onClick={() => onRemove(p.tag)}>&times;</button>
              </div>
            );
          })}
        </div>
      )}
      <div className="navbar-search dt-navbar-search" ref={searchRef}>
        <input
          className="navbar-search-input"
          type="text"
          placeholder="Add player..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => searchResults.length > 0 && setShowSearch(true)}
        />
        {searchQuery && (
          <button className="navbar-search-clear" onClick={() => { setSearchQuery(""); setSearchResults([]); setShowSearch(false); }}>&times;</button>
        )}
        {showSearch && searchResults.length > 0 && (
          <div className="navbar-search-dropdown">
            {searchResults.map((p) => {
              const tag = p.playersInfo?.[0]?.battleTag || p.player?.playerIds?.[0]?.battleTag;
              const race = p.player?.race;
              const mmr = p.player?.mmr;
              const wins = p.player?.wins || 0;
              const losses = p.player?.losses || 0;
              const profile = allProfiles[tag];
              const avatarUrl = profile?.profilePicUrl;
              const country = profile?.country;
              const [name, hashNum] = (tag || "").split("#");
              const alreadyAdded = selectedPlayers.some((s) => s.tag === tag);
              return (
                <button
                  key={tag}
                  className="navbar-search-result"
                  style={alreadyAdded ? { opacity: 0.35, pointerEvents: "none" } : undefined}
                  onClick={() => handleResultClick(tag, name, mmr || 0, race)}
                >
                  <span className="navbar-search-avatar-wrap">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="" className="navbar-search-avatar" />
                    ) : raceMapping[race] ? (
                      <img src={raceMapping[race]} alt="" className="navbar-search-avatar race-fallback" />
                    ) : (
                      <span className="navbar-search-avatar placeholder" />
                    )}
                    {country && (
                      <span className="navbar-search-flag">
                        <CountryFlag name={country.toLowerCase()} style={{ width: 12, height: 9 }} />
                      </span>
                    )}
                  </span>
                  {raceMapping[race] && avatarUrl && (
                    <img src={raceMapping[race]} alt="" className="navbar-search-race" />
                  )}
                  <span className="navbar-search-info">
                    <span className="navbar-search-name-row">
                      <span className="navbar-search-name">{name}</span>
                      {hashNum && <span className="navbar-search-tag">#{hashNum}</span>}
                    </span>
                    <span className="navbar-search-meta">
                      <span className="navbar-search-w">{wins}W</span>
                      <span className="navbar-search-l">{losses}L</span>
                    </span>
                  </span>
                  <span className="navbar-search-mmr">{mmr != null ? `${Math.round(mmr)} MMR` : "—"}</span>
                </button>
              );
            })}
          </div>
        )}
        {isSearching && searchQuery.length >= 2 && !showSearch && (
          <div className="navbar-search-dropdown">
            <div className="navbar-search-loading">
              <PeonLoader size="sm" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Weekly Digest Search ────────────────────────────────────────────────────

function WeeklyDigestSearch({ weeklies, selectedWeek, onSelect, existingCovers }) {
  const [query, setQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef(null);

  const filteredWeeklies = query.length > 0
    ? weeklies.filter((w) =>
        w.week_start.includes(query) ||
        w.digest?.toLowerCase().includes(query.toLowerCase())
      )
    : weeklies.slice(0, 6);

  useEffect(() => {
    if (!showResults) return;
    function handleClick(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showResults]);

  function handleSelect(weekStart) {
    onSelect(weekStart);
    setQuery(weekStart);
    setShowResults(false);
  }

  useEffect(() => {
    if (selectedWeek) setQuery(selectedWeek);
  }, [selectedWeek]);

  return (
    <div className="dt-weekly-search" ref={searchRef}>
      <input
        className="dt-weekly-search-input"
        type="text"
        placeholder="Search by date or content..."
        value={query}
        onChange={(e) => { setQuery(e.target.value); setShowResults(true); }}
        onFocus={() => setShowResults(true)}
      />
      {query && (
        <button className="dt-weekly-search-clear" onClick={() => { setQuery(""); setShowResults(false); }}>×</button>
      )}
      {showResults && filteredWeeklies.length > 0 && (
        <div className="dt-weekly-search-dropdown">
          {filteredWeeklies.map((w) => (
            <button key={w.week_start} className="dt-weekly-search-result" onClick={() => handleSelect(w.week_start)}>
              <div className="dt-weekly-result-date">
                {w.week_start}
                {existingCovers[w.week_start] && <span className="dt-has-cover">has cover</span>}
              </div>
              <div className="dt-weekly-result-preview">{w.digest?.slice(0, 80)}...</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function DevTools() {
  const { adminKey } = useAdmin();
  const location = useLocation();
  const weekUrlParam = useMemo(() => new URLSearchParams(location.search).get("week"), [location.search]);
  const [weeklies, setWeeklies] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState("");
  const [loading, setLoading] = useState(true);
  const [showDigest, setShowDigest] = useState(false);
  const [playerProfiles, setPlayerProfiles] = useState({});
  const [existingCovers, setExistingCovers] = useState({});

  // Style
  const [stylePresetId, setStylePresetId] = useState("wc3-classic");
  const [styleText, setStyleText] = useState(STYLE_PRESETS[0].style);

  // Pipeline
  const [cards, setCards] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [genStep, setGenStep] = useState("");
  const [genError, setGenError] = useState(null);

  // Gallery
  const [savedGenerations, setSavedGenerations] = useState([]);

  // ─── Data loading ────────────────────────────────────────────────────────
  useEffect(() => {
    fetch(`${RELAY_URL}/api/admin/weekly-digests`)
      .then((r) => r.json())
      .then((data) => {
        setWeeklies(data || []);
        // Deep-link: if ?week= param present, select that week; otherwise default to first
        if (weekUrlParam && data?.some((w) => w.week_start === weekUrlParam)) {
          setSelectedWeek(weekUrlParam);
        } else if (data?.length > 0) {
          setSelectedWeek(data[0].week_start);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [weekUrlParam]);

  useEffect(() => {
    if (weeklies.length === 0) return;
    weeklies.forEach((w) => {
      const url = `${RELAY_URL}/api/admin/weekly-digest/${w.week_start}/cover.jpg`;
      const img = new Image();
      img.onload = () => setExistingCovers((prev) => ({ ...prev, [w.week_start]: url }));
      img.src = url;
    });
  }, [weeklies]);

  const selectedDigest = weeklies.find((w) => w.week_start === selectedWeek);

  const loadSavedGenerations = useCallback((weekStart) => {
    if (!weekStart || !adminKey) return;
    fetch(`${RELAY_URL}/api/admin/cover-generations/${weekStart}`, {
      headers: { "X-API-Key": adminKey },
    })
      .then((r) => r.json())
      .then((data) => setSavedGenerations(Array.isArray(data) ? data : []))
      .catch(() => setSavedGenerations([]));
  }, [adminKey]);

  useEffect(() => {
    if (selectedDigest) {
      setCards([]);
      setGenError(null);
      setShowDigest(false);
      loadSavedGenerations(selectedDigest.week_start);
    }
  }, [selectedDigest, loadSavedGenerations]);

  // ─── Player helpers ──────────────────────────────────────────────────────
  async function resolvePlayersFromLLM(playerInfos) {
    const found = [];
    for (const info of playerInfos) {
      const searchName = typeof info === "string" ? info : info.name;
      const archetype = typeof info === "string" ? null : info.archetype;
      const visual = typeof info === "string" ? null : info.visual;
      try {
        const results = await searchLadder(searchName);
        if (!Array.isArray(results) || results.length === 0) continue;
        const r = results[0];
        const tag = r.playersInfo?.[0]?.battleTag || r.player?.playerIds?.[0]?.battleTag;
        if (!tag) continue;
        found.push({ tag, name: tag.split("#")[0], mmr: r.player?.mmr || 0, race: r.player?.race, archetype, visual });
        getPlayerProfile(tag).then((p) => {
          setPlayerProfiles((prev) => ({ ...prev, [tag]: p }));
        });
      } catch { /* skip */ }
    }
    return found;
  }

  function buildPlayerContext(resolvedPlayers) {
    return resolvedPlayers.map((p) => {
      const profile = playerProfiles[p.tag];
      return {
        name: p.name,
        race: RACE_NAMES[p.race] || null,
        archetype: p.archetype || null,
        visual: p.visual || null,
        profilePicUrl: profile?.profilePicUrl || null,
        country: profile?.country || null,
        mmr: p.mmr || null,
      };
    });
  }

  // ─── Pipeline: Distill ───────────────────────────────────────────────────
  async function handleDistill() {
    if (!selectedWeek || !adminKey) return;
    setGenerating(true);
    setGenError(null);
    setCards([]);

    try {
      setGenStep("Extracting headlines...");
      const headlineRes = await fetch(
        `${RELAY_URL}/api/admin/weekly-digest/${selectedWeek}/headline`,
        { method: "POST", headers: { "X-API-Key": adminKey, "Content-Type": "application/json" }, body: JSON.stringify({}) }
      );
      const headlineData = await headlineRes.json();
      if (headlineData.error) throw new Error(headlineData.error);
      const opts = headlineData.headlines || [];
      if (opts.length === 0) throw new Error("No headlines generated");

      let newCards = opts.map((opt) => ({
        headline: opt.headline, score: opt.score, rawPlayers: opt.players || [],
        resolvedPlayers: [], prompt: null, imageUrl: null, status: "players", error: null,
      }));
      setCards([...newCards]);

      setGenStep("Resolving players...");
      const playerResults = await Promise.all(newCards.map((c) => resolvePlayersFromLLM(c.rawPlayers)));
      newCards = newCards.map((c, i) => ({ ...c, resolvedPlayers: playerResults[i], status: "prompt" }));
      setCards([...newCards]);

      setGenStep("Writing scene prompts...");
      const promptResults = await Promise.all(
        newCards.map((c) => {
          const playerContext = buildPlayerContext(c.resolvedPlayers);
          return fetch(
            `${RELAY_URL}/api/admin/weekly-digest/${selectedWeek}/prompt`,
            {
              method: "POST",
              headers: { "X-API-Key": adminKey, "Content-Type": "application/json" },
              body: JSON.stringify({ headline: c.headline, playerContext: playerContext.length > 0 ? playerContext : undefined }),
            }
          ).then((r) => r.json());
        })
      );
      newCards = newCards.map((c, i) => ({
        ...c,
        prompt: promptResults[i].prompt || null,
        status: promptResults[i].error ? "error" : "done",
        error: promptResults[i].error || null,
      }));
      setCards([...newCards]);
    } catch (err) {
      setGenError(err.message);
    }
    setGenerating(false);
    setGenStep("");
  }

  // ─── Image generation ────────────────────────────────────────────────────
  function buildFullPrompt(scene) {
    return styleText ? `${scene}, ${styleText}` : scene;
  }

  async function handleRenderImage(idx) {
    setCards((prev) => prev.map((c, i) => i === idx ? { ...c, status: "image", imageUrl: null, error: null } : c));
    try {
      const card = cards[idx];
      let scene = card.prompt;
      if (!scene) {
        const playerContext = buildPlayerContext(card.resolvedPlayers);
        const promptRes = await fetch(
          `${RELAY_URL}/api/admin/weekly-digest/${selectedWeek}/prompt`,
          { method: "POST", headers: { "X-API-Key": adminKey, "Content-Type": "application/json" }, body: JSON.stringify({ headline: card.headline, playerContext: playerContext.length > 0 ? playerContext : undefined }) }
        ).then((r) => r.json());
        if (promptRes.error) throw new Error(promptRes.error);
        scene = promptRes.prompt;
        setCards((prev) => prev.map((c, i) => i === idx ? { ...c, prompt: scene } : c));
      }
      const fullPrompt = buildFullPrompt(scene);
      const res = await fetch(`${RELAY_URL}/api/admin/generate-image`, {
        method: "POST",
        headers: { "X-API-Key": adminKey, "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: fullPrompt, weekStart: selectedWeek, headline: card.headline, scene, style: styleText }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setCards((prev) => prev.map((c, i) => i === idx ? { ...c, imageUrl: `${RELAY_URL}${data.imageUrl}`, status: "done" } : c));
      loadSavedGenerations(selectedWeek);
    } catch (err) {
      setCards((prev) => prev.map((c, i) => i === idx ? { ...c, error: err.message, status: "error" } : c));
    }
  }

  async function handleNewPromptAndImage(idx) {
    const card = cards[idx];
    setCards((prev) => prev.map((c, i) => i === idx ? { ...c, status: "prompt", prompt: null, imageUrl: null, error: null } : c));
    try {
      const playerContext = buildPlayerContext(card.resolvedPlayers);
      const promptRes = await fetch(
        `${RELAY_URL}/api/admin/weekly-digest/${selectedWeek}/prompt`,
        { method: "POST", headers: { "X-API-Key": adminKey, "Content-Type": "application/json" }, body: JSON.stringify({ headline: card.headline, playerContext: playerContext.length > 0 ? playerContext : undefined }) }
      ).then((r) => r.json());
      if (promptRes.error) throw new Error(promptRes.error);
      setCards((prev) => prev.map((c, i) => i === idx ? { ...c, prompt: promptRes.prompt, status: "image" } : c));
      const fullPrompt = buildFullPrompt(promptRes.prompt);
      const imgRes = await fetch(`${RELAY_URL}/api/admin/generate-image`, {
        method: "POST",
        headers: { "X-API-Key": adminKey, "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: fullPrompt, weekStart: selectedWeek, headline: card.headline, scene: promptRes.prompt, style: styleText }),
      }).then((r) => r.json());
      if (imgRes.error) throw new Error(imgRes.error);
      setCards((prev) => prev.map((c, i) => i === idx ? { ...c, imageUrl: `${RELAY_URL}${imgRes.imageUrl}`, status: "done" } : c));
      loadSavedGenerations(selectedWeek);
    } catch (err) {
      setCards((prev) => prev.map((c, i) => i === idx ? { ...c, error: err.message, status: "error" } : c));
    }
  }

  // ─── Gallery actions ─────────────────────────────────────────────────────
  async function handleDeleteGeneration(id) {
    try {
      await fetch(`${RELAY_URL}/api/admin/cover-generation/${id}`, { method: "DELETE", headers: { "X-API-Key": adminKey } });
      setSavedGenerations((prev) => prev.filter((g) => g.id !== id));
    } catch { /* ignore */ }
  }

  function updateCard(idx, patch) {
    setCards((prev) => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  }

  // ─── Render ──────────────────────────────────────────────────────────────
  if (loading) {
    return <div className="dt-page"><div className="dt-loading"><PeonLoader /></div></div>;
  }

  const topics = selectedDigest?.digest?.match(/^TOPICS:\s*(.+)/m)?.[1] || "";
  const hasCards = cards.length > 0;

  return (
    <div className="dt-page">
      {/* Hero */}
      <header className="dt-hero reveal" style={{ "--delay": "0.05s" }}>
        <span className="dt-eyebrow">Workshop</span>
        <h1 className="dt-title">Cover Art Pipeline</h1>
        <p className="dt-lead">
          Distill weekly digests into headlines, cast players as characters, and render cover art.
        </p>
      </header>

      {/* ── Section 1: Source ─────────────────────────────────────────────── */}
      <section className="dt-section reveal" style={{ "--delay": "0.10s" }}>
        <div className="dt-section-head">
          <div>
            <h2>Source</h2>
            <p>Select a weekly digest to distill.</p>
          </div>
          <div className="dt-section-meta">
            {selectedDigest && (
              <span className="dt-pill">{selectedDigest.week_start}</span>
            )}
          </div>
        </div>

        <WeeklyDigestSearch
          weeklies={weeklies}
          selectedWeek={selectedWeek}
          onSelect={setSelectedWeek}
          existingCovers={existingCovers}
        />

        {selectedDigest && (
          <div className="dt-digest-section">
            <button className="dt-digest-toggle" onClick={() => setShowDigest(!showDigest)}>
              <span className="dt-digest-toggle-arrow">{showDigest ? "▾" : "▸"}</span>
              <span className="dt-digest-toggle-label">
                {topics ? topics.slice(0, 100) : "View digest text"}
              </span>
            </button>
            {showDigest && (
              <pre className="dt-digest-preview">{selectedDigest.digest}</pre>
            )}
          </div>
        )}
      </section>

      {/* ── Section 2: Distill ────────────────────────────────────────────── */}
      <section className="dt-section reveal" style={{ "--delay": "0.15s" }}>
        <div className="dt-section-head">
          <div>
            <h2>Distill</h2>
            <p>Extract headlines, resolve players, and write scene descriptions from the digest.</p>
          </div>
          <button
            className="dt-btn dt-btn-gold"
            onClick={handleDistill}
            disabled={generating || !adminKey || !selectedWeek}
          >
            {generating ? genStep || "Distilling..." : hasCards ? "Re-distill" : "Distill"}
          </button>
        </div>
        {genError && <div className="dt-error">{genError}</div>}

        {hasCards && (
          <div className="dt-cards">
            {cards.map((card, idx) => (
              <div key={idx} className={`dt-card ${card.status === "done" && card.imageUrl ? "dt-card--rendered" : card.status === "done" ? "dt-card--ready" : ""}`}>
                {/* Header: score + headline */}
                <div className="dt-card-header">
                  <span className="dt-card-score">{card.score}</span>
                  <input
                    className="dt-card-headline"
                    type="text"
                    value={card.headline}
                    onChange={(e) => updateCard(idx, { headline: e.target.value })}
                  />
                </div>

                {/* Players */}
                <PlayerSearch
                  selectedPlayers={card.resolvedPlayers}
                  profiles={playerProfiles}
                  onAdd={(p) => {
                    updateCard(idx, { resolvedPlayers: [...card.resolvedPlayers, p] });
                    if (p.tag) getPlayerProfile(p.tag).then((prof) => setPlayerProfiles((prev) => ({ ...prev, [p.tag]: prof })));
                  }}
                  onRemove={(tag) => updateCard(idx, { resolvedPlayers: card.resolvedPlayers.filter((p) => p.tag !== tag) })}
                />

                {/* Scene prompt */}
                {card.prompt && (
                  <div className="dt-card-prompt">
                    <label className="dt-label">Scene</label>
                    <textarea
                      className="dt-card-prompt-input"
                      value={card.prompt}
                      onChange={(e) => updateCard(idx, { prompt: e.target.value })}
                      rows={3}
                    />
                  </div>
                )}

                {/* Image */}
                {card.imageUrl && (
                  <div className="dt-card-image">
                    <img src={card.imageUrl} alt="Generated cover" className="dt-cover-img" />
                  </div>
                )}

                {/* Loading */}
                {(card.status === "prompt" || card.status === "image" || card.status === "players") && (
                  <div className="dt-card-loading">
                    <PeonLoader size="sm" />
                    <span className="dt-card-loading-text">
                      {card.status === "players" && "Resolving players..."}
                      {card.status === "prompt" && "Writing scene prompt..."}
                      {card.status === "image" && "Rendering image..."}
                    </span>
                  </div>
                )}

                {card.error && <div className="dt-error">{card.error}</div>}

                {/* Actions */}
                {card.status === "done" && (
                  <div className="dt-card-actions">
                    {!card.imageUrl ? (
                      <button className="dt-btn dt-btn-sm dt-btn-gold" onClick={() => handleRenderImage(idx)}>
                        Render
                      </button>
                    ) : (
                      <>
                        <button className="dt-btn dt-btn-sm" onClick={() => handleRenderImage(idx)}>Re-render</button>
                        <button className="dt-btn dt-btn-sm" onClick={() => handleNewPromptAndImage(idx)}>New Scene + Render</button>
                      </>
                    )}
                  </div>
                )}
                {card.status === "error" && (
                  <div className="dt-card-actions">
                    <button className="dt-btn dt-btn-sm" onClick={() => handleNewPromptAndImage(idx)}>Retry</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {!adminKey && (
          <div className="dt-warning">Set your admin API key on the Admin page to use generation features.</div>
        )}
      </section>

      {/* ── Section 3: Style ──────────────────────────────────────────────── */}
      <section className="dt-section reveal" style={{ "--delay": "0.20s" }}>
        <div className="dt-section-head">
          <div>
            <h2>Style</h2>
            <p>Art direction applied when rendering images. Edit or pick a preset.</p>
          </div>
        </div>
        <div className="dt-style-presets">
          {STYLE_PRESETS.map((p) => (
            <button
              key={p.id}
              className={`dt-style-preset ${stylePresetId === p.id ? "dt-style-preset--active" : ""}`}
              onClick={() => { setStylePresetId(p.id); setStyleText(p.style); }}
            >
              {p.label}
            </button>
          ))}
        </div>
        <textarea
          className="dt-style-input"
          value={styleText}
          onChange={(e) => { setStyleText(e.target.value); setStylePresetId(""); }}
          rows={3}
        />
      </section>

      {/* ── Section 4: Gallery ────────────────────────────────────────────── */}
      {(savedGenerations.length > 0 || Object.keys(existingCovers).length > 0) && (
        <section className="dt-section reveal" style={{ "--delay": "0.25s" }}>
          <div className="dt-section-head">
            <div>
              <h2>Gallery</h2>
              <p>
                {savedGenerations.length > 0
                  ? `${savedGenerations.length} saved generation${savedGenerations.length !== 1 ? "s" : ""} for ${selectedWeek}.`
                  : "Published covers across all weeks."}
              </p>
            </div>
          </div>

          {savedGenerations.length > 0 && (
            <div className="dt-gallery-group">
              <label className="dt-label">This week</label>
              <div className="dt-gallery-grid">
                {savedGenerations.map((gen) => (
                  <div key={gen.id} className="dt-gallery-item">
                    <img
                      src={`${RELAY_URL}/api/admin/cover-generation/${gen.id}/image`}
                      alt={gen.headline || "Generated cover"}
                      className="dt-gallery-img"
                    />
                    <div className="dt-gallery-meta">
                      {gen.headline && <span className="dt-gallery-headline">{gen.headline}</span>}
                      <span className="dt-gallery-date">{new Date(gen.created_at + "Z").toLocaleString()}</span>
                    </div>
                    <div className="dt-gallery-actions">
                      <button className="dt-btn-xs" onClick={() => handleDeleteGeneration(gen.id)} title="Delete">&times;</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {Object.keys(existingCovers).length > 0 && (
            <div className="dt-gallery-group">
              <label className="dt-label">Published covers</label>
              <div className="dt-gallery-grid">
                {Object.entries(existingCovers).map(([week, url]) => (
                  <div key={week} className="dt-gallery-item">
                    <img src={url} alt={`Cover ${week}`} className="dt-gallery-img" />
                    <span className="dt-gallery-label">{week}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
