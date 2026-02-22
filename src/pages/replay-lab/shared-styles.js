import styled from "styled-components";
import { FiUpload } from "react-icons/fi";

// ── Layout ──────────────────────────────────────

export const Section = styled.div`
  margin-bottom: var(--space-8);
`;

export const SectionTitle = styled.h2`
  font-family: var(--font-display);
  font-size: var(--text-lg);
  color: var(--white);
  margin-bottom: var(--space-4);
`;

// ── Drop Zone ───────────────────────────────────

export const DropZone = styled.div`
  border: 2px dashed
    ${(p) => (p.$active ? "var(--gold)" : "rgba(160, 130, 80, 0.3)")};
  border-radius: var(--radius-md);
  padding: var(--space-6) var(--space-4);
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  background: ${(p) =>
    p.$active
      ? "rgba(252, 219, 51, 0.08)"
      : "rgba(255, 255, 255, 0.02)"};

  &:hover {
    border-color: var(--gold);
    background: rgba(252, 219, 51, 0.06);
  }
`;

export const DropLabel = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: ${(p) => (p.$active ? "var(--gold)" : "var(--grey-light)")};
  margin-top: var(--space-2);
`;

export const DropIcon = styled(FiUpload)`
  color: ${(p) => (p.$active ? "var(--gold)" : "var(--grey-mid)")};
`;

// ── Replay Chips ────────────────────────────────

export const ReplayStrip = styled.div`
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
  margin-top: var(--space-4);
`;

export const ReplayChip = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 4px 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(160, 130, 80, 0.15);
  border-radius: var(--radius-sm);
`;

export const ChipText = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
`;

export const ChipName = styled.span`
  font-family: var(--font-display);
  font-size: var(--text-xs);
  color: var(--gold);
`;

export const ChipRemove = styled.button`
  display: flex;
  align-items: center;
  background: none;
  border: none;
  color: var(--grey-mid);
  cursor: pointer;
  padding: 0;
  &:hover {
    color: var(--red);
  }
`;

// ── Status / Labels ─────────────────────────────

export const StatusText = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: ${(p) => p.$color || "var(--grey-light)"};
  margin-top: var(--space-2);
`;

export const EmptyState = styled.div`
  padding: var(--space-6);
  text-align: center;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--grey-light);
`;

export const DbBadge = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
  background: rgba(255, 255, 255, 0.04);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  border: 1px solid rgba(255, 255, 255, 0.08);
`;

export const StatsBanner = styled.div`
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
  justify-content: center;
  margin-top: var(--space-3);
`;

// ── Threshold ───────────────────────────────────

export const ThresholdRow = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
`;

export const ThresholdLabel = styled.label`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
`;

export const ThresholdValue = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--gold);
  min-width: 36px;
`;

// ── Candidate Table ─────────────────────────────

export const CandidateTable = styled.div`
  border: 1px solid rgba(160, 130, 80, 0.15);
  border-radius: var(--radius-md);
  overflow: hidden;
`;

export const CandidateHeader = styled.div`
  display: grid;
  grid-template-columns: 1fr 50px 1fr 70px 80px;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  background: rgba(0, 0, 0, 0.3);
  border-bottom: 1px solid rgba(160, 130, 80, 0.15);
  font-family: var(--font-mono);
  font-size: 9px;
  color: var(--gold);
  text-transform: uppercase;
  letter-spacing: 0.06em;
`;

export const CandidateRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 50px 1fr 70px 80px;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  align-items: center;
  border-bottom: 1px solid rgba(160, 130, 80, 0.06);
  cursor: pointer;
  transition: background 0.1s;

  &:last-child { border-bottom: none; }
  &:hover { background: rgba(252, 219, 51, 0.04); }
`;

export const CandidateName = styled.span`
  font-family: var(--font-display);
  font-size: var(--text-xs);
  color: ${(p) => p.$color || "#fff"};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const CandidateTag = styled.span`
  font-family: var(--font-mono);
  font-size: 9px;
  color: var(--grey-light);
`;

export const CandidateScore = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: ${(p) =>
    p.$val >= 0.75 ? "var(--gold)" :
    p.$val >= 0.60 ? "#fff" :
    "var(--grey-light)"};
  font-weight: ${(p) => p.$val >= 0.70 ? "bold" : "normal"};
`;

export const CandidateScoreBar = styled.div`
  height: 4px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 2px;
  overflow: hidden;
  width: 100%;
`;

export const CandidateScoreFill = styled.div`
  height: 100%;
  border-radius: 2px;
  background: ${(p) =>
    p.$val >= 0.75 ? "var(--gold)" :
    p.$val >= 0.60 ? "rgba(252,219,51,0.5)" :
    "rgba(255,255,255,0.2)"};
`;

export const LinkBtn = styled.button`
  padding: 3px 10px;
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.15s;
  background: rgba(252, 219, 51, 0.12);
  color: var(--gold);
  border: 1px solid rgba(252, 219, 51, 0.3);
  &:hover { background: rgba(252, 219, 51, 0.2); }
`;

// ── Breakdown Bars ──────────────────────────────

export const BreakdownBars = styled.div`
  display: flex;
  gap: 4px;
  align-items: center;
`;

export const MiniBar = styled.div`
  width: 40px;
  height: 4px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 2px;
  overflow: hidden;
  position: relative;
`;

export const MiniBarFill = styled.div`
  height: 100%;
  border-radius: 2px;
  background: ${(p) =>
    p.$val >= 0.75 ? "var(--gold)" :
    p.$val >= 0.60 ? "rgba(252,219,51,0.5)" :
    "rgba(255,255,255,0.2)"};
`;

export const MiniBarLabel = styled.span`
  font-family: var(--font-mono);
  font-size: 8px;
  color: var(--grey-mid);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  width: 28px;
`;

// ── Match / Import Table ────────────────────────

export const MatchTable = styled.div`
  border: 1px solid rgba(160, 130, 80, 0.15);
  border-radius: var(--radius-md);
  overflow: hidden;
  margin-top: var(--space-4);
`;

export const MatchTableHeader = styled.div`
  display: grid;
  grid-template-columns: 1fr 80px 100px 60px 100px;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  background: rgba(0, 0, 0, 0.3);
  border-bottom: 1px solid rgba(160, 130, 80, 0.15);
  font-family: var(--font-mono);
  font-size: 9px;
  color: var(--gold);
  text-transform: uppercase;
  letter-spacing: 0.06em;
`;

export const MatchRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 80px 100px 60px 100px;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  align-items: center;
  border-bottom: 1px solid rgba(160, 130, 80, 0.06);
  &:last-child { border-bottom: none; }
`;

export const MatchCell = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: ${(p) => p.$color || "var(--grey-light)"};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const ImportBadge = styled.span`
  display: inline-block;
  padding: 2px 8px;
  font-family: var(--font-mono);
  font-size: 10px;
  border-radius: var(--radius-sm);
  text-align: center;
  ${(p) => {
    switch (p.$status) {
      case "done": return "color: var(--green); border: 1px solid rgba(76,175,80,0.3); background: rgba(76,175,80,0.08);";
      case "skipped": return "color: var(--grey-light); border: 1px solid rgba(160,130,80,0.2); background: rgba(255,255,255,0.03);";
      case "importing": return "color: var(--gold); border: 1px solid rgba(252,219,51,0.3); background: rgba(252,219,51,0.08);";
      case "pending": return "color: var(--grey-mid); border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.02);";
      case "error": return "color: var(--red); border: 1px solid rgba(244,67,54,0.3); background: rgba(244,67,54,0.08);";
      default: return "";
    }
  }}
`;

export const ProgressBarTrack = styled.div`
  height: 6px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 3px;
  overflow: hidden;
  margin-top: var(--space-2);
  margin-bottom: var(--space-2);
`;

export const ProgressBarFill = styled.div`
  height: 100%;
  border-radius: 3px;
  background: var(--gold);
  transition: width 0.3s ease;
`;

export const ImportAllRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: var(--space-4);
`;

export const ProgressLabel = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
  display: flex;
  justify-content: space-between;
  margin-bottom: var(--space-1);
`;

// ── Detail Panel ────────────────────────────────

export const DetailPanel = styled.div`
  margin-top: var(--space-4);
  padding: var(--space-6);
  border: 1px solid rgba(160, 130, 80, 0.2);
  border-radius: var(--radius-md);
  background: rgba(0, 0, 0, 0.35);
`;

export const DetailHeader = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
`;

export const DetailName = styled.span`
  font-family: var(--font-display);
  font-size: var(--text-base);
  color: var(--gold);
`;

export const DetailScore = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: #fff;
  background: rgba(252, 219, 51, 0.15);
  padding: 2px 10px;
  border-radius: var(--radius-sm);
  border: 1px solid rgba(252, 219, 51, 0.25);
`;

export const DetailBars = styled.div`
  display: flex;
  gap: var(--space-3);
  margin-bottom: var(--space-6);
`;

export const DetailBar = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
`;

export const DetailBarLabel = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: #fff;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

export const DetailBarTrack = styled.div`
  height: 8px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  overflow: hidden;
`;

export const DetailBarFill = styled.div`
  height: 100%;
  background: var(--gold);
  border-radius: 4px;
`;

export const DetailSectionLabel = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--gold);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: var(--space-2);
  margin-top: var(--space-4);
`;

export const OverlayRow = styled.div`
  display: flex;
  gap: var(--space-6);
  align-items: flex-start;
  flex-wrap: wrap;
`;

// ── Hotkey Table ────────────────────────────────

export const HotkeyTable = styled.div`
  display: grid;
  grid-template-columns: 40px 1fr 1fr;
  gap: 1px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: var(--radius-sm);
  overflow: hidden;
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
`;

export const HkCell = styled.div`
  padding: 5px 8px;
  background: rgba(0, 0, 0, 0.3);
  color: ${(p) => p.$color || "#fff"};
  display: flex;
  align-items: center;
  gap: 6px;
`;

export const HkHeader = styled.div`
  padding: 4px 8px;
  background: rgba(0, 0, 0, 0.5);
  color: var(--gold);
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
`;

export const HkBar = styled.div`
  height: 4px;
  border-radius: 2px;
  flex: 1;
  background: rgba(255, 255, 255, 0.06);
  position: relative;
  overflow: hidden;
`;

export const HkBarFill = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  border-radius: 2px;
  background: ${(p) => p.$color || "var(--gold)"};
`;

export const HkRole = styled.span`
  font-size: 8px;
  color: ${(p) => p.$color || "rgba(255,255,255,0.3)"};
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
`;

// ── Compare Grid ────────────────────────────────

export const CompareGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
  margin-top: var(--space-2);
`;

export const CompareColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
`;

export const CompareLabel = styled.div`
  font-family: var(--font-display);
  font-size: var(--text-xs);
  color: var(--gold);
  padding-bottom: var(--space-1);
  border-bottom: 1px solid rgba(160, 130, 80, 0.15);
`;

// ── Merge ───────────────────────────────────────

export const MergedGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
`;

// ── Misc ────────────────────────────────────────

export const PlaystyleSummary = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-4);
  margin-bottom: var(--space-4);
  flex-wrap: wrap;
`;

export const CloseBtn = styled.button`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
  background: none;
  border: 1px solid rgba(160, 130, 80, 0.2);
  border-radius: var(--radius-sm);
  padding: 2px 8px;
  cursor: pointer;
  margin-left: auto;
  &:hover { color: var(--red); border-color: rgba(244, 67, 54, 0.3); }
`;

export const HeroSearchWrap = styled.div`
  max-width: 520px;
  margin: 0 auto var(--space-6);
`;

// ── Helpers ─────────────────────────────────────

export function getGroupData(groupHotkeys) {
  const groups = [];
  if (!groupHotkeys) return groups;
  for (let i = 0; i <= 9; i++) {
    const g = groupHotkeys[String(i)] || {};
    const assigned = g.assigned || 0;
    const used = g.used || 0;
    groups.push({ id: i, assigned, used });
  }
  return groups;
}
