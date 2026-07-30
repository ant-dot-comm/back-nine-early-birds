import { useEffect, useMemo, useState } from "react";
import { getMemberLeaderboard, listRecentRounds } from "../lib/db";
import type { RoundSummaryRow } from "../lib/db";
import type { LeaderboardRow } from "../lib/types";
import { FullSpinner } from "../components/ui";
import { PAINT, C } from "../lib/paint";
import { modeLabel } from "../lib/course";
import { formatRoundDate } from "../lib/date";

type Metric = "birdies" | "avg" | "gir" | "pars";
const METRICS: { key: Metric; label: string }[] = [
  { key: "birdies", label: "Birdies" }, { key: "avg", label: "Scoring avg" }, { key: "gir", label: "GIR" }, { key: "pars", label: "Pars" },
];
const BAR_COLORS = [C.flag, C.paper, C.fescue, "#6A705A", "#4A5340"];

export default function Stats() {
  const [board, setBoard] = useState<LeaderboardRow[] | null>(null);
  const [rounds, setRounds] = useState<RoundSummaryRow[]>([]);
  const [metric, setMetric] = useState<Metric>("birdies");

  useEffect(() => {
    getMemberLeaderboard().then(setBoard).catch(() => setBoard([]));
    listRecentRounds(8).then(setRounds).catch(() => setRounds([]));
  }, []);

  const bars = useMemo(() => {
    if (!board) return [];
    const val = (r: LeaderboardRow) => metric === "birdies" ? r.birdies : metric === "pars" ? r.pars : metric === "gir" ? (r.gir_pct ?? 0) : (r.avg9 ?? 0);
    const rows = board.filter((r) => r.rounds > 0).map((r) => ({ name: r.display_name.split(/\s+/)[0], v: val(r) }));
    rows.sort((a, b) => metric === "avg" ? a.v - b.v : b.v - a.v);
    const max = Math.max(1, ...rows.map((r) => r.v));
    return rows.slice(0, 5).map((r, i) => ({ ...r, h: Math.round((r.v / max) * 176) + 8, color: BAR_COLORS[i % BAR_COLORS.length] }));
  }, [board, metric]);

  if (board === null) return <div className="screen"><FullSpinner /></div>;

  return (
    <div className="screen fade">
      <div className="safe-top" style={{ flex: "none", display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "6px 22px 12px" }}>
        <h1 className="display" style={{ fontSize: 27 }}>Group stats</h1>
        <span style={{ font: "600 11px var(--sans)", color: C.sand }}>All time</span>
      </div>

      <div style={{ flex: "none", display: "flex", gap: 7, padding: "0 22px 14px", overflowX: "auto" }}>
        {METRICS.map((m) => (
          <button key={m.key} onClick={() => setMetric(m.key)} className={`chip${metric === m.key ? " on" : ""}`} style={{ cursor: "pointer", flex: "none", ...(metric === m.key ? { background: C.paper, color: C.ink, boxShadow: "0 8px 14px -7px rgba(9,13,7,.7)" } : {}) }}>{m.label}</button>
        ))}
      </div>

      <div className="scroll">
        <div className="pad pad-dock" style={{ paddingTop: 0, display: "flex", flexDirection: "column", gap: 18 }}>
          {/* painted bar chart */}
          <div style={{ position: "relative", height: 296, borderRadius: "110px 110px 26px 26px", overflow: "hidden", boxShadow: "0 20px 36px -16px rgba(9,13,7,.82), 0 5px 10px -5px rgba(9,13,7,.55), inset 0 1px 0 rgba(233,223,198,.11)" }}>
            <img src={PAINT.stripesWide} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(#20261C00 34%,#20261Cdd)" }} />
            {bars.length === 0 ? (
              <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: C.cream, font: "400 22px var(--hand)" }} className="hand">no rounds logged yet</div>
            ) : (
              <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 236, display: "flex", alignItems: "flex-end", justifyContent: "space-around", padding: "0 12px 12px" }}>
                {bars.map((b) => (
                  <div key={b.name} style={{ width: 52, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                    <span className="tnum" style={{ font: "600 18px var(--sans)", color: C.cream }}>{metric === "gir" ? `${b.v}%` : metric === "avg" ? b.v.toFixed(1) : b.v}</span>
                    <span style={{ width: "100%", height: b.h, background: b.color, borderRadius: "6px 6px 0 0" }} />
                    <span style={{ font: "600 10px var(--sans)", color: C.cream }}>{b.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* group totals */}
          <div style={{ display: "flex", gap: 10 }}>
            <Tile label="Members" value={String(board.filter((r) => r.rounds > 0).length)} />
            <Tile label="Rounds logged" value={String(board.reduce((s, r) => s + r.rounds, 0))} accent />
            <Tile label="Birdies" value={String(board.reduce((s, r) => s + r.birdies, 0))} />
          </div>

          {/* every round */}
          <div>
            <span className="eyebrow" style={{ display: "block", marginBottom: 8 }}>Your recent rounds</span>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {rounds.length === 0 ? <span style={{ font: "400 14px var(--sans)", color: C.tx3 }}>No rounds yet.</span> : rounds.map((r) => (
                <div key={r.round.id} style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 2px", borderBottom: `1px solid ${C.line2}` }}>
                  <div style={{ flex: 1 }}><div style={{ font: "600 14px var(--sans)", color: C.tx }}>{formatRoundDate(r.round.played_on, true)}</div><div style={{ font: "400 11px var(--sans)", color: C.tx3 }}>{modeLabel(r.round.mode)} · {r.playerCount} played</div></div>
                  <span className="tnum" style={{ font: "600 17px var(--sans)", color: r.selfDiff != null && r.selfDiff < 0 ? C.flag : C.tx }}>{r.selfTotal ?? "—"}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Tile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="surf-panel" style={{ flex: 1, borderRadius: 14, padding: "13px 14px" }}>
      <span style={{ font: "600 9px var(--sans)", letterSpacing: ".14em", textTransform: "uppercase", color: C.tx3 }}>{label}</span>
      <div className="tnum" style={{ font: "600 30px var(--sans)", lineHeight: 1.1, color: accent ? C.flag : C.tx }}>{value}</div>
    </div>
  );
}
