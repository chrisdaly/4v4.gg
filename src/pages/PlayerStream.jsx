import React, { useMemo } from "react";
import { useParams, useLocation } from "react-router-dom";
import { findPlayerInOngoingMatches } from "../lib/utils";
import useOngoingMatches from "../lib/useOngoingMatches";
import OngoingGame from "../components/OngoingGame";

const PlayerStream = () => {
  const { tag } = useParams();
  const location = useLocation();
  const streamerTag = useMemo(() => decodeURIComponent(tag || ""), [tag]);

  // Style options: default, dark, bordered, minimal
  const style = useMemo(
    () => new URLSearchParams(location.search).get("style") || "default",
    [location.search]
  );

  const { data, error } = useOngoingMatches();

  const ongoingGame = useMemo(
    () => (data && streamerTag ? findPlayerInOngoingMatches(data, streamerTag) : null),
    [data, streamerTag]
  );

  if (!data && !error) return null;

  return (
    <div id="StreamOverlay" className={`stream-style-${style}`}>
      {ongoingGame && <OngoingGame ongoingGameData={ongoingGame} compact={true} streamerTag={streamerTag} />}
    </div>
  );
};

export default PlayerStream;
