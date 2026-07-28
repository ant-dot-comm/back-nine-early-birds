import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { listRecentRounds, listDraftRounds, getSeasonStats, deleteRound, listPendingShares, acceptShare, dismissShare } from "../lib/db";
import type { RoundSummaryRow, SeasonStats } from "../lib/db";
import type { ScoreShare } from "../lib/types";
import { Avatar, StatCard, FullSpinner, Logo } from "../components/ui";
import ConfirmDialog from "../components/ConfirmDialog";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrashCan, faFlag } from "@fortawesome/free-solid-svg-icons";
import { toParLabel, modeLabel, parTotalFor } from "../lib/course";
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
  const [shares, setShares] = useState<ScoreShare[]>([]);
  const [busyShare, setBusyShare] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  function load() {
    getSeasonStats().then(setStats).catch(() => setStats(null));
    listRecentRounds(5).then(setRounds).catch(() => setRounds([]));
    listDraftRounds().then(setDrafts).catch(() => setDrafts([]));
    listPendingShares().then(setShares).catch(() => setShares([]));
  }

  async function accept(s: ScoreShare) {
    setBusyShare(s.id);
    try {
      await acceptShare(s.id);
      setShares((prev) => prev.filter((x) => x.id !== s.id));
      load();
    } finally {
      setBusyShare(null);
    }
  }
  async function dismiss(s: ScoreShare) {
    setBusyShare(s.id);
    try {
      await dismissShare(s.id);
      setShares((prev) => prev.filter((x) => x.id !== s.id));
    } finally {
      setBusyShare(null);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function doDelete() {
    if (!confirmId) return;
    setDeleting(true);
    try {
      await deleteRound(confirmId);
      setConfirmId(null);
      load();
    } finally {
      setDeleting(false);
    }
  }

  const firstName = (profile?.display_name ?? "there").split(/\s+/)[0];

  return (
    <div className="screen fade">
      <div className="safe-top" style={{ flex: "none", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 24px 4px" }}>
        <Logo width={140} />
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
            <FontAwesomeIcon icon={faFlag} style={{ color: "var(--gold)", fontSize: 17 }} />
            Log a round
          </button>

          {/* Shared with you — pending scores from other members */}
          {shares.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <h2 className="h-serif" style={{ font: "600 19px var(--serif)" }}>Shared with you</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {shares.map((s) => {
                  const total = s.scores.reduce((a, x) => a + x.strokes, 0);
                  const diff = total - parTotalFor(s.scores.map((x) => x.hole));
                  return (
                    <div key={s.id} className="card" style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12, border: "1.5px solid var(--brass)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                          <span style={{ font: "600 15px var(--sans)", color: "var(--ink)" }}>{s.from_display ?? "A friend"} shared a round</span>
                          <span style={{ font: "400 13px var(--sans)", color: "var(--faint)" }}>{formatRoundDate(s.played_on)} · {modeLabel(s.mode)}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                          <span className="tnum" style={{ font: "600 20px var(--sans)", color: "var(--ink)" }}>{total}</span>
                          <span style={{ font: "600 13px var(--sans)", color: diff < 0 ? "var(--brass)" : "var(--faint)" }}>{toParLabel(diff)}</span>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 10 }}>
                        <button className="btn sm" style={{ flex: 1, height: 46 }} onClick={() => accept(s)} disabled={busyShare === s.id}>
                          {busyShare === s.id ? <span className="spin on-dark" /> : "Add to my rounds"}
                        </button>
                        <button className="btn ghost sm" style={{ height: 46 }} onClick={() => dismiss(s)} disabled={busyShare === s.id}>Dismiss</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

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
                        <FontAwesomeIcon icon={faTrashCan} />
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
                  <RoundRow
                    key={r.round.id}
                    row={r}
                    onClick={() => navigate(`/rounds/${r.round.id}`)}
                    onDelete={() => setConfirmId(r.round.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {confirmId && (
        <ConfirmDialog
          title="Delete this round?"
          body="This permanently removes the round and every score in it. This can't be undone."
          busy={deleting}
          onCancel={() => setConfirmId(null)}
          onConfirm={doDelete}
        />
      )}
    </div>
  );
}

function RoundRow({ row, onClick, onDelete }: { row: RoundSummaryRow; onClick: () => void; onDelete: () => void }) {
  const under = row.selfDiff !== null && row.selfDiff < 0;
  return (
    <div className="card" style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 12px 14px 16px" }}>
      <button onClick={onClick} style={{ flex: 1, display: "flex", alignItems: "center", gap: 12, border: "none", background: "transparent", cursor: "pointer", textAlign: "left", padding: 0, minWidth: 0 }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
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
      <button
        onClick={onDelete}
        aria-label="Delete round"
        style={{ width: 38, height: 38, flex: "none", borderRadius: 10, border: "none", background: "transparent", color: "#b58a78", cursor: "pointer", display: "grid", placeItems: "center" }}
      >
        <FontAwesomeIcon icon={faTrashCan} />
      </button>
    </div>
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

