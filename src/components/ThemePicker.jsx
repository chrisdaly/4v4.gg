import React, { useState, useRef, useEffect } from "react";
import styled from "styled-components";
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

const Wrapper = styled.div`
  position: fixed;
  bottom: var(--space-4);
  left: 50%;
  transform: translateX(-50%);
  z-index: calc(var(--z-overlay) - 1);
`;

const Btn = styled.button`
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full);
  border: 1px solid rgba(160, 130, 80, 0.3);
  background: rgba(20, 16, 12, 0.8);
  color: var(--gold);
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  backdrop-filter: blur(4px);

  &:hover {
    border-color: var(--gold);
    background: rgba(252, 219, 51, 0.1);
  }

  img {
    width: 22px;
    height: 22px;
    object-fit: contain;
  }
`;

const Panel = styled.div`
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 4px;
  padding: var(--space-2);
  background: rgba(15, 12, 8, 0.95);
  border: 1px solid rgba(160, 130, 80, 0.3);
  border-radius: var(--radius-md);
  backdrop-filter: blur(8px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6);
`;

const Option = styled.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  background: ${(p) => (p.$active ? "rgba(252, 219, 51, 0.1)" : "transparent")};
  border: 1px solid ${(p) => (p.$active ? "var(--gold)" : "rgba(160, 130, 80, 0.15)")};
  border-radius: var(--radius-sm);
  color: ${(p) => (p.$active ? "var(--gold)" : "var(--grey-light)")};
  font-family: var(--font-display);
  font-size: var(--text-xxs);
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;

  &:hover {
    color: var(--gold);
    border-color: rgba(252, 219, 51, 0.3);
    background: rgba(252, 219, 51, 0.05);
  }

  img {
    width: 20px;
    height: 20px;
    object-fit: contain;
  }
`;

const ThemePicker = () => {
  const { themeId, setThemeId } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const icon = THEME_ICONS[themeId];

  return (
    <Wrapper ref={ref}>
      <Btn onClick={() => setOpen((v) => !v)} title="Change theme">
        {icon ? <img src={icon} alt="" /> : <GiCrossedSwords />}
      </Btn>
      {open && (
        <Panel>
          {themeList.map((t) => {
            const tIcon = THEME_ICONS[t.id];
            return (
              <Option
                key={t.id}
                $active={t.id === themeId}
                onClick={() => {
                  setThemeId(t.id);
                  setOpen(false);
                }}
              >
                {tIcon ? <img src={tIcon} alt="" /> : <GiCrossedSwords style={{ fontSize: 16, opacity: 0.7 }} />}
                {t.name}
              </Option>
            );
          })}
        </Panel>
      )}
    </Wrapper>
  );
};

export default ThemePicker;
