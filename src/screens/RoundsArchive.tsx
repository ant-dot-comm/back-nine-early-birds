import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { listRecentRounds, listDraftRounds } from "../lib/db";
import type { RoundSummaryRow } from "../lib/db";
import { FullSpinner } from "../components/ui";
import { toParLabel, modeLabel } from "../lib/course";
import { formatRoundDate } from "../lib/date";
import { C } from "../lib/paint";

export default function RoundsArchive() {
  const navigate = useNavigate();
  const [rounds, setRounds] = useState<RoundSummaryRow[] | null>(null);
  const [drafts, setDrafts] = useState<RoundSummaryRow[]>([]);

  useEffect(() => {
    listRecentRounds(60).then(setRounds).catch(() => setRounds([]));
    listDraftRounds().then(setDrafts).catch(() => setDrafts([]));
  }, []);

  return (
    <div className="screen fade">
      <div className="safe-top" style={{ flex: "none", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 20px 10px" }}>
        <span style={{ font: "600 18px var(--sans)", color: C.tx }}>Your card archive</span>
        <button className="btn flag sm" style={{ height: 40 }} onClick={() => navigate("/rounds/new")}>Log a round</button>
      </div>
      <div className="scroll">
        <div className="pad pad-dock" style={{ paddingTop: 0, display: "flex", flexDirection: "column", gap: 16 }}>
          {drafts.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span className="eyebrow">In progress</span>
              {drafts.map((d) => (
                <button key={d.round.id} onClick={() => navigate(`/rounds/${d.round.id}/score`)} className="surf-panel" style={{ borderRadius: 14, padding: "13px 15px", display: "flex", alignItems: "center", justifyContent: "space-between", border: `1px solid ${C.line}`, cursor: "pointer" }}>
                  <div style={{ textAlign: "left" }}><div style={{ font: "600 15px var(--sans)", color: C.tx }}>{formatRoundDate(d.round.played_on, true)}</div><div style={{ font: "400 12px var(--sans)", color: C.tx3 }}>{modeLabel(d.round.mode)} · unfinished</div></div>
                  <span style={{ font: "600 12px var(--sans)", color: C.sand }}>Continue ▸</span>
                </button>
              ))}
            </div>
          )}

          {rounds === null ? <FullSpinner /> : rounds.length === 0 ? (
            <div className="surf-panel" style={{ borderRadius: 14, padding: "26px 20px", textAlign: "center", display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 28 }}>⛳️</span>
              <span style={{ font: "600 16px var(--sans)", color: C.tx }}>No cards signed yet</span>
              <span style={{ font: "400 13px var(--sans)", color: C.tx3 }}>Log your first round to start the archive.</span>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {rounds.map((r) => (
                <Link key={r.round.id} to={`/rounds/${r.round.id}`} className="surf-panel" style={{ borderRadius: 14, padding: "13px 15px", display: "flex", alignItems: "center", gap: 12, textDecoration: "none" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ font: "600 15px var(--sans)", color: C.tx }}>{formatRoundDate(r.round.played_on, true)}</div>
                    <div style={{ font: "400 12px var(--sans)", color: C.tx3 }}>{modeLabel(r.round.mode)} · {r.playerCount} {r.playerCount === 1 ? "player" : "players"}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span className="tnum" style={{ font: "600 26px var(--sans)", color: C.tx }}>{r.selfTotal ?? "—"}</span>
                    {r.selfDiff != null && <span style={{ font: "600 13px var(--sans)", color: r.selfDiff < 0 ? C.flag : C.tx3 }}>{toParLabel(r.selfDiff)}</span>}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
