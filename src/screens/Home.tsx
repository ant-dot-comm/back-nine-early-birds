import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { listRecentRounds, listDraftRounds, getSeasonStats, deleteRound } from "../lib/db";
import type { RoundSummaryRow, SeasonStats } from "../lib/db";
import { Avatar, StatCard, FullSpinner } from "../components/ui";
import { toParLabel, modeLabel } from "../lib/course";
import { formatRoundDate } from "../lib/date";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function Home() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<SeasonStats | null>(null);
  const [rounds, setRounds] = useState<RoundSummaryRow[] | null>(null);
  const [drafts, setDrafts] = useState<RoundSummaryRow[]>([]);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    getSeasonStats().then(setStats).catch(() => setStats(null));
    listRecentRounds(5).then(setRounds).catch(() => setRounds([]));
    listDraftRounds().then(setDrafts).catch(() => setDrafts([]));
  }, []);

  async function doDelete() {
    if (!confirmId) return;
    setDeleting(true);
    try {
      await deleteRound(confirmId);
      setDrafts((prev) => prev.filter((d) => d.round.id !== confirmId));
      setConfirmId(null);
    } finally {
      setDeleting(false);
    }
  }

  const firstName = (profile?.display_name ?? "there").split(/\s+/)[0];

  return (
    <div className="screen fade">
      <div className="safe-top" style={{ flex: "none", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 24px 4px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ font: "700 18px var(--sans)", letterSpacing: "0.02em", color: "var(--green-900)" }}>BACK</span>
          <span style={{ width: 27, height: 27, borderRadius: "50%", background: "var(--green-900)", color: "var(--gold)", font: "700 15px var(--sans)", display: "grid", placeItems: "center" }}>9</span>
        </div>
        <button onClick={() => navigate("/account")} aria-label="Account" style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer" }}>
          <Avatar initials={profile?.initials ?? "9"} me size={38} />
        </button>
      </div>

      <div className="scroll">
        <div className="pad" style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div>
            <h1 className="h-serif" style={{ font: "600 30px/1.1 var(--serif)" }}>{greeting()}, {firstName}.</h1>
            <p style={{ margin: "6px 0 0", font: "400 15px var(--sans)", color: "var(--muted-2)" }}>Early birds tee off Saturday at 6:40am.</p>
          </div>

          <button className="btn" style={{ height: 64, fontSize: 18 }} onClick={() => navigate("/rounds/new")}>
            <span style={{ position: "relative", width: 16, height: 20, display: "inline-block" }}>
              <span style={{ position: "absolute", left: 2, top: 0, bottom: 0, width: 2, background: "var(--gold)" }} />
              <span style={{ position: "absolute", left: 4, top: 1, width: 0, height: 0, borderTop: "5px solid transparent", borderBottom: "5px solid transparent", borderLeft: "11px solid var(--gold)" }} />
            </span>
            Log a round
          </button>

          {/* In-progress rounds */}
          {drafts.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <h2 className="h-serif" style={{ font: "600 19px var(--serif)" }}>In progress</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {drafts.map((d) => (
                  <div key={d.round.id} className="card" style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12, borderColor: "var(--chip-line)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                        <span style={{ font: "600 15px var(--sans)", color: "var(--ink)" }}>{formatRoundDate(d.round.played_on, true)}</span>
                        <span style={{ font: "400 13px var(--sans)", color: "var(--faint)" }}>
                          {modeLabel(d.round.mode)} · {d.playerCount} {d.playerCount === 1 ? "player" : "players"}
                        </span>
                      </div>
                      {d.selfTotal !== null && (
                        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                          <span className="tnum" style={{ font: "600 20px var(--sans)", color: "var(--ink)" }}>{d.selfTotal}</span>
                          <span style={{ font: "600 13px var(--sans)", color: (d.selfDiff ?? 0) < 0 ? "var(--brass)" : "var(--faint)" }}>{toParLabel(d.selfDiff ?? 0)}</span>
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                      <button className="btn sm" style={{ flex: 1, height: 46 }} onClick={() => navigate(`/rounds/${d.round.id}/score`)}>Continue</button>
                      <button
                        onClick={() => setConfirmId(d.round.id)}
                        aria-label="Delete round"
                        style={{ width: 46, height: 46, flex: "none", borderRadius: 12, border: "1.5px solid #d8b7a8", background: "transparent", color: "#a8654a", cursor: "pointer", display: "grid", placeItems: "center" }}
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 12 }}>
            <StatCard label="Birdies this season" value={stats ? stats.birdies : "—"} accent />
            <StatCard label="Rounds played" value={stats ? stats.roundsPlayed : "—"} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
              <h2 className="h-serif" style={{ font: "600 19px var(--serif)" }}>Recent rounds</h2>
              <Link to="/stats" style={{ font: "500 13px var(--sans)", color: "var(--brass)" }}>See all</Link>
            </div>

            {rounds === null ? (
              <div style={{ padding: "24px 0" }}><FullSpinner /></div>
            ) : rounds.length === 0 ? (
              <EmptyRounds />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {rounds.map((r) => (
                  <RoundRow key={r.round.id} row={r} onClick={() => navigate(`/rounds/${r.round.id}`)} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {confirmId && (
        <ConfirmDelete
          busy={deleting}
          onCancel={() => setConfirmId(null)}
          onConfirm={doDelete}
        />
      )}
    </div>
  );
}

function RoundRow({ row, onClick }: { row: RoundSummaryRow; onClick: () => void }) {
  const under = row.selfDiff !== null && row.selfDiff < 0;
  return (
    <button onClick={onClick} className="card" style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", cursor: "pointer", textAlign: "left", width: "100%" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ font: "600 15px var(--sans)", color: "var(--ink)" }}>{formatRoundDate(row.round.played_on)}</span>
        <span style={{ font: "400 13px var(--sans)", color: "var(--faint)" }}>
          {modeLabel(row.round.mode)} · {row.playerCount} {row.playerCount === 1 ? "player" : "players"}
        </span>
      </div>
      {row.selfTotal !== null && (
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span className="tnum" style={{ font: "600 20px var(--sans)", color: "var(--ink)" }}>{row.selfTotal}</span>
          <span style={{ font: "600 13px var(--sans)", color: under ? "var(--brass)" : "var(--faint)" }}>{toParLabel(row.selfDiff!)}</span>
        </div>
      )}
    </button>
  );
}

function EmptyRounds() {
  return (
    <div className="card" style={{ padding: "26px 20px", textAlign: "center", display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ font: "600 16px var(--serif)", color: "var(--green-900)" }}>No rounds yet</span>
      <span style={{ font: "400 14px var(--sans)", color: "var(--faint)" }}>Tap “Log a round” after your next nine.</span>
    </div>
  );
}

function ConfirmDelete({ busy, onCancel, onConfirm }: { busy: boolean; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div onClick={onCancel} style={{ position: "fixed", inset: 0, background: "rgba(20,25,12,.45)", display: "grid", placeItems: "center", padding: 24, zIndex: 50 }}>
      <div onClick={(e) => e.stopPropagation()} className="fade" style={{ width: "100%", maxWidth: 360, background: "var(--sand)", borderRadius: 22, padding: 24, display: "flex", flexDirection: "column", gap: 10 }}>
        <h2 className="h-serif" style={{ font: "600 20px var(--serif)" }}>Delete this round?</h2>
        <p style={{ margin: 0, font: "400 15px/1.5 var(--sans)", color: "var(--muted)" }}>
          This permanently removes the round and every score in it. This can't be undone.
        </p>
        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <button className="btn ghost" onClick={onCancel} disabled={busy}>Cancel</button>
          <button
            className="btn"
            style={{ background: "#a8654a" }}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? <span className="spin on-dark" /> : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TrashIcon() {
  return (
    <span style={{ position: "relative", width: 15, height: 16, display: "block" }}>
      <span style={{ position: "absolute", top: 3, left: 0, right: 0, height: 1.5, background: "currentColor" }} />
      <span style={{ position: "absolute", top: 0, left: 5, width: 5, height: 2, border: "1.5px solid currentColor", borderBottom: "none", borderRadius: "2px 2px 0 0" }} />
      <span style={{ position: "absolute", top: 5, left: 1.5, width: 12, height: 10, border: "1.5px solid currentColor", borderTop: "none", borderRadius: "0 0 3px 3px" }} />
    </span>
  );
}
