import React, { useState, useEffect, useRef } from "react";
import { useHistory, useLocation } from "react-router-dom";
import styled from "styled-components";
import { BiFullscreen, BiExitFullscreen } from "react-icons/bi";
import { PageLayout, PageHero } from "../../components/PageLayout";
import { Button, CountryFlag, Select } from "../../components/ui";
import MatchOverlay from "../../components/MatchOverlay";
import PeonLoader from "../../components/PeonLoader";
import { getPlayerProfile, getSeasons, searchLadder } from "../../lib/api";
import { fetchPlayerSessionData } from "../../lib/utils";
import { gateway } from "../../lib/params";
import { raceMapping } from "../../lib/constants";

/**
 * Overlay Index - Streamlined overlay configuration
 * URL: /overlay
 */

const Container = styled.div`
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: var(--space-4);
  min-height: 600px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const Sidebar = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-width: 0;
`;

const Panel = styled.div`
  background: var(--surface-1);
  border: 1px solid var(--grey-mid);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  overflow: visible;
  position: relative;
`;

const PanelTitle = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--gold);
  margin-bottom: var(--space-3);
  font-weight: 600;
`;

const Label = styled.label`
  display: block;
  font-family: var(--font-mono);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--grey-light);
  margin-bottom: 4px;
`;

const Input = styled.input`
  width: 100%;
  padding: var(--space-2) var(--space-3);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  background: var(--surface-1);
  border: 1px solid var(--grey-mid);
  border-radius: var(--radius-sm);
  color: var(--white);
  box-sizing: border-box;
  transition: border-color 0.15s, background-color 0.15s;

  &:hover {
    border-color: var(--gold);
  }

  &:focus {
    outline: none;
    border-color: var(--gold);
    background-color: rgba(252, 219, 51, 0.05);
  }

  &::placeholder {
    color: var(--grey-mid);
  }
`;


const GameGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 180px;
  overflow-y: auto;
`;

const GameItem = styled.div`
  padding: var(--space-2);
  background: ${props => props.$selected ? 'rgba(252, 219, 51, 0.1)' : 'rgba(0,0,0,0.3)'};
  border: 1px solid ${props => props.$selected ? 'var(--gold)' : 'transparent'};
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background: ${props => props.$selected ? 'rgba(252, 219, 51, 0.15)' : 'rgba(0,0,0,0.5)'};
  }
`;

const GameMapName = styled.div`
  font-family: var(--font-display);
  font-size: var(--text-xs);
  color: var(--gold);
  margin-bottom: 2px;
`;

const GamePlayers = styled.div`
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--grey-light);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const GameTime = styled.span`
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--grey-mid);
  float: right;
`;

const PreviewArea = styled.div`
  display: flex;
  flex-direction: column;
`;

const MockScreen = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: 16/9;
  background: url('/scenes/1v1.png') center/cover no-repeat, #000;
  border-radius: var(--radius-md);
  overflow: hidden;
  flex: 1;
  min-height: 400px;

  &:fullscreen {
    border-radius: 0;
  }
`;

const FullscreenBtn = styled.button`
  position: absolute;
  bottom: var(--space-3);
  right: var(--space-3);
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  border: 2px solid transparent;
  border-radius: var(--radius-sm);
  color: var(--white);
  cursor: pointer;
  z-index: 10;
  transition: all 0.15s;

  svg {
    width: 18px;
    height: 18px;
  }

  &:hover {
    border-color: var(--gold);
    color: var(--gold);
  }
`;

const OverlayWrapper = styled.div`
  position: absolute;
  top: ${props => props.$top}%;
  left: ${props => props.$left}%;
  transform: translateX(-50%) scale(${props => props.$scale});
  transform-origin: top center;
  cursor: grab;

  &:active {
    cursor: grabbing;
  }
`;

const ResizeHandle = styled.div`
  position: absolute;
  bottom: -4px;
  right: -4px;
  width: 16px;
  height: 16px;
  background: var(--gold);
  border-radius: 2px;
  cursor: se-resize;
  opacity: 0.7;
  transition: opacity 0.15s;

  &:hover {
    opacity: 1;
  }

  &::before {
    content: '';
    position: absolute;
    bottom: 3px;
    right: 3px;
    width: 8px;
    height: 8px;
    border-right: 2px solid #000;
    border-bottom: 2px solid #000;
  }
`;

const UrlPanel = styled.div`
  margin-top: var(--space-4);
  padding: var(--space-4);
  background: var(--surface-1);
  border: 1px solid var(--grey-mid);
  border-radius: var(--radius-md);
`;

const UrlCode = styled.code`
  display: block;
  padding: var(--space-3);
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid var(--grey-dark);
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--green);
  word-break: break-all;
  margin-bottom: var(--space-3);
  user-select: all;
  cursor: text;
`;

const DimRow = styled.div`
  display: flex;
  gap: var(--space-4);
  flex-wrap: wrap;
`;

const DimItem = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--grey-light);

  span {
    color: var(--grey-mid);
    margin-right: 4px;
  }
`;

const Tip = styled.div`
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  padding: var(--space-2);
  background: rgba(252, 219, 51, 0.08);
  border-radius: var(--radius-sm);
  margin-top: var(--space-2);
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--grey-light);
  line-height: 1.4;

  strong {
    color: var(--gold);
  }
`;

const GuideSection = styled.div`
  margin-top: var(--space-4);
  padding: var(--space-4);
  background: var(--surface-1);
  border: 1px solid var(--grey-mid);
  border-radius: var(--radius-md);
`;

const GuideTitle = styled.div`
  font-family: var(--font-display);
  font-size: var(--text-base);
  color: var(--gold);
  margin-bottom: var(--space-4);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;

  &:hover {
    color: #ffe066;
  }

  span:last-child {
    font-size: var(--text-xs);
    color: var(--grey-mid);
  }
`;

const GuideSteps = styled.ol`
  list-style: none;
  padding: 0;
  margin: 0;
  counter-reset: step;
  display: grid;
  gap: var(--space-3);
`;

const GuideStep = styled.li`
  counter-increment: step;
  padding-left: 36px;
  position: relative;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--grey-light);
  line-height: 1.6;

  &::before {
    content: counter(step);
    position: absolute;
    left: 0;
    top: 0;
    width: 24px;
    height: 24px;
    background: var(--gold);
    color: #000;
    border-radius: 50%;
    font-size: 12px;
    font-weight: bold;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  strong {
    color: var(--white);
  }

  code {
    display: block;
    padding: var(--space-2) var(--space-3);
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid var(--grey-dark);
    border-radius: var(--radius-sm);
    color: var(--green);
    margin-top: var(--space-2);
    word-break: break-all;
    font-size: var(--text-xs);
  }
`;

const CheckboxRow = styled.label`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;
  padding: var(--space-2);
  margin-top: var(--space-2);
  background: ${props => props.$active ? 'rgba(252, 219, 51, 0.1)' : 'rgba(0, 0, 0, 0.2)'};
  border: 1px solid ${props => props.$active ? 'var(--gold)' : 'transparent'};
  border-radius: var(--radius-sm);
  transition: all 0.15s;

  &:hover {
    background: ${props => props.$active ? 'rgba(252, 219, 51, 0.15)' : 'rgba(0, 0, 0, 0.3)'};
  }

  input {
    accent-color: var(--gold);
    width: 16px;
    height: 16px;
  }
`;

const CheckboxLabel = styled.div`
  flex: 1;
`;

const CheckboxTitle = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: ${props => props.$active ? 'var(--gold)' : 'var(--white)'};
`;

const CheckboxDesc = styled.div`
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--grey-mid);
  margin-top: 2px;
`;

const SearchDropdown = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #1a1a1a;
  border: 1px solid var(--grey-mid);
  border-radius: var(--radius-sm);
  max-height: 300px;
  overflow-y: auto;
  z-index: 1000;
  margin-top: 4px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
`;

const SearchItem = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  cursor: pointer;
  transition: background 0.15s;
  background: #1a1a1a;

  &:hover {
    background: #252525;
  }

  &:not(:last-child) {
    border-bottom: 1px solid var(--grey-dark);
  }
`;

const SearchAvatarWrap = styled.div`
  position: relative;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
`;

const SearchAvatar = styled.img`
  width: 40px;
  height: 40px;
  border-radius: var(--radius-sm);
  background: var(--grey-dark);
  object-fit: cover;
`;

const SearchAvatarPlaceholder = styled.div`
  width: 40px;
  height: 40px;
  border-radius: var(--radius-sm);
  background: var(--grey-dark);
  display: flex;
  align-items: center;
  justify-content: center;
`;

const SearchFlag = styled.span`
  position: absolute;
  bottom: -2px;
  left: -2px;
`;

const SearchRace = styled.img`
  width: 16px;
  height: 16px;
  margin-left: var(--space-1);
`;

const SearchInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const SearchNameRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 4px;
`;

const SearchName = styled.span`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
`;

const SearchTag = styled.span`
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--grey-mid);
`;

const SearchMeta = styled.div`
  display: flex;
  gap: var(--space-2);
  font-family: var(--font-mono);
  font-size: 11px;
  margin-top: 2px;
`;

const SearchWins = styled.span`
  color: var(--green);
`;

const SearchLosses = styled.span`
  color: var(--red);
`;

const SearchMmr = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--white);
  white-space: nowrap;
`;

const STORAGE_KEY = "overlay_recent_tags";
const SETTINGS_KEY = "overlay_settings";
const POSITION_KEY_H = "overlay_position_horizontal";
const POSITION_KEY_V = "overlay_position_vertical";

// Demo match data
const DEMO_MATCH = {
  id: "demo",
  mapName: "Demo Game",
  teams: [
    {
      players: [
        { battleTag: "HuyaYumiko0414#1234", name: "HuyaYumiko0414", race: 4, currentMmr: 2234 },
        { battleTag: "Lynfan#1818", name: "Lynfan", race: 1, currentMmr: 2243 },
        { battleTag: "bobbyog#1234", name: "bobbyog", race: 2, currentMmr: 2020 },
        { battleTag: "Lacoste#1979", name: "Lacoste", race: 8, currentMmr: 2032 },
      ],
    },
    {
      players: [
        { battleTag: "UnapologeticOne#1954", name: "UnapologeticOne", race: 2, currentMmr: 1954 },
        { battleTag: "sjow#1773", name: "sjow", race: 4, currentMmr: 1986 },
        { battleTag: "lllllllinVleh#1796", name: "lllllllinVleh", race: 8, currentMmr: 1796 },
        { battleTag: "CrocBlanc#1746", name: "CrocBlanc", race: 1, currentMmr: 1746 },
      ],
    },
  ],
};

const DEMO_COUNTRIES = {
  "HuyaYumiko0414#1234": "cn",
  "Lynfan#1818": "cn",
  "bobbyog#1234": "ca",
  "Lacoste#1979": "de",
  "UnapologeticOne#1954": "de",
  "sjow#1773": "de",
  "lllllllinVleh#1796": "cn",
  "CrocBlanc#1746": "fr",
};

const OverlayIndex = () => {
  const history = useHistory();
  const location = useLocation();

  // Parse URL params
  const params = new URLSearchParams(location.search);
  const urlPlayer = params.get("player") || "";
  const urlMatch = params.get("match") || "";

  // Account
  const [battleTag, setBattleTag] = useState(() => {
    if (urlPlayer) return urlPlayer;
    try {
      const recent = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return recent[0] || "";
    } catch { return ""; }
  });
  const [searchResults, setSearchResults] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchTimeout = useRef(null);
  const searchRef = useRef(null);

  // Game selection
  const [recentGames, setRecentGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState(urlMatch || null);
  const [matchIdInput, setMatchIdInput] = useState("");
  const [loadingGame, setLoadingGame] = useState(false);
  const [loadingGames, setLoadingGames] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [noGamesFound, setNoGamesFound] = useState(false);
  const [showGuide, setShowGuide] = useState(true);
  const [previewMode, setPreviewMode] = useState(false);

  // Preview data
  const [previewMatch, setPreviewMatch] = useState(null);
  const [previewCountries, setPreviewCountries] = useState({});
  const [previewSession, setPreviewSession] = useState({});

  // UI settings
  const [layout, setLayout] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}").layout || "horizontal";
    } catch { return "horizontal"; }
  });
  const [matchStyle, setMatchStyle] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}").matchStyle || "default";
    } catch { return "default"; }
  });

  // Separate position state for each layout
  const DEFAULT_POSITION_H = { top: 4, left: 50, scale: 1 };
  const DEFAULT_POSITION_V = { top: 10, left: 90, scale: 1 };

  const [positionH, setPositionH] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(POSITION_KEY_H));
      return saved || DEFAULT_POSITION_H;
    } catch { return DEFAULT_POSITION_H; }
  });

  const [positionV, setPositionV] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(POSITION_KEY_V));
      return saved || DEFAULT_POSITION_V;
    } catch { return DEFAULT_POSITION_V; }
  });

  // Derived: current position based on layout
  const position = layout === "vertical" ? positionV : positionH;
  const setPosition = layout === "vertical" ? setPositionV : setPositionH;

  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const resizeStart = useRef({ scale: 1, x: 0, y: 0 });
  const mockScreenRef = useRef(null);

  // Save horizontal position to localStorage
  useEffect(() => {
    localStorage.setItem(POSITION_KEY_H, JSON.stringify(positionH));
  }, [positionH]);

  // Save vertical position to localStorage
  useEffect(() => {
    localStorage.setItem(POSITION_KEY_V, JSON.stringify(positionV));
  }, [positionV]);

  // Track if user's games were already fetched
  const userGamesFetched = useRef("");
  const [pendingUserGame, setPendingUserGame] = useState(null);
  const [currentSeason, setCurrentSeason] = useState(24); // Default to current season

  // Fetch current season on mount
  useEffect(() => {
    const fetchCurrentSeason = async () => {
      try {
        const seasons = await getSeasons();
        if (seasons && seasons.length > 0) {
          setCurrentSeason(seasons[0].id);
        }
      } catch (error) {
        console.error("Error fetching seasons:", error);
      }
    };
    fetchCurrentSeason();
  }, []);

  // Update URL when player or game changes
  const updateUrl = (player, gameId) => {
    const newParams = new URLSearchParams();
    if (player) newParams.set("player", player);
    if (gameId && gameId !== "demo") newParams.set("match", gameId);
    const newSearch = newParams.toString();
    const newUrl = newSearch ? `${location.pathname}?${newSearch}` : location.pathname;
    history.replace(newUrl);
  };

  // Save settings
  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ layout, matchStyle }));
  }, [layout, matchStyle]);

  // Search players (using ladder search like navbar for MMR/W/L data)
  const searchPlayers = async (query) => {
    if (!query || query.length < 3) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const results = await searchLadder(query);
      // Dedupe by battleTag
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
      setShowDropdown(sliced.length > 0);

      // Fetch profile for each result (avatar, country)
      for (const r of sliced) {
        const tag = r.playersInfo?.[0]?.battleTag || r.player?.playerIds?.[0]?.battleTag;
        if (tag && !profiles[tag]) {
          getPlayerProfile(tag).then((p) => {
            setProfiles((prev) => ({ ...prev, [tag]: p }));
          }).catch(() => {});
        }
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchChange = (value) => {
    setBattleTag(value);
    setShowDropdown(true);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => searchPlayers(value), 300);
  };

  const selectPlayer = (tag) => {
    userGamesFetched.current = "";
    setBattleTag(tag);
    setShowDropdown(false);
    updateUrl(tag, selectedGame);
    // Save to recent
    try {
      const recent = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      const updated = [tag, ...recent.filter(t => t !== tag)].slice(0, 5);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  };

  // Close search dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Fetch user's last 4v4 game when battleTag changes
  useEffect(() => {
    const fetchUserGames = async () => {
      if (!battleTag || !battleTag.includes("#")) return;
      if (userGamesFetched.current === battleTag) return;
      userGamesFetched.current = battleTag;

      try {
        // Use /api/matches/search with season & gateway (required for correct filtering)
        const response = await fetch(
          `https://website-backend.w3champions.com/api/matches/search?playerId=${encodeURIComponent(battleTag)}&gameMode=4&season=${currentSeason}&gateway=${gateway}&offset=0&pageSize=1`
        );
        const data = await response.json();
        if (data.matches && data.matches.length > 0) {
          setPendingUserGame(data.matches[0]);
        }
      } catch (error) {
        console.error("Error fetching user games:", error);
      }
    };
    fetchUserGames();
  }, [battleTag, currentSeason]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!mockScreenRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      mockScreenRef.current.requestFullscreen();
    }
  };

  // Fetch player's recent games when battleTag changes
  useEffect(() => {
    const fetchPlayerGames = async () => {
      if (!battleTag || !battleTag.includes("#")) {
        setRecentGames([]);
        setNoGamesFound(false);
        return;
      }
      setLoadingGames(true);
      setNoGamesFound(false);
      try {
        // Use /api/matches/search with season & gateway (required for correct filtering)
        const response = await fetch(
          `https://website-backend.w3champions.com/api/matches/search?playerId=${encodeURIComponent(battleTag)}&gameMode=4&season=${currentSeason}&gateway=${gateway}&offset=0&pageSize=10`
        );
        const data = await response.json();
        const matches = data.matches || [];
        setRecentGames(matches);

        // If no games found, auto-load demo data
        if (matches.length === 0) {
          setNoGamesFound(true);
          setPreviewMatch(DEMO_MATCH);
          setPreviewCountries(DEMO_COUNTRIES);
          setPreviewSession({});
          setSelectedGame("demo");
        }
      } catch (error) {
        console.error("Error fetching player games:", error);
      } finally {
        setLoadingGames(false);
      }
    };
    fetchPlayerGames();
  }, [battleTag, currentSeason]);

  // Load game for preview
  const loadGame = async (game) => {
    setSelectedGame(game.id);
    setLoadingGame(true);
    updateUrl(battleTag, game.id);

    try {
      // If it's demo data
      if (game.id === "demo") {
        setPreviewMatch(DEMO_MATCH);
        setPreviewCountries(DEMO_COUNTRIES);
        setPreviewSession({});
        setLoadingGame(false);
        return;
      }

      // Fetch full match data if needed
      let match = game;
      if (!game.teams) {
        const response = await fetch(`https://website-backend.w3champions.com/api/matches/${game.id}`);
        match = await response.json();
      }

      setPreviewMatch(match);

      // Fetch countries
      const players = match.teams?.flatMap(t => t.players) || [];
      const tags = players.map(p => p.battleTag);

      const profiles = await Promise.all(
        tags.map(async tag => {
          try {
            const p = await getPlayerProfile(tag);
            return [tag, p.country];
          } catch { return [tag, null]; }
        })
      );
      setPreviewCountries(Object.fromEntries(profiles.filter(([, c]) => c)));

      // Fetch session data
      const sessions = await Promise.all(
        tags.map(async tag => {
          try {
            const data = await fetchPlayerSessionData(tag);
            return [tag, { recentGames: data?.session?.form || [] }];
          } catch { return [tag, {}]; }
        })
      );
      setPreviewSession(Object.fromEntries(sessions));

    } catch (error) {
      console.error("Error loading game:", error);
    } finally {
      setLoadingGame(false);
    }
  };

  const loadMatchById = async () => {
    if (!matchIdInput.trim()) return;
    await loadGame({ id: matchIdInput.trim() });
  };

  // Load pending user game once loadGame is defined
  useEffect(() => {
    if (pendingUserGame) {
      loadGame(pendingUserGame);
      setPendingUserGame(null);
    }
  }, [pendingUserGame]);

  // Load from URL param on mount
  useEffect(() => {
    if (urlMatch && urlMatch !== "demo") {
      loadGame({ id: urlMatch });
    }
  }, []);

  // Drag handlers
  const handleDragStart = (e) => {
    if (!mockScreenRef.current) return;
    e.preventDefault();
    const rect = mockScreenRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    dragOffset.current = { x: x - position.left, y: y - position.top };
    setDragging(true);
  };

  useEffect(() => {
    if (!dragging) return;

    const handleMove = (e) => {
      if (!mockScreenRef.current) return;
      const rect = mockScreenRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setPosition(prev => ({
        ...prev,
        top: Math.max(0, Math.min(y - dragOffset.current.y, 95)),
        left: Math.max(0, Math.min(x - dragOffset.current.x, 100)),
      }));
    };

    const handleUp = () => setDragging(false);

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [dragging]);

  // Resize handlers
  const handleResizeStart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    resizeStart.current = { scale: position.scale, x: e.clientX, y: e.clientY };
    setResizing(true);
  };

  useEffect(() => {
    if (!resizing) return;

    const handleMove = (e) => {
      // Calculate distance moved (diagonal)
      const dx = e.clientX - resizeStart.current.x;
      const dy = e.clientY - resizeStart.current.y;
      const distance = (dx + dy) / 2; // Average of both directions
      const scaleDelta = distance / 200; // 200px drag = 1.0 scale change
      const newScale = Math.max(0.5, Math.min(1.5, resizeStart.current.scale + scaleDelta));
      setPosition(prev => ({ ...prev, scale: newScale }));
    };

    const handleUp = () => setResizing(false);

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [resizing]);

  const baseUrl = window.location.origin;
  const encodedTag = encodeURIComponent(battleTag || "YourTag#1234");

  // Build preview params: use matchId if a real game is selected, otherwise fall back to demo
  const getPreviewParams = () => {
    if (!previewMode) return "";
    if (selectedGame && selectedGame !== "demo") {
      return `&matchId=${selectedGame}`;
    }
    return "&preview=true";
  };

  const overlayUrl = `${baseUrl}/overlay/match/${encodedTag}?style=${matchStyle}${layout === "vertical" ? "&layout=vertical" : ""}${getPreviewParams()}`;

  const styleOptions = [
    { value: "default", label: "Default" },
    { value: "clean-gold", label: "Gold Border" },
    { value: "frame", label: "Double Frame" },
    { value: "team-split", label: "Team Colors" },
    { value: "frost", label: "Frosted Glass" },
    { value: "wc3", label: "WC3 Dark" },
    { value: "banner", label: "Banner" },
  ];

  return (
    <PageLayout maxWidth="1600px" bare>
      <PageHero
        eyebrow="Streaming"
        title="Stream Overlay"
        lead="Configure your overlay, then copy the URL to OBS"
      />

      <Container>
        <Sidebar>
          {/* 1. Account */}
          <Panel>
            <PanelTitle>1. Your Account</PanelTitle>
            <div ref={searchRef} style={{ position: "relative" }}>
              <Input
                type="text"
                value={battleTag}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => setShowDropdown(true)}
                onBlur={() => updateUrl(battleTag, selectedGame)}
                placeholder="Search for your battle tag..."
              />
              {isSearching && (
                <div style={{ position: "absolute", right: 8, top: 8 }}>
                  <PeonLoader size="sm" />
                </div>
              )}
              {showDropdown && searchResults.length > 0 && (
                <SearchDropdown>
                  {searchResults.map((p, i) => {
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
                      <SearchItem key={i} onClick={() => selectPlayer(tag)}>
                        <SearchAvatarWrap>
                          {avatarUrl ? (
                            <SearchAvatar src={avatarUrl} alt="" />
                          ) : raceMapping[race] ? (
                            <SearchAvatar src={raceMapping[race]} alt="" style={{ padding: 4, background: '#2a2a2a' }} />
                          ) : (
                            <SearchAvatarPlaceholder />
                          )}
                          {country && (
                            <SearchFlag>
                              <CountryFlag name={country.toLowerCase()} style={{ width: 14, height: 10 }} />
                            </SearchFlag>
                          )}
                        </SearchAvatarWrap>
                        {raceMapping[race] && avatarUrl && (
                          <SearchRace src={raceMapping[race]} alt="" />
                        )}
                        <SearchInfo>
                          <SearchNameRow>
                            <SearchName>{name}</SearchName>
                            {hashNum && <SearchTag>#{hashNum}</SearchTag>}
                          </SearchNameRow>
                          <SearchMeta>
                            <SearchWins>{wins}W</SearchWins>
                            <SearchLosses>{losses}L</SearchLosses>
                          </SearchMeta>
                        </SearchInfo>
                        <SearchMmr>{mmr != null ? `${Math.round(mmr)} MMR` : "—"}</SearchMmr>
                      </SearchItem>
                    );
                  })}
                </SearchDropdown>
              )}
            </div>
          </Panel>

          {/* 2. Select Game */}
          <Panel>
            <PanelTitle>2. Select Game</PanelTitle>

            {loadingGames ? (
              <div style={{ padding: "var(--space-3)", textAlign: "center" }}>
                <PeonLoader size="sm" />
              </div>
            ) : noGamesFound ? (
              <div style={{
                padding: "var(--space-2)",
                background: "rgba(252, 219, 51, 0.1)",
                borderRadius: "var(--radius-sm)",
                marginBottom: "var(--space-2)",
              }}>
                <div style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--text-xs)",
                  color: "var(--gold)",
                  marginBottom: "4px",
                }}>
                  No 4v4 games found this season
                </div>
                <div style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "10px",
                  color: "var(--grey-light)",
                }}>
                  Showing demo data for preview
                </div>
              </div>
            ) : recentGames.length > 0 ? (
              <>
                <Label>Match History</Label>
                <GameGrid>
                  {recentGames.map((game) => (
                    <GameItem
                      key={game.id}
                      $selected={selectedGame === game.id}
                      onClick={() => loadGame(game)}
                    >
                      <GameTime>
                        {new Date(game.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </GameTime>
                      <GameMapName>{game.mapName || "Unknown Map"}</GameMapName>
                      <GamePlayers>
                        {game.teams?.flatMap(t => t.players?.map(p => p.name)).slice(0, 4).join(", ")}...
                      </GamePlayers>
                    </GameItem>
                  ))}
                </GameGrid>
              </>
            ) : (
              <div style={{
                padding: "var(--space-3)",
                textAlign: "center",
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-xs)",
                color: "var(--grey-mid)",
              }}>
                Enter your battle tag above
              </div>
            )}

            {/* Advanced toggle */}
            <div
              onClick={() => setShowAdvanced(!showAdvanced)}
              style={{
                marginTop: "var(--space-2)",
                paddingTop: "var(--space-2)",
                borderTop: "1px solid var(--grey-dark)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <span style={{
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                color: "var(--grey-mid)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}>
                Advanced
              </span>
              <span style={{ color: "var(--grey-mid)", fontSize: "10px" }}>
                {showAdvanced ? "▲" : "▼"}
              </span>
            </div>

            {showAdvanced && (
              <div style={{ marginTop: "var(--space-2)" }}>
                <Label>Load by Match ID</Label>
                <div style={{ display: "flex", gap: "4px" }}>
                  <Input
                    type="text"
                    value={matchIdInput}
                    onChange={(e) => setMatchIdInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && loadMatchById()}
                    placeholder="Paste match ID..."
                    style={{ flex: 1 }}
                  />
                  <Button $secondary onClick={loadMatchById}>Go</Button>
                </div>
              </div>
            )}
          </Panel>

          {/* 3. Customize */}
          <Panel>
            <PanelTitle>3. Customize</PanelTitle>

            <div style={{ marginBottom: "var(--space-4)" }}>
              <Label>Layout</Label>
              <Select value={layout} onChange={(e) => setLayout(e.target.value)}>
                <option value="horizontal">Horizontal</option>
                <option value="vertical">Vertical</option>
              </Select>
            </div>

            <div style={{ marginBottom: "var(--space-4)" }}>
              <Label>Style</Label>
              <Select value={matchStyle} onChange={(e) => setMatchStyle(e.target.value)}>
                {styleOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </Select>
            </div>

            <CheckboxRow $active={previewMode}>
              <input
                type="checkbox"
                checked={previewMode}
                onChange={(e) => setPreviewMode(e.target.checked)}
              />
              <CheckboxLabel>
                <CheckboxTitle $active={previewMode}>Preview Mode</CheckboxTitle>
                <CheckboxDesc>Shows selected game in OBS for positioning</CheckboxDesc>
              </CheckboxLabel>
            </CheckboxRow>
          </Panel>
        </Sidebar>

        {/* Preview */}
        <PreviewArea>
          <MockScreen ref={mockScreenRef}>
            <FullscreenBtn onClick={toggleFullscreen} title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
              {isFullscreen ? <BiExitFullscreen /> : <BiFullscreen />}
            </FullscreenBtn>

            {loadingGame && (
              <div style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(0,0,0,0.5)",
              }}>
                <PeonLoader />
              </div>
            )}

            {previewMatch && !loadingGame && (
              <OverlayWrapper
                $top={position.top}
                $left={position.left}
                $scale={position.scale}
                onMouseDown={handleDragStart}
                onWheel={(e) => {
                  e.preventDefault();
                  const delta = e.deltaY > 0 ? -0.05 : 0.05;
                  setPosition(prev => ({
                    ...prev,
                    scale: Math.max(0.5, Math.min(1.5, prev.scale + delta))
                  }));
                }}
              >
                <MatchOverlay
                  matchData={previewMatch}
                  atGroups={{}}
                  sessionData={previewSession}
                  countries={previewCountries}
                  streamerTag={battleTag}
                  matchStyle={matchStyle}
                  layout={layout}
                />
                <ResizeHandle onMouseDown={handleResizeStart} title="Drag to resize" />
              </OverlayWrapper>
            )}

            {!previewMatch && !loadingGame && (
              <div style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--grey-mid)",
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-sm)",
              }}>
                Select a game to preview
              </div>
            )}
          </MockScreen>

          {/* URL Output */}
          <UrlPanel>
            <PanelTitle style={{ marginBottom: "var(--space-3)" }}>OBS Browser Source URL</PanelTitle>
            <UrlCode>{overlayUrl}</UrlCode>
            <DimRow>
              <DimItem><span>Width:</span>{layout === "vertical" ? "240" : "1200"}</DimItem>
              <DimItem><span>Height:</span>{layout === "vertical" ? "450" : "200"}</DimItem>
            </DimRow>

            {previewMode && (
              <Tip>
                <span>⚠️</span>
                <span>
                  <strong>Preview mode is ON</strong> — Turn it off before going live so the overlay only shows during actual games.
                </span>
              </Tip>
            )}
          </UrlPanel>

          {/* OBS Guide */}
          <GuideSection>
            <GuideTitle onClick={() => setShowGuide(!showGuide)}>
              <span>OBS Setup Guide</span>
              <span>{showGuide ? "▲" : "▼"}</span>
            </GuideTitle>

            {showGuide && (
              <GuideSteps>
                <GuideStep>
                  In OBS, click <strong>+</strong> under "Sources" and select <strong>"Browser"</strong>
                </GuideStep>
                <GuideStep>
                  Paste the URL above into the URL field
                </GuideStep>
                <GuideStep>
                  Set dimensions: <strong>{layout === "vertical" ? "240 × 450" : "1200 × 200"}</strong>
                </GuideStep>
                <GuideStep>
                  Add this custom CSS for transparency:
                  <code>body {"{"} background: transparent !important; {"}"}</code>
                </GuideStep>
                <GuideStep>
                  Position the overlay on your scene. Enable <strong>Preview Mode</strong> above to show demo data while positioning, then disable it before going live.
                </GuideStep>
                <GuideStep>
                  The overlay auto-hides when you're not in a game — leave it enabled all the time!
                </GuideStep>
              </GuideSteps>
            )}
          </GuideSection>
        </PreviewArea>
      </Container>
    </PageLayout>
  );
};

export default OverlayIndex;
