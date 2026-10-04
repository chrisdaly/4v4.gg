import React from "react";
import { describeSession } from "../../lib/session";

/**
 * SessionDivider - the line between two sittings in the match history,
 * carrying when the sitting below it ran and how it went.
 *
 * `partial` ("prev" | "next") means the page edge cut the sitting, so the
 * record would be a fragment: then only the day and time show.
 */
const SessionDivider = ({ session, partial = false }) => {
  const { day, time } = describeSession(session.start, session.end);
  const net = session.mmrChange;
  const games = session.matches.length;
  return (
    <div className="session-divider" role="separator">
      <span className="sd-when">
        <span className="sd-day">{day}</span>
        <span className="sd-time">{time}</span>
      </span>
      {!partial && (
        <span className="sd-record">
          <span className="sd-games">{games} {games === 1 ? "game" : "games"}</span>
          <span className="sd-wl">
            <span className="sd-w">{session.wins}W</span>
            <span className="sd-sep">-</span>
            <span className="sd-l">{session.losses}L</span>
          </span>
          <span className={`sd-net ${net > 0 ? "positive" : net < 0 ? "negative" : ""}`}>
            {net > 0 ? "+" : ""}{net}
          </span>
        </span>
      )}
      {partial && <span className="sd-partial">continues on the {partial === "prev" ? "previous" : "next"} page</span>}
    </div>
  );
};

export default SessionDivider;
