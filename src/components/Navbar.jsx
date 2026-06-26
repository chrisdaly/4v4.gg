import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation, useHistory } from "react-router-dom";
import { raceMapping } from "../lib/constants";
import { searchLadderWithFallback, getPlayerProfile, getOngoingMatches, getFinishedMatches, getLadder, getSeasons } from "../lib/api";
import { CountryFlag, Input } from "./ui";
import PeonLoader from "./PeonLoader";
import useAdmin from "../lib/useAdmin";

const Navbar = () => {
  const location = useLocation();
  const history = useHistory();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [profiles, setProfiles] = useState({});
  const profilesRef = useRef(profiles);
  const searchRef = useRef(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileRef = useRef(null);
  const { adminKey, adminViewActive, toggleAdminView, isKeyValid } = useAdmin();

  const isActive = (path, matchPaths) => {
    if (matchPaths) {
      return matchPaths.some((p) => location.pathname.startsWith(p));
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

  useEffect(() => {
    profilesRef.current = profiles;
  }, [profiles]);

  // Debounced search
  useEffect(() => {
    if (searchQuery.length < 3) {
      setSearchResults([]);
      setShowSearch(false);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const results = await searchLadderWithFallback(searchQuery);
        if (cancelled) return;
        const deduped = [];
        const seen = new Set();
        for (const r of (Array.isArray(results) ? results : [])) {
          const tag = r.playersInfo?.[0]?.battleTag || r.player?.playerIds?.[0]?.battleTag;
          if (!tag || seen.has(tag)) continue;
          seen.add(tag);
          deduped.push(r);
        }
        deduped.sort((a, b) => ((b.player?.wins || 0) + (b.player?.losses || 0)) - ((a.player?.wins || 0) + (a.player?.losses || 0)));
        const sliced = deduped.slice(0, 8);
        setSearchResults(sliced);
        setShowSearch(true);

        for (const r of sliced) {
          const tag = r.playersInfo?.[0]?.battleTag || r.player?.playerIds?.[0]?.battleTag;
          if (tag && !profilesRef.current[tag]) {
            getPlayerProfile(tag).then((p) => {
              if (!cancelled) setProfiles((prev) => (prev[tag] ? prev : { ...prev, [tag]: p }));
            });
          }
        }
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  const handleResultClick = (battleTag) => {
    history.push(`/player/${encodeURIComponent(battleTag)}`);
    setSearchQuery("");
    setSearchResults([]);
    setShowSearch(false);
  };

  const [showMore, setShowMore] = useState(false);
  const moreRef = useRef(null);

  // Close More dropdown on outside click
  useEffect(() => {
    if (!showMore) return;
    const handler = (e) => {
      if (moreRef.current && !moreRef.current.contains(e.target)) {
        setShowMore(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMore]);

  // Close More dropdown on route change
  useEffect(() => {
    setShowMore(false);
  }, [location.pathname]);

  const prefetch = {
    ongoing: () => getOngoingMatches(),
    finished: () => getFinishedMatches(),
    ladder: () => { getSeasons(); getLadder(0); },
  };

  const primaryLinks = [
    { to: "/live", label: "Games", prefetch: prefetch.ongoing, matchPaths: ["/live", "/ongoing", "/finished"] },
    { to: "/ladder", label: "Ladder", prefetch: prefetch.ladder },
    { to: "/news", label: "News" },
    { to: "/chat", label: "Chat" },
  ];

  const moreLinks = [
    { to: "/upload", label: "Upload" },
    { to: "/search", label: "Search" },
    { to: "/stats", label: "Stats" },
    { to: "/lab", label: "Lab" },
    { to: "/observatory", label: "Observatory" },
    { to: "/clips", label: "Clips" },
    { to: "/blog", label: "Blog" },
    { to: "/overlay", label: "Overlay" },
    { to: "/themes", label: "Themes" },
  ];

  const isMoreActive = moreLinks.some((link) => isActive(link.to));

  return (
    <nav className="navbar" ref={mobileRef}>
      <div className="navbar-content">
        <Link to="/" className="navbar-logo">
          4v4.GG
        </Link>
        <div className="navbar-links">
          {primaryLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`navbar-link ${isActive(link.to, link.matchPaths) ? "active" : ""}`}
              onMouseEnter={link.prefetch}
            >
              {link.label}
            </Link>
          ))}
          <div className="navbar-more" ref={moreRef}>
            <button
              className={`navbar-more-btn ${isMoreActive ? "active" : ""}`}
              onClick={() => setShowMore((v) => !v)}
            >
              More <span className={`navbar-more-chevron ${showMore ? "open" : ""}`}>&#9662;</span>
            </button>
            {showMore && (
              <div className="navbar-more-dropdown">
                {moreLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`navbar-more-link ${isActive(link.to) ? "active" : ""}`}
                    onClick={() => setShowMore(false)}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="navbar-right">
          <div className="navbar-search" ref={searchRef}>
            <div className="navbar-search-input-wrap">
              <svg className="navbar-search-icon" width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.5"/>
                <line x1="8.7" y1="8.7" x2="13" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <Input
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
            </div>
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
                <div className="navbar-search-loading">
                  <PeonLoader size="sm" />
                </div>
              </div>
            )}
          </div>
          {adminKey && (
            <button
              className={`navbar-admin-toggle ${adminViewActive ? "active" : ""}`}
              onClick={toggleAdminView}
              title={adminViewActive ? "Admin view on — click to disable" : "Admin view off — click to enable"}
            >
              <span
                className="admin-key-dot"
                data-status={isKeyValid === true ? "valid" : isKeyValid === false ? "invalid" : "unknown"}
              />
            </button>
          )}
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
          {[...primaryLinks, ...moreLinks].map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`navbar-mobile-link ${isActive(link.to, link.matchPaths) ? "active" : ""}`}
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          {adminKey && (
            <button
              className={`navbar-mobile-link navbar-admin-toggle-mobile ${adminViewActive ? "active" : ""}`}
              onClick={toggleAdminView}
            >
              <span
                className="admin-key-dot"
                data-status={isKeyValid === true ? "valid" : isKeyValid === false ? "invalid" : "unknown"}
              />
              {adminViewActive ? "Admin On" : "Admin Off"}
            </button>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
