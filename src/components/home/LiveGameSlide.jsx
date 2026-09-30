import React from "react";
import { useHistory } from "react-router-dom";
import OngoingGame from "../OngoingGame";

/**
 * One live game on the home page's panel. It is the same OngoingGame /
 * Game.jsx the /live page renders, so the two never drift: same team
 * headers, portraits, names, MMR lines, form dots, arranged-team
 * connectors, MMR chart and map footer. Only the cell width flexes, for
 * the narrower column (see .hm-slide in Home.css).
 *
 * Clicking anywhere but a link opens the match, as on /live.
 *
 * Props: match (an ongoing match), active (the visible slide)
 */
export default function LiveGameSlide({ match, active = false }) {
  const history = useHistory();
  const matchId = match?.id;

  return (
    <div
      className={`hm-slide ${active ? "is-active" : ""}`}
      data-live-slide={matchId}
      data-active={active ? "true" : undefined}
      aria-hidden={active ? undefined : "true"}
      onClick={(e) => {
        if (e.target.closest("a")) return;
        if (matchId) history.push(`/match/${matchId}`);
      }}
    >
      <OngoingGame ongoingGameData={match} />
    </div>
  );
}
