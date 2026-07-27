import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSeasonStats, listRecentRounds } from "../lib/db";
import type { SeasonStats, RoundSummaryRow } from "../lib/db";
import { TopBar, FullSpinner } from "../components/ui";
import { toParLabel } from "../lib/course";
import { formatRoundDate } from "../lib/date";

export default function Stats() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<SeasonStats | null>(null);
  const [rounds, setRounds] = useState<RoundSummaryRow[] | null>(null);

  useEffect(() => {
    getSeasonStats().then(setStats).catch(() => setStats(null));
    listRecentRounds(30).then(setRounds).catch(() => setRounds([]));
  }, []);

  if (!stats || rounds === null) return <div className="screen"><TopBar title="Stats" onBack="auto" /><FullSpinner /></div>;

  const year = new Date().getFullYear();
  const tiles: { label: string; value: string; accent?: boolean }[] = [
    { label: "Rounds", value: String(stats.roundsPlayed) },
    { label: "Birdies", value: String(stats.birdies), accent: true },
    { label: "Eagles", value: String(stats.eagles), accent: true },
    { label: "Best to par", value: stats.bestToPar === null ? "—" : toParLabel(stats.bestToPar) },
    { label: "Scoring avg", value: stats.scoringAvg === null ? "—" : stats.scoringAvg.toFixed(1) },
    { label: "GIR", value: stats.girPct === null ? "—" : `${Math.round(stats.girPct)}%` },
  ];

  return (
    <div className="screen fade">
      <TopBar title="Stats" subtitle={`${year} season · your card`} onBack="auto" />
      <div className="scroll">
        <div className="pad" style={{ display: "flex", flexDirection: "column", gap: 22, paddingTop: 8 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 10,
            }}
          >
            {tiles.map((t) => (
              <div
                key={t.label}
                className="card"
                style={{ padding: "14px 14px 13px", display: "flex", flexDirection: "column", gap: 6 }}
              >
                <span
                  style={{
                    font: "500 11px var(--sans)",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "var(--faint)",
                  }}
                >
                  {t.label}
                </span>
                <span
                  className="tnum"
                  style={{
                    font: "600 26px var(--sans)",
                    lineHeight: 1,
                    color: t.accent ? "var(--brass)" : "var(--green-900)",
                  }}
                >
                  {t.value}
                </span>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h2 className="h-serif" style={{ font: "600 19px var(--serif)" }}>
              All rounds
            </h2>
            {rounds.length === 0 ? (
              <div className="card" style={{ padding: "22px 18px", textAlign: "center" }}>
                <span style={{ font: "400 14px var(--sans)", color: "var(--faint)" }}>
                  No rounds logged yet.
                </span>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {rounds.map((r) => (
                  <button
                    key={r.round.id}
                    onClick={() => navigate(`/rounds/${r.round.id}`)}
                    className="card"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      padding: "14px 16px",
                      cursor: "pointer",
                      textAlign: "left",
                      width: "100%",
                    }}
                  >
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                      <span style={{ font: "600 15px var(--sans)", color: "var(--ink)" }}>
                        {formatRoundDate(r.round.played_on)}
                      </span>
                      <span style={{ font: "400 13px var(--sans)", color: "var(--faint)" }}>
                        {r.playerCount} {r.playerCount === 1 ? "player" : "players"} · {r.round.course}
                      </span>
                    </div>
                    {r.selfTotal !== null && (
                      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                        <span className="tnum" style={{ font: "600 20px var(--sans)", color: "var(--ink)" }}>
                          {r.selfTotal}
                        </span>
                        <span
                          style={{
                            font: "600 13px var(--sans)",
                            color: r.selfDiff! < 0 ? "var(--brass)" : "var(--faint)",
                          }}
                        >
                          {toParLabel(r.selfDiff!)}
                        </span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
