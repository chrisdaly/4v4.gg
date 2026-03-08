import React, { useState, useEffect, useRef } from "react";
import styled from "styled-components";
import MatchOverlay from "../../components/MatchOverlay";
import GameCard from "../../components/game/GameCard";
import PeonLoader from "../../components/PeonLoader";
import { getPlayerProfile } from "../../lib/api";
import { fetchPlayerSessionData } from "../../lib/utils";
import { gateway, initSeason } from "../../lib/params";

/**
 * Overlay Index - Instructions and preview for stream overlays
 * URL: /overlay
 */

// Styled components using design system
const Page = styled.div`
  background: #0a0a0a;
  min-height: 100vh;
  padding: var(--space-8);
  color: var(--white);
`;

const Title = styled.h1`
  font-family: var(--font-display);
  font-size: var(--text-xl);
  color: var(--gold);
  margin-bottom: var(--space-1);
`;

const Subtitle = styled.p`
  color: var(--grey-light);
  font-size: var(--text-sm);
  margin-bottom: var(--space-6);
`;

const Section = styled.section`
  margin-bottom: var(--space-8);
`;

const SectionTitle = styled.h2`
  font-family: var(--font-display);
  font-size: var(--text-lg);
  color: var(--gold);
  margin-bottom: var(--space-4);
`;

const SettingsPanel = styled.div`
  padding: var(--space-4);
  background: var(--grey-dark);
  border-radius: var(--radius-md);
  max-width: 500px;
  margin-bottom: var(--space-6);
`;

const Label = styled.label`
  display: block;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--grey-light);
  margin-bottom: var(--space-1);
`;

const Select = styled.select`
  width: 100%;
  padding: var(--space-2);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  background: #0a0a0a;
  border: 1px solid var(--grey-mid);
  border-radius: var(--radius-md);
  color: var(--white);
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: var(--gold);
  }
`;

const Card = styled.div`
  background: var(--grey-dark);
  border-radius: var(--radius-md);
  padding: var(--space-6);
  max-width: 500px;
  margin-bottom: var(--space-6);
`;

const CardTitle = styled.h3`
  font-family: var(--font-display);
  font-size: var(--text-lg);
  color: var(--gold);
  margin-bottom: var(--space-4);
`;

const CardDescription = styled.p`
  color: var(--grey-light);
  font-size: var(--text-sm);
  margin-bottom: var(--space-4);
  line-height: 1.5;
`;

const FieldLabel = styled.label`
  display: block;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--grey-mid);
  margin-bottom: var(--space-1);
`;

const CodeBlock = styled.code`
  display: block;
  padding: var(--space-2);
  background: #0a0a0a;
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  word-break: break-all;
`;

const UrlCode = styled(CodeBlock)`
  color: var(--green);
  padding: var(--space-2) var(--space-2);
`;

const DimCode = styled(CodeBlock)`
  color: var(--grey-light);
`;

const DimensionGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
`;

const MockScreen = styled.div`
  position: relative;
  width: 100%;
  max-width: 1280px;
  aspect-ratio: 16/9;
  background: url('/scenes/1v1.png') center/cover no-repeat, #000;
  border-radius: var(--radius-md);
  overflow: hidden;

  &:fullscreen {
    max-width: none;
    border-radius: 0;
    width: 100vw;
    height: 100vh;
  }
`;

const TipBox = styled.div`
  margin-top: var(--space-4);
  padding: var(--space-4);
  background: var(--gold-tint);
  border: 1px solid rgba(252, 219, 51, 0.3);
  border-radius: var(--radius-md);

  strong {
    color: var(--gold);
  }

  span {
    color: var(--grey-light);
  }
`;

const StepNumber = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: var(--gold);
  color: #000;
  font-family: var(--font-display);
  font-size: var(--text-base);
  font-weight: bold;
  border-radius: var(--radius-full);
  margin-right: var(--space-3);
  flex-shrink: 0;
`;

const StepHeader = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: var(--space-4);
`;

const FullscreenButton = styled.button`
  position: absolute;
  bottom: 12px;
  right: 12px;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.7);
  border: 1px solid var(--grey-mid);
  border-radius: var(--radius-md);
  color: var(--grey-light);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  cursor: pointer;
  z-index: 50;
  transition: all var(--transition);

  &:hover {
    background: rgba(0, 0, 0, 0.9);
    border-color: var(--gold);
    color: var(--gold);
  }
`;

const ResetButton = styled.button`
  padding: var(--space-1) var(--space-2);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  background: transparent;
  border: 1px solid var(--grey-mid);
  border-radius: var(--radius-md);
  color: var(--grey-mid);
  cursor: pointer;
  transition: all var(--transition);

  &:hover {
    border-color: var(--red);
    color: var(--red);
  }
`;

const GuideSteps = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  max-width: 700px;
`;

const GuideStep = styled.div`
  display: flex;
  gap: var(--space-4);
`;

const GuideStepNumber = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: var(--grey-dark);
  border: 1px solid var(--grey-mid);
  color: var(--gold);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: bold;
  border-radius: var(--radius-full);
  flex-shrink: 0;
`;

const GuideStepContent = styled.div`
  flex: 1;
`;

const GuideStepTitle = styled.div`
  font-family: var(--font-display);
  font-size: var(--text-base);
  color: var(--white);
  margin-bottom: var(--space-1);
`;

const GuideStepText = styled.p`
  color: var(--grey-light);
  font-size: var(--text-sm);
  line-height: 1.5;
  margin: 0 0 var(--space-2) 0;

  strong {
    color: var(--white);
  }

  code {
    background: var(--grey-dark);
    padding: 1px 6px;
    border-radius: var(--radius-sm);
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--green);
  }
`;

const CssBlock = styled.div`
  padding: var(--space-2) var(--space-3);
  background: var(--grey-dark);
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--green);
  margin-bottom: var(--space-2);
  display: inline-block;
`;

const TipGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-4);
  max-width: 800px;

  @media (max-width: 700px) {
    grid-template-columns: 1fr;
  }
`;

const TipCard = styled.div`
  padding: var(--space-4);
  background: var(--grey-dark);
  border-radius: var(--radius-md);
`;

const TipCardTitle = styled.div`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
  margin-bottom: var(--space-2);
`;

const TipCardText = styled.p`
  color: var(--grey-light);
  font-size: var(--text-xs);
  line-height: 1.5;
  margin: 0;

  code {
    background: #0a0a0a;
    padding: 1px 5px;
    border-radius: var(--radius-sm);
    font-family: var(--font-mono);
    color: var(--green);
  }
`;

const STORAGE_KEY = "overlay_recent_tags";
const POSITIONS_KEY = "overlay_positions";
const SETTINGS_KEY = "overlay_settings";
const MAX_RECENT = 5;

const DEFAULT_POSITIONS = {
  match: { top: 4, left: 50, scale: 1 },
};

const OverlayIndex = () => {
  const [battleTag, setBattleTag] = useState(() => {
    try {
      const recent = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return recent[0] || "";
    } catch { return ""; }
  });
  const [recentTags, setRecentTags] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch { return []; }
  });
  const [matchStyle, setMatchStyle] = useState(() => {
    try {
      const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
      return settings.matchStyle || "default";
    } catch { return "default"; }
  });
  const [layout, setLayout] = useState(() => {
    try {
      const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
      return settings.layout || "horizontal";
    } catch { return "horizontal"; }
  });
  const [saved, setSaved] = useState(false);

  // Overlay positions (percentages from edges) and scale - load from localStorage
  const [overlayPositions, setOverlayPositions] = useState(() => {
    try {
      const saved = localStorage.getItem(POSITIONS_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_POSITIONS;
    } catch { return DEFAULT_POSITIONS; }
  });
  const [dragging, setDragging] = useState(null);
  const [resizing, setResizing] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const resizeStart = useRef({ scale: 1, x: 0, y: 0 });
  const mockScreenRef = useRef(null);

  // Search state
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchTimeout = useRef(null);
  const inputRef = useRef(null);

  // Search W3Champions API
  const searchPlayers = async (query) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://website-backend.w3champions.com/api/players/global-search?search=${encodeURIComponent(query)}&pageSize=10`
      );
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data || []);
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced search on input change
  const handleInputChange = (value) => {
    setBattleTag(value);
    setShowDropdown(true);

    // Clear previous timeout
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    // Debounce search by 300ms
    searchTimeout.current = setTimeout(() => {
      searchPlayers(value);
    }, 300);
  };

  // Select a player from search results
  const selectPlayer = (tag) => {
    setBattleTag(tag);
    saveTag(tag);
    setShowDropdown(false);
    setSearchResults([]);
    fetchPlayerPreview(tag);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (inputRef.current && !inputRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Save tag to recent list
  const saveTag = (tag) => {
    if (!tag || !tag.includes("#")) return;
    const updated = [tag, ...recentTags.filter(t => t !== tag)].slice(0, MAX_RECENT);
    setRecentTags(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      saveTag(battleTag);
      setShowDropdown(false);
      e.target.blur();
      fetchPlayerPreview(battleTag);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  // Drag handlers for overlay positioning
  const handleDragStart = (overlayId, e) => {
    e.preventDefault();
    if (!mockScreenRef.current) return;

    const rect = mockScreenRef.current.getBoundingClientRect();
    const startX = ((e.clientX - rect.left) / rect.width) * 100;
    const startY = ((e.clientY - rect.top) / rect.height) * 100;

    // Calculate offset from current position
    const pos = overlayPositions[overlayId];
    dragOffset.current = { x: startX - pos.left, y: startY - pos.top };

    setDragging(overlayId);
  };

  const handleDragMove = (e) => {
    if (!dragging || !mockScreenRef.current) return;

    const rect = mockScreenRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setOverlayPositions(prev => ({
      ...prev,
      [dragging]: {
        ...prev[dragging],
        top: Math.max(0, Math.min(y - dragOffset.current.y, 95)),
        left: Math.max(0, Math.min(x - dragOffset.current.x, 100))
      }
    }));
  };

  const handleDragEnd = () => {
    setDragging(null);
    setResizing(null);
  };

  // Resize handlers
  const handleResizeStart = (overlayId, e) => {
    e.preventDefault();
    e.stopPropagation();
    resizeStart.current = {
      scale: overlayPositions[overlayId].scale,
      x: e.clientX,
      y: e.clientY
    };
    setResizing(overlayId);
  };

  const handleResizeMove = (e) => {
    if (!resizing) return;

    // Calculate distance moved from start point
    const dx = e.clientX - resizeStart.current.x;
    const dy = e.clientY - resizeStart.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const direction = (dx + dy) > 0 ? 1 : -1;

    const newScale = resizeStart.current.scale + (direction * distance * 0.005);

    setOverlayPositions(prev => ({
      ...prev,
      [resizing]: {
        ...prev[resizing],
        scale: Math.max(0.4, Math.min(newScale, 2))
      }
    }));
  };

  // Add/remove mouse listeners when dragging or resizing
  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      return () => {
        window.removeEventListener('mousemove', handleDragMove);
        window.removeEventListener('mouseup', handleDragEnd);
      };
    }
    if (resizing) {
      window.addEventListener('mousemove', handleResizeMove);
      window.addEventListener('mouseup', handleDragEnd);
      return () => {
        window.removeEventListener('mousemove', handleResizeMove);
        window.removeEventListener('mouseup', handleDragEnd);
      };
    }
  }, [dragging, resizing]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!mockScreenRef.current) return;

    if (!document.fullscreenElement) {
      mockScreenRef.current.requestFullscreen().catch(err => {
        console.error('Fullscreen error:', err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Save positions to localStorage when they change
  useEffect(() => {
    localStorage.setItem(POSITIONS_KEY, JSON.stringify(overlayPositions));
  }, [overlayPositions]);

  // Save settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ matchStyle, layout }));
  }, [matchStyle, layout]);

  // Reset positions to default
  const resetPositions = () => {
    setOverlayPositions(DEFAULT_POSITIONS);
  };

  const matchStyleOptions = [
    { value: "default", label: "Default", group: "Simple" },
    { value: "clean-gold", label: "Dark + Gold Border", group: "Simple" },
    { value: "frame", label: "Gold Frame (Double)", group: "Simple" },
    { value: "team-split", label: "Team Colors (Blue/Red)", group: "Gradient" },
    { value: "frost", label: "Frosted Glass", group: "Gradient" },
    { value: "wc3", label: "WC3 Dark Blue", group: "Themed" },
    { value: "banner", label: "Banner Shape", group: "Themed" },
  ];

  // Preview match data — fetched from real games
  const [previewMatch, setPreviewMatch] = useState(null);
  const [previewSession, setPreviewSession] = useState({});
  const [previewCountries, setPreviewCountries] = useState({});
  const [previewStreamer, setPreviewStreamer] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);

  // Enrich a match with countries + session data, then set as preview
  const loadPreview = async (match, streamerTag) => {
    setPreviewMatch(match);
    setPreviewStreamer(streamerTag);

    const allPlayers = match.teams.flatMap(t => t.players);
    const tags = allPlayers.map(p => p.battleTag);

    const [profiles, sessions] = await Promise.all([
      Promise.all(tags.map(async tag => {
        const p = await getPlayerProfile(tag);
        return [tag, p.country];
      })),
      Promise.all(tags.map(async tag => {
        const data = await fetchPlayerSessionData(tag);
        return [tag, {
          recentGames: data?.session?.form || [],
          wins: data?.session?.wins || 0,
          losses: data?.session?.losses || 0,
        }];
      })),
    ]);

    setPreviewCountries(Object.fromEntries(profiles.filter(([, c]) => c)));
    setPreviewSession(Object.fromEntries(sessions));
  };

  // Fetch a player's most recent 4v4 game for the preview
  // Uses /api/matches/search (not /api/matches) which correctly filters by playerId
  const fetchPlayerPreview = async (tag) => {
    setPreviewLoading(true);
    try {
      const season = await initSeason();
      const res = await fetch(
        `https://website-backend.w3champions.com/api/matches/search?playerId=${encodeURIComponent(tag)}&gameMode=4&gateway=${gateway}&season=${season}&pageSize=1`
      );
      if (res.ok) {
        const data = await res.json();
        const match = data?.matches?.[0];
        if (match?.teams?.length === 2) {
          await loadPreview(match, tag);
          return true;
        }
      }
    } catch (err) {
      console.error("Preview fetch error:", err);
    } finally {
      setPreviewLoading(false);
    }
    return false;
  };

  // On mount: fetch saved player's game, or fall back to random ongoing game
  useEffect(() => {
    const init = async () => {
      // If we have a saved tag, fetch their game
      if (battleTag && battleTag.includes("#")) {
        const found = await fetchPlayerPreview(battleTag);
        if (found) return;
      }
      // Fall back to a random ongoing 4v4 game
      try {
        setPreviewLoading(true);
        const res = await fetch("https://website-backend.w3champions.com/api/matches/ongoing");
        if (res.ok) {
          const data = await res.json();
          const games = (data?.matches || []).filter(m =>
            m.gameMode === 4 && m.teams?.length === 2 && m.teams[0].players?.length === 4
          );
          if (games.length > 0) {
            const match = games[Math.floor(Math.random() * games.length)];
            await loadPreview(match, match.teams[0].players[0].battleTag);
          }
        }
      } catch (err) {
        console.error("Preview fetch error:", err);
      } finally {
        setPreviewLoading(false);
      }
    };
    init();
  }, []);

  const baseUrl = window.location.origin;
  const encodedTag = encodeURIComponent(battleTag || "YourTag#1234");

  return (
    <Page>
      <Title>Stream Overlays</Title>
      <Subtitle>Add real-time 4v4 stats to your stream in 3 easy steps</Subtitle>

      {/* STEP 1: Pick your username */}
      <Section>
        <StepHeader>
          <StepNumber>1</StepNumber>
          <SectionTitle style={{ margin: 0 }}>Find Your Account</SectionTitle>
        </StepHeader>
        <SettingsPanel>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
            <Label style={{ marginBottom: 0 }}>Battle Tag</Label>
            {isSearching && (
              <span className="search-status searching"><PeonLoader size="sm" /></span>
            )}
            {saved && (
              <span className="search-status saved">Saved</span>
            )}
          </div>
          <div ref={inputRef} className="search-container">
            <input
              type="text"
              value={battleTag}
              onChange={(e) => handleInputChange(e.target.value)}
              onFocus={() => setShowDropdown(true)}
              onKeyDown={handleKeyDown}
              placeholder="Search for a player..."
              className="search-input"
            />

            {/* Search dropdown */}
            {showDropdown && (searchResults.length > 0 || recentTags.length > 0) && (
              <div className="search-dropdown">
                {/* Recent tags section */}
                {recentTags.length > 0 && searchResults.length === 0 && (
                  <>
                    <div className="search-dropdown-header">Recent</div>
                    {recentTags.map(tag => (
                      <div
                        key={tag}
                        onClick={() => selectPlayer(tag)}
                        className="search-dropdown-item"
                      >
                        <span className="search-player-name">{tag.split("#")[0]}</span>
                        <span className="search-player-tag">#{tag.split("#")[1]}</span>
                      </div>
                    ))}
                  </>
                )}

                {/* Search results */}
                {searchResults.length > 0 && (
                  <>
                    <div className="search-dropdown-header">Search Results</div>
                    {searchResults.map((player, i) => (
                      <div
                        key={player.battleTag || i}
                        onClick={() => selectPlayer(player.battleTag)}
                        className="search-dropdown-item"
                      >
                        <span className="search-player-name">{player.name}</span>
                        <span className="search-player-tag">#{player.battleTag?.split("#")[1]}</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
          <p className="search-hint">
            Type to search • Click to select • Press Enter to save
          </p>
        </SettingsPanel>
      </Section>

      {/* STEP 2: Get your overlay URL */}
      <Section>
        <StepHeader>
          <StepNumber>2</StepNumber>
          <SectionTitle style={{ margin: 0 }}>Copy Your Overlay URL</SectionTitle>
        </StepHeader>
        <Subtitle style={{ marginBottom: "var(--space-4)", marginLeft: "40px" }}>
          Add this as a Browser Source in OBS/Streamlabs. Use the Custom CSS to make the background transparent.
        </Subtitle>
        <Card>
          <CardTitle>Match Overlay</CardTitle>
          <CardDescription>
            Shows both teams when you're in a game. Appears automatically, hides when not in game.
          </CardDescription>

          <div style={{ marginBottom: "var(--space-4)" }}>
            <FieldLabel>URL</FieldLabel>
            <UrlCode>{baseUrl}/overlay/match/{encodedTag}?style={matchStyle}{layout === "vertical" ? "&layout=vertical" : ""}</UrlCode>
          </div>

          <DimensionGrid>
            <div>
              <FieldLabel>Width</FieldLabel>
              <DimCode>{layout === "vertical" ? "280" : "1200"}</DimCode>
            </div>
            <div>
              <FieldLabel>Height</FieldLabel>
              <DimCode>{layout === "vertical" ? "180" : "200"}</DimCode>
            </div>
          </DimensionGrid>

          <div>
            <FieldLabel>Custom CSS</FieldLabel>
            <DimCode>body {"{"} background: transparent !important; {"}"}</DimCode>
          </div>
        </Card>
      </Section>

      {/* STEP 3: Preview */}
      <Section>
        <StepHeader>
          <StepNumber>3</StepNumber>
          <SectionTitle style={{ margin: 0 }}>Preview</SectionTitle>
        </StepHeader>
        <Subtitle style={{ marginBottom: "var(--space-4)", marginLeft: "40px" }}>
          Drag to reposition, use the corner handle to resize. Double-click for fullscreen preview.
        </Subtitle>

        {/* Style controls row */}
        <div style={{
          display: 'flex',
          gap: 'var(--space-4)',
          marginLeft: '40px',
          marginBottom: 'var(--space-4)',
          alignItems: 'flex-end'
        }}>
          <div style={{ flex: '0 0 200px' }}>
            <Label>Layout</Label>
            <Select value={layout} onChange={(e) => setLayout(e.target.value)}>
              <option value="horizontal">Horizontal (Top Bar)</option>
              <option value="vertical">Vertical (Sidebar)</option>
            </Select>
          </div>
          <div style={{ flex: '0 0 200px' }}>
            <Label>Match Style</Label>
            <Select value={matchStyle} onChange={(e) => setMatchStyle(e.target.value)}>
              {matchStyleOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </Select>
          </div>
          <ResetButton onClick={resetPositions}>
            Reset Position
          </ResetButton>
        </div>

        {/* Game card above mock screen */}
        {previewMatch && (
          <div style={{ marginLeft: '40px', marginBottom: 'var(--space-4)', maxWidth: '600px' }}>
            <GameCard
              game={previewMatch}
              playerBattleTag={previewStreamer}
            />
          </div>
        )}

        <MockScreen
          ref={mockScreenRef}
          onDoubleClick={toggleFullscreen}
          style={{ cursor: dragging || resizing ? 'grabbing' : 'default' }}
        >
          {/* Fullscreen button - bottom right */}
          <FullscreenButton onClick={toggleFullscreen}>
            {isFullscreen ? "Exit Fullscreen (ESC)" : "Fullscreen"}
          </FullscreenButton>

              {/* Match Overlay - draggable + resizable */}
              <div
                onMouseDown={(e) => handleDragStart('match', e)}
                style={{
                  position: "absolute",
                  top: `${overlayPositions.match.top}%`,
                  left: `${overlayPositions.match.left}%`,
                  transform: `translateX(-50%) scale(${overlayPositions.match.scale})`,
                  transformOrigin: 'top center',
                  cursor: dragging === 'match' ? 'grabbing' : 'grab',
                }}>
                <div style={{ position: 'relative', border: '2px solid transparent', borderColor: (dragging === 'match' || resizing === 'match') ? 'var(--gold)' : 'transparent', borderRadius: 'var(--radius-md)' }}>
                  {previewLoading ? (
                    <div style={{ padding: 'var(--space-6)', display: 'flex', justifyContent: 'center' }}>
                      <PeonLoader size="sm" />
                    </div>
                  ) : previewMatch ? (
                    <MatchOverlay
                      matchData={previewMatch}
                      atGroups={{}}
                      sessionData={previewSession}
                      countries={previewCountries}
                      streamerTag={previewStreamer}
                      matchStyle={matchStyle}
                      layout={layout}
                    />
                  ) : (
                    <div style={{ padding: 'var(--space-4)', color: 'var(--grey-mid)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>
                      Search for a player to preview their last game
                    </div>
                  )}
                  {/* Resize handle */}
                  <div
                    onMouseDown={(e) => handleResizeStart('match', e)}
                    style={{
                      position: 'absolute', bottom: -6, right: -6, width: 12, height: 12,
                      background: 'var(--gold)', borderRadius: 2, cursor: 'nwse-resize',
                      opacity: 0.8,
                    }}
                  />
                </div>
              </div>
        </MockScreen>

        {/* Position readout */}
        <div style={{
          marginTop: 'var(--space-4)',
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--text-xs)',
          maxWidth: '300px',
        }}>
          <div style={{ background: 'var(--grey-dark)', padding: 'var(--space-2)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ color: 'var(--grey-light)', marginBottom: '4px' }}>Match Overlay</div>
            <div style={{ color: 'var(--gold)' }}>top: {overlayPositions.match.top.toFixed(0)}% | center</div>
            <div style={{ color: 'var(--grey-light)' }}>scale: {(overlayPositions.match.scale * 100).toFixed(0)}%</div>
          </div>
        </div>

        <TipBox style={{ marginTop: 'var(--space-4)' }}>
          <strong>Tip:</strong>
          <span> The Match Overlay auto-hides when you're not in a game, so you can leave it always enabled!</span>
        </TipBox>
      </Section>

      {/* OBS SETUP GUIDE */}
      <Section>
        <SectionTitle>OBS Setup Guide</SectionTitle>
        <Subtitle>Step-by-step instructions for adding overlays to OBS Studio or Streamlabs.</Subtitle>

        <GuideSteps>
          <GuideStep>
            <GuideStepNumber>1</GuideStepNumber>
            <GuideStepContent>
              <GuideStepTitle>Add a Browser Source</GuideStepTitle>
              <GuideStepText>
                In OBS, click the <strong>+</strong> button in the Sources panel and select <strong>Browser</strong>.
                Give it a name like "Match Overlay" and click OK.
              </GuideStepText>
            </GuideStepContent>
          </GuideStep>

          <GuideStep>
            <GuideStepNumber>2</GuideStepNumber>
            <GuideStepContent>
              <GuideStepTitle>Paste the URL</GuideStepTitle>
              <GuideStepText>
                Copy one of the overlay URLs from Step 2 above and paste it into the <strong>URL</strong> field.
                Make sure your battle tag is in the URL — the <strong>#</strong> must be encoded as <strong>%23</strong>.
              </GuideStepText>
            </GuideStepContent>
          </GuideStep>

          <GuideStep>
            <GuideStepNumber>3</GuideStepNumber>
            <GuideStepContent>
              <GuideStepTitle>Set the dimensions</GuideStepTitle>
              <GuideStepText>
                Set the <strong>Width</strong> and <strong>Height</strong> to the values shown in the overlay card above.
              </GuideStepText>
            </GuideStepContent>
          </GuideStep>

          <GuideStep>
            <GuideStepNumber>4</GuideStepNumber>
            <GuideStepContent>
              <GuideStepTitle>Add the Custom CSS</GuideStepTitle>
              <GuideStepText>
                Scroll down to the <strong>Custom CSS</strong> field and replace the default content with:
              </GuideStepText>
              <CssBlock>body {"{"} background: transparent !important; {"}"}</CssBlock>
              <GuideStepText>
                This makes the background transparent so only the overlay content shows on your stream.
              </GuideStepText>
            </GuideStepContent>
          </GuideStep>

          <GuideStep>
            <GuideStepNumber>5</GuideStepNumber>
            <GuideStepContent>
              <GuideStepTitle>Position and resize</GuideStepTitle>
              <GuideStepText>
                Click OK, then drag the source to where you want it on your scene.
                You can hold <strong>Alt</strong> and drag an edge to crop, or drag the corners to resize.
              </GuideStepText>
            </GuideStepContent>
          </GuideStep>
        </GuideSteps>

        <TipBox>
          <strong>Tip:</strong>
          <span> The Match Overlay goes at the top of your screen and auto-hides when you're not in a game,
          so you can leave the browser source always enabled.</span>
        </TipBox>
      </Section>

      {/* TIPS & TROUBLESHOOTING */}
      <Section>
        <SectionTitle>Tips</SectionTitle>
        <TipGrid>
          <TipCard>
            <TipCardTitle>Auto-refresh</TipCardTitle>
            <TipCardText>
              Overlays poll for new data every 30 seconds. You don't need to refresh the browser source manually —
              it updates itself when a game starts, ends, or your stats change.
            </TipCardText>
          </TipCard>
          <TipCard>
            <TipCardTitle>Match Overlay auto-hides</TipCardTitle>
            <TipCardText>
              The match overlay renders nothing when you're not in a game, so you can leave the source
              always enabled. It appears automatically when a game starts.
            </TipCardText>
          </TipCard>
          <TipCard>
            <TipCardTitle>Change the style</TipCardTitle>
            <TipCardText>
              Change the look by adding <code>?style=wc3</code> to the URL. Options include
              default, clean-gold, frost, team-split, frame, wc3, and banner. Use the dropdown above to preview.
            </TipCardText>
          </TipCard>
          <TipCard>
            <TipCardTitle>Sizing issues?</TipCardTitle>
            <TipCardText>
              If the overlay looks too large or small, adjust the Width and Height in the Browser Source properties.
              You can also use OBS transform (right-click → Transform → Edit Transform) for precise scaling.
            </TipCardText>
          </TipCard>
        </TipGrid>
      </Section>
    </Page>
  );
};

export default OverlayIndex;
