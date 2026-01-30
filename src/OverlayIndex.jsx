import React, { useState, useEffect, useRef } from "react";
import styled from "styled-components";
import MatchOverlay from "./MatchOverlay.jsx";
import PlayerOverlay from "./PlayerOverlay.jsx";
import { GameCard } from "./components/game";

/**
 * Overlay Index - Instructions and preview for stream overlays
 * URL: /overlay
 */

// Styled components using design system
const Page = styled.div`
  background: #0a0a0a;
  min-height: 100vh;
  padding: var(--space-8);
  color: #fff;
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
  color: #fff;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: var(--gold);
  }
`;

const CardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-6);
  margin-bottom: var(--space-8);

  @media (max-width: 1000px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.div`
  background: var(--grey-dark);
  border-radius: var(--radius-md);
  padding: var(--space-6);
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
  background: url('/scenes/snow.png') center/cover no-repeat, #000;
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

const LayoutButton = styled.button`
  padding: var(--space-1) var(--space-2);
  margin-right: var(--space-2);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  background: ${p => p.$active ? 'var(--gold)' : 'var(--grey-dark)'};
  border: 1px solid var(--grey-mid);
  border-radius: var(--radius-md);
  color: ${p => p.$active ? '#000' : 'var(--grey-light)'};
  cursor: pointer;
  transition: background var(--transition);

  &:hover {
    background: ${p => p.$active ? 'var(--gold)' : 'var(--grey-mid)'};
  }
`;

const LayoutSelector = styled.div`
  margin-bottom: var(--space-4);

  span {
    color: var(--grey-light);
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    margin-right: var(--space-2);
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

const STORAGE_KEY = "overlay_recent_tags";
const POSITIONS_KEY = "overlay_positions";
const SETTINGS_KEY = "overlay_settings";
const MAX_RECENT = 5;

const DEFAULT_POSITIONS = {
  match: { top: 4, left: 50, scale: 1 },
  player: { bottom: 18, left: 2, scale: 1 },
  lastGame: { bottom: 18, right: 2, scale: 1 },
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
  const [bgStyle, setBgStyle] = useState(() => {
    try {
      const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
      return settings.bgStyle || "bg-gradient-fade";
    } catch { return "bg-gradient-fade"; }
  });
  const [playerLayout, setPlayerLayout] = useState(() => {
    try {
      const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
      return settings.playerLayout || "default";
    } catch { return "default"; }
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
    if (overlayId === 'match') {
      dragOffset.current = { x: startX - pos.left, y: startY - pos.top };
    } else if (overlayId === 'player') {
      dragOffset.current = { x: startX - pos.left, y: (100 - startY) - pos.bottom };
    } else if (overlayId === 'lastGame') {
      dragOffset.current = { x: (100 - startX) - pos.right, y: (100 - startY) - pos.bottom };
    }

    setDragging(overlayId);
  };

  const handleDragMove = (e) => {
    if (!dragging || !mockScreenRef.current) return;

    const rect = mockScreenRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setOverlayPositions(prev => {
      const updated = { ...prev };
      if (dragging === 'match') {
        updated.match = {
          ...prev.match,
          top: Math.max(0, Math.min(y - dragOffset.current.y, 95)),
          left: Math.max(0, Math.min(x - dragOffset.current.x, 100))
        };
      } else if (dragging === 'player') {
        updated.player = {
          ...prev.player,
          bottom: Math.max(0, Math.min((100 - y) - dragOffset.current.y, 95)),
          left: Math.max(0, Math.min(x - dragOffset.current.x, 95))
        };
      } else if (dragging === 'lastGame') {
        updated.lastGame = {
          ...prev.lastGame,
          bottom: Math.max(0, Math.min((100 - y) - dragOffset.current.y, 95)),
          right: Math.max(0, Math.min((100 - x) - dragOffset.current.x, 95))
        };
      }
      return updated;
    });
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
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ bgStyle, playerLayout }));
  }, [bgStyle, playerLayout]);

  // Reset positions to default
  const resetPositions = () => {
    setOverlayPositions(DEFAULT_POSITIONS);
  };

  const bgOptions = [
    { value: "bg-gradient-fade", label: "Gradient Fade (default)" },
    { value: "bg-dark-gold", label: "Dark + Gold Border" },
    { value: "bg-frosted", label: "Frosted Glass" },
    { value: "bg-minimal", label: "Minimal Dark" },
    { value: "bg-none", label: "Fully Transparent" },
  ];

  const playerLayoutOptions = [
    { value: "default", label: "Default (vertical)" },
    { value: "horizontal", label: "Horizontal (bar)" },
    { value: "minimal", label: "Minimal" },
    { value: "compact", label: "Compact (2-line)" },
    { value: "session", label: "Session Only" },
  ];

  // Mock data for preview
  const mockMatchData = {
    teams: [
      {
        players: [
          { battleTag: "Player1#123", name: "Player1", race: 1, currentMmr: 1850 },
          { battleTag: "Player2#123", name: "Player2", race: 2, currentMmr: 1720 },
          { battleTag: "Player3#123", name: "Player3", race: 4, currentMmr: 1680 },
          { battleTag: "Player4#123", name: "Player4", race: 8, currentMmr: 1590 },
        ]
      },
      {
        players: [
          { battleTag: "Enemy1#123", name: "Enemy1", race: 1, currentMmr: 1780 },
          { battleTag: "Enemy2#123", name: "Enemy2", race: 2, currentMmr: 1750 },
          { battleTag: "Enemy3#123", name: "Enemy3", race: 4, currentMmr: 1700 },
          { battleTag: "Enemy4#123", name: "Enemy4", race: 8, currentMmr: 1620 },
        ]
      }
    ]
  };

  const mockPlayerData = {
    name: "YourName",
    profilePic: null,
    country: "us",
    mmr: 1850,
    allTimeLow: 1420,
    allTimePeak: 1920,
    wins: 45,
    losses: 38,
    sessionChange: 24,
    form: [true, true, false, true, true, false, true, true],
    rank: 52,
  };

  // Mock last game data for GameCard (uses standard match format)
  const mockLastGame = {
    mapName: "(4)Ferocity",
    durationInSeconds: 892,
    endTime: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
    id: "mock-match-123",
    teams: [
      {
        players: [
          { battleTag: "YourName#123", name: "YourName", race: 1, oldMmr: 1838, currentMmr: 1850, won: true },
          { battleTag: "Teammate1#123", name: "Teammate1", race: 2, oldMmr: 1700, currentMmr: 1712, won: true },
          { battleTag: "Teammate2#123", name: "Teammate2", race: 4, oldMmr: 1650, currentMmr: 1662, won: true },
          { battleTag: "Teammate3#123", name: "Teammate3", race: 8, oldMmr: 1580, currentMmr: 1592, won: true },
        ]
      },
      {
        players: [
          { battleTag: "Enemy1#123", name: "Enemy1", race: 1, oldMmr: 1760, currentMmr: 1748, won: false },
          { battleTag: "Enemy2#123", name: "Enemy2", race: 2, oldMmr: 1730, currentMmr: 1718, won: false },
          { battleTag: "Enemy3#123", name: "Enemy3", race: 4, oldMmr: 1680, currentMmr: 1668, won: false },
          { battleTag: "Enemy4#123", name: "Enemy4", race: 8, oldMmr: 1600, currentMmr: 1588, won: false },
        ]
      }
    ]
  };


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
              <span className="search-status searching">searching...</span>
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

          <Label style={{ marginTop: "var(--space-4)" }}>Background Style</Label>
          <Select value={bgStyle} onChange={(e) => setBgStyle(e.target.value)}>
            {bgOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </Select>
        </SettingsPanel>
      </Section>

      {/* STEP 2: Get your overlay URLs */}
      <Section>
        <StepHeader>
          <StepNumber>2</StepNumber>
          <SectionTitle style={{ margin: 0 }}>Copy Your Overlay URLs</SectionTitle>
        </StepHeader>
        <Subtitle style={{ marginBottom: "var(--space-4)", marginLeft: "40px" }}>
          Add these as Browser Sources in OBS/Streamlabs. Use the Custom CSS to make backgrounds transparent.
        </Subtitle>
        <CardGrid>
        {/* Match Overlay */}
        <Card>
          <CardTitle>Match Overlay</CardTitle>
          <CardDescription>
            Shows both teams when you're in a game. Appears automatically, hides when not in game.
          </CardDescription>

          <div style={{ marginBottom: "var(--space-4)" }}>
            <FieldLabel>URL</FieldLabel>
            <UrlCode>{baseUrl}/overlay/match/{encodedTag}?bg={bgStyle}</UrlCode>
          </div>

          <DimensionGrid>
            <div>
              <FieldLabel>Width</FieldLabel>
              <DimCode>1200</DimCode>
            </div>
            <div>
              <FieldLabel>Height</FieldLabel>
              <DimCode>200</DimCode>
            </div>
          </DimensionGrid>

          <div>
            <FieldLabel>Custom CSS</FieldLabel>
            <DimCode>body {"{"} background: transparent !important; {"}"}</DimCode>
          </div>
        </Card>

        {/* Player Overlay */}
        <Card>
          <CardTitle>Player Overlay</CardTitle>
          <CardDescription>
            Shows your stats, MMR, record, and session progress. Always visible.
          </CardDescription>

          <div style={{ marginBottom: "var(--space-4)" }}>
            <FieldLabel>URL</FieldLabel>
            <UrlCode>{baseUrl}/overlay/player/{encodedTag}?bg={bgStyle}</UrlCode>
          </div>

          <DimensionGrid>
            <div>
              <FieldLabel>Width</FieldLabel>
              <DimCode>280</DimCode>
            </div>
            <div>
              <FieldLabel>Height</FieldLabel>
              <DimCode>320</DimCode>
            </div>
          </DimensionGrid>

          <div>
            <FieldLabel>Custom CSS</FieldLabel>
            <DimCode>body {"{"} background: transparent !important; {"}"}</DimCode>
          </div>
        </Card>

        {/* Last Game Overlay */}
        <Card>
          <CardTitle>Last Game Overlay</CardTitle>
          <CardDescription>
            Shows your most recent game result with map, players, and MMR change.
          </CardDescription>

          <div style={{ marginBottom: "var(--space-4)" }}>
            <FieldLabel>URL</FieldLabel>
            <UrlCode>{baseUrl}/overlay/lastgame/{encodedTag}?bg={bgStyle}</UrlCode>
          </div>

          <DimensionGrid>
            <div>
              <FieldLabel>Width</FieldLabel>
              <DimCode>280</DimCode>
            </div>
            <div>
              <FieldLabel>Height</FieldLabel>
              <DimCode>320</DimCode>
            </div>
          </DimensionGrid>

          <div>
            <FieldLabel>Custom CSS</FieldLabel>
            <DimCode>body {"{"} background: transparent !important; {"}"}</DimCode>
          </div>
        </Card>
      </CardGrid>
      </Section>

      {/* STEP 3: Position your overlays */}
      <Section>
        <StepHeader>
          <StepNumber>3</StepNumber>
          <SectionTitle style={{ margin: 0 }}>Position Your Overlays</SectionTitle>
        </StepHeader>
        <Subtitle style={{ marginBottom: "var(--space-4)", marginLeft: "40px" }}>
          Drag overlays to position them. Use the corner handles to resize. Double-click for fullscreen preview.
        </Subtitle>

        {/* Layout selector for Player Overlay */}
        <LayoutSelector style={{ marginLeft: "40px" }}>
          <span>Player Layout:</span>
          {playerLayoutOptions.map(opt => (
            <LayoutButton
              key={opt.value}
              $active={playerLayout === opt.value}
              onClick={() => setPlayerLayout(opt.value)}
            >
              {opt.label}
            </LayoutButton>
          ))}
          <ResetButton onClick={resetPositions} style={{ marginLeft: "var(--space-4)" }}>
            Reset Positions
          </ResetButton>
        </LayoutSelector>

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
                  <MatchOverlay
                    matchData={mockMatchData}
                    atGroups={{}}
                    sessionData={{}}
                    streamerTag="Player1#123"
                    bgStyle={bgStyle}
                  />
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

              {/* Player Overlay - draggable + resizable */}
              <div
                onMouseDown={(e) => handleDragStart('player', e)}
                style={{
                  position: "absolute",
                  bottom: `${overlayPositions.player.bottom}%`,
                  left: `${overlayPositions.player.left}%`,
                  transform: `scale(${overlayPositions.player.scale})`,
                  transformOrigin: 'bottom left',
                  cursor: dragging === 'player' ? 'grabbing' : 'grab',
                }}>
                <div style={{ position: 'relative', border: '2px solid transparent', borderColor: (dragging === 'player' || resizing === 'player') ? 'var(--gold)' : 'transparent', borderRadius: 'var(--radius-md)' }}>
                  <PlayerOverlay playerData={mockPlayerData} layout={playerLayout} bgStyle={bgStyle} />
                  {/* Resize handle */}
                  <div
                    onMouseDown={(e) => handleResizeStart('player', e)}
                    style={{
                      position: 'absolute', top: -6, right: -6, width: 12, height: 12,
                      background: 'var(--gold)', borderRadius: 2, cursor: 'nwse-resize',
                      opacity: 0.8,
                    }}
                  />
                </div>
              </div>

              {/* Last Game Overlay - draggable + resizable */}
              <div
                onMouseDown={(e) => handleDragStart('lastGame', e)}
                style={{
                  position: "absolute",
                  bottom: `${overlayPositions.lastGame.bottom}%`,
                  right: `${overlayPositions.lastGame.right}%`,
                  transform: `scale(${overlayPositions.lastGame.scale})`,
                  transformOrigin: 'bottom right',
                  cursor: dragging === 'lastGame' ? 'grabbing' : 'grab',
                }}>
                <div style={{ position: 'relative', border: '2px solid transparent', borderColor: (dragging === 'lastGame' || resizing === 'lastGame') ? 'var(--gold)' : 'transparent', borderRadius: 'var(--radius-md)' }}>
                  <GameCard
                    game={mockLastGame}
                    playerBattleTag="YourName#123"
                    overlay={true}
                    layout="vertical"
                    size="expanded"
                  />
                  {/* Resize handle */}
                  <div
                    onMouseDown={(e) => handleResizeStart('lastGame', e)}
                    style={{
                      position: 'absolute', top: -6, left: -6, width: 12, height: 12,
                      background: 'var(--gold)', borderRadius: 2, cursor: 'nwse-resize',
                      opacity: 0.8,
                    }}
                  />
                </div>
              </div>
        </MockScreen>

        {/* Position readout */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 'var(--space-4)',
          marginTop: 'var(--space-4)',
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--text-xs)',
        }}>
          <div style={{ background: 'var(--grey-dark)', padding: 'var(--space-2)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ color: 'var(--grey-light)', marginBottom: '4px' }}>Match Overlay</div>
            <div style={{ color: 'var(--gold)' }}>top: {overlayPositions.match.top.toFixed(0)}% | center</div>
            <div style={{ color: 'var(--grey-light)' }}>scale: {(overlayPositions.match.scale * 100).toFixed(0)}%</div>
          </div>
          <div style={{ background: 'var(--grey-dark)', padding: 'var(--space-2)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ color: 'var(--grey-light)', marginBottom: '4px' }}>Player Overlay</div>
            <div style={{ color: 'var(--gold)' }}>bottom: {overlayPositions.player.bottom.toFixed(0)}% | left: {overlayPositions.player.left.toFixed(0)}%</div>
            <div style={{ color: 'var(--grey-light)' }}>scale: {(overlayPositions.player.scale * 100).toFixed(0)}%</div>
          </div>
          <div style={{ background: 'var(--grey-dark)', padding: 'var(--space-2)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ color: 'var(--grey-light)', marginBottom: '4px' }}>Last Game Overlay</div>
            <div style={{ color: 'var(--gold)' }}>bottom: {overlayPositions.lastGame.bottom.toFixed(0)}% | right: {overlayPositions.lastGame.right.toFixed(0)}%</div>
            <div style={{ color: 'var(--grey-light)' }}>scale: {(overlayPositions.lastGame.scale * 100).toFixed(0)}%</div>
          </div>
        </div>

        <TipBox style={{ marginTop: 'var(--space-4)' }}>
          <strong>Tip:</strong>
          <span> The Match Overlay auto-hides when you're not in a game, so you can leave it always enabled!</span>
        </TipBox>
      </Section>
    </Page>
  );
};

export default OverlayIndex;
