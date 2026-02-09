import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation, useHistory } from "react-router-dom";
import { GiCrossedSwords } from "react-icons/gi";
import { themeList } from "../lib/borderThemes";
import { useTheme } from "../lib/ThemeContext";
import { raceIcons, raceMapping } from "../lib/constants";
import { searchLadder, getPlayerProfile, getOngoingMatches, getFinishedMatches, getLadder, getSeasons } from "../lib/api";
import { CountryFlag } from "./ui";

const THEME_ICONS = {
  human: raceIcons.human,
  orc: raceIcons.orc,
  nightElf: raceIcons.elf,
  undead: raceIcons.undead,
};

const Navbar = () => {
  const location = useLocation();
  const history = useHistory();
  const { themeId, setThemeId } = useTheme();
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [profiles, setProfiles] = useState({});
  const searchRef = useRef(null);

  const isActive = (path) => {
    if (path === "/ongoing") {
      return location.pathname === "/" || location.pathname === "/ongoing";
    }
    return location.pathname.startsWith(path);
  };

  // Close picker on outside click
  useEffect(() => {
    if (!showPicker) return;
    const handler = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setShowPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showPicker]);

  // Close search on outside click
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

  // Debounced search
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      setShowSearch(false);
      return;
    }
    setIsSearching(true);
    const timer = setTimeout(async () => {
      const results = await searchLadder(searchQuery);
      // Deduplicate by battleTag — API can return multiple entries per player (different races/seasons).
      // Keep the entry with highest MMR for each player.
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

      // Fetch profiles for results (non-blocking)
      for (const r of sliced) {
        const tag = r.playersInfo?.[0]?.battleTag || r.player?.playerIds?.[0]?.battleTag;
        if (tag && !profiles[tag]) {
          getPlayerProfile(tag).then((p) => {
            setProfiles((prev) => ({ ...prev, [tag]: p }));
          });
        }
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleResultClick = (battleTag) => {
    history.push(`/player/${encodeURIComponent(battleTag)}`);
    setSearchQuery("");
    setSearchResults([]);
    setShowSearch(false);
  };

  // Prefetch API data on hover so pages load instantly
  const prefetch = {
    ongoing: () => getOngoingMatches(),
    finished: () => getFinishedMatches(),
    ladder: () => { getSeasons(); getLadder(0); },
  };

  const icon = THEME_ICONS[themeId];

  return (
    <nav className="navbar">
      <div className="navbar-content">
        <Link to="/" className="navbar-logo">
          4v4.GG
        </Link>
        <div className="navbar-links">
          <Link
            to="/ongoing"
            className={`navbar-link ${isActive("/ongoing") ? "active" : ""}`}
            onMouseEnter={prefetch.ongoing}
          >
            Live
          </Link>
          <Link
            to="/finished"
            className={`navbar-link ${isActive("/finished") ? "active" : ""}`}
            onMouseEnter={prefetch.finished}
          >
            Finished
          </Link>
          <Link
            to="/ladder"
            className={`navbar-link ${isActive("/ladder") ? "active" : ""}`}
            onMouseEnter={prefetch.ladder}
          >
            Ladder
          </Link>
          <Link
            to="/stats"
            className={`navbar-link ${isActive("/stats") ? "active" : ""}`}
          >
            Stats
          </Link>
          <Link
            to="/chat"
            className={`navbar-link ${isActive("/chat") ? "active" : ""}`}
          >
            Chat
          </Link>
          <Link
            to="/blog"
            className={`navbar-link ${isActive("/blog") ? "active" : ""}`}
          >
            Blog
          </Link>
          <div className="navbar-search" ref={searchRef}>
            <input
              className="navbar-search-input"
              type="text"
              placeholder="Search player..."
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
                  const profile = profiles[tag];
                  const avatarUrl = profile?.profilePicUrl;
                  const country = profile?.country;
                  const [name, hashNum] = (tag || "").split("#");
                  return (
                    <button
                      key={tag}
                      className="navbar-search-result"
                      onClick={() => handleResultClick(tag)}
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
                <div className="navbar-search-loading">Searching...</div>
              </div>
            )}
          </div>
          <div style={{ position: "relative" }} ref={pickerRef}>
            <button
              className="navbar-theme-btn"
              onClick={() => setShowPicker((v) => !v)}
              title="Change theme"
            >
              {icon
                ? <img src={icon} alt="" className="navbar-theme-icon" />
                : <GiCrossedSwords />
              }
            </button>
            {showPicker && (
              <div className="navbar-theme-dropdown">
                {themeList.map((t) => {
                  const tIcon = THEME_ICONS[t.id];
                  return (
                    <button
                      key={t.id}
                      className={`navbar-theme-option${t.id === themeId ? " active" : ""}`}
                      onClick={() => {
                        setThemeId(t.id);
                        setShowPicker(false);
                      }}
                    >
                      {tIcon
                        ? <img src={tIcon} alt="" className="navbar-theme-icon" />
                        : <GiCrossedSwords style={{ fontSize: 16, opacity: 0.7 }} />
                      }
                      <span className="navbar-theme-name">{t.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
