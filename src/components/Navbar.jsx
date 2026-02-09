import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation, useHistory } from "react-router-dom";
import { raceMapping } from "../lib/constants";
import { searchLadder, getPlayerProfile, getOngoingMatches, getFinishedMatches, getLadder, getSeasons } from "../lib/api";
import { CountryFlag } from "./ui";

const Navbar = () => {
  const location = useLocation();
  const history = useHistory();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [profiles, setProfiles] = useState({});
  const searchRef = useRef(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileRef = useRef(null);

  const isActive = (path) => {
    if (path === "/live") {
      return location.pathname === "/live" || location.pathname === "/ongoing";
    }
    return location.pathname.startsWith(path);
  };

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

  // Close mobile menu on outside click
  useEffect(() => {
    if (!mobileOpen) return;
    const handler = (e) => {
      if (mobileRef.current && !mobileRef.current.contains(e.target)) {
        setMobileOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [mobileOpen]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

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

  const prefetch = {
    ongoing: () => getOngoingMatches(),
    finished: () => getFinishedMatches(),
    ladder: () => { getSeasons(); getLadder(0); },
  };

  const navLinks = [
    { to: "/news", label: "News" },
    { to: "/live", label: "Live", prefetch: prefetch.ongoing },
    { to: "/finished", label: "Finished", prefetch: prefetch.finished },
    { to: "/ladder", label: "Ladder", prefetch: prefetch.ladder },
    { to: "/stats", label: "Stats" },
    { to: "/chat", label: "Chat" },
    { to: "/blog", label: "Blog" },
    { to: "/themes", label: "Themes" },
  ];

  return (
    <nav className="navbar" ref={mobileRef}>
      <div className="navbar-content">
        <Link to="/" className="navbar-logo">
          4v4.GG
        </Link>
        <div className="navbar-links">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`navbar-link ${isActive(link.to) ? "active" : ""}`}
              onMouseEnter={link.prefetch}
            >
              {link.label}
            </Link>
          ))}
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
        </div>
        <div className="navbar-right">
          <button
            className="navbar-hamburger"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            <span className={`hamburger-bar ${mobileOpen ? "open" : ""}`} />
            <span className={`hamburger-bar ${mobileOpen ? "open" : ""}`} />
            <span className={`hamburger-bar ${mobileOpen ? "open" : ""}`} />
          </button>
        </div>
      </div>
      {mobileOpen && (
        <div className="navbar-mobile-menu">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`navbar-mobile-link ${isActive(link.to) ? "active" : ""}`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
