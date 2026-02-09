import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { GiCrossedSwords } from "react-icons/gi";
import { themeList } from "../lib/borderThemes";
import { useTheme } from "../lib/ThemeContext";
import { raceIcons } from "../lib/constants";

const THEME_ICONS = {
  human: raceIcons.human,
  orc: raceIcons.orc,
  nightElf: raceIcons.elf,
  undead: raceIcons.undead,
};

const Navbar = () => {
  const location = useLocation();
  const { themeId, setThemeId } = useTheme();
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef(null);

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
          >
            Live
          </Link>
          <Link
            to="/finished"
            className={`navbar-link ${isActive("/finished") ? "active" : ""}`}
          >
            Finished
          </Link>
          <Link
            to="/ladder"
            className={`navbar-link ${isActive("/ladder") ? "active" : ""}`}
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
