import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listRecentRounds } from "../lib/db";
import type { RoundSummaryRow } from "../lib/db";
import { TopBar, FullSpinner } from "../components/ui";
import { toParLabel, modeLabel } from "../lib/course";
import { formatRoundDate } from "../lib/date";

export default function Stats() {
  const navigate = useNavigate();
  const [rounds, setRounds] = useState<RoundSummaryRow[] | null>(null);

  useEffect(() => {
    listRecentRounds(50).then(setRounds).catch(() => setRounds([]));
  }, []);

  if (rounds === null) return <div className="screen"><TopBar title="All rounds" onBack="auto" /><FullSpinner /></div>;

  return (
    <div className="screen fade">
      <TopBar title="All rounds" onBack="auto" />
      <div className="scroll">
        <div className="pad" style={{ display: "flex", flexDirection: "column", gap: 22, paddingTop: 8 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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
                        {modeLabel(r.round.mode)} · {r.playerCount} {r.playerCount === 1 ? "player" : "players"}
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
