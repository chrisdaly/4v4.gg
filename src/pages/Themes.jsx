import React from "react";
import { themeList } from "../lib/borderThemes";
import { useTheme } from "../lib/ThemeContext";
import { PageLayout } from "../components/PageLayout";
import "../styles/pages/Themes.css";

const Themes = () => {
  const { themeId, setThemeId } = useTheme();

  const themesHeader = (
    <div className="page-header">
      <div className="page-title-section">
        <h1 className="page-title">Themes</h1>
        <div className="page-stats">
          <span className="stat-item">Choose a look for 4v4.GG</span>
        </div>
      </div>
    </div>
  );

  return (
    <PageLayout maxWidth="1000px" bare header={themesHeader}>
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
    </PageLayout>
  );
};

export default Themes;
