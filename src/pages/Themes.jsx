import React from "react";
import { themeList } from "../lib/borderThemes";
import { useTheme } from "../lib/ThemeContext";
import "../styles/pages/Themes.css";

const Themes = () => {
  const { themeId, setThemeId } = useTheme();

  return (
    <div className="themes-page">
      <div className="themes-header">
        <h1 className="themes-title">Themes</h1>
        <p className="themes-subtitle">Choose a look for 4v4.GG</p>
      </div>
      <div className="themes-grid">
        {themeList.map((t) => (
          <button
            key={t.id}
            className={`themes-card${t.id === themeId ? " active" : ""}`}
            onClick={() => setThemeId(t.id)}
          >
            <span
              className="themes-preview"
              style={
                t.backgroundImg && t.backgroundImg !== "none"
                  ? { backgroundImage: `url(${t.backgroundImg})` }
                  : undefined
              }
            />
            <span className="themes-card-info">
              <span className="themes-card-name">{t.name}</span>
              <span className="themes-card-desc">{t.desc}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default Themes;
