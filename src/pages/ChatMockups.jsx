import React from "react";
import styled from "styled-components";

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
    background: ${(p) => p.$bgImage ? `url(${p.$bgImage}) center / cover no-repeat` : "#080808"};
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
    label: "A: Campfire + Launcher Border",
    desc: "Authentic W3C launcher look — iron frame, warm campfire glow",
    bg: "/frames/launcher/Static_Background.png",
    overlay: "rgba(0, 0, 0, 0.45)",
    chatFrame: FRAME_STYLES.launcherBorder,
    sidebarFrame: FRAME_STYLES.simpleBorder,
  },
  {
    label: "B: Campfire + WC3 Ornate Frame",
    desc: "Gold ornamental corners over campfire scene",
    bg: "/frames/launcher/Static_Background.png",
    overlay: "rgba(0, 0, 0, 0.45)",
    chatFrame: FRAME_STYLES.wc3Frame,
    sidebarFrame: FRAME_STYLES.simpleBorder,
  },
  {
    label: "C: Campfire + Wood Frame",
    desc: "Assembled wood corners + tile edges — tavern notice board vibe",
    bg: "/frames/launcher/Static_Background.png",
    overlay: "rgba(0, 0, 0, 0.45)",
    chatType: "wood",
    sidebarFrame: FRAME_STYLES.simpleBorder,
  },
  {
    label: "D: Campfire + Wood Frame + Parchment",
    desc: "Wood frame with parchment texture inside — quest log feel",
    bg: "/frames/launcher/Static_Background.png",
    overlay: "rgba(0, 0, 0, 0.45)",
    chatType: "wood-parchment",
    sidebarFrame: FRAME_STYLES.simpleBorder,
  },
  {
    label: "E: Campfire + Parchment Panel",
    desc: "Subtle parchment texture on dark panel — no wood frame",
    bg: "/frames/launcher/Static_Background.png",
    overlay: "rgba(0, 0, 0, 0.45)",
    chatType: "parchment",
    sidebarType: "parchment",
  },
  {
    label: "F: Night Elf + Wood Frame + Parchment",
    desc: "Purple forest + wood frame with parchment glow",
    bg: "/backgrounds/nightelf.jpg",
    overlay: "rgba(5, 0, 15, 0.45)",
    chatType: "wood-parchment",
    sidebarFrame: FRAME_STYLES.simpleBorder,
  },
  {
    label: "G: Undead + Wood Frame",
    desc: "Gothic green + dark wood frame — crypt message board",
    bg: "/backgrounds/undead.jpg",
    overlay: "rgba(0, 0, 0, 0.45)",
    chatType: "wood",
    sidebarFrame: FRAME_STYLES.simpleBorder,
  },
  {
    label: "H: Orc + Wood Frame + Parchment",
    desc: "Warm earthy tones + wood and parchment — war room briefing",
    bg: "/backgrounds/orc.jpg",
    overlay: "rgba(0, 0, 0, 0.45)",
    chatType: "wood-parchment",
    sidebarFrame: FRAME_STYLES.simpleBorder,
  },
  {
    label: "I: Human + Launcher Border",
    desc: "Bright castle scene, iron launcher frame",
    bg: "/backgrounds/human.jpg",
    overlay: "rgba(0, 0, 0, 0.5)",
    chatFrame: FRAME_STYLES.launcherBorder,
    sidebarFrame: FRAME_STYLES.simpleBorder,
  },
  {
    label: "J: Campfire + Simple Gold Border",
    desc: "Minimal thin gold border, no ornate frame",
    bg: "/frames/launcher/Static_Background.png",
    overlay: "rgba(0, 0, 0, 0.45)",
    chatFrame: FRAME_STYLES.goldBorder,
    sidebarFrame: FRAME_STYLES.goldBorder,
  },
];

export default function ChatMockups() {
  return (
    <Page>
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
            <MockupContainer $bgImage={mockup.bg} $overlay={mockup.overlay}>
              {chatEl}
              {sidebarEl}
            </MockupContainer>
          </MockupSection>
        );
      })}
    </Page>
  );
}
