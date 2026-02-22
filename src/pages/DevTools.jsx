import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useLocation } from "react-router-dom";
import useAdmin from "../lib/useAdmin";
import { searchLadder, getPlayerProfile } from "../lib/api";
import { raceMapping } from "../lib/constants";
import { CountryFlag, PageHero } from "../components/ui";
import { PageLayout } from "../components/PageLayout";
import PeonLoader from "../components/PeonLoader";
import "../styles/pages/DevTools.css";

const RELAY_URL =
  import.meta.env.VITE_CHAT_RELAY_URL || "https://4v4gg-chat-relay.fly.dev";

const RACE_NAMES = { 0: "Random", 1: "Human", 2: "Orc", 4: "Night Elf", 8: "Undead" };

const STYLE_SUFFIX = "Warcraft III fantasy illustration, rich oil painting with visible brushstrokes, bold saturated colors, dramatic rim lighting, deep crimson and burnished gold palette, dark atmospheric background, ornate detailed armor and robes, painterly game concept art, epic and cinematic, wide cinematic composition";


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


  // Pipeline
  const [cards, setCards] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [genStep, setGenStep] = useState("");
  const [genError, setGenError] = useState(null);

  // Gallery
  const [savedGenerations, setSavedGenerations] = useState([]);
  const [publishedGenId, setPublishedGenId] = useState(null);

  // Upload
  const [uploading, setUploading] = useState(false);
  const uploadRef = useRef(null);

  // Modal
  const [selectedGenId, setSelectedGenId] = useState(null);

  // Scene suggestions
  const [sceneSuggestions, setSceneSuggestions] = useState(null); // { scenes, dailyCount, dateRange }
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestError, setSuggestError] = useState(null);

  // Freeform
  const [freeformPrompt, setFreeformPrompt] = useState("");
  const [freeformStatus, setFreeformStatus] = useState(null); // null | "rendering"
  const [freeformImageUrl, setFreeformImageUrl] = useState(null);
  const [freeformError, setFreeformError] = useState(null);

  // Tabs
  const [tab, setTab] = useState("prompt"); // "prompt" | "gallery"

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
    setCards([]);
    setGenError(null);
    setShowDigest(false);
    setSceneSuggestions(null);
    setSuggestError(null);
    setPublishedGenId(null);
    if (selectedWeek) {
      loadSavedGenerations(selectedWeek);
    }
  }, [selectedWeek, loadSavedGenerations]);

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
    return `${scene}, ${STYLE_SUFFIX}`;
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
        body: JSON.stringify({ prompt: fullPrompt, weekStart: selectedWeek, headline: card.headline, scene, style: STYLE_SUFFIX }),
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
        body: JSON.stringify({ prompt: fullPrompt, weekStart: selectedWeek, headline: card.headline, scene: promptRes.prompt, style: STYLE_SUFFIX }),
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
      if (selectedGenId === id) setSelectedGenId(null);
    } catch { /* ignore */ }
  }

  async function handleSetAsCover(genId) {
    if (!selectedWeek || !adminKey) return;
    try {
      const res = await fetch(`${RELAY_URL}/api/admin/weekly-digest/${selectedWeek}/cover-from-generation`, {
        method: "POST",
        headers: { "X-API-Key": adminKey, "Content-Type": "application/json" },
        body: JSON.stringify({ generationId: genId }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setPublishedGenId(genId);
      setExistingCovers((prev) => ({
        ...prev,
        [selectedWeek]: `${RELAY_URL}/api/admin/weekly-digest/${selectedWeek}/cover.jpg?t=${Date.now()}`,
      }));
    } catch { /* ignore */ }
  }

  async function handleUploadFile(file) {
    if (!file || !adminKey) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("image", file);
      if (selectedWeek) form.append("weekStart", selectedWeek);
      const res = await fetch(`${RELAY_URL}/api/admin/upload-image`, {
        method: "POST",
        headers: { "X-API-Key": adminKey },
        body: form,
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (selectedWeek) loadSavedGenerations(selectedWeek);
    } catch (err) {
      console.error("Upload failed:", err);
    }
    setUploading(false);
    if (uploadRef.current) uploadRef.current.value = "";
  }

  async function handleSuggestScenes(weekOverride) {
    const week = weekOverride || selectedWeek;
    if (!week || !adminKey) return;

    // Check cache first (4 hour TTL)
    const cacheKey = `inspire-scenes-${week}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const { data, timestamp } = JSON.parse(cached);
        const fourHours = 4 * 60 * 60 * 1000;
        if (Date.now() - timestamp < fourHours) {
          setSceneSuggestions(data);
          return;
        }
      } catch (e) {
        // Invalid cache, continue to fetch
        localStorage.removeItem(cacheKey);
      }
    }

    setSuggestLoading(true);
    setSuggestError(null);
    setSceneSuggestions(null);
    try {
      const res = await fetch(`${RELAY_URL}/api/admin/weekly-digest/${week}/suggest-scenes`, {
        method: "POST",
        headers: { "X-API-Key": adminKey, "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Cache the result
      localStorage.setItem(cacheKey, JSON.stringify({
        data,
        timestamp: Date.now()
      }));

      setSceneSuggestions(data);
    } catch (err) {
      setSuggestError(err.message);
    }
    setSuggestLoading(false);
  }

  async function handleFreeformRender() {
    if (!freeformPrompt.trim() || !adminKey) return;
    setFreeformStatus("rendering");
    setFreeformImageUrl(null);
    setFreeformError(null);
    try {
      const fullPrompt = `${freeformPrompt}, ${STYLE_SUFFIX}`;
      const res = await fetch(`${RELAY_URL}/api/admin/generate-image`, {
        method: "POST",
        headers: { "X-API-Key": adminKey, "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: fullPrompt, weekStart: selectedWeek || null, scene: freeformPrompt, style: STYLE_SUFFIX }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setFreeformImageUrl(`${RELAY_URL}${data.imageUrl}`);
      if (selectedWeek) loadSavedGenerations(selectedWeek);
    } catch (err) {
      setFreeformError(err.message);
    }
    setFreeformStatus(null);
  }

  // Modal navigation
  const selectedGeneration = selectedGenId ? savedGenerations.find((g) => g.id === selectedGenId) : null;
  const selectedGenIdx = selectedGenId ? savedGenerations.findIndex((g) => g.id === selectedGenId) : -1;

  useEffect(() => {
    if (selectedGenId === null) return;
    function handleKey(e) {
      if (e.key === "Escape") { setSelectedGenId(null); return; }
      if (e.key === "ArrowLeft" && selectedGenIdx > 0) {
        setSelectedGenId(savedGenerations[selectedGenIdx - 1].id);
      }
      if (e.key === "ArrowRight" && selectedGenIdx < savedGenerations.length - 1) {
        setSelectedGenId(savedGenerations[selectedGenIdx + 1].id);
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [selectedGenId, selectedGenIdx, savedGenerations]);

  function updateCard(idx, patch) {
    setCards((prev) => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  }

  // Current week's Monday (for "This week" shortcut) — must be before early return
  const currentMonday = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? 6 : day - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - diff);
    return monday.toISOString().split("T")[0];
  }, []);
  const isCurrentWeek = selectedWeek === currentMonday;

  // ─── Render ──────────────────────────────────────────────────────────────
  if (loading) {
    return <PageLayout maxWidth="1000px" bare overlay><div className="dt-loading"><PeonLoader /></div></PageLayout>;
  }

  const galleryCount = savedGenerations.length + Object.keys(existingCovers).length;

  return (
    <PageLayout maxWidth="1000px" bare overlay>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      {/* Header */}
      <PageHero
        eyebrow="Dev Tools"
        title="Cover Art"
        lead="Generate and manage weekly magazine cover illustrations from chat highlights."
        className="dt-hero reveal"
      >
        <div className="dt-tabs">
          <button className={`dt-tab ${tab === "prompt" ? "dt-tab--active" : ""}`} onClick={() => setTab("prompt")}>Prompt</button>
          <button className={`dt-tab ${tab === "gallery" ? "dt-tab--active" : ""}`} onClick={() => setTab("gallery")}>
            Gallery{galleryCount > 0 ? ` (${galleryCount})` : ""}
          </button>
        </div>
      </PageHero>

      {tab === "prompt" && (
        <>
          {/* Prompt area */}
          <div className="dt-prompt-zen reveal" style={{ "--delay": "0.10s" }}>
            <textarea
              className="dt-prompt-input"
              value={freeformPrompt}
              onChange={(e) => setFreeformPrompt(e.target.value)}
              placeholder="Describe a scene..."
              rows={6}
            />
            <div className="dt-prompt-bar">
              <button
                className="dt-btn dt-btn-gold"
                onClick={handleFreeformRender}
                disabled={freeformStatus === "rendering" || !freeformPrompt.trim() || !adminKey}
              >
                {freeformStatus === "rendering" ? "Rendering..." : "Render"}
              </button>
            </div>
          </div>

          {/* Suggestions */}
          <div className="dt-suggest-row reveal" style={{ "--delay": "0.15s" }}>
            <button
              className="dt-suggest-chip"
              onClick={() => { setSelectedWeek(currentMonday); handleSuggestScenes(currentMonday); }}
              disabled={suggestLoading}
            >
              Inspire from this week
            </button>
          </div>

          {suggestLoading && <PeonLoader size="sm" />}

          {sceneSuggestions?.scenes?.length > 0 && (
            <div className="dt-scenes reveal" style={{ "--delay": "0.12s" }}>
              {sceneSuggestions.scenes.map((s, i) => (
                <button key={i} className="dt-scene-card" onClick={() => setFreeformPrompt(s.scene)}>
                  <span className="dt-scene-title">{s.title}</span>
                  <span className="dt-scene-text">{s.scene}</span>
                </button>
              ))}
            </div>
          )}

          {/* Style footer */}
          <div className="dt-style-footer reveal" style={{ "--delay": "0.20s" }}>
            <span className="dt-style-footer-label">Style</span>
            <div className="dt-style-tags">
              {STYLE_SUFFIX.split(",").map((tag, i) => (
                <span key={i} className="dt-style-tag">{tag.trim()}</span>
              ))}
            </div>
          </div>

          {/* Result */}
          {freeformStatus === "rendering" && (
            <PeonLoader size="sm" />
          )}
          {(suggestError || freeformError) && <div className="dt-error">{suggestError || freeformError}</div>}
          {freeformImageUrl && (
            <div className="dt-result reveal" style={{ "--delay": "0.05s" }}>
              <img src={freeformImageUrl} alt="Rendered" className="dt-cover-img" />
            </div>
          )}
        </>
      )}

      {tab === "gallery" && (
        <div className="dt-gallery-tab reveal" style={{ "--delay": "0.10s" }}>
          <div className="dt-gallery-toolbar">
            <input
              ref={uploadRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => e.target.files?.[0] && handleUploadFile(e.target.files[0])}
            />
            <button
              className="dt-btn dt-btn-sm"
              onClick={() => uploadRef.current?.click()}
              disabled={uploading || !adminKey}
            >
              {uploading ? "Uploading..." : "Upload image"}
            </button>
          </div>
          {savedGenerations.length > 0 && (
            <div className="dt-gallery-group">
              <label className="dt-label">{selectedWeek || "Generations"}</label>
              <div className="dt-gallery-grid">
                {savedGenerations.map((gen) => (
                  <div
                    key={gen.id}
                    className={`dt-gallery-card ${publishedGenId === gen.id ? "dt-gallery-card--published" : ""}`}
                    onClick={() => setSelectedGenId(gen.id)}
                  >
                    <div className="dt-gallery-thumb">
                      <img
                        src={`${RELAY_URL}/api/admin/cover-generation/${gen.id}/image`}
                        alt={gen.headline || "Generated cover"}
                        loading="lazy"
                      />
                      {publishedGenId === gen.id && <span className="dt-published-badge">Published</span>}
                      <div className="dt-gallery-actions">
                        <button className="dt-btn-xs" onClick={(e) => { e.stopPropagation(); handleDeleteGeneration(gen.id); }} title="Delete">&times;</button>
                      </div>
                    </div>
                    <div className="dt-gallery-info">
                      {gen.headline && <h3 className="dt-gallery-title">{gen.headline}</h3>}
                      <span className="dt-gallery-date">{new Date(gen.created_at + "Z").toLocaleString()}</span>
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
                  <div key={week} className="dt-gallery-card">
                    <div className="dt-gallery-thumb">
                      <img src={url} alt={`Cover ${week}`} loading="lazy" />
                    </div>
                    <div className="dt-gallery-info">
                      <h3 className="dt-gallery-title">{week}</h3>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {galleryCount === 0 && (
            <p className="dt-gallery-empty">No images yet. Render something on the Prompt tab.</p>
          )}
        </div>
      )}

      {/* ── Modal ────────────────────────────────────────────────────────── */}
      {selectedGeneration && (
        <div className="dt-modal" onClick={() => setSelectedGenId(null)}>
          <div className="dt-modal-content" onClick={(e) => e.stopPropagation()}>
            <img
              src={`${RELAY_URL}/api/admin/cover-generation/${selectedGeneration.id}/image`}
              alt={selectedGeneration.headline || "Cover"}
              className="dt-modal-img"
            />
            <div className="dt-modal-meta">
              {selectedGeneration.headline && <h3 className="dt-modal-headline">{selectedGeneration.headline}</h3>}
              <span className="dt-modal-date">{new Date(selectedGeneration.created_at + "Z").toLocaleString()}</span>
              {selectedGeneration.scene && (
                <details className="dt-modal-details">
                  <summary>Scene prompt</summary>
                  <p>{selectedGeneration.scene}</p>
                </details>
              )}
              {selectedGeneration.style && (
                <details className="dt-modal-details">
                  <summary>Style</summary>
                  <p>{selectedGeneration.style}</p>
                </details>
              )}
            </div>
            <div className="dt-modal-actions">
              <button
                className={`dt-btn dt-btn-sm ${publishedGenId === selectedGeneration.id ? "dt-btn-published" : "dt-btn-gold"}`}
                onClick={() => handleSetAsCover(selectedGeneration.id)}
                disabled={publishedGenId === selectedGeneration.id}
              >
                {publishedGenId === selectedGeneration.id ? "Published to " + selectedWeek : "Publish as cover for " + selectedWeek}
              </button>
              <button className="dt-btn dt-btn-sm" onClick={() => { handleDeleteGeneration(selectedGeneration.id); }}>
                Delete
              </button>
            </div>
            {selectedGenIdx > 0 && (
              <button className="dt-modal-nav dt-modal-nav--prev" onClick={() => setSelectedGenId(savedGenerations[selectedGenIdx - 1].id)}>
                &#8249;
              </button>
            )}
            {selectedGenIdx < savedGenerations.length - 1 && (
              <button className="dt-modal-nav dt-modal-nav--next" onClick={() => setSelectedGenId(savedGenerations[selectedGenIdx + 1].id)}>
                &#8250;
              </button>
            )}
            <button className="dt-modal-close" onClick={() => setSelectedGenId(null)}>&times;</button>
          </div>
        </div>
      )}
      </div>
    </PageLayout>
  );
}
