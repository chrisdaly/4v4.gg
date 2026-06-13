import React from "react";

/**
 * MmrRangeBar — gradient low→peak bar with a gold marker at the current MMR.
 * Shared by the player profile thermometer card and the OBS player overlay.
 *
 * detail: "full" shows low/current/peak values with sub-labels (profile);
 *         "minimal" shows just the low/peak values under the track (overlay).
 */
export default function MmrRangeBar({ low, current, peak, detail = "full", className = "" }) {
  const range = peak - low;
  const position = range > 0 ? ((current - low) / range) * 100 : 50;

  return (
    <div className={`mrb ${className}`}>
      <div className="mrb-track">
        <div className="mrb-marker" style={{ left: `${position}%` }} />
      </div>
      {detail === "minimal" ? (
        <div className="mrb-labels">
          <span className="mrb-value low">{low}</span>
          <span className="mrb-value high">{peak}</span>
        </div>
      ) : (
        <div className="mrb-labels">
          <div className="mrb-group">
            <span className="mrb-value low">{low}</span>
            <span className="mrb-label">LOW</span>
          </div>
          <div className="mrb-group current">
            <span className="mrb-value">{current}</span>
            <span className="mrb-label">CURRENT</span>
          </div>
          <div className="mrb-group">
            <span className="mrb-value high">{peak}</span>
            <span className="mrb-label">PEAK</span>
          </div>
        </div>
      )}
    </div>
  );
}
