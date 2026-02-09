import React, { useState } from "react";
import styled from "styled-components";

const Page = styled.div`
  padding: var(--space-6) var(--space-8);
  max-width: 1400px;
  margin: 0 auto;
`;

const Title = styled.h1`
  font-family: var(--font-display);
  font-size: var(--text-xl);
  color: var(--gold);
  margin-bottom: var(--space-2);
`;

const Subtitle = styled.p`
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--grey-light);
  margin-bottom: var(--space-8);
`;

const Section = styled.section`
  margin-bottom: var(--space-12);
`;

const SectionTitle = styled.h2`
  font-family: var(--font-display);
  font-size: var(--text-lg);
  color: #fff;
  margin-bottom: var(--space-1);
`;

const SectionDesc = styled.p`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: var(--space-6);
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(${(p) => p.$minWidth || "200px"}, 1fr));
  gap: var(--space-6);
`;

const Card = styled.div`
  border: 1px solid var(--grey-mid);
  border-radius: var(--radius-md);
  overflow: hidden;
  background: rgba(255, 255, 255, 0.02);
  transition: border-color 0.2s;

  &:hover {
    border-color: var(--gold);
  }
`;

const ImageWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: ${(p) => p.$minHeight || "120px"};
  padding: var(--space-4);
  background: ${(p) => p.$bg || "repeating-conic-gradient(#1a1a1a 0% 25%, #111 0% 50%) 0 0 / 16px 16px"};
`;

const AssetImage = styled.img`
  max-width: 100%;
  max-height: ${(p) => p.$maxH || "200px"};
  object-fit: contain;
  image-rendering: ${(p) => p.$pixelated ? "pixelated" : "auto"};
`;

const AssetInfo = styled.div`
  padding: var(--space-2) var(--space-3);
  border-top: 1px solid var(--grey-mid);
  background: rgba(0, 0, 0, 0.3);
`;

const AssetName = styled.div`
  font-family: var(--font-mono);
  font-size: 11px;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const AssetPath = styled.div`
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--grey-light);
  opacity: 0.6;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;

  &:hover {
    opacity: 1;
    color: var(--gold);
  }
`;

/* ── Frame Preview (shows border-image in action) ──────── */

const FramePreviewBox = styled.div`
  width: 100%;
  aspect-ratio: 4 / 3;
  border: ${(p) => p.$borderWidth || "16px"} solid transparent;
  border-image: url(${(p) => p.$src}) ${(p) => p.$slice || "80"} / ${(p) => p.$borderWidth || "16px"} stretch;
  background: rgba(15, 12, 10, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
`;

/* ── Background Preview ──────────────────────────────── */

const BgPreview = styled.div`
  width: 100%;
  aspect-ratio: 16 / 9;
  background: url(${(p) => p.$src}) center / cover no-repeat;
  border-radius: var(--radius-sm);
`;

const BgOverlayPreview = styled.div`
  width: 100%;
  aspect-ratio: 16 / 9;
  position: relative;
  border-radius: var(--radius-sm);
  overflow: hidden;

  &::before {
    content: "";
    position: absolute;
    inset: 0;
    background: url(${(p) => p.$src}) center / cover no-repeat;
  }

  &::after {
    content: "";
    position: absolute;
    inset: 0;
    background: ${(p) => p.$overlay || "rgba(0,0,0,0.85)"};
  }
`;

/* ── Corner Assembly Preview ─────────────────────────── */

const CornerGrid = styled.div`
  display: grid;
  grid-template-columns: auto 1fr auto;
  grid-template-rows: auto 1fr auto;
  width: 100%;
  aspect-ratio: 4 / 3;
  background: rgba(20, 18, 15, 0.9);
`;

const CornerImg = styled.img`
  width: 64px;
  height: 64px;
  object-fit: contain;
  transform: ${(p) => p.$flip || "none"};
`;

const CornerCenter = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--grey-light);
  opacity: 0.5;
`;

/* ── Tab Navigation ──────────────────────────────────── */

const TabBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-bottom: var(--space-8);
  border-bottom: 1px solid var(--grey-mid);
  padding-bottom: var(--space-4);
`;

const Tab = styled.button`
  font-family: var(--font-display);
  font-size: var(--text-xs);
  color: ${(p) => (p.$active ? "var(--gold)" : "var(--grey-light)")};
  background: ${(p) => (p.$active ? "rgba(252, 219, 51, 0.08)" : "transparent")};
  border: 1px solid ${(p) => (p.$active ? "var(--gold)" : "var(--grey-mid)")};
  border-radius: var(--radius-full);
  padding: var(--space-1) var(--space-4);
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    color: var(--gold);
    border-color: var(--gold);
  }
`;

function copyPath(path) {
  navigator.clipboard?.writeText(path);
}

function AssetCard({ src, name, path, bg, maxH, pixelated, minHeight }) {
  return (
    <Card>
      <ImageWrapper $bg={bg} $minHeight={minHeight}>
        <AssetImage src={src} alt={name} $maxH={maxH} $pixelated={pixelated} />
      </ImageWrapper>
      <AssetInfo>
        <AssetName>{name}</AssetName>
        <AssetPath onClick={() => copyPath(path)} title="Click to copy path">
          {path}
        </AssetPath>
      </AssetInfo>
    </Card>
  );
}

/* ── External Links ──────────────────────────────────── */

const ExternalLinks = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--space-4);
`;

const ExtLink = styled.a`
  display: block;
  padding: var(--space-4);
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--grey-mid);
  border-radius: var(--radius-md);
  text-decoration: none;
  transition: all 0.15s;

  &:hover {
    border-color: var(--gold);
    background: rgba(252, 219, 51, 0.04);
  }
`;

const ExtLinkTitle = styled.div`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
  margin-bottom: var(--space-1);
`;

const ExtLinkMeta = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
`;

/* ── Asset Data ──────────────────────────────────────── */

const SECTIONS = [
  {
    id: "backgrounds",
    title: "Backgrounds",
    desc: "Race-themed backgrounds from W3Champions",
    minWidth: "300px",
    items: [
      { name: "Human", src: "/backgrounds/human.jpg" },
      { name: "Night Elf", src: "/backgrounds/nightelf.jpg" },
      { name: "Orc", src: "/backgrounds/orc.jpg" },
      { name: "Undead", src: "/backgrounds/undead.jpg" },
    ],
  },
  {
    id: "theme-backgrounds",
    title: "Theme Backgrounds",
    desc: "Background candidates for the expanded theme system",
    minWidth: "400px",
    isThemeBackgrounds: true,
    groups: [
      {
        label: "Frozen Throne",
        items: [
          { name: "Arthas Close-up (1920x1080)", src: "/backgrounds/themes/frozen-throne.jpg", note: "has watermark" },
          { name: "Lich King on Throne", src: "/backgrounds/themes/frozen-throne-ice.jpg", note: "small watermark" },
          { name: "Undead Campaign — Northrend", src: "/backgrounds/themes/frozen-throne-alt.jpg" },
          { name: "Wrath Login — Frost Wyrm + Icecrown", src: "/backgrounds/themes/blight-alt.jpg", note: "clean, no text" },
        ],
      },
      {
        label: "Dalaran / Arcane",
        items: [
          { name: "Peter Lee — Floating City", src: "/backgrounds/themes/dalaran.jpg", note: "stunning" },
          { name: "Dalaran Overview", src: "/backgrounds/themes/dalaran-alt.jpg" },
        ],
      },
      {
        label: "Lordaeron",
        items: [
          { name: "Human Campaign — Knight in Gates", src: "/backgrounds/themes/lordaeron.jpg" },
          { name: "The Culling — Arthas at Stratholme", src: "/backgrounds/themes/culling.jpg", note: "has logos" },
        ],
      },
      {
        label: "Ashenvale",
        items: [
          { name: "Night Elf Campaign — Moonlit Forest", src: "/backgrounds/themes/ashenvale.jpg" },
        ],
      },
      {
        label: "Blackrock",
        items: [
          { name: "Blackrock Mountain Concept", src: "/backgrounds/themes/blackrock-alt.jpg", note: "incredible painting" },
          { name: "Upper Blackrock Spire Loading", src: "/backgrounds/themes/blackrock.jpg", note: "has WoW logo" },
        ],
      },
      {
        label: "Fel / Burning Legion",
        items: [
          { name: "Legion Wallpaper — Illidan", src: "/backgrounds/themes/fel.jpg", note: "has logo" },
          { name: "BC Login — Dark Portal", src: "/backgrounds/themes/fel-alt.jpg", note: "clean" },
          { name: "Legion Login — Tomb of Sargeras", src: "/backgrounds/themes/arcane-legion-login.jpg", note: "clean" },
          { name: "Outland WC3 Map", src: "/backgrounds/themes/outland.jpg", note: "map style" },
        ],
      },
      {
        label: "Holy Light",
        items: [
          { name: "Cathedral of Light — Hearthstone", src: "/backgrounds/themes/holy-light.jpg" },
          { name: "Uther the Lightbringer", src: "/backgrounds/themes/holy-light-alt.jpg" },
        ],
      },
      {
        label: "Blight / Plague",
        items: [
          { name: "Icecrown Citadel Loading", src: "/backgrounds/themes/blight.jpg", note: "has WoW logo" },
          { name: "Naxxramas Loading", src: "/backgrounds/themes/blight-naxx.jpg", note: "has WoW logo" },
          { name: "Wrath Login — Icecrown", src: "/backgrounds/themes/blight-alt.jpg", note: "clean" },
        ],
      },
      {
        label: "Arena",
        items: [
          { name: "Trial of the Crusader", src: "/backgrounds/themes/arena.jpg", note: "has WoW logo" },
          { name: "Ring of Valor — Horde Banners", src: "/backgrounds/themes/arena-alt.jpg", note: "clean" },
        ],
      },
      {
        label: "Midnight / Dark",
        items: [
          { name: "Shadowlands Login — Shattered Sky", src: "/backgrounds/themes/midnight.png", note: "clean, no text" },
          { name: "Revendreth — Gothic Castle", src: "/backgrounds/themes/midnight-revendreth.jpg" },
          { name: "Campfire Under Stars (existing)", src: "/frames/launcher/Static_Background.png" },
        ],
      },
    ],
  },
  {
    id: "wc3-frame",
    title: "WC3 Ornate Frame",
    desc: "Full border-image frame with decorative corners",
    minWidth: "300px",
    items: [{ name: "wc3-frame.png", src: "/frames/wc3-frame.png" }],
  },
  {
    id: "chat-frames",
    title: "Chat Frames",
    desc: "WoW chat frame borders and backgrounds",
    items: [
      { name: "ChatFrame", src: "/frames/chat/ChatFrame.png" },
      { name: "ChatFrameBorder", src: "/frames/chat/ChatFrameBorder.png" },
      { name: "ChatFrameInnerBorder", src: "/frames/chat/ChatFrameInnerBorder.png" },
      { name: "ChatFrameBackground", src: "/frames/chat/ChatFrameBackground.png" },
      { name: "BorderCorner", src: "/frames/chat/BorderCorner.png" },
      { name: "BorderLeft", src: "/frames/chat/BorderLeft.png" },
      { name: "BorderTop", src: "/frames/chat/BorderTop.png" },
    ],
  },
  {
    id: "wood",
    title: "Wood Borders",
    desc: "Achievement and BlackMarket wood frame pieces",
    items: [
      { name: "WoodBorder", src: "/frames/wood/WoodBorder.png" },
      { name: "WoodBorder-Corner", src: "/frames/wood/WoodBorder-Corner.png" },
      { name: "AchievementWood (H)", src: "/frames/wood/AchievementWood.png" },
      { name: "AchievementWood (V)", src: "/frames/wood/AchievementWoodVertical.png" },
      { name: "Corner TL", src: "/frames/wood/WoodCorner-TL.png" },
      { name: "Corner TR", src: "/frames/wood/WoodCorner-TR.png" },
      { name: "Corner BL", src: "/frames/wood/WoodCorner-BL.png" },
      { name: "Corner BR", src: "/frames/wood/WoodCorner-BR.png" },
      { name: "Tile Horizontal", src: "/frames/wood/WoodTile-H.png" },
      { name: "Tile Vertical", src: "/frames/wood/WoodTile-V.png" },
    ],
  },
  {
    id: "stone",
    title: "Stone / Bronze / Marble Corners",
    desc: "ItemTextFrame corner pieces — 4 variants",
    items: [
      { name: "Stone TL", src: "/frames/stone/Stone-TL.png" },
      { name: "Stone TR", src: "/frames/stone/Stone-TR.png" },
      { name: "Stone BL", src: "/frames/stone/Stone-BL.png" },
      { name: "Stone BR", src: "/frames/stone/Stone-BR.png" },
      { name: "Bronze TL", src: "/frames/stone/Bronze-TL.png" },
      { name: "Bronze TR", src: "/frames/stone/Bronze-TR.png" },
      { name: "Bronze BL", src: "/frames/stone/Bronze-BL.png" },
      { name: "Bronze BR", src: "/frames/stone/Bronze-BR.png" },
      { name: "Marble TL", src: "/frames/stone/Marble-TL.png" },
      { name: "Marble TR", src: "/frames/stone/Marble-TR.png" },
      { name: "Marble BL", src: "/frames/stone/Marble-BL.png" },
      { name: "Marble BR", src: "/frames/stone/Marble-BR.png" },
    ],
  },
  {
    id: "dialog",
    title: "Dialog Frames",
    desc: "WoW dialog box borders, corners, and backgrounds",
    items: [
      { name: "Background", src: "/frames/dialog/Background.png" },
      { name: "Background Dark", src: "/frames/dialog/Background-Dark.png" },
      { name: "Border", src: "/frames/dialog/Border.png" },
      { name: "Corner", src: "/frames/dialog/Corner.png" },
      { name: "Header", src: "/frames/dialog/Header.png" },
      { name: "Gold Background", src: "/frames/dialog/Gold-Background.png" },
      { name: "Gold Border", src: "/frames/dialog/Gold-Border.png" },
      { name: "Gold Corner", src: "/frames/dialog/Gold-Corner.png" },
      { name: "Gold Dragon", src: "/frames/dialog/Gold-Dragon.png" },
      { name: "Gold Header", src: "/frames/dialog/Gold-Header.png" },
    ],
  },
  {
    id: "tooltips",
    title: "Tooltips",
    desc: "9-slice tooltip borders and backgrounds",
    items: [
      { name: "Tooltip Frame", src: "/frames/tooltips/Tooltip.png" },
      { name: "Background", src: "/frames/tooltips/Background.png" },
      { name: "Border", src: "/frames/tooltips/Border.png" },
      { name: "TooltipBg", src: "/frames/tooltips/TooltipBg.png" },
      { name: "Top-Left", src: "/frames/tooltips/TL.png" },
      { name: "Top-Right", src: "/frames/tooltips/TR.png" },
      { name: "Bottom-Left", src: "/frames/tooltips/BL.png" },
      { name: "Bottom-Right", src: "/frames/tooltips/BR.png" },
      { name: "Top", src: "/frames/tooltips/T.png" },
      { name: "Bottom", src: "/frames/tooltips/B.png" },
      { name: "Left", src: "/frames/tooltips/L.png" },
      { name: "Right", src: "/frames/tooltips/R.png" },
    ],
  },
  {
    id: "parchment",
    title: "Parchment & Scroll",
    desc: "Tileable parchment textures and edge pieces",
    items: [
      { name: "Parchment", src: "/frames/parchment/Parchment.png" },
      { name: "Parchment Horizontal", src: "/frames/parchment/Parchment-H.png" },
      { name: "Quest Parchment", src: "/frames/parchment/QuestParchment.png" },
      { name: "Tileable", src: "/frames/parchment/Tileable.png" },
      { name: "Edge Top", src: "/frames/parchment/Edge-Top.png" },
      { name: "Edge Bottom", src: "/frames/parchment/Edge-Bottom.png" },
      { name: "Edge Left", src: "/frames/parchment/Edge-Left.png" },
      { name: "Edge Right", src: "/frames/parchment/Edge-Right.png" },
    ],
  },
  {
    id: "chat-bubbles",
    title: "Chat Bubbles",
    desc: "Speech bubble backdrops and tails",
    items: [
      { name: "Backdrop", src: "/frames/chat-bubbles/Backdrop.png" },
      { name: "Background", src: "/frames/chat-bubbles/Background.png" },
      { name: "Tail", src: "/frames/chat-bubbles/Tail.png" },
      { name: "ChatBubble", src: "/frames/chat-bubbles/ChatBubble.png" },
    ],
  },
  {
    id: "metal",
    title: "Metal Borders",
    desc: "Achievement metal border strips and joints",
    items: [
      { name: "Borders", src: "/frames/metal/Borders.png" },
      { name: "Left Strip", src: "/frames/metal/Left.png" },
      { name: "Top Strip", src: "/frames/metal/Top.png" },
      { name: "Joint", src: "/frames/metal/Joint.png" },
    ],
  },
  {
    id: "launcher",
    title: "W3Champions Launcher",
    desc: "Buttons, frames, and UI from the W3C launcher app",
    items: [
      { name: "Main Border", src: "/frames/launcher/Maon_Border.png" },
      { name: "Static Background", src: "/frames/launcher/Static_Background.png" },
      { name: "Header Frame", src: "/frames/launcher/Header_Buttons_Frame.png" },
      { name: "Header Frame Slim", src: "/frames/launcher/Header_Buttons_Frame_Slim.png" },
      { name: "Text Frame", src: "/frames/launcher/W3Champion_Text_Frame.png" },
      { name: "Settings Panel Frame", src: "/frames/launcher/Settings_Directory_Text_Frame.png" },
      { name: "Input Field Frame", src: "/frames/launcher/Settings_Directory_Frame.png" },
      { name: "Button Blue", src: "/frames/launcher/Button_Blue.png" },
      { name: "Button Blue Active", src: "/frames/launcher/Button_Blue_Active.png" },
      { name: "Exit Button", src: "/frames/launcher/Exit_Button.png" },
      { name: "Hero Button Active", src: "/frames/launcher/Green_Hero_Button_Active.png" },
      { name: "Hero Button Static", src: "/frames/launcher/Green_Hero_Button_Static.png" },
      { name: "Item Background", src: "/frames/launcher/itemBg.png" },
    ],
  },
  {
    id: "logos",
    title: "W3Champions Logos",
    desc: "Official W3Champions branding assets",
    items: [
      { name: "Medium Logo", src: "/frames/w3c-logos/medium-logo.png" },
      { name: "Medium Logotype", src: "/frames/w3c-logos/medium-logotype.png" },
      { name: "Small Logo Full", src: "/frames/w3c-logos/small-logo-full.png" },
      { name: "Small Logo Yellow", src: "/frames/w3c-logos/small-logo-full-yellow.png" },
      { name: "Small Logo", src: "/frames/w3c-logos/small-logo.png" },
    ],
  },
  {
    id: "fansite-kit",
    title: "WC3 Fansite Kit",
    desc: "Race-specific borders, buttons, and logos from the Frozen Throne UI kit",
    items: [
      { name: "Human Borders", src: "/frames/fansite-kit/human-borders.png" },
      { name: "Orc Borders", src: "/frames/fansite-kit/orb-borders.png" },
      { name: "Night Elf Borders", src: "/frames/fansite-kit/elf-borders.png" },
      { name: "Undead Borders", src: "/frames/fansite-kit/undead-borders.png" },
      { name: "4 Races", src: "/frames/fansite-kit/4-races.jpg" },
      { name: "Buttons", src: "/frames/fansite-kit/buttons.png" },
      { name: "Blue Button", src: "/frames/fansite-kit/blue-button.png" },
      { name: "Green Button", src: "/frames/fansite-kit/green-button.png" },
      { name: "Red Button", src: "/frames/fansite-kit/red-button.png" },
      { name: "Button Yes", src: "/frames/fansite-kit/button-yes.png" },
      { name: "Button No", src: "/frames/fansite-kit/button-no.png" },
      { name: "Chain", src: "/frames/fansite-kit/p-chain.png" },
      { name: "WC3: Reign of Chaos", src: "/frames/fansite-kit/warcraft-3-reign-of-chaos.png" },
      { name: "WC3: Frozen Throne", src: "/frames/fansite-kit/warcraft-3-the-frozen-throne.png" },
      { name: "RoC Icon", src: "/frames/fansite-kit/warcraft-3-reign-of-chaos-icon.png" },
      { name: "TFT Icon", src: "/frames/fansite-kit/warcraft-3-the-frozen-throne-icon.png" },
    ],
  },
  {
    id: "kenney",
    title: "Kenney Fantasy UI Borders",
    desc: "CC0 licensed 9-slice borders — kenney.nl/assets/fantasy-ui-borders",
    minWidth: "120px",
    items: [
      { name: "Preview Sheet", src: "/frames/external/kenney/Preview.png" },
      { name: "Sample Usage", src: "/frames/external/kenney/Sample.png" },
      { name: "Border 000", src: "/frames/external/kenney/panel-border-000.png" },
      { name: "Border 001", src: "/frames/external/kenney/panel-border-001.png" },
      { name: "Border 002", src: "/frames/external/kenney/panel-border-002.png" },
      { name: "Border 003", src: "/frames/external/kenney/panel-border-003.png" },
      { name: "Border 004", src: "/frames/external/kenney/panel-border-004.png" },
      { name: "Border 005", src: "/frames/external/kenney/panel-border-005.png" },
      { name: "Border 010", src: "/frames/external/kenney/panel-border-010.png" },
      { name: "Border 015", src: "/frames/external/kenney/panel-border-015.png" },
      { name: "Border 020", src: "/frames/external/kenney/panel-border-020.png" },
      { name: "Border 025", src: "/frames/external/kenney/panel-border-025.png" },
      { name: "Border 030", src: "/frames/external/kenney/panel-border-030.png" },
      { name: "Border 031", src: "/frames/external/kenney/panel-border-031.png" },
      { name: "Panel 000", src: "/frames/external/kenney/panel-000.png" },
      { name: "Panel 005", src: "/frames/external/kenney/panel-005.png" },
      { name: "Panel 010", src: "/frames/external/kenney/panel-010.png" },
      { name: "Panel 015", src: "/frames/external/kenney/panel-015.png" },
      { name: "Panel 020", src: "/frames/external/kenney/panel-020.png" },
      { name: "Panel 025", src: "/frames/external/kenney/panel-025.png" },
      { name: "Panel 030", src: "/frames/external/kenney/panel-030.png" },
      { name: "Double Border 000", src: "/frames/external/kenney/double-border-panel-border-000.png" },
      { name: "Double Border 005", src: "/frames/external/kenney/double-border-panel-border-005.png" },
      { name: "Double Border 010", src: "/frames/external/kenney/double-border-panel-border-010.png" },
      { name: "Double Border 015", src: "/frames/external/kenney/double-border-panel-border-015.png" },
      { name: "Double Border 020", src: "/frames/external/kenney/double-border-panel-border-020.png" },
    ],
  },
  {
    id: "hive-workshop",
    title: "Hive Workshop Custom UIs",
    desc: "Custom WC3 UI packs — hiveworkshop.com/repositories/user-interface.779",
    minWidth: "280px",
    items: [
      { name: "Dragon Scales UI", src: "/frames/external/hive/dragon-scales.jpg" },
      { name: "Scions of the Sky UI", src: "/frames/external/hive/scions-sky.jpg" },
      { name: "Fallout UI", src: "/frames/external/hive/fallout.jpg" },
      { name: "Kul Tiran Custom UI", src: "/frames/external/hive/kul-tiran.jpg" },
    ],
  },
];

const TAB_IDS = SECTIONS.map((s) => s.id);

export default function Assets() {
  const [activeTab, setActiveTab] = useState("all");

  const visibleSections =
    activeTab === "all" ? SECTIONS : SECTIONS.filter((s) => s.id === activeTab);

  return (
    <Page>
      <Title>Asset Library</Title>
      <Subtitle>
        WC3 &amp; WoW UI textures, borders, frames, backgrounds. Click path to copy.
      </Subtitle>

      <TabBar>
        <Tab $active={activeTab === "all"} onClick={() => setActiveTab("all")}>
          All
        </Tab>
        {SECTIONS.map((s) => (
          <Tab
            key={s.id}
            $active={activeTab === s.id}
            onClick={() => setActiveTab(s.id)}
          >
            {s.title}
          </Tab>
        ))}
      </TabBar>

      {visibleSections.map((section) => (
        <Section key={section.id}>
          <SectionTitle>{section.title}</SectionTitle>
          <SectionDesc>{section.desc}</SectionDesc>

          {/* Theme backgrounds — grouped by theme */}
          {section.isThemeBackgrounds ? (
            <>
              {section.groups.map((group) => (
                <React.Fragment key={group.label}>
                  <SectionDesc style={{ marginTop: "var(--space-6)", color: "var(--gold)", fontSize: "var(--text-xs)", textTransform: "none", letterSpacing: "normal" }}>
                    {group.label}
                  </SectionDesc>
                  <Grid $minWidth="400px">
                    {group.items.map((item) => (
                      <Card key={item.src}>
                        <BgPreview $src={item.src} />
                        <AssetInfo>
                          <AssetName>{item.name}</AssetName>
                          <AssetPath onClick={() => copyPath(item.src)}>
                            {item.src}{item.note ? ` — ${item.note}` : ""}
                          </AssetPath>
                        </AssetInfo>
                      </Card>
                    ))}
                  </Grid>
                </React.Fragment>
              ))}
            </>
          ) : /* Special rendering for backgrounds */
          section.id === "backgrounds" ? (
            <Grid $minWidth="300px">
              {section.items.map((item) => (
                <Card key={item.name}>
                  <BgPreview $src={item.src} />
                  <AssetInfo>
                    <AssetName>{item.name}</AssetName>
                    <AssetPath onClick={() => copyPath(item.src)}>{item.src}</AssetPath>
                  </AssetInfo>
                  <BgOverlayPreview $src={item.src} $overlay="rgba(0,0,0,0.85)" />
                  <AssetInfo>
                    <AssetName>{item.name} + 85% overlay</AssetName>
                  </AssetInfo>
                </Card>
              ))}
            </Grid>
          ) : section.id === "wc3-frame" ? (
            /* Special rendering for the main WC3 frame */
            <Grid $minWidth="300px">
              <Card>
                <ImageWrapper $minHeight="200px">
                  <AssetImage src={section.items[0].src} $maxH="300px" />
                </ImageWrapper>
                <AssetInfo>
                  <AssetName>Raw Image</AssetName>
                  <AssetPath onClick={() => copyPath(section.items[0].src)}>
                    {section.items[0].src}
                  </AssetPath>
                </AssetInfo>
              </Card>
              <Card>
                <ImageWrapper $minHeight="200px" $bg="transparent">
                  <FramePreviewBox $src='"/frames/wc3-frame.png"' $slice="80" $borderWidth="16px">
                    border-image preview
                  </FramePreviewBox>
                </ImageWrapper>
                <AssetInfo>
                  <AssetName>As border-image (16px, slice 80)</AssetName>
                </AssetInfo>
              </Card>
              <Card>
                <ImageWrapper $minHeight="200px" $bg="transparent">
                  <FramePreviewBox $src='"/frames/wc3-frame.png"' $slice="80" $borderWidth="24px">
                    border-image preview
                  </FramePreviewBox>
                </ImageWrapper>
                <AssetInfo>
                  <AssetName>As border-image (24px, slice 80)</AssetName>
                </AssetInfo>
              </Card>
            </Grid>
          ) : section.id === "stone" ? (
            /* Stone corners with assembly preview */
            <>
              <Grid $minWidth="140px">
                {section.items.map((item) => (
                  <AssetCard
                    key={item.name}
                    src={item.src}
                    name={item.name}
                    path={item.src}
                    maxH="100px"
                  />
                ))}
              </Grid>
              <SectionDesc style={{ marginTop: "var(--space-6)" }}>
                Corner Assembly Previews
              </SectionDesc>
              <Grid $minWidth="250px">
                {["Stone", "Bronze", "Marble"].map((variant) => (
                  <Card key={variant}>
                    <CornerGrid>
                      <CornerImg src={`/frames/stone/${variant}-TL.png`} />
                      <div />
                      <CornerImg src={`/frames/stone/${variant}-TR.png`} />
                      <div />
                      <CornerCenter>{variant}</CornerCenter>
                      <div />
                      <CornerImg src={`/frames/stone/${variant}-BL.png`} />
                      <div />
                      <CornerImg src={`/frames/stone/${variant}-BR.png`} />
                    </CornerGrid>
                    <AssetInfo>
                      <AssetName>{variant} Corners Assembled</AssetName>
                    </AssetInfo>
                  </Card>
                ))}
              </Grid>
            </>
          ) : section.id === "wood" && section.items.length >= 8 ? (
            /* Wood with assembly preview */
            <>
              <Grid $minWidth="160px">
                {section.items.map((item) => (
                  <AssetCard
                    key={item.name}
                    src={item.src}
                    name={item.name}
                    path={item.src}
                    maxH="120px"
                  />
                ))}
              </Grid>
              <SectionDesc style={{ marginTop: "var(--space-6)" }}>
                Wood Corner Assembly
              </SectionDesc>
              <Grid $minWidth="300px">
                <Card>
                  <CornerGrid>
                    <CornerImg src="/frames/wood/WoodCorner-TL.png" />
                    <div />
                    <CornerImg src="/frames/wood/WoodCorner-TR.png" />
                    <div />
                    <CornerCenter>Wood Frame</CornerCenter>
                    <div />
                    <CornerImg src="/frames/wood/WoodCorner-BL.png" />
                    <div />
                    <CornerImg src="/frames/wood/WoodCorner-BR.png" />
                  </CornerGrid>
                  <AssetInfo>
                    <AssetName>BlackMarket Wood Corners</AssetName>
                  </AssetInfo>
                </Card>
              </Grid>
            </>
          ) : section.id === "kenney" ? (
            /* Kenney with dark bg so white sprites are visible */
            <Grid $minWidth={section.minWidth || "120px"}>
              {section.items.map((item) => (
                <AssetCard
                  key={item.name}
                  src={item.src}
                  name={item.name}
                  path={item.src}
                  bg="#222"
                  maxH={item.name.startsWith("Preview") || item.name.startsWith("Sample") ? "300px" : "120px"}
                  minHeight={item.name.startsWith("Preview") || item.name.startsWith("Sample") ? "200px" : "80px"}
                />
              ))}
            </Grid>
          ) : (
            /* Default grid */
            <Grid $minWidth={section.minWidth || "200px"}>
              {section.items.map((item) => (
                <AssetCard
                  key={item.name}
                  src={item.src}
                  name={item.name}
                  path={item.src}
                />
              ))}
            </Grid>
          )}
        </Section>
      ))}

      <Section>
        <SectionTitle>External Resources</SectionTitle>
        <SectionDesc>Additional fantasy UI border packs available online</SectionDesc>
        <ExternalLinks>
          <ExtLink href="https://kenney.nl/assets/fantasy-ui-borders" target="_blank" rel="noopener">
            <ExtLinkTitle>Kenney Fantasy UI Borders</ExtLinkTitle>
            <ExtLinkMeta>CC0 — 140 sprites, 9-slice, free commercial use</ExtLinkMeta>
          </ExtLink>
          <ExtLink href="https://gaming-tools.com/warcraft-3/warcraft-3-fansite-kit-free-download/" target="_blank" rel="noopener">
            <ExtLinkTitle>WC3 Fansite Kit</ExtLinkTitle>
            <ExtLinkMeta>Free — Race-specific borders (Human, Orc, NE, UD) + Lifecraft font</ExtLinkMeta>
          </ExtLink>
          <ExtLink href="https://www.hiveworkshop.com/repositories/user-interface.779/" target="_blank" rel="noopener">
            <ExtLinkTitle>Hive Workshop Custom UIs</ExtLinkTitle>
            <ExtLinkMeta>Community — 9+ pages of custom WC3 UI replacement packs</ExtLinkMeta>
          </ExtLink>
          <ExtLink href="https://ronenness.github.io/RPGUI/" target="_blank" rel="noopener">
            <ExtLinkTitle>RPGUI Framework</ExtLinkTitle>
            <ExtLinkMeta>zlib license — CSS/JS RPG frames (framed-golden, framed-golden-2)</ExtLinkMeta>
          </ExtLink>
          <ExtLink href="https://opengameart.org/content/golden-ui" target="_blank" rel="noopener">
            <ExtLinkTitle>OpenGameArt: Golden UI</ExtLinkTitle>
            <ExtLinkMeta>CC0 — Panels, bars, buttons, inventory by Buch</ExtLinkMeta>
          </ExtLink>
          <ExtLink href="https://free-game-assets.itch.io/fantasy-rpg-user-interface" target="_blank" rel="noopener">
            <ExtLinkTitle>Fantasy RPG UI (itch.io)</ExtLinkTitle>
            <ExtLinkMeta>$0.90 — Includes chat interface assets, gold frames</ExtLinkMeta>
          </ExtLink>
          <ExtLink href="https://codepen.io/kevinmcullen/pen/PVmwVz" target="_blank" rel="noopener">
            <ExtLinkTitle>Gold Shimmer Border (CodePen)</ExtLinkTitle>
            <ExtLinkMeta>CSS-only — Animated gold border sweep effect</ExtLinkMeta>
          </ExtLink>
          <ExtLink href="https://codepen.io/propjockey/pen/poqKrGe" target="_blank" rel="noopener">
            <ExtLinkTitle>CSS Fantasy Buttons (CodePen)</ExtLinkTitle>
            <ExtLinkMeta>CSS-only — Metallic gradient border techniques</ExtLinkMeta>
          </ExtLink>
        </ExternalLinks>
      </Section>
    </Page>
  );
}
