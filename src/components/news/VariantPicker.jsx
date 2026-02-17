import React, { useState } from "react";
import { ModalBackdrop, ModalContent, Button } from "../ui";

const VARIANT_LABELS = ["A", "B", "C"];
const ANGLE_LABELS = ["Drama", "Humor", "Competitive"];

const SECTION_META = {
  TOPICS: { label: "Topics", previewFn: (text) => text.slice(0, 100) },
  DRAMA: {
    label: "Drama",
    previewFn: (text) => {
      const pipe = text.indexOf(" | ");
      return pipe > 0 ? text.slice(0, pipe) : text.slice(0, 120);
    },
  },
  HIGHLIGHTS: {
    label: "Highlights",
    previewFn: (text) => {
      const items = text.split(/;\s*/);
      return items.slice(0, 2).join("; ").slice(0, 120);
    },
  },
  BANS: {
    label: "Bans",
    previewFn: (text) => text.split(/;\s*/)[0]?.slice(0, 100) || text.slice(0, 100),
  },
  RECAP: {
    label: "Recap",
    previewFn: (text) => {
      const dot = text.indexOf(".");
      return dot > 0 ? text.slice(0, dot + 1) : text.slice(0, 120);
    },
  },
};

/**
 * Full-screen overlay for mix-and-match variant selection.
 * Shows per-section rows with 3 variant cards (A/B/C).
 */
const VariantPicker = ({ variants, picks, onPick, onApply, onCancel, applyError }) => {
  const [expanded, setExpanded] = useState(null); // "DRAMA-1" etc.

  const sectionKeys = Object.keys(SECTION_META);

  return (
    <ModalBackdrop onClick={onCancel}>
      <ModalContent $size="lg" onClick={(e) => e.stopPropagation()}>
        <div className="mg-variant-picker">
          <div className="mg-variant-header">
            <h3 className="mg-variant-title">Pick Your Sections</h3>
            <span className="mg-variant-subtitle">
              Mix and match from 3 editorial angles
            </span>
          </div>

          <div className="mg-variant-sections">
            {sectionKeys.map((key) => {
              const meta = SECTION_META[key];
              const currentPick = picks[key] ?? 0;

              return (
                <div key={key} className="mg-variant-section-row">
                  <span className="mg-variant-section-label">{meta.label}</span>
                  <div className="mg-variant-cards">
                    {variants.map((v) => {
                      const content = v.sections?.[key];
                      const isFailed = !content;
                      const isSelected = currentPick === v.idx;
                      const expandKey = `${key}-${v.idx}`;
                      const isExpanded = expanded === expandKey;

                      return (
                        <div
                          key={v.idx}
                          className={[
                            "mg-variant-card",
                            isSelected && "mg-variant-card--selected",
                            isFailed && "mg-variant-card--failed",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          onClick={() => !isFailed && onPick(key, v.idx)}
                        >
                          <div className="mg-variant-card-header">
                            <span className="mg-variant-card-label">
                              {VARIANT_LABELS[v.idx]}
                            </span>
                            <span className="mg-variant-card-angle">
                              {ANGLE_LABELS[v.idx]}
                            </span>
                            {isSelected && (
                              <span className="mg-variant-card-check">&#10003;</span>
                            )}
                          </div>
                          {isFailed ? (
                            <span className="mg-variant-card-failed">Failed</span>
                          ) : isExpanded ? (
                            <div className="mg-variant-expanded">
                              <p className="mg-variant-full-text">{content}</p>
                              <button
                                className="mg-variant-collapse-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpanded(null);
                                }}
                              >
                                Collapse
                              </button>
                            </div>
                          ) : (
                            <div className="mg-variant-preview">
                              <span className="mg-variant-preview-text">
                                {meta.previewFn(content)}
                              </span>
                              <button
                                className="mg-variant-expand-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpanded(expandKey);
                                }}
                              >
                                Expand
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {applyError && (
            <div className="mg-variant-error">{applyError}</div>
          )}

          <div className="mg-variant-footer">
            <Button $ghost onClick={onCancel}>Cancel</Button>
            <Button
              onClick={onApply}
              style={{
                background: "var(--gold)",
                color: "var(--grey-dark)",
                border: "none",
              }}
            >
              Apply Selections
            </Button>
          </div>
        </div>
      </ModalContent>
    </ModalBackdrop>
  );
};

export default VariantPicker;
