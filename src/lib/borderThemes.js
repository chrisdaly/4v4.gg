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
 *  - backgroundImg: optional page background image URL
 */

const borderThemes = {
  classic: {
    id: "classic",
    name: "Classic",
    desc: "Clean black, no background",
    border: "1px solid var(--grey-mid)",
    borderImage: "none",
    bg: "rgba(0, 0, 0, 0.6)",
    headerBg: "rgba(0, 0, 0, 0.4)",
    blur: "none",
    shadow: "none",
    backgroundImg: "none",
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

  human: {
    id: "human",
    name: "Human",
    desc: "Stone frame with gold trim",
    border: "28px solid transparent",
    borderImage:
      'url("/frames/fansite-kit/human-borders.png") 60 / 28px stretch',
    bg: "rgba(10, 8, 6, 0.45)",
    headerBg: "rgba(10, 8, 6, 0.35)",
    blur: "none",
    shadow: "none",
    backgroundImg: "/backgrounds/human.jpg",
  },

  orc: {
    id: "orc",
    name: "Orc",
    desc: "Dark wood with metal bolts",
    border: "30px solid transparent",
    borderImage:
      'url("/frames/fansite-kit/orb-borders.png") 65 / 30px stretch',
    bg: "rgba(10, 8, 6, 0.45)",
    headerBg: "rgba(10, 8, 6, 0.35)",
    blur: "none",
    shadow: "none",
    backgroundImg: "/backgrounds/orc.jpg",
  },

  nightElf: {
    id: "nightElf",
    name: "Night Elf",
    desc: "Green vine foliage frame",
    border: "30px solid transparent",
    borderImage:
      'url("/frames/fansite-kit/elf-borders.png") 65 / 30px stretch',
    bg: "rgba(10, 15, 8, 0.45)",
    headerBg: "rgba(10, 15, 8, 0.35)",
    blur: "none",
    shadow: "none",
    backgroundImg: "/backgrounds/nightelf.jpg",
  },

  undead: {
    id: "undead",
    name: "Undead",
    desc: "Ornate dark with purple gems",
    border: "30px solid transparent",
    borderImage:
      'url("/frames/fansite-kit/undead-borders.png") 65 / 30px stretch',
    bg: "rgba(12, 8, 15, 0.45)",
    headerBg: "rgba(12, 8, 15, 0.35)",
    blur: "none",
    shadow: "none",
    backgroundImg: "/backgrounds/undead.jpg",
  },
};

export const THEME_STORAGE_KEY = "chatBorderTheme";
export const DEFAULT_THEME = "ironforge";

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
