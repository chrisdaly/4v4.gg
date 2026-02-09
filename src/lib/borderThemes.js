/**
 * Border Themes for Chat Panels
 *
 * Each theme defines the border, background, and backdrop styles
 * for the three chat panels (ChatPanel, ActiveGamesSidebar, UserListSidebar).
 *
 * Properties:
 *  - id:          unique key (used for localStorage)
 *  - name:        display name in the picker
 *  - desc:        short description
 *  - border:      CSS border value
 *  - borderImage: CSS border-image value (or "none")
 *  - bg:          CSS background value for the panel body
 *  - headerBg:    CSS background for the panel header
 *  - blur:        CSS backdrop-filter value
 *  - shadow:      optional box-shadow
 */

const borderThemes = {
  classic: {
    id: "classic",
    name: "Classic",
    desc: "Clean silver frame",
    border: "8px solid transparent",
    borderImage: 'url("/frames/chat/ChatFrameBorder.png") 30 / 8px stretch',
    bg: "rgba(10, 8, 6, 0.25)",
    headerBg: "rgba(10, 8, 6, 0.2)",
    blur: "blur(1px)",
    shadow: "none",
  },

  ironforge: {
    id: "ironforge",
    name: "Ironforge",
    desc: "Heavy dark metal with rivets",
    border: "16px solid transparent",
    borderImage:
      'url("/frames/launcher/Maon_Border.png") 120 / 16px stretch',
    bg: "rgba(10, 8, 6, 0.4)",
    headerBg: "rgba(10, 8, 6, 0.3)",
    blur: "blur(2px)",
    shadow: "none",
  },

  royal: {
    id: "royal",
    name: "Royal",
    desc: "Ornate gold corners",
    border: "20px solid transparent",
    borderImage: 'url("/frames/wc3-frame.png") 80 / 20px stretch',
    bg: "rgba(10, 8, 6, 0.35)",
    headerBg: "rgba(10, 8, 6, 0.25)",
    blur: "blur(2px)",
    shadow: "none",
  },

  goldDialog: {
    id: "goldDialog",
    name: "Gold Dialog",
    desc: "WC3 dialog gold frame",
    border: "12px solid transparent",
    borderImage:
      'url("/frames/dialog/Gold-Border.png") 28 / 12px stretch',
    bg: "rgba(10, 8, 6, 0.35)",
    headerBg: "rgba(10, 8, 6, 0.25)",
    blur: "blur(2px)",
    shadow: "none",
  },

  darkWood: {
    id: "darkWood",
    name: "Dark Wood",
    desc: "Tavern-style wood border",
    border: "14px solid transparent",
    borderImage:
      'url("/frames/wood/WoodBorder.png") 40 / 14px stretch',
    bg: "rgba(10, 8, 6, 0.35)",
    headerBg: "rgba(10, 8, 6, 0.25)",
    blur: "blur(1px)",
    shadow: "none",
  },

  goldTrim: {
    id: "goldTrim",
    name: "Gold Trim",
    desc: "CSS gradient gold border",
    border: "2px solid transparent",
    borderImage:
      "linear-gradient(135deg, #b8860b 0%, #fcdb33 25%, #b8860b 50%, #fcdb33 75%, #b8860b 100%) 1",
    bg: "rgba(10, 8, 6, 0.3)",
    headerBg: "rgba(10, 8, 6, 0.25)",
    blur: "blur(1px)",
    shadow: "inset 0 0 20px rgba(0, 0, 0, 0.3)",
  },

  subtle: {
    id: "subtle",
    name: "Subtle",
    desc: "Thin gold outline",
    border: "1px solid rgba(252, 219, 51, 0.2)",
    borderImage: "none",
    bg: "rgba(10, 8, 6, 0.25)",
    headerBg: "rgba(10, 8, 6, 0.2)",
    blur: "blur(1px)",
    shadow: "none",
  },

  tooltip: {
    id: "tooltip",
    name: "Tooltip",
    desc: "Thin minimal frame",
    border: "4px solid transparent",
    borderImage:
      'url("/frames/tooltips/Border.png") 4 / 4px stretch',
    bg: "rgba(10, 8, 6, 0.3)",
    headerBg: "rgba(10, 8, 6, 0.25)",
    blur: "blur(1px)",
    shadow: "none",
  },

  bevel: {
    id: "bevel",
    name: "Bevel",
    desc: "Raised gold-edged panel",
    border: "2px solid #b8860b",
    borderImage: "none",
    bg: "linear-gradient(180deg, rgba(252, 219, 51, 0.04) 0%, rgba(0, 0, 0, 0.12) 100%)",
    headerBg: "rgba(10, 8, 6, 0.3)",
    blur: "blur(1px)",
    shadow:
      "inset 1px 1px 0 rgba(252, 219, 51, 0.25), inset -1px -1px 0 rgba(0, 0, 0, 0.45), 0 2px 8px rgba(0, 0, 0, 0.5)",
  },

  arcane: {
    id: "arcane",
    name: "Arcane",
    desc: "Inner gold glow",
    border: "2px solid #fcdb33",
    borderImage: "none",
    bg: "rgba(0, 0, 0, 0.8)",
    headerBg: "rgba(10, 8, 6, 0.3)",
    blur: "blur(1px)",
    shadow:
      "inset 0 0 15px rgba(252, 219, 51, 0.12), inset 0 0 3px rgba(252, 219, 51, 0.25), 0 0 10px rgba(252, 219, 51, 0.08)",
  },

  frost: {
    id: "frost",
    name: "Frost",
    desc: "Frosted glass panel",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderImage: "none",
    bg: "rgba(20, 25, 35, 0.35)",
    headerBg: "rgba(20, 25, 35, 0.3)",
    blur: "blur(8px)",
    shadow: "inset 0 1px 0 rgba(255, 255, 255, 0.05)",
  },

  none: {
    id: "none",
    name: "None",
    desc: "No border, transparent",
    border: "none",
    borderImage: "none",
    bg: "rgba(10, 8, 6, 0.2)",
    headerBg: "rgba(10, 8, 6, 0.15)",
    blur: "blur(1px)",
    shadow: "none",
  },
};

export const THEME_STORAGE_KEY = "chatBorderTheme";
export const DEFAULT_THEME = "classic";

export function loadThemeId() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) || DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function saveThemeId(id) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, id);
  } catch {}
}

export function getTheme(id) {
  return borderThemes[id] || borderThemes[DEFAULT_THEME];
}

export const themeList = Object.values(borderThemes);
export default borderThemes;
