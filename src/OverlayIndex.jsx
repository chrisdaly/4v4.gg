import React, { useState, useEffect, useRef } from "react";
import MatchOverlay from "./MatchOverlay.jsx";
import PlayerOverlay from "./PlayerOverlay.jsx";
import LastGameOverlay from "./LastGameOverlay.jsx";

/**
 * Overlay Index - Instructions and preview for stream overlays
 * URL: /overlay
 */
const STORAGE_KEY = "overlay_recent_tags";
const MAX_RECENT = 5;

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
  const [showMock, setShowMock] = useState(true);
  const [bgStyle, setBgStyle] = useState("bg-gradient-fade");
  const [saved, setSaved] = useState(false);

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

  const bgOptions = [
    { value: "bg-gradient-fade", label: "Gradient Fade (default)" },
    { value: "bg-dark-gold", label: "Dark + Gold Border" },
    { value: "bg-frosted", label: "Frosted Glass" },
    { value: "bg-minimal", label: "Minimal Dark" },
    { value: "bg-none", label: "Fully Transparent" },
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

  // Mock last game data with player names
  const mockLastGame = {
    mapName: "(4)Ferocity",
    won: true,
    mmrChange: 12,
    allies: [
      { name: "YourName", race: 1 },
      { name: "Teammate1", race: 2 },
      { name: "Teammate2", race: 4 },
      { name: "Teammate3", race: 8 },
    ],
    opponents: [
      { name: "Enemy1", race: 1 },
      { name: "Enemy2", race: 2 },
      { name: "Enemy3", race: 4 },
      { name: "Enemy4", race: 8 },
    ],
  };


  const baseUrl = window.location.origin;
  const encodedTag = encodeURIComponent(battleTag || "YourTag#1234");

  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", padding: "40px", color: "#fff" }}>
      <h1 style={{ color: "#fcdb33", fontFamily: "Friz_Quadrata_Bold", marginBottom: "10px" }}>
        Stream Overlays
      </h1>
      <p style={{ color: "#888", marginBottom: "30px" }}>
        Add these overlays to OBS/Streamlabs as Browser Sources
      </p>

      {/* Settings */}
      <div style={{ marginBottom: "30px", padding: "20px", background: "#111", borderRadius: "8px", maxWidth: "500px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
          <label style={{ color: "#888", fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px" }}>
            Your Battle Tag
          </label>
          {isSearching && (
            <span className="search-status searching">searching...</span>
          )}
          {saved && (
            <span className="search-status saved">✓ Saved</span>
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

        <label style={{ display: "block", marginTop: "16px", marginBottom: "8px", color: "#888", fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px" }}>
          Background Style
        </label>
        <select
          value={bgStyle}
          onChange={(e) => setBgStyle(e.target.value)}
          style={{
            width: "100%",
            padding: "12px",
            fontSize: "14px",
            background: "#1a1a1a",
            border: "1px solid #333",
            borderRadius: "4px",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          {bgOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Two Column Layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px", marginBottom: "40px" }}>

        {/* Match Overlay */}
        <div style={{ background: "#111", borderRadius: "8px", padding: "24px" }}>
          <h2 style={{ color: "#fcdb33", marginBottom: "16px" }}>Match Overlay</h2>
          <p style={{ color: "#888", marginBottom: "16px", fontSize: "14px" }}>
            Shows both teams when you're in a game. Appears automatically, hides when not in game.
          </p>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", marginBottom: "4px", color: "#666", fontSize: "11px", textTransform: "uppercase" }}>URL</label>
            <code style={{
              display: "block",
              padding: "10px",
              background: "#0a0a0a",
              borderRadius: "4px",
              fontSize: "12px",
              color: "#4ade80",
              wordBreak: "break-all"
            }}>
              {baseUrl}/overlay/match/{encodedTag}?bg={bgStyle}
            </code>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "4px", color: "#666", fontSize: "11px", textTransform: "uppercase" }}>Width</label>
              <code style={{ display: "block", padding: "8px", background: "#0a0a0a", borderRadius: "4px", color: "#888" }}>1200</code>
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "4px", color: "#666", fontSize: "11px", textTransform: "uppercase" }}>Height</label>
              <code style={{ display: "block", padding: "8px", background: "#0a0a0a", borderRadius: "4px", color: "#888" }}>200</code>
            </div>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "4px", color: "#666", fontSize: "11px", textTransform: "uppercase" }}>Custom CSS</label>
            <code style={{
              display: "block",
              padding: "10px",
              background: "#0a0a0a",
              borderRadius: "4px",
              fontSize: "12px",
              color: "#888"
            }}>
              body {"{"} background: transparent !important; {"}"}
            </code>
          </div>
        </div>

        {/* Player Overlay */}
        <div style={{ background: "#111", borderRadius: "8px", padding: "24px" }}>
          <h2 style={{ color: "#fcdb33", marginBottom: "16px" }}>Player Overlay</h2>
          <p style={{ color: "#888", marginBottom: "16px", fontSize: "14px" }}>
            Shows your stats, MMR, record, and session progress. Always visible.
          </p>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", marginBottom: "4px", color: "#666", fontSize: "11px", textTransform: "uppercase" }}>URL</label>
            <code style={{
              display: "block",
              padding: "10px",
              background: "#0a0a0a",
              borderRadius: "4px",
              fontSize: "12px",
              color: "#4ade80",
              wordBreak: "break-all"
            }}>
              {baseUrl}/overlay/player/{encodedTag}?bg={bgStyle}
            </code>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "4px", color: "#666", fontSize: "11px", textTransform: "uppercase" }}>Width</label>
              <code style={{ display: "block", padding: "8px", background: "#0a0a0a", borderRadius: "4px", color: "#888" }}>280</code>
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "4px", color: "#666", fontSize: "11px", textTransform: "uppercase" }}>Height</label>
              <code style={{ display: "block", padding: "8px", background: "#0a0a0a", borderRadius: "4px", color: "#888" }}>320</code>
            </div>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "4px", color: "#666", fontSize: "11px", textTransform: "uppercase" }}>Custom CSS</label>
            <code style={{
              display: "block",
              padding: "10px",
              background: "#0a0a0a",
              borderRadius: "4px",
              fontSize: "12px",
              color: "#888"
            }}>
              body {"{"} background: transparent !important; {"}"}
            </code>
          </div>
        </div>
      </div>

      {/* Mock Game Screen Preview */}
      <div style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "16px" }}>
          <h2 style={{ color: "#fcdb33", margin: 0 }}>Preview</h2>
          <button
            onClick={() => setShowMock(!showMock)}
            style={{
              padding: "6px 12px",
              background: showMock ? "#333" : "#1a1a1a",
              border: "1px solid #444",
              borderRadius: "4px",
              color: "#888",
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            {showMock ? "Hide Mock" : "Show Mock"}
          </button>
        </div>
        <p style={{ color: "#666", fontSize: "13px", marginBottom: "16px" }}>
          This shows how the overlays would look over your game. Add your own screenshot as a background!
        </p>
      </div>

      {showMock && (
        <div style={{
          position: "relative",
          width: "100%",
          maxWidth: "1280px",
          aspectRatio: "16/9",
          background: "linear-gradient(180deg, #1a2a1a 0%, #0d1a0d 40%, #1a1a10 70%, #2a2015 100%)",
          backgroundImage: `
            radial-gradient(circle at 30% 40%, rgba(0, 80, 0, 0.3) 0%, transparent 40%),
            radial-gradient(circle at 70% 30%, rgba(0, 50, 80, 0.2) 0%, transparent 30%),
            linear-gradient(180deg, #1a2a1a 0%, #0d1a0d 40%, #1a1a10 70%, #2a2015 100%)
          `,
          borderRadius: "8px",
          overflow: "hidden",
        }}>
          {/* Fake WC3 UI bar at bottom */}
          <div style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "80px",
            background: "linear-gradient(180deg, #3d2817 0%, #1a0f08 100%)",
            borderTop: "2px solid #8b7355",
          }}>
            <div style={{
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)",
              bottom: "10px",
              width: "140px",
              height: "60px",
              background: "linear-gradient(180deg, #2a1a0a 0%, #1a0f05 100%)",
              border: "1px solid #8b7355",
              borderRadius: "4px",
            }} />
          </div>

          {/* Match Overlay - positioned at top center */}
          <div style={{
            position: "absolute",
            top: "20px",
            left: "50%",
            transform: "translateX(-50%)",
          }}>
            <MatchOverlay
              matchData={mockMatchData}
              atGroups={{}}
              sessionData={{}}
              streamerTag="Player1#123"
              bgStyle={bgStyle}
            />
          </div>

          {/* Player Overlay - positioned bottom left */}
          <div style={{
            position: "absolute",
            bottom: "100px",
            left: "20px",
          }}>
            <PlayerOverlay playerData={mockPlayerData} bgStyle={bgStyle} />
          </div>

          {/* Last Game Overlay - positioned bottom right */}
          <div style={{
            position: "absolute",
            bottom: "100px",
            right: "20px",
          }}>
            <LastGameOverlay
              game={mockLastGame}
              layout="vertical"
              bgStyle={bgStyle}
            />
          </div>

        </div>
      )}

      {/* Preview legend - outside the mock screen */}
      {showMock && (
        <div style={{
          display: "flex",
          gap: "24px",
          marginTop: "16px",
          fontSize: "12px",
          color: "#666",
        }}>
          <span>↑ <strong style={{ color: "#888" }}>Match Overlay</strong> — top center</span>
          <span>← <strong style={{ color: "#888" }}>Player Overlay</strong> — bottom left</span>
          <span>→ <strong style={{ color: "#888" }}>Last Game</strong> — bottom right</span>
        </div>
      )}


      {/* Instructions */}
      <div style={{ marginTop: "40px", maxWidth: "800px" }}>
        <h2 style={{ color: "#fcdb33", marginBottom: "16px" }}>Setup Instructions</h2>
        <ol style={{ color: "#ccc", lineHeight: "1.8", paddingLeft: "20px" }}>
          <li>Open OBS or Streamlabs</li>
          <li>Add a new <strong>Browser Source</strong></li>
          <li>Paste the URL for the overlay you want (replace the battle tag with yours)</li>
          <li>Set the Width and Height as shown above</li>
          <li>Paste the Custom CSS into the "Custom CSS" field</li>
          <li>Position the overlay where you want it on your stream</li>
        </ol>

        <div style={{ marginTop: "20px", padding: "16px", background: "#1a1a0a", border: "1px solid #4a4a20", borderRadius: "4px" }}>
          <strong style={{ color: "#fcdb33" }}>Tip:</strong>
          <span style={{ color: "#888" }}> The Match Overlay auto-hides when you're not in a game, so you can leave it always enabled!</span>
        </div>
      </div>
    </div>
  );
};

export default OverlayIndex;
