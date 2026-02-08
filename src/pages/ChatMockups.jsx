import React from "react";
import styled, { css } from "styled-components";
import { raceMapping } from "../lib/constants";

const Page = styled.div`
  padding: var(--space-6) var(--space-8);
  max-width: 1400px;
  margin: 0 auto;
`;

const PageTitle = styled.h1`
  font-family: var(--font-display);
  font-size: var(--text-xl);
  color: var(--gold);
  margin-bottom: var(--space-2);
`;

const PageSubtitle = styled.p`
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--grey-light);
  margin-bottom: var(--space-8);
`;

const MockupSection = styled.section`
  margin-bottom: var(--space-12);
`;

const MockupLabel = styled.h2`
  font-family: var(--font-display);
  font-size: var(--text-lg);
  color: #fff;
  margin-bottom: var(--space-1);
`;

const MockupDesc = styled.p`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: var(--space-4);
`;

/* ── Mockup Container (simulates full chat page) ──────── */

const MockupContainer = styled.div`
  position: relative;
  border-radius: var(--radius-md);
  overflow: hidden;
  height: 700px;
  display: flex;
  gap: var(--space-4);
  padding: var(--space-2) var(--space-4);

  &::before {
    content: "";
    position: absolute;
    inset: 0;
    background: ${(p) =>
      p.$bgTile ? `url(${p.$bgTile}) repeat center / 256px` :
      p.$bgImage ? `url(${p.$bgImage}) center / cover no-repeat` :
      "#080808"};
    z-index: 0;
  }

  &::after {
    content: "";
    position: absolute;
    inset: 0;
    background: ${(p) => p.$overlay || "rgba(0,0,0,0.5)"};
    z-index: 1;
  }

  > * {
    position: relative;
    z-index: 2;
  }
`;

/* ── Chat Panel ──────────────────────────────────────── */

const ChatPanel = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  ${(p) => p.$frameStyle || ""}
`;

const ChatHeader = styled.div`
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid rgba(160, 130, 80, 0.15);
  background: linear-gradient(180deg, rgba(160, 130, 80, 0.04) 0%, transparent 100%);
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.2);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
`;

const ChatTitle = styled.span`
  font-family: var(--font-display);
  font-size: var(--text-base);
  color: var(--gold);
`;

const ChatStatus = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--grey-light);
  display: flex;
  align-items: center;
  gap: var(--space-2);

  &::before {
    content: "";
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--green);
  }
`;

const ChatMessages = styled.div`
  flex: 1;
  padding: var(--space-2) var(--space-4);
  overflow-y: auto;

  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: var(--grey-mid); border-radius: 3px; }
`;

/* ── Message Segment (matches real ChatPanel layout) ──── */

const MessageSegment = styled.div`
  position: relative;
  min-height: 85px;
  margin-top: var(--space-4);
  padding-bottom: var(--space-1);

  &:first-child { margin-top: 0; }
`;

const AvatarContainer = styled.div`
  position: absolute;
  left: var(--space-2);
  top: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 60px;
`;

const Avatar = styled.div`
  width: 60px;
  height: 60px;
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
`;

const AvatarStats = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 3px;
  line-height: 1;
  gap: 4px;
`;

const MmrRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 4px;
  white-space: nowrap;
`;

const MmrValue = styled.span`
  font-family: var(--font-mono);
  font-size: 14px;
  color: #fff;
  font-weight: 700;
`;

const MmrLabel = styled.span`
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--grey-light);
  opacity: 0.6;
`;

const FormDots = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
  justify-content: center;
`;

const FormDot = styled.span`
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${(p) => (p.$win ? "var(--green)" : "var(--red)")};
  opacity: 0.8;
`;

const GroupStartRow = styled.div`
  padding: 2px var(--space-4) 2px 84px;
  line-height: 1.375;
`;

const ContinuationRow = styled.div`
  padding: 2px var(--space-4) 2px 84px;
  line-height: 1.375;
`;

const MsgName = styled.span`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
`;

const MsgTime = styled.span`
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--grey-light);
  margin-left: var(--space-2);
`;

const MsgText = styled.span`
  font-family: var(--font-body);
  color: #e0e0e0;
  font-size: 15px;
  line-height: 1.6;
  word-break: break-word;
`;

/* ── Sidebar ─────────────────────────────────────────── */

const SidebarPanel = styled.div`
  width: 220px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
  ${(p) => p.$frameStyle || ""}
`;

const SidebarHeader = styled.div`
  padding: var(--space-2) var(--space-4);
  border-bottom: 1px solid rgba(160, 130, 80, 0.15);
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--grey-light);
  flex-shrink: 0;
`;

const SidebarCount = styled.span`
  color: var(--gold);
`;

const ColumnHeaders = styled.div`
  display: flex;
  align-items: center;
  padding: var(--space-1) var(--space-4);
  padding-left: calc(var(--space-4) + 28px + var(--space-4));
  border-bottom: 1px solid rgba(160, 130, 80, 0.15);
  background: rgba(20, 16, 12, 0.6);
  font-family: var(--font-mono);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  flex-shrink: 0;
`;

const ColPlayer = styled.span`
  flex: 1;
  color: var(--gold);
`;

const ColMmr = styled.span`
  flex-shrink: 0;
  color: var(--grey-light);
`;

const SidebarList = styled.div`
  flex: 1;
  padding: var(--space-1) 0;
  overflow-y: auto;

  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: var(--grey-mid); border-radius: 3px; }
`;

const SidebarRow = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-sm);
  margin: 0 var(--space-1);

  &:hover { background: rgba(255, 255, 255, 0.04); }
`;

const SidebarAvatar = styled.div`
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
`;

const SidebarName = styled.span`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const SidebarMmr = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: #fff;
`;

/* ── Transcript Data ─────────────────────────────────── */

const TRANSCRIPT = [
  {
    name: "Spermfeather", mmr: 1028, time: "4:10",
    dots: [false, false, true, false, true, false, false],
    lines: [
      "i canot belive u fucking did htat",
      "that was ufcking VITAL TO WIN",
    ],
  },
  {
    name: "Abouttogoafk", mmr: 1351, time: "4:10",
    dots: [true, true, true, true, false, true],
    lines: ["upose thank you for 1v2"],
  },
  {
    name: "Spermfeather", mmr: 1028, time: "4:10",
    dots: [false, false, true, false, true, false, false],
    lines: ["u god dann idiot"],
  },
  {
    name: "upos", mmr: 1251, time: "4:10",
    dots: [true, true, false, true, true, true, true, false],
    lines: [
      "lol whatever",
      "u had 2 heros all game",
    ],
  },
  {
    name: "Spermfeather", mmr: 1028, time: "4:10",
    dots: [false, false, true, false, true, false, false],
    lines: [
      "WE EVENTALKED AOBUT IT",
      "DEFNED THAT SIDE",
      "u fucking refused",
      "and made us lose",
      "what afuckng idiot",
    ],
  },
  {
    name: "upos", mmr: 1251, time: "4:11",
    dots: [true, true, false, true, true, true, true, false],
    lines: [
      "didnt someone say tp?",
      "to we lose?",
      "no?",
      "cause i think i saw that",
    ],
  },
  {
    name: "Spermfeather", mmr: 1028, time: "4:11",
    dots: [false, false, true, false, true, false, false],
    lines: [
      "i expo my side the STAY ON UR SIDE TO DEFEND",
      "idiot",
      "not take my natural expo",
      "and then i cant defnd urs",
    ],
  },
];

const USERS = [
  { name: "Ice", mmr: 2336 },
  { name: "ToD", mmr: 2288 },
  { name: "KODOFO...", mmr: 2136 },
  { name: "Cechi", mmr: 2119 },
  { name: "finicky", mmr: 2068 },
  { name: "lutz", mmr: 2067 },
  { name: "bobbyog", mmr: 2060 },
  { name: "EyeServ", mmr: 2055 },
  { name: "Solana", mmr: 2009 },
  { name: "Sanya", mmr: 1998 },
  { name: "Boyzinho", mmr: 1984 },
  { name: "SHIP", mmr: 1951 },
  { name: "ALPHA", mmr: 1892 },
  { name: "Q8DARKL...", mmr: 1887 },
  { name: "Napo", mmr: 1872 },
  { name: "JperezImba", mmr: 1871 },
  { name: "KNOPPERS", mmr: 1871 },
  { name: "Hindsight", mmr: 1856 },
];

function TranscriptChat() {
  return (
    <ChatMessages>
      {TRANSCRIPT.map((seg, i) => (
        <MessageSegment key={i}>
          <AvatarContainer>
            <Avatar />
            <AvatarStats>
              <MmrRow>
                <MmrValue>{seg.mmr}</MmrValue>
                <MmrLabel>MMR</MmrLabel>
              </MmrRow>
              <FormDots>
                {seg.dots.map((w, j) => <FormDot key={j} $win={w} />)}
              </FormDots>
            </AvatarStats>
          </AvatarContainer>
          <GroupStartRow>
            <div>
              <MsgName>{seg.name}</MsgName>
              <MsgTime>{seg.time}</MsgTime>
            </div>
            <MsgText>{seg.lines[0]}</MsgText>
          </GroupStartRow>
          {seg.lines.slice(1).map((line, j) => (
            <ContinuationRow key={j}>
              <MsgText>{line}</MsgText>
            </ContinuationRow>
          ))}
        </MessageSegment>
      ))}
    </ChatMessages>
  );
}

function SidebarContent() {
  return (
    <>
      <ColumnHeaders>
        <ColPlayer>Player</ColPlayer>
        <ColMmr>MMR</ColMmr>
      </ColumnHeaders>
      <SidebarList>
        {USERS.map((u) => (
          <SidebarRow key={u.name}>
            <SidebarAvatar />
            <SidebarName>{u.name}</SidebarName>
            <SidebarMmr>{u.mmr}</SidebarMmr>
          </SidebarRow>
        ))}
      </SidebarList>
    </>
  );
}

/* ── Wood Frame (assembled from corner + tile pieces) ─── */

const WoodFrameWrapper = styled.div`
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: ${(p) => p.$bg || "rgba(10, 8, 6, 0.6)"};
  backdrop-filter: blur(8px);
`;

const WoodCorner = styled.img`
  position: absolute;
  width: 48px;
  height: 48px;
  z-index: 3;
  ${(p) => p.$pos === "tl" && "top: 0; left: 0;"}
  ${(p) => p.$pos === "tr" && "top: 0; right: 0;"}
  ${(p) => p.$pos === "bl" && "bottom: 0; left: 0;"}
  ${(p) => p.$pos === "br" && "bottom: 0; right: 0;"}
`;

const WoodEdgeH = styled.div`
  position: absolute;
  left: 48px;
  right: 48px;
  height: 16px;
  z-index: 2;
  background: url("/frames/wood/WoodTile-H.png") repeat-x center / auto 100%;
  ${(p) => p.$top ? "top: 0;" : "bottom: 0;"}
`;

const WoodEdgeV = styled.div`
  position: absolute;
  top: 48px;
  bottom: 48px;
  width: 16px;
  z-index: 2;
  background: url("/frames/wood/WoodTile-V.png") repeat-y center / 100% auto;
  ${(p) => p.$left ? "left: 0;" : "right: 0;"}
`;

const WoodInner = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  margin: 14px;
  z-index: 1;
`;

function WoodFrame({ children, bg }) {
  return (
    <WoodFrameWrapper $bg={bg}>
      <WoodCorner src="/frames/wood/WoodCorner-TL.png" $pos="tl" />
      <WoodCorner src="/frames/wood/WoodCorner-TR.png" $pos="tr" />
      <WoodCorner src="/frames/wood/WoodCorner-BL.png" $pos="bl" />
      <WoodCorner src="/frames/wood/WoodCorner-BR.png" $pos="br" />
      <WoodEdgeH $top />
      <WoodEdgeH />
      <WoodEdgeV $left />
      <WoodEdgeV />
      <WoodInner>{children}</WoodInner>
    </WoodFrameWrapper>
  );
}

/* ── Parchment-tinted panels ─────────────────────────── */

const ParchmentPanel = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  border: 1px solid rgba(140, 110, 60, 0.4);

  &::before {
    content: "";
    position: absolute;
    inset: 0;
    background: url("/frames/parchment/Tileable.png") repeat center / 256px;
    opacity: ${(p) => p.$opacity || 0.08};
    z-index: 0;
    pointer-events: none;
  }

  > * { position: relative; z-index: 1; }
  background: ${(p) => p.$bg || "rgba(20, 15, 8, 0.7)"};
  backdrop-filter: blur(8px);
`;

/* ── Frame Styles ────────────────────────────────────── */

const FRAME_STYLES = {
  wc3Frame: `
    border: 20px solid transparent;
    border-image: url("/frames/wc3-frame.png") 80 / 20px stretch;
    background: rgba(10, 8, 6, 0.6);
    backdrop-filter: blur(8px);
  `,
  launcherBorder: `
    border: 24px solid transparent;
    border-image: url("/frames/launcher/Maon_Border.png") 120 / 24px stretch;
    background: rgba(10, 8, 6, 0.6);
    backdrop-filter: blur(8px);
  `,
  simpleBorder: `
    border: 1px solid rgba(160, 130, 80, 0.3);
    border-radius: var(--radius-md);
    background: rgba(10, 8, 6, 0.6);
    backdrop-filter: blur(8px);
  `,
  goldBorder: `
    border: 2px solid rgba(252, 219, 51, 0.25);
    border-radius: var(--radius-md);
    background: rgba(10, 8, 6, 0.6);
    backdrop-filter: blur(8px);
  `,
};

/* ── Mockup Definitions ──────────────────────────────── */

const MOCKUPS = [
  {
    label: "A: Parchment BG + Wood Frame",
    desc: "Parchment page background + wood corner frame — tavern notice board",
    bg: "/frames/parchment/Parchment-H.png",
    overlay: "rgba(0, 0, 0, 0.3)",
    chatType: "wood",
    sidebarFrame: FRAME_STYLES.simpleBorder,
  },
  {
    label: "B: Parchment BG + WC3 Ornate Frame",
    desc: "Parchment page + gold ornamental frame — royal decree",
    bg: "/frames/parchment/Parchment-H.png",
    overlay: "rgba(0, 0, 0, 0.3)",
    chatFrame: FRAME_STYLES.wc3Frame,
    sidebarFrame: FRAME_STYLES.simpleBorder,
  },
  {
    label: "C: Parchment BG + Launcher Border",
    desc: "Parchment page + iron launcher frame",
    bg: "/frames/parchment/Parchment-H.png",
    overlay: "rgba(0, 0, 0, 0.3)",
    chatFrame: FRAME_STYLES.launcherBorder,
    sidebarFrame: FRAME_STYLES.simpleBorder,
  },
  {
    label: "D: Parchment BG (dark) + Wood Frame",
    desc: "Heavily darkened parchment + wood frame — aged scroll",
    bg: "/frames/parchment/Parchment-H.png",
    overlay: "rgba(0, 0, 0, 0.65)",
    chatType: "wood",
    sidebarFrame: FRAME_STYLES.simpleBorder,
  },
  {
    label: "E: Parchment Tile BG + Wood Frame",
    desc: "Tileable parchment texture repeating + wood corners",
    bgTile: "/frames/parchment/Tileable.png",
    overlay: "rgba(0, 0, 0, 0.35)",
    chatType: "wood",
    sidebarFrame: FRAME_STYLES.simpleBorder,
  },
  {
    label: "F: Parchment Tile BG (dark) + WC3 Frame",
    desc: "Tileable parchment darkened + gold ornamental frame",
    bgTile: "/frames/parchment/Tileable.png",
    overlay: "rgba(0, 0, 0, 0.6)",
    chatFrame: FRAME_STYLES.wc3Frame,
    sidebarFrame: FRAME_STYLES.wc3Frame,
  },
  {
    label: "G: Campfire + Launcher Border (for comparison)",
    desc: "Previous favorite — campfire + iron frame",
    bg: "/frames/launcher/Static_Background.png",
    overlay: "rgba(0, 0, 0, 0.45)",
    chatFrame: FRAME_STYLES.launcherBorder,
    sidebarFrame: FRAME_STYLES.simpleBorder,
  },
  {
    label: "H: Campfire + Wood Frame (for comparison)",
    desc: "Campfire + wood corners and tile edges",
    bg: "/frames/launcher/Static_Background.png",
    overlay: "rgba(0, 0, 0, 0.45)",
    chatType: "wood",
    sidebarFrame: FRAME_STYLES.simpleBorder,
  },
];

/* ══════════════════════════════════════════════════════════
   ACTIVE GAMES SIDEBAR LAYOUT MOCKUPS
   ══════════════════════════════════════════════════════════ */

const FAKE_MATCHES = [
  {
    map: "Mur'gul Oasis LV",
    mapImg: "/maps/MurgulOasisLV.png",
    elapsed: "3:58",
    team1: [
      { name: "Densington", race: 1 },
      { name: "nonamee", race: 4 },
      { name: "Sageypoo", race: 8 },
      { name: "Apm50", race: 0 },
    ],
    team2: [
      { name: "TYRN", race: 8 },
      { name: "qwerty", race: 2 },
      { name: "Driver", race: 4 },
      { name: "nASoRCo", race: 2 },
    ],
    avg1: 1478,
    avg2: 1479,
  },
  {
    map: "Deadlock LV",
    mapImg: "/maps/DeadlockLV.png",
    elapsed: "4:10",
    team1: [
      { name: "Ice", race: 4 },
      { name: "XIIINostra", race: 2 },
      { name: "volume!one", race: 1 },
      { name: "ShoananasS", race: 8 },
    ],
    team2: [
      { name: "Cechi", race: 8 },
      { name: "EyeServ", race: 4 },
      { name: "Teo", race: 1 },
      { name: "ReetarDio", race: 2 },
    ],
    avg1: 2086,
    avg2: 2077,
  },
  {
    map: "Ferocity",
    mapImg: "/maps/Ferocity.png",
    elapsed: "9:51",
    team1: [
      { name: "Heavenwaits", race: 1 },
      { name: "jau69", race: 8 },
      { name: "flOatmybOat", race: 4 },
      { name: "QQs", race: 2 },
    ],
    team2: [
      { name: "DennisR", race: 1 },
      { name: "pomanta", race: 4 },
      { name: "Inarijaervi", race: 2 },
      { name: "Slothien", race: 8 },
    ],
    avg1: 1528,
    avg2: 1526,
  },
];

/* ── Shared mockup styled components ─────────────────── */

const AGFrame = styled.div`
  width: ${(p) => p.$width || "340px"};
  box-sizing: border-box;
  border: 24px solid transparent;
  border-image: url("/frames/launcher/Maon_Border.png") 120 / 24px stretch;
  background: rgba(10, 8, 6, 0.45);
  backdrop-filter: blur(4px);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  flex-shrink: 0;

  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: var(--grey-mid); border-radius: 3px; }
`;

const AGHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px var(--space-4);
  border-bottom: 1px solid rgba(252, 219, 51, 0.15);
  background: linear-gradient(180deg, rgba(160, 130, 80, 0.06) 0%, transparent 100%);
  flex-shrink: 0;
`;

const AGHeaderTitle = styled.span`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
  letter-spacing: 1px;
`;

const AGHeaderCount = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
`;

const AGCard = styled.div`
  display: block;
  padding: var(--space-4) var(--space-3);
  margin: var(--space-3) var(--space-2);
  border-radius: var(--radius-md);
  border: 1px solid rgba(160, 130, 80, 0.12);
  background: rgba(255, 255, 255, 0.02);
`;

const AGLiveDot = styled.span`
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--red);
  margin-right: 4px;
  animation: pulse 1.5s infinite;
`;

const AGRaceIcon = styled.img`
  width: ${(p) => p.$size || "16px"};
  height: ${(p) => p.$size || "16px"};
  flex-shrink: 0;
`;

const AGPlayerName = styled.span`
  font-family: var(--font-display);
  font-size: ${(p) => p.$size || "13px"};
  color: rgba(255, 255, 255, 0.85);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  flex: 1;
`;

const AGMapName = styled.div`
  font-family: var(--font-display);
  font-size: ${(p) => p.$size || "var(--text-xs)"};
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const AGElapsed = styled.div`
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--grey-light);
`;

const AGTeamLabel = styled.div`
  font-family: var(--font-mono);
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${(p) => (p.$team === 1 ? "var(--blue, #4a9eff)" : "var(--red)")};
  opacity: 0.6;
  margin-bottom: 2px;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
`;

const AGAvgMmr = styled.span`
  font-family: var(--font-mono);
  font-size: 10px;
  color: #fff;
  opacity: 0.8;
  text-transform: none;
  letter-spacing: 0;
`;

const AGMapImg = styled.img`
  border-radius: var(--radius-sm);
  object-fit: cover;
  flex-shrink: 0;
`;

const AGVs = styled.span`
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--grey-light);
  opacity: 0.5;
`;

/* ── Layout A: Banner Map ────────────────────────────── */

const BannerImg = styled.img`
  width: 100%;
  height: 80px;
  object-fit: cover;
  border-radius: var(--radius-sm) var(--radius-sm) 0 0;
  margin: -16px -12px 0 -12px;
  width: calc(100% + 24px);
`;

const BannerOverlay = styled.div`
  position: relative;
  margin-top: -28px;
  padding: 0 var(--space-2);
  margin-bottom: var(--space-3);
`;

function LayoutA({ match }) {
  return (
    <AGCard>
      <BannerImg src={match.mapImg} alt="" />
      <BannerOverlay>
        <AGMapName $size="var(--text-sm)" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>{match.map}</AGMapName>
        <AGElapsed><AGLiveDot />{match.elapsed}</AGElapsed>
      </BannerOverlay>
      <div style={{ display: "flex", gap: "12px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <AGTeamLabel $team={1}><span>Team 1</span><AGAvgMmr>{match.avg1}</AGAvgMmr></AGTeamLabel>
          {match.team1.map((p, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
              <AGRaceIcon src={raceMapping[p.race]} />
              <AGPlayerName>{p.name}</AGPlayerName>
            </div>
          ))}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <AGTeamLabel $team={2}><span>Team 2</span><AGAvgMmr>{match.avg2}</AGAvgMmr></AGTeamLabel>
          {match.team2.map((p, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
              <AGRaceIcon src={raceMapping[p.race]} />
              <AGPlayerName>{p.name}</AGPlayerName>
            </div>
          ))}
        </div>
      </div>
    </AGCard>
  );
}

/* ── Layout B: Compact race icons only ───────────────── */

const RaceRow = styled.div`
  display: flex;
  align-items: center;
  gap: 3px;
`;

function LayoutB({ match }) {
  return (
    <AGCard style={{ padding: "12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <AGMapImg src={match.mapImg} style={{ width: 40, height: 40 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <AGMapName>{match.map}</AGMapName>
          <AGElapsed><AGLiveDot />{match.elapsed}</AGElapsed>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "6px 0" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: "#fff", fontWeight: 700 }}>{match.avg1}</div>
          <RaceRow>
            {match.team1.map((p, i) => <AGRaceIcon key={i} src={raceMapping[p.race]} $size="18px" />)}
          </RaceRow>
        </div>
        <AGVs>vs</AGVs>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: "#fff", fontWeight: 700 }}>{match.avg2}</div>
          <RaceRow>
            {match.team2.map((p, i) => <AGRaceIcon key={i} src={raceMapping[p.race]} $size="18px" />)}
          </RaceRow>
        </div>
      </div>
    </AGCard>
  );
}

/* ── Layout C: Split team tint ───────────────────────── */

const SplitCard = styled.div`
  margin: var(--space-3) var(--space-2);
  border-radius: var(--radius-md);
  border: 1px solid rgba(160, 130, 80, 0.12);
  overflow: hidden;
`;

const SplitTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.02);
`;

const SplitTeams = styled.div`
  display: flex;
`;

const SplitTeamCol = styled.div`
  flex: 1;
  padding: 10px 12px;
  background: ${(p) => p.$team === 1 ? "rgba(74, 158, 255, 0.04)" : "rgba(255, 80, 80, 0.04)"};
  border-top: 1px solid ${(p) => p.$team === 1 ? "rgba(74, 158, 255, 0.15)" : "rgba(255, 80, 80, 0.15)"};
`;

function LayoutC({ match }) {
  return (
    <SplitCard>
      <SplitTop>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <AGMapImg src={match.mapImg} style={{ width: 44, height: 44 }} />
          <div>
            <AGMapName>{match.map}</AGMapName>
            <AGElapsed><AGLiveDot />{match.elapsed}</AGElapsed>
          </div>
        </div>
      </SplitTop>
      <SplitTeams>
        <SplitTeamCol $team={1}>
          <AGTeamLabel $team={1}><span>Team 1</span><AGAvgMmr>{match.avg1}</AGAvgMmr></AGTeamLabel>
          {match.team1.map((p, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
              <AGRaceIcon src={raceMapping[p.race]} />
              <AGPlayerName $size="12px">{p.name}</AGPlayerName>
            </div>
          ))}
        </SplitTeamCol>
        <SplitTeamCol $team={2}>
          <AGTeamLabel $team={2}><span>Team 2</span><AGAvgMmr>{match.avg2}</AGAvgMmr></AGTeamLabel>
          {match.team2.map((p, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
              <AGRaceIcon src={raceMapping[p.race]} />
              <AGPlayerName $size="12px">{p.name}</AGPlayerName>
            </div>
          ))}
        </SplitTeamCol>
      </SplitTeams>
    </SplitCard>
  );
}

/* ── Layout D: Vertical teams, 2 players per row ─────── */

const TwoPerRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2px 8px;
`;

function LayoutD({ match }) {
  return (
    <AGCard>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <AGMapImg src={match.mapImg} style={{ width: 56, height: 56 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <AGMapName $size="var(--text-sm)">{match.map}</AGMapName>
          <AGElapsed><AGLiveDot />{match.elapsed}</AGElapsed>
        </div>
      </div>
      <div style={{ marginBottom: 10 }}>
        <AGTeamLabel $team={1}><span>Team 1</span><AGAvgMmr>{match.avg1}</AGAvgMmr></AGTeamLabel>
        <TwoPerRow>
          {match.team1.map((p, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <AGRaceIcon src={raceMapping[p.race]} $size="14px" />
              <AGPlayerName $size="12px">{p.name}</AGPlayerName>
            </div>
          ))}
        </TwoPerRow>
      </div>
      <div>
        <AGTeamLabel $team={2}><span>Team 2</span><AGAvgMmr>{match.avg2}</AGAvgMmr></AGTeamLabel>
        <TwoPerRow>
          {match.team2.map((p, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <AGRaceIcon src={raceMapping[p.race]} $size="14px" />
              <AGPlayerName $size="12px">{p.name}</AGPlayerName>
            </div>
          ))}
        </TwoPerRow>
      </div>
    </AGCard>
  );
}

/* ── Layout E: Minimal list (expandable feel) ────────── */

const MinimalRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-bottom: 1px solid rgba(160, 130, 80, 0.08);

  &:last-child { border-bottom: none; }
  &:hover { background: rgba(255, 255, 255, 0.03); }
`;

const MmrVs = styled.div`
  font-family: var(--font-mono);
  font-size: 11px;
  color: #fff;
  white-space: nowrap;
  flex-shrink: 0;
  text-align: right;
`;

function LayoutE({ matches }) {
  return (
    <>
      {matches.map((match, i) => (
        <MinimalRow key={i}>
          <AGMapImg src={match.mapImg} style={{ width: 36, height: 36 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <AGMapName $size="13px">{match.map}</AGMapName>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <AGElapsed><AGLiveDot />{match.elapsed}</AGElapsed>
              <RaceRow style={{ opacity: 0.7 }}>
                {match.team1.map((p, j) => <AGRaceIcon key={j} src={raceMapping[p.race]} $size="12px" />)}
              </RaceRow>
              <AGVs>v</AGVs>
              <RaceRow style={{ opacity: 0.7 }}>
                {match.team2.map((p, j) => <AGRaceIcon key={j} src={raceMapping[p.race]} $size="12px" />)}
              </RaceRow>
            </div>
          </div>
          <MmrVs>{match.avg1} <span style={{ opacity: 0.4 }}>v</span> {match.avg2}</MmrVs>
        </MinimalRow>
      ))}
    </>
  );
}

/* ── Layout F: Banner + race face-off row ────────────── */

const FaceoffRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 0;
  border-bottom: 1px solid rgba(160, 130, 80, 0.08);
  margin-bottom: var(--space-2);
`;

const FaceoffMmr = styled.span`
  font-family: var(--font-mono);
  font-size: 13px;
  color: #fff;
  font-weight: 700;
`;

function LayoutF({ match }) {
  return (
    <AGCard>
      <BannerImg src={match.mapImg} alt="" />
      <BannerOverlay>
        <AGMapName $size="var(--text-sm)" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>{match.map}</AGMapName>
        <AGElapsed><AGLiveDot />{match.elapsed}</AGElapsed>
      </BannerOverlay>
      <FaceoffRow>
        <RaceRow>
          {match.team1.map((p, i) => <AGRaceIcon key={i} src={raceMapping[p.race]} $size="20px" />)}
        </RaceRow>
        <FaceoffMmr>{match.avg1}</FaceoffMmr>
        <AGVs style={{ fontSize: 12 }}>vs</AGVs>
        <FaceoffMmr>{match.avg2}</FaceoffMmr>
        <RaceRow>
          {match.team2.map((p, i) => <AGRaceIcon key={i} src={raceMapping[p.race]} $size="20px" />)}
        </RaceRow>
      </FaceoffRow>
      <div style={{ display: "flex", gap: "12px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {match.team1.map((p, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
              <AGRaceIcon src={raceMapping[p.race]} />
              <AGPlayerName>{p.name}</AGPlayerName>
            </div>
          ))}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {match.team2.map((p, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
              <AGRaceIcon src={raceMapping[p.race]} />
              <AGPlayerName>{p.name}</AGPlayerName>
            </div>
          ))}
        </div>
      </div>
    </AGCard>
  );
}

/* ── Active Games Mockup Grid ────────────────────────── */

const LayoutGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-6);
  margin-bottom: var(--space-12);
`;

const LayoutColumn = styled.div`
  display: flex;
  flex-direction: column;
`;

const LayoutLabel = styled.div`
  font-family: var(--font-display);
  font-size: var(--text-base);
  color: #fff;
  margin-bottom: var(--space-1);
`;

const LayoutDesc = styled.div`
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--grey-light);
  margin-bottom: var(--space-4);
  line-height: 1.4;
`;

function ActiveGamesMockups() {
  return (
    <>
      <PageTitle>Active Games Layouts</PageTitle>
      <PageSubtitle>Six layout options — same data, different presentations</PageSubtitle>

      <LayoutGrid>
        {/* A: Banner Map */}
        <LayoutColumn>
          <LayoutLabel>A: Banner Map</LayoutLabel>
          <LayoutDesc>Full-width map hero image, name overlaid. Two-column players below.</LayoutDesc>
          <AGFrame $width="100%">
            <AGHeader>
              <AGHeaderTitle>Active Games</AGHeaderTitle>
              <AGHeaderCount>{FAKE_MATCHES.length}</AGHeaderCount>
            </AGHeader>
            {FAKE_MATCHES.map((m, i) => <LayoutA key={i} match={m} />)}
          </AGFrame>
        </LayoutColumn>

        {/* B: Compact race icons */}
        <LayoutColumn>
          <LayoutLabel>B: Compact Race Icons</LayoutLabel>
          <LayoutDesc>No player names — race icons + avg MMR as a visual shorthand. Fits more games.</LayoutDesc>
          <AGFrame $width="100%">
            <AGHeader>
              <AGHeaderTitle>Active Games</AGHeaderTitle>
              <AGHeaderCount>{FAKE_MATCHES.length}</AGHeaderCount>
            </AGHeader>
            {FAKE_MATCHES.map((m, i) => <LayoutB key={i} match={m} />)}
          </AGFrame>
        </LayoutColumn>

        {/* C: Split team tint */}
        <LayoutColumn>
          <LayoutLabel>C: Split Team Tint</LayoutLabel>
          <LayoutDesc>Blue/red background tint per team column. Clear team separation.</LayoutDesc>
          <AGFrame $width="100%">
            <AGHeader>
              <AGHeaderTitle>Active Games</AGHeaderTitle>
              <AGHeaderCount>{FAKE_MATCHES.length}</AGHeaderCount>
            </AGHeader>
            {FAKE_MATCHES.map((m, i) => <LayoutC key={i} match={m} />)}
          </AGFrame>
        </LayoutColumn>

        {/* D: Vertical, 2 per row */}
        <LayoutColumn>
          <LayoutLabel>D: Vertical + 2-Per-Row</LayoutLabel>
          <LayoutDesc>Each team stacked vertically. Players in a 2-column grid within each team.</LayoutDesc>
          <AGFrame $width="100%">
            <AGHeader>
              <AGHeaderTitle>Active Games</AGHeaderTitle>
              <AGHeaderCount>{FAKE_MATCHES.length}</AGHeaderCount>
            </AGHeader>
            {FAKE_MATCHES.map((m, i) => <LayoutD key={i} match={m} />)}
          </AGFrame>
        </LayoutColumn>

        {/* E: Minimal list */}
        <LayoutColumn>
          <LayoutLabel>E: Minimal List</LayoutLabel>
          <LayoutDesc>One line per game — map, race icons, avg MMRs. Ultra-compact.</LayoutDesc>
          <AGFrame $width="100%">
            <AGHeader>
              <AGHeaderTitle>Active Games</AGHeaderTitle>
              <AGHeaderCount>{FAKE_MATCHES.length}</AGHeaderCount>
            </AGHeader>
            <LayoutE matches={FAKE_MATCHES} />
          </AGFrame>
        </LayoutColumn>

        {/* F: Banner + faceoff */}
        <LayoutColumn>
          <LayoutLabel>F: Banner + Race Faceoff</LayoutLabel>
          <LayoutDesc>Map banner, then race icons facing off with avg MMR. Player names below.</LayoutDesc>
          <AGFrame $width="100%">
            <AGHeader>
              <AGHeaderTitle>Active Games</AGHeaderTitle>
              <AGHeaderCount>{FAKE_MATCHES.length}</AGHeaderCount>
            </AGHeader>
            {FAKE_MATCHES.map((m, i) => <LayoutF key={i} match={m} />)}
          </AGFrame>
        </LayoutColumn>
      </LayoutGrid>
    </>
  );
}

export default function ChatMockups() {
  return (
    <Page>
      <ActiveGamesMockups />

      <PageTitle>Chat Mockups</PageTitle>
      <PageSubtitle>
        Background + frame combinations — full transcript layout
      </PageSubtitle>

      {MOCKUPS.map((mockup, i) => {
        const chatContent = (
          <>
            <ChatHeader>
              <ChatTitle>4v4 Chat</ChatTitle>
              <ChatStatus>connected</ChatStatus>
            </ChatHeader>
            <TranscriptChat />
          </>
        );

        const sidebarContent = (
          <>
            <SidebarHeader>
              Channel <SidebarCount>79</SidebarCount>
            </SidebarHeader>
            <SidebarContent />
          </>
        );

        let chatEl;
        if (mockup.chatType === "wood") {
          chatEl = <WoodFrame>{chatContent}</WoodFrame>;
        } else if (mockup.chatType === "wood-parchment") {
          chatEl = <WoodFrame bg="rgba(20, 15, 8, 0.7)">{chatContent}</WoodFrame>;
        } else if (mockup.chatType === "parchment") {
          chatEl = <ParchmentPanel>{chatContent}</ParchmentPanel>;
        } else {
          chatEl = <ChatPanel $frameStyle={mockup.chatFrame}>{chatContent}</ChatPanel>;
        }

        let sidebarEl;
        if (mockup.sidebarType === "parchment") {
          sidebarEl = <ParchmentPanel as={SidebarPanel} $bg="rgba(20, 15, 8, 0.7)" $opacity={0.06} style={{ width: 220, flex: "none" }}>{sidebarContent}</ParchmentPanel>;
        } else {
          sidebarEl = <SidebarPanel $frameStyle={mockup.sidebarFrame}>{sidebarContent}</SidebarPanel>;
        }

        return (
          <MockupSection key={i}>
            <MockupLabel>{mockup.label}</MockupLabel>
            <MockupDesc>{mockup.desc}</MockupDesc>
            <MockupContainer $bgImage={mockup.bg} $bgTile={mockup.bgTile} $overlay={mockup.overlay}>
              {chatEl}
              {sidebarEl}
            </MockupContainer>
          </MockupSection>
        );
      })}
    </Page>
  );
}
