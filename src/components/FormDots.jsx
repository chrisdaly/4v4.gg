import React from "react";
import { Dot } from "./ui";

const DOT_SIZES = { small: 6, medium: 8, large: 12 };

// The dots wrap at eight (see .form-dots in Game.css); past one row the
// W-L line is the quick read, whether or not any dots were dropped
const DOTS_PER_ROW = 8;

/**
 * FormDots - Displays win/loss form as colored dots
 * @param {boolean[]} form - Array of booleans (true = win, false = loss), oldest first
 * @param {string} size - "small" (default), "medium", or "large"
 * @param {number} maxDots - Maximum dots to show (default: all of them), shows most recent
 * @param {boolean} showSummary - Show the W-L line past a row of dots (default true)
 */
const FormDots = ({ form, size = "small", maxDots = Infinity, showSummary = true }) => {
  if (!form || form.length === 0) return null;

  // Show only the most recent games if over limit
  const displayForm = form.length > maxDots ? form.slice(-maxDots) : form;
  const hasMore = form.length > maxDots;
  const withSummary = showSummary && (hasMore || form.length > DOTS_PER_ROW);

  // Calculate totals for summary
  const wins = form.filter(w => w).length;
  const losses = form.length - wins;

  return (
    <div className={`form-dots-container ${withSummary ? "has-summary" : ""}`}>
      <div className={`form-dots ${size}`}>
        {displayForm.map((won, i) => (
          <Dot
            key={i}
            $win={won}
            $size={DOT_SIZES[size] || DOT_SIZES.small}
            $recent={i === displayForm.length - 1}
          />
        ))}
      </div>
      {withSummary && (
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
