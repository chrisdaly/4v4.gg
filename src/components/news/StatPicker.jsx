import React from "react";
import { STAT_CATEGORIES } from "../../lib/useEditorial";

const FormDots = ({ form }) => {
  if (!form) return null;
  return (
    <span className="digest-form-dots">
      {form.split("").map((c, i) => (
        <span
          key={i}
          className={`digest-form-dot ${c === "W" ? "digest-form-dot--w" : "digest-form-dot--l"}`}
        />
      ))}
    </span>
  );
};

const getMmr = (c) => {
  if (c.mmrChange != null) return c.mmrChange;
  const m = c.formatted?.match(/([+-]?\d+)\s*MMR/);
  return m ? parseInt(m[1]) : null;
};

const getRecord = (key, c) => {
  if (key === "WINNER" || key === "LOSER") {
    const mmr = getMmr(c);
    if (mmr != null) {
      const sign = mmr > 0 ? "+" : "";
      return `${sign}${mmr} MMR`;
    }
  }
  if (key === "GRINDER") return `${c.wins + c.losses} games`;
  if (key === "HOTSTREAK") return `${c.winStreak}W streak`;
  if (key === "COLDSTREAK") return `${c.lossStreak}L streak`;
  return `${c.wins}W-${c.losses}L`;
};

const StatPicker = ({ candidates, selectedStats, onToggle }) => {
  if (!candidates) return null;

  return (
    <div className="stat-picker">
      <div className="stat-picker-label">Player Stats</div>
      {STAT_CATEGORIES.map(({ key, label, cls }) => {
        const items = candidates[key] || [];
        if (items.length === 0) return null;
        const selectedIdx = selectedStats[key] ?? null;
        return (
          <div key={key} className={`stat-picker-category stat-picker-category--${cls}`}>
            <span className="stat-picker-category-label">{label}</span>
            <div className="stat-picker-candidates">
              {items.map((c, i) => {
                const isSelected = selectedIdx === i;
                return (
                  <button
                    key={c.battleTag}
                    className={`stat-picker-candidate${isSelected ? " stat-picker-candidate--selected" : ""}`}
                    onClick={() => onToggle(key, i)}
                  >
                    <span className="stat-picker-candidate-name">{c.name}</span>
                    <span className="stat-picker-candidate-record">{getRecord(key, c)}</span>
                    <FormDots form={c.form} />
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StatPicker;
