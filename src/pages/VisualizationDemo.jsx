import React, { useState, useEffect } from "react";
import { Sparklines, SparklinesLine, SparklinesSpots, SparklinesReferenceLine } from "react-sparklines";
import { fetchPlayerSessionData } from "../lib/utils";

const PlayerCard = ({ player, title }) => {
  const { session, seasonMmrs, currentMmr, peak, low, name } = player;
  const delta = session?.mmrChange || 0;
  const hasSparklineData = seasonMmrs && seasonMmrs.length >= 2;

  return (
    <div style={{ background: "#111", padding: "20px", borderRadius: "8px", border: "2px solid #fcdb33", marginBottom: "20px" }}>
      <h3 style={{ color: "#fcdb33", marginBottom: "15px" }}>{title}</h3>
      <div style={{ textAlign: "center" }}>
        <h2 style={{ color: "#fcdb33", margin: "0 0 5px 0" }}>{name}</h2>
        <p style={{ color: "#fff", margin: "0 0 8px 0" }}>
          <span style={{ fontFamily: "monospace", fontSize: "18px" }}>{currentMmr || "?"}</span>
          <span style={{ color: "#888" }}> MMR</span>
          {player.rank && (
            <span style={{ color: "#666" }}> · #{player.rank}</span>
          )}
        </p>
        {session ? (
          <div style={{ marginBottom: "8px" }}>
            <span style={{ color: "#888", fontSize: "10px" }}>Session: </span>
            <span style={{ color: "#fff", fontSize: "12px", fontFamily: "monospace" }}>{session.wins}W-{session.losses}L</span>
            {delta !== 0 && (
              <span style={{ color: delta >= 0 ? "#34c774" : "#c23434", fontFamily: "monospace", fontSize: "12px" }}>
                {" "}{delta >= 0 ? "↑" : "↓"}{Math.abs(delta)} MMR
              </span>
            )}
          </div>
        ) : (
          <div style={{ marginBottom: "8px" }}>
            <span style={{ color: "#666", fontSize: "10px" }}>Last played: </span>
            <span style={{ color: "#888", fontSize: "10px" }}>{player.lastPlayed || "Unknown"}</span>
          </div>
        )}
        <div style={{ display: "flex", gap: "4px", justifyContent: "center", alignItems: "center", marginBottom: "8px" }}>
          {(session?.form || []).slice().reverse().map((won, i, arr) => (
            <span
              key={i}
              style={{
                width: i === arr.length - 1 ? "10px" : "8px",
                height: i === arr.length - 1 ? "10px" : "8px",
                borderRadius: "50%",
                background: won ? "#34c774" : "#c23434",
                opacity: i === arr.length - 1 ? 1 : 0.6,
              }}
            />
          ))}
          {!session && <span style={{ color: "#666", fontSize: "10px" }}>—</span>}
        </div>
        {hasSparklineData ? (
          <>
            <div style={{ width: "100px", margin: "0 auto 4px auto" }}>
              <Sparklines data={seasonMmrs} width={100} height={24} margin={2}>
                <SparklinesLine style={{ strokeWidth: 2, stroke: "#aaa", fill: "none" }} />
              </Sparklines>
            </div>
            <span style={{ color: "#666", fontSize: "9px" }}>peak </span>
            <span style={{ color: "#34c774", fontSize: "10px", fontFamily: "monospace" }}>{peak}</span>
            <span style={{ color: "#666", fontSize: "9px" }}> MMR</span>
          </>
        ) : (
          <div style={{ marginTop: "8px" }}>
            <span style={{ color: "#666", fontSize: "10px" }}>Not enough data for sparkline</span>
          </div>
        )}
      </div>
    </div>
  );
};

const VisualizationDemo = () => {
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      const playerConfigs = [
        { battleTag: "deads#21670", name: "deads" },
        { battleTag: "StarBuck#2732", name: "StarBuck" },
        { battleTag: "papercut#21681", name: "papercut" },
        { battleTag: "FOALS#11315", name: "FOALS" },
      ];

      const playerDataPromises = playerConfigs.map(async ({ battleTag, name }) => {
        const { session, seasonMmrs, currentMmrFallback, rank, lastPlayed } = await fetchPlayerSessionData(battleTag, 0);
        return {
          name,
          battleTag,
          session,
          seasonMmrs,
          currentMmr: session?.currentMmr || seasonMmrs[seasonMmrs.length - 1] || currentMmrFallback || 0,
          peak: seasonMmrs.length > 0 ? Math.max(...seasonMmrs) : 0,
          low: seasonMmrs.length > 0 ? Math.min(...seasonMmrs) : 0,
          rank,
          lastPlayed,
        };
      });

      const playersData = await Promise.all(playerDataPromises);
      setPlayers(playersData);
      setLoading(false);
    };
    loadData();
  }, []);

  if (loading || players.length === 0) {
    return <div style={{ padding: "40px", background: "#000", color: "#fff" }}>Loading real data for players...</div>;
  }

  // Use first player for the grid demos
  const playerData = players[0];
  const { session, seasonMmrs, currentMmr, peak, low } = playerData;
  const delta = session?.mmrChange || 0;
  const range = peak - low || 1;
  const currentPosition = ((currentMmr - low) / range) * 100;

  return (
    <div style={{ padding: "40px", background: "#000", minHeight: "100vh" }}>
      <h1 style={{ color: "#fcdb33", marginBottom: "20px" }}>Player Card Visualization Options</h1>

      {/* Player Comparison */}
      <h2 style={{ color: "#888", marginBottom: "15px" }}>Live Player Data Comparison</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px", marginBottom: "40px" }}>
        {players.map((player, idx) => (
          <PlayerCard key={player.battleTag} player={player} title={player.battleTag} />
        ))}
      </div>

      <h2 style={{ color: "#888", marginBottom: "15px" }}>Visualization Options (using {playerData.name})</h2>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "40px" }}>

        {/* Session-based: Recommended */}
        <div style={{ background: "#111", padding: "20px", borderRadius: "8px", border: "2px solid #fcdb33" }}>
          <h3 style={{ color: "#fcdb33", marginBottom: "20px" }}>SESSION-BASED ⭐</h3>
          <div style={{ textAlign: "center" }}>
            <h2 style={{ color: "#fcdb33", margin: "0 0 5px 0" }}>{playerData.name}</h2>
            <p style={{ color: "#fff", margin: "0 0 8px 0" }}>
              <span style={{ fontFamily: "monospace", fontSize: "18px" }}>{currentMmr}</span>
              <span style={{ color: "#888" }}> MMR </span>
              {session && (
                <span style={{ color: delta >= 0 ? "#34c774" : "#c23434", fontFamily: "monospace", fontSize: "14px" }}>
                  {delta >= 0 ? "↑" : "↓"}{Math.abs(delta)}
                </span>
              )}
            </p>
            {/* Session W/L */}
            {session && (
              <div style={{ marginBottom: "8px" }}>
                <span style={{ color: "#888", fontSize: "10px" }}>Session: </span>
                <span style={{ color: "#fff", fontSize: "12px", fontFamily: "monospace" }}>{session.wins}W-{session.losses}L</span>
              </div>
            )}
            <div style={{ display: "flex", gap: "4px", justifyContent: "center", marginBottom: "8px" }}>
              {(session?.form || []).map((won, i) => (
                <span
                  key={i}
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: won ? "#34c774" : "#c23434",
                    opacity: 0.7,
                  }}
                />
              ))}
            </div>
            {/* Season sparkline */}
            <div style={{ width: "100px", margin: "0 auto" }}>
              <Sparklines data={seasonMmrs} width={100} height={20} margin={2}>
                <SparklinesLine style={{ strokeWidth: 2, stroke: "#aaa", fill: "none" }} />
              </Sparklines>
            </div>
            <span style={{ color: "#666", fontSize: "9px" }}>season trend</span>
          </div>
        </div>

        {/* Option 1: Compact Range Bar */}
        <div style={{ background: "#111", padding: "20px", borderRadius: "8px", border: "1px solid #333" }}>
          <h3 style={{ color: "#888", marginBottom: "20px" }}>OPTION 1: Range Bar</h3>
          <div style={{ textAlign: "center" }}>
            <h2 style={{ color: "#fcdb33", margin: "0 0 5px 0" }}>{playerData.name}</h2>
            <p style={{ color: "#fff", margin: "0 0 12px 0" }}>
              <span style={{ fontFamily: "monospace", fontSize: "18px" }}>{currentMmr}</span>
              <span style={{ color: "#888" }}> MMR</span>
            </p>
            {/* Range bar */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "8px" }}>
              <span style={{ color: "#c23434", fontSize: "12px", fontFamily: "monospace" }}>▼{low}</span>
              <div style={{ position: "relative", width: "80px", height: "4px", background: "#333", borderRadius: "2px" }}>
                <div
                  style={{
                    position: "absolute",
                    left: `${currentPosition}%`,
                    top: "-4px",
                    width: "8px",
                    height: "12px",
                    background: "#fcdb33",
                    borderRadius: "2px",
                    transform: "translateX(-50%)",
                  }}
                />
              </div>
              <span style={{ color: "#34c774", fontSize: "12px", fontFamily: "monospace" }}>{peak}▲</span>
            </div>
            <div style={{ display: "flex", gap: "4px", justifyContent: "center" }}>
              {(session?.form || []).map((won, i) => (
                <span
                  key={i}
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: won ? "#34c774" : "#c23434",
                    opacity: 0.7,
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Option 2: Sparkline + Delta */}
        <div style={{ background: "#111", padding: "20px", borderRadius: "8px", border: "1px solid #333" }}>
          <h3 style={{ color: "#888", marginBottom: "20px" }}>OPTION 2: Sparkline + Delta</h3>
          <div style={{ textAlign: "center" }}>
            <h2 style={{ color: "#fcdb33", margin: "0 0 5px 0" }}>{playerData.name}</h2>
            <p style={{ color: "#fff", margin: "0 0 8px 0" }}>
              <span style={{ fontFamily: "monospace", fontSize: "18px" }}>{currentMmr}</span>
              <span style={{ color: "#888" }}> MMR </span>
              <span style={{ color: delta >= 0 ? "#34c774" : "#c23434", fontFamily: "monospace", fontSize: "14px" }}>
                {delta >= 0 ? "↑" : "↓"}{Math.abs(delta)}
              </span>
            </p>
            <div style={{ width: "100px", margin: "0 auto 8px auto" }}>
              <Sparklines data={seasonMmrs} width={100} height={20} margin={2}>
                <SparklinesLine style={{ strokeWidth: 2, stroke: "#aaa", fill: "none" }} />
              </Sparklines>
            </div>
            <div style={{ display: "flex", gap: "4px", justifyContent: "center" }}>
              {(session?.form || []).slice(-5).map((won, i) => (
                <span
                  key={i}
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: won ? "#34c774" : "#c23434",
                    opacity: 0.7,
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Option 3: Stats Row */}
        <div style={{ background: "#111", padding: "20px", borderRadius: "8px", border: "1px solid #333" }}>
          <h3 style={{ color: "#888", marginBottom: "20px" }}>OPTION 3: Stats Row</h3>
          <div style={{ textAlign: "center" }}>
            <h2 style={{ color: "#fcdb33", margin: "0 0 5px 0" }}>{playerData.name}</h2>
            <p style={{ color: "#fff", margin: "0 0 8px 0" }}>
              <span style={{ fontFamily: "monospace", fontSize: "18px" }}>{currentMmr}</span>
              <span style={{ color: "#888" }}> MMR</span>
            </p>
            <p style={{ color: "#888", fontSize: "12px", margin: "0 0 8px 0" }}>
              Peak <span style={{ color: "#34c774", fontFamily: "monospace" }}>{peak}</span>
              <span style={{ color: "#666" }}> | </span>
              Low <span style={{ color: "#c23434", fontFamily: "monospace" }}>{low}</span>
            </p>
            <div style={{ display: "flex", gap: "4px", justifyContent: "center" }}>
              {(session?.form || []).slice(-5).map((won, i) => (
                <span
                  key={i}
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: won ? "#34c774" : "#c23434",
                    opacity: 0.7,
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Option 4: Volatility Badge */}
        <div style={{ background: "#111", padding: "20px", borderRadius: "8px", border: "1px solid #333" }}>
          <h3 style={{ color: "#888", marginBottom: "20px" }}>OPTION 4: Volatility Badge</h3>
          <div style={{ textAlign: "center" }}>
            <h2 style={{ color: "#fcdb33", margin: "0 0 5px 0" }}>{playerData.name}</h2>
            <p style={{ color: "#fff", margin: "0 0 8px 0" }}>
              <span style={{ fontFamily: "monospace", fontSize: "18px" }}>{currentMmr}</span>
              <span style={{ color: "#888" }}> MMR </span>
              <span style={{
                background: "rgba(252, 100, 50, 0.2)",
                color: "#fc6432",
                padding: "2px 6px",
                borderRadius: "4px",
                fontSize: "10px",
                fontWeight: "bold"
              }}>
                🔥 HIGH VAR
              </span>
            </p>
            <div style={{ display: "flex", gap: "4px", justifyContent: "center" }}>
              {(session?.form || []).slice(-5).map((won, i) => (
                <span
                  key={i}
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: won ? "#34c774" : "#c23434",
                    opacity: 0.7,
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Option 5: Combined Minimal */}
        <div style={{ background: "#111", padding: "20px", borderRadius: "8px", border: "1px solid #333" }}>
          <h3 style={{ color: "#888", marginBottom: "20px" }}>OPTION 5: Combined Minimal</h3>
          <div style={{ textAlign: "center" }}>
            <h2 style={{ color: "#fcdb33", margin: "0 0 5px 0" }}>{playerData.name}</h2>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "8px" }}>
              <span style={{ fontFamily: "monospace", fontSize: "18px", color: "#fff" }}>{currentMmr}</span>
              <span style={{ color: delta >= 0 ? "#34c774" : "#c23434", fontFamily: "monospace", fontSize: "12px" }}>
                {delta >= 0 ? "↑" : "↓"}{Math.abs(delta)}
              </span>
              <div style={{ width: "60px" }}>
                <Sparklines data={seasonMmrs} width={60} height={16} margin={1}>
                  <SparklinesLine style={{ strokeWidth: 1.5, stroke: "#888", fill: "none" }} />
                </Sparklines>
              </div>
              <div style={{ display: "flex", gap: "3px" }}>
                {(session?.form || []).slice(-5).map((won, i) => (
                  <span
                    key={i}
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: won ? "#34c774" : "#c23434",
                      opacity: 0.7,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Option 6: Gradient Bar */}
        <div style={{ background: "#111", padding: "20px", borderRadius: "8px", border: "1px solid #333" }}>
          <h3 style={{ color: "#888", marginBottom: "20px" }}>OPTION 6: Gradient Range</h3>
          <div style={{ textAlign: "center" }}>
            <h2 style={{ color: "#fcdb33", margin: "0 0 5px 0" }}>{playerData.name}</h2>
            <p style={{ color: "#fff", margin: "0 0 10px 0" }}>
              <span style={{ fontFamily: "monospace", fontSize: "18px" }}>{currentMmr}</span>
              <span style={{ color: "#888" }}> MMR</span>
            </p>
            {/* Gradient range bar */}
            <div style={{ position: "relative", width: "120px", height: "8px", margin: "0 auto 10px auto", borderRadius: "4px", background: "linear-gradient(to right, #c23434, #888, #34c774)" }}>
              <div
                style={{
                  position: "absolute",
                  left: `${currentPosition}%`,
                  top: "-2px",
                  width: "12px",
                  height: "12px",
                  background: "#fcdb33",
                  borderRadius: "50%",
                  transform: "translateX(-50%)",
                  border: "2px solid #000",
                }}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", width: "120px", margin: "0 auto 8px auto" }}>
              <span style={{ color: "#666", fontSize: "10px", fontFamily: "monospace" }}>{low}</span>
              <span style={{ color: "#666", fontSize: "10px", fontFamily: "monospace" }}>{peak}</span>
            </div>
            <div style={{ display: "flex", gap: "4px", justifyContent: "center" }}>
              {(session?.form || []).slice(-5).map((won, i) => (
                <span
                  key={i}
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: won ? "#34c774" : "#c23434",
                    opacity: 0.7,
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Option 7: Streak Emphasis */}
        <div style={{ background: "#111", padding: "20px", borderRadius: "8px", border: "1px solid #333" }}>
          <h3 style={{ color: "#888", marginBottom: "20px" }}>OPTION 7: Streak Focus</h3>
          <div style={{ textAlign: "center" }}>
            <h2 style={{ color: "#fcdb33", margin: "0 0 5px 0" }}>{playerData.name}</h2>
            <p style={{ color: "#fff", margin: "0 0 8px 0" }}>
              <span style={{ fontFamily: "monospace", fontSize: "18px" }}>{currentMmr}</span>
              <span style={{ color: "#888" }}> MMR</span>
            </p>
            <div style={{
              background: "rgba(194, 52, 52, 0.2)",
              border: "1px solid #c23434",
              borderRadius: "4px",
              padding: "4px 8px",
              display: "inline-block",
              marginBottom: "8px"
            }}>
              <span style={{ color: "#c23434", fontSize: "12px", fontWeight: "bold" }}>3 LOSS STREAK</span>
            </div>
            <div style={{ display: "flex", gap: "4px", justifyContent: "center" }}>
              {(session?.form || []).slice(-5).map((won, i) => (
                <span
                  key={i}
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: won ? "#34c774" : "#c23434",
                    opacity: 0.7,
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Option 8: Mini Chart with Endpoints */}
        <div style={{ background: "#111", padding: "20px", borderRadius: "8px", border: "1px solid #333" }}>
          <h3 style={{ color: "#888", marginBottom: "20px" }}>OPTION 8: Labeled Sparkline</h3>
          <div style={{ textAlign: "center" }}>
            <h2 style={{ color: "#fcdb33", margin: "0 0 5px 0" }}>{playerData.name}</h2>
            <p style={{ color: "#fff", margin: "0 0 8px 0" }}>
              <span style={{ fontFamily: "monospace", fontSize: "18px" }}>{currentMmr}</span>
              <span style={{ color: "#888" }}> MMR</span>
            </p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", marginBottom: "8px" }}>
              <span style={{ color: "#666", fontSize: "10px", fontFamily: "monospace" }}>{seasonMmrs[0]}</span>
              <div style={{ width: "80px" }}>
                <Sparklines data={seasonMmrs} width={80} height={20} margin={2}>
                  <SparklinesLine style={{ strokeWidth: 2, stroke: delta >= 0 ? "#34c774" : "#c23434", fill: "none" }} />
                </Sparklines>
              </div>
              <span style={{ color: delta >= 0 ? "#34c774" : "#c23434", fontSize: "10px", fontFamily: "monospace" }}>{currentMmr}</span>
            </div>
            <div style={{ display: "flex", gap: "4px", justifyContent: "center" }}>
              {(session?.form || []).slice(-5).map((won, i) => (
                <span
                  key={i}
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: won ? "#34c774" : "#c23434",
                    opacity: 0.7,
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Option 9: Rank Badge */}
        <div style={{ background: "#111", padding: "20px", borderRadius: "8px", border: "1px solid #333" }}>
          <h3 style={{ color: "#888", marginBottom: "20px" }}>OPTION 9: Rank Badge</h3>
          <div style={{ textAlign: "center" }}>
            <h2 style={{ color: "#fcdb33", margin: "0 0 5px 0" }}>{playerData.name}</h2>
            <p style={{ color: "#fff", margin: "0 0 8px 0" }}>
              <span style={{ fontFamily: "monospace", fontSize: "18px" }}>{currentMmr}</span>
              <span style={{ color: "#888" }}> MMR </span>
              <span style={{ color: delta >= 0 ? "#34c774" : "#c23434", fontFamily: "monospace", fontSize: "14px" }}>
                {delta >= 0 ? "↑" : "↓"}{Math.abs(delta)}
              </span>
            </p>
            {session && (
              <div style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: "linear-gradient(135deg, rgba(252, 219, 51, 0.2), rgba(252, 219, 51, 0.05))",
                border: "1px solid #fcdb33",
                borderRadius: "6px",
                padding: "6px 12px",
                marginBottom: "8px"
              }}>
                <span style={{ color: "#fcdb33", fontSize: "14px", fontWeight: "bold" }}>{session.wins}W-{session.losses}L</span>
                <span style={{ color: "#888", fontSize: "11px" }}>session</span>
              </div>
            )}
            <div style={{ display: "flex", gap: "4px", justifyContent: "center" }}>
              {(session?.form || []).slice(-5).map((won, i) => (
                <span
                  key={i}
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: won ? "#34c774" : "#c23434",
                    opacity: 0.7,
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Option 10: Full Stats (Recommended) */}
        <div style={{ background: "#111", padding: "20px", borderRadius: "8px", border: "2px solid #fcdb33" }}>
          <h3 style={{ color: "#fcdb33", marginBottom: "20px" }}>OPTION 10: Full Stats ⭐</h3>
          <div style={{ textAlign: "center" }}>
            <h2 style={{ color: "#fcdb33", margin: "0 0 5px 0" }}>{playerData.name}</h2>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "6px" }}>
              <span style={{ fontFamily: "monospace", fontSize: "18px", color: "#fff" }}>{currentMmr}</span>
              <span style={{ color: delta >= 0 ? "#34c774" : "#c23434", fontFamily: "monospace", fontSize: "12px" }}>
                {delta >= 0 ? "↑" : "↓"}{Math.abs(delta)}
              </span>
              {session && (
                <span style={{
                  background: "rgba(252, 219, 51, 0.2)",
                  color: "#fcdb33",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  fontSize: "10px",
                  fontWeight: "bold"
                }}>
                  {session.wins}W-{session.losses}L
                </span>
              )}
            </div>
            <div style={{ width: "100px", margin: "0 auto 6px auto" }}>
              <Sparklines data={seasonMmrs} width={100} height={20} margin={2}>
                <SparklinesLine style={{ strokeWidth: 2, stroke: "#aaa", fill: "none" }} />
              </Sparklines>
            </div>
            <div style={{ display: "flex", gap: "4px", justifyContent: "center", marginBottom: "6px" }}>
              {(session?.form || []).slice(-5).map((won, i) => (
                <span
                  key={i}
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: won ? "#34c774" : "#c23434",
                    opacity: 0.7,
                  }}
                />
              ))}
            </div>
            <p style={{ color: "#666", fontSize: "10px", margin: 0 }}>
              {session ? `Session: ${session.wins}W-${session.losses}L` : "No session"}
            </p>
          </div>
        </div>

        {/* Option 11: Minimal Pro */}
        <div style={{ background: "#111", padding: "20px", borderRadius: "8px", border: "1px solid #333" }}>
          <h3 style={{ color: "#888", marginBottom: "20px" }}>OPTION 11: Minimal Pro</h3>
          <div style={{ textAlign: "center" }}>
            <h2 style={{ color: "#fcdb33", margin: "0 0 8px 0" }}>{playerData.name}</h2>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
              <span style={{ fontFamily: "monospace", fontSize: "16px", color: "#fff" }}>{currentMmr}</span>
              {session && (
                <span style={{
                  color: delta >= 0 ? "#34c774" : "#c23434",
                  fontSize: "10px",
                  fontWeight: "bold",
                  opacity: 0.8
                }}>
                  {delta >= 0 ? "↑" : "↓"}{Math.abs(delta)}
                </span>
              )}
              <div style={{ display: "flex", gap: "2px" }}>
                {(session?.form || []).map((won, i) => (
                  <span
                    key={i}
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: won ? "#34c774" : "#c23434",
                      opacity: 0.6,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Option 12: Sparkline with Min/Max Labels */}
        <div style={{ background: "#111", padding: "20px", borderRadius: "8px", border: "1px solid #333" }}>
          <h3 style={{ color: "#888", marginBottom: "20px" }}>OPTION 12: Min/Max Labels</h3>
          <div style={{ textAlign: "center" }}>
            <h2 style={{ color: "#fcdb33", margin: "0 0 5px 0" }}>{playerData.name}</h2>
            <p style={{ color: "#fff", margin: "0 0 8px 0" }}>
              <span style={{ fontFamily: "monospace", fontSize: "18px" }}>{currentMmr}</span>
              <span style={{ color: "#888" }}> MMR</span>
            </p>
            <div style={{ position: "relative", width: "120px", margin: "0 auto 8px auto" }}>
              {/* Min label */}
              <span style={{
                position: "absolute",
                left: "-25px",
                bottom: "0",
                color: "#c23434",
                fontSize: "9px",
                fontFamily: "monospace"
              }}>{low}</span>
              {/* Max label */}
              <span style={{
                position: "absolute",
                right: "-25px",
                top: "0",
                color: "#34c774",
                fontSize: "9px",
                fontFamily: "monospace"
              }}>{peak}</span>
              <Sparklines data={seasonMmrs} width={120} height={30} margin={5}>
                <SparklinesLine style={{ strokeWidth: 2, stroke: "#aaa", fill: "none" }} />
                <SparklinesSpots size={3} style={{ fill: "#fcdb33" }} />
                <SparklinesReferenceLine type="max" style={{ stroke: "#34c774", strokeOpacity: 0.5, strokeDasharray: "2,2" }} />
                <SparklinesReferenceLine type="min" style={{ stroke: "#c23434", strokeOpacity: 0.5, strokeDasharray: "2,2" }} />
              </Sparklines>
            </div>
            <div style={{ display: "flex", gap: "4px", justifyContent: "center" }}>
              {(session?.form || []).slice(-5).map((won, i) => (
                <span
                  key={i}
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: won ? "#34c774" : "#c23434",
                    opacity: 0.7,
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Option 13: Sparkline with Range Band */}
        <div style={{ background: "#111", padding: "20px", borderRadius: "8px", border: "1px solid #333" }}>
          <h3 style={{ color: "#888", marginBottom: "20px" }}>OPTION 13: Range Band</h3>
          <div style={{ textAlign: "center" }}>
            <h2 style={{ color: "#fcdb33", margin: "0 0 5px 0" }}>{playerData.name}</h2>
            <p style={{ color: "#fff", margin: "0 0 8px 0" }}>
              <span style={{ fontFamily: "monospace", fontSize: "18px" }}>{currentMmr}</span>
              <span style={{ color: "#888" }}> MMR </span>
              <span style={{ color: "#666", fontSize: "11px" }}>({low}-{peak})</span>
            </p>
            <div style={{ position: "relative", width: "120px", margin: "0 auto 8px auto" }}>
              <Sparklines data={seasonMmrs} width={120} height={30} margin={5}>
                <SparklinesLine style={{ strokeWidth: 2, stroke: "#fcdb33", fill: "rgba(252, 219, 51, 0.1)" }} />
                <SparklinesSpots size={3} spotColors={{ '-1': '#c23434', '0': '#34c774' }} />
              </Sparklines>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
              <span style={{ color: "#c23434", fontSize: "10px" }}>▼{low}</span>
              <div style={{ display: "flex", gap: "4px" }}>
                {(session?.form || []).slice(-5).map((won, i) => (
                  <span
                    key={i}
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: won ? "#34c774" : "#c23434",
                      opacity: 0.7,
                    }}
                  />
                ))}
              </div>
              <span style={{ color: "#34c774", fontSize: "10px" }}>{peak}▲</span>
            </div>
          </div>
        </div>

        {/* Option 14: Inline Min/Max with Sparkline */}
        <div style={{ background: "#111", padding: "20px", borderRadius: "8px", border: "2px solid #34c774" }}>
          <h3 style={{ color: "#34c774", marginBottom: "20px" }}>OPTION 14: Inline Range ⭐</h3>
          <div style={{ textAlign: "center" }}>
            <h2 style={{ color: "#fcdb33", margin: "0 0 5px 0" }}>{playerData.name}</h2>
            <p style={{ color: "#fff", margin: "0 0 10px 0" }}>
              <span style={{ fontFamily: "monospace", fontSize: "18px" }}>{currentMmr}</span>
              <span style={{ color: "#888" }}> MMR </span>
              <span style={{ color: delta >= 0 ? "#34c774" : "#c23434", fontFamily: "monospace", fontSize: "12px" }}>
                {delta >= 0 ? "↑" : "↓"}{Math.abs(delta)}
              </span>
            </p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", marginBottom: "8px" }}>
              <span style={{ color: "#c23434", fontSize: "10px", fontFamily: "monospace" }}>{low}</span>
              <div style={{ width: "80px" }}>
                <Sparklines data={seasonMmrs} width={80} height={24} margin={2}>
                  <SparklinesLine style={{ strokeWidth: 2, stroke: "#aaa", fill: "none" }} />
                  <SparklinesReferenceLine type="max" style={{ stroke: "#34c774", strokeOpacity: 0.4, strokeDasharray: "2,2" }} />
                  <SparklinesReferenceLine type="min" style={{ stroke: "#c23434", strokeOpacity: 0.4, strokeDasharray: "2,2" }} />
                </Sparklines>
              </div>
              <span style={{ color: "#34c774", fontSize: "10px", fontFamily: "monospace" }}>{peak}</span>
            </div>
            <div style={{ display: "flex", gap: "4px", justifyContent: "center" }}>
              {(session?.form || []).slice(-5).map((won, i) => (
                <span
                  key={i}
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: won ? "#34c774" : "#c23434",
                    opacity: 0.7,
                  }}
                />
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default VisualizationDemo;
