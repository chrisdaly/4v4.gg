import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from "react";
import { getTheme, loadThemeId, saveThemeId, THEME_STORAGE_KEY } from "./borderThemes";

const ThemeContext = createContext(null);

const DEFAULT_BG = "/frames/launcher/Static_Background.png";

export function ThemeProvider({ children }) {
  const [isFirstVisit, setIsFirstVisit] = useState(() => {
    try {
      return localStorage.getItem(THEME_STORAGE_KEY) === null;
    } catch {
      return false;
    }
  });

  const [themeId, setThemeIdRaw] = useState(loadThemeId);
  const borderTheme = useMemo(() => getTheme(themeId), [themeId]);

  const setThemeId = useCallback((id) => {
    setThemeIdRaw(id);
    saveThemeId(id);
    setIsFirstVisit(false);
  }, []);

  // Expose all theme properties as CSS custom properties on body
  useEffect(() => {
    const s = document.body.style;
    const raw = borderTheme.backgroundImg;

    // Background
    if (raw === "none") {
      s.setProperty("--theme-bg-img", "none");
      s.setProperty("--theme-bg-overlay", "none");
    } else {
      s.setProperty("--theme-bg-img", `url(${raw || DEFAULT_BG})`);
      s.setProperty("--theme-bg-overlay", "linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55))");
    }

    // Border theme for cards/panels
    s.setProperty("--theme-border", borderTheme.border);
    s.setProperty("--theme-border-image", borderTheme.borderImage);
    s.setProperty("--theme-bg", borderTheme.bg);
    s.setProperty("--theme-header-bg", borderTheme.headerBg);
    s.setProperty("--theme-blur", borderTheme.blur);
    s.setProperty("--theme-shadow", borderTheme.shadow || "none");
  }, [borderTheme]);

  const value = useMemo(
    () => ({ themeId, borderTheme, setThemeId, isFirstVisit }),
    [themeId, borderTheme, setThemeId, isFirstVisit]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
