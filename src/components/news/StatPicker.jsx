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
                    <span className="stat-picker-candidate-record">
                      {c.wins}W-{c.losses}L
                      {c.winStreak > 0 && <span className="stat-picker-streak stat-picker-streak--hot"> ({c.winStreak}W streak)</span>}
                      {c.lossStreak > 0 && <span className="stat-picker-streak stat-picker-streak--cold"> ({c.lossStreak}L streak)</span>}
                    </span>
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
