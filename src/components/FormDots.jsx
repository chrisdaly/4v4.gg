import React from "react";

/**
 * FormDots - Displays win/loss form as colored dots
 * @param {boolean[]} form - Array of booleans (true = win, false = loss), oldest first
 * @param {string} size - "small" (default), "medium", or "large"
 * @param {number} maxDots - Maximum dots to show (default 8), shows most recent
 * @param {boolean} showSummary - Show W-L summary when many games (default true)
 */
const FormDots = ({ form, size = "small", maxDots = 25, showSummary = true }) => {
  if (!form || form.length === 0) return null;

  // Show only the most recent games if over limit
  const displayForm = form.length > maxDots ? form.slice(-maxDots) : form;
  const hasMore = form.length > maxDots;

  // Calculate totals for summary
  const wins = form.filter(w => w).length;
  const losses = form.length - wins;

  return (
    <div className={`form-dots-container ${hasMore ? "has-summary" : ""}`}>
      <div className={`form-dots ${size}`}>
        {displayForm.map((won, i) => (
          <span
            key={i}
            className={`form-dot ${won ? "win" : "loss"} ${i === displayForm.length - 1 ? "latest" : ""}`}
          />
        ))}
      </div>
      {hasMore && showSummary && (
        <div className="form-summary">
          <span className="form-summary-wins">{wins}W</span>
          <span className="form-summary-sep">-</span>
          <span className="form-summary-losses">{losses}L</span>
        </div>
      )}
    </div>
  );
};

export default FormDots;
