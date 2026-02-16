import React, { useState, useEffect } from "react";
import { CountryFlag } from "./ui";
import Mmr from "./Mmr";
import { Sparklines, SparklinesLine } from "react-sparklines";
import { akaLookup, fetchPlayerSessionData } from "../lib/utils";
import { raceMapping } from "../lib/constants";
import FormDots from "./FormDots";

const Player = ({ data, side, transition }) => {
  const [sparklineData, setSparklineData] = useState([]);
  const [sessionData, setSessionData] = useState(null);
  const [peakMmr, setPeakMmr] = useState(null);
  const [playerRank, setPlayerRank] = useState(null);
  const { race, oldMmr, name, location, battleTag, rank } = data;
  const aka = akaLookup(name);
  const raceIcon = raceMapping[race];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { session, seasonMmrs, rank: fetchedRank } = await fetchPlayerSessionData(battleTag, race);
        setSparklineData(seasonMmrs);
        setSessionData(session);
        setPlayerRank(fetchedRank || rank);
        if (seasonMmrs.length > 0) {
          setPeakMmr(Math.max(...seasonMmrs));
        }
      } catch (error) {
        console.error("Error fetching player data:", error);
      }
    };

    fetchData();
  }, [battleTag, race, rank]);

  const Name = () => {
    return aka !== null && transition ? aka : name;
  };

  // Demo-style layout when transition is active
  if (transition) {
    const delta = sessionData?.mmrChange || 0;
    const hasSparkline = sparklineData && sparklineData.length >= 2;

    return (
      <div className="player-card-demo">
        <div className="player-name"><Name /></div>

        <div className="player-mmr-line">
          <span className="mmr-value">{oldMmr}</span>
          <span className="mmr-label"> MMR</span>
          {playerRank && <span className="player-rank"> · #{playerRank}</span>}
        </div>

        {sessionData && sessionData.form && sessionData.form.length > 0 ? (
          <div className="session-info">
            <span className="session-label">Session: </span>
            <span className="session-record">{sessionData.wins}W-{sessionData.losses}L</span>
            {delta !== 0 && (
              <span className={`session-delta ${delta >= 0 ? 'positive' : 'negative'}`}>
                {delta >= 0 ? ' ↑' : ' ↓'}{Math.abs(delta)} MMR
              </span>
            )}
          </div>
        ) : (
          <div className="session-info">
            <span className="session-label-muted">No active session</span>
          </div>
        )}

        <FormDots form={sessionData?.form?.slice().reverse()} size="small" />

        {hasSparkline && (
          <div className="sparkline-container">
            <Sparklines data={sparklineData} width={80} height={20} margin={2}>
              <SparklinesLine style={{ strokeWidth: 2, stroke: "var(--grey-light)", fill: "none" }} />
            </Sparklines>
          </div>
        )}

        {peakMmr && (
          <div className="peak-mmr">
            <span className="peak-label">peak </span>
            <span className="peak-value">{peakMmr}</span>
            <span className="peak-label"> MMR</span>
          </div>
        )}
      </div>
    );
  }

  // Original layout when transition is not active
  const LeftSlot = () => {
    if (side === "left") {
      return <CountryFlag name={location?.toLowerCase()}> />;
    } else {
      return <img src={raceIcon} alt={race} className={"race"} />;
    }
  };

  const RightSlot = () => {
    if (side === "right") {
      return <CountryFlag name={location?.toLowerCase()}> />;
    } else {
      return <img src={raceIcon} alt={race} className={"race"} />;
    }
  };

  return (
    <div className="playerCard">
      <div className="playerTop">
        <div className="playerName">
          <h2><Name /></h2>
        </div>
      </div>
      <div className="playerBottom three-columns">
        <div className="number">
          <LeftSlot />
        </div>
        <div>
          <Mmr data={oldMmr}></Mmr>
        </div>
        <div className="number">
          <RightSlot />
        </div>
      </div>
    </div>
  );
};

export default Player;
