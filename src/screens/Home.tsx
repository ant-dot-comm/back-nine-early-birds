import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { listRecentRounds, listDraftRounds, getSeasonStats, deleteRound, listPendingShares, acceptShare, dismissShare, getMemberLeaderboard, listMyChallenges, respondChallenge, cancelChallenge, startChallengeRound } from "../lib/db";
import type { RoundSummaryRow, SeasonStats } from "../lib/db";
import type { ScoreShare, LeaderboardRow, Challenge } from "../lib/types";
import { Avatar, FullSpinner, Logo } from "../components/ui";
import ConfirmDialog from "../components/ConfirmDialog";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrashCan, faFlag } from "@fortawesome/free-solid-svg-icons";
import { toParLabel, modeLabel, parTotalFor, personSub } from "../lib/course";
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
  const [board, setBoard] = useState<LeaderboardRow[]>([]);
  const [statView, setStatView] = useState<"you" | "everyone">("you");
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [busyChal, setBusyChal] = useState<string | null>(null);
  const [busyShare, setBusyShare] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  function load() {
    getSeasonStats().then(setStats).catch(() => setStats(null));
    listRecentRounds(5).then(setRounds).catch(() => setRounds([]));
    listDraftRounds().then(setDrafts).catch(() => setDrafts([]));
    listPendingShares().then(setShares).catch(() => setShares([]));
    getMemberLeaderboard().then(setBoard).catch(() => setBoard([]));
    listMyChallenges().then(setChallenges).catch(() => setChallenges([]));
  }

  const myId = profile?.id;
  const incoming = challenges.filter((c) => c.status === "pending" && c.defender === myId);
  const accepted = challenges.filter((c) => c.status === "accepted");
  const inRound = challenges.filter((c) => c.status === "in_round");

  async function respondChal(id: string, accept: boolean) {
    setBusyChal(id);
    try { await respondChallenge(id, accept); load(); } finally { setBusyChal(null); }
  }
  async function cancelChal(id: string) {
    setBusyChal(id);
    try { await cancelChallenge(id); load(); } finally { setBusyChal(null); }
  }
  async function startChal(id: string) {
    setBusyChal(id);
    try {
      const roundId = await startChallengeRound(id, "back9");
      navigate(`/rounds/${roundId}/score`);
    } catch { setBusyChal(null); }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const firstName = profile?.first_name?.trim() || (profile?.display_name ?? "there").split(/\s+/)[0];

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
            {profile?.display_name && (
              <p style={{ margin: "6px 0 0", font: "400 14px var(--sans)", color: "var(--muted-2)" }}>
                aka <span style={{ color: "var(--brass)", fontWeight: 600 }}>{profile.display_name}</span>
              </p>
            )}
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

          {/* Rare-name challenges */}
          {(incoming.length > 0 || accepted.length > 0 || inRound.length > 0) && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <h2 className="h-serif" style={{ font: "600 19px var(--serif)" }}>Rare-name challenges</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {incoming.map((c) => (
                  <div key={c.id} className="card" style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12, border: "1.5px solid var(--brass)" }}>
                    <div style={{ font: "500 14px/1.5 var(--sans)", color: "var(--ink)" }}>
                      <b>{c.challenger_display}</b> is challenging you for <b style={{ color: "var(--brass)" }}>{c.secret_name}</b>. Play a round together — lower score keeps it.
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                      <button className="btn sm" style={{ flex: 1, height: 44 }} onClick={() => respondChal(c.id, true)} disabled={busyChal === c.id}>
                        {busyChal === c.id ? <span className="spin on-dark" /> : "Accept"}
                      </button>
                      <button className="btn ghost sm" style={{ height: 44 }} onClick={() => respondChal(c.id, false)} disabled={busyChal === c.id}>Decline</button>
                    </div>
                  </div>
                ))}
                {accepted.map((c) => {
                  const other = c.challenger === myId ? c.defender_display : c.challenger_display;
                  return (
                    <div key={c.id} className="card" style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12, border: "1.5px solid var(--brass)" }}>
                      <div style={{ font: "500 14px/1.5 var(--sans)", color: "var(--ink)" }}>
                        Accepted — <b>you vs {other}</b> for <b style={{ color: "var(--brass)" }}>{c.secret_name}</b>. Start the round when you're together; whoever starts keeps score.
                      </div>
                      <div style={{ display: "flex", gap: 10 }}>
                        <button className="btn sm" style={{ flex: 1, height: 44 }} onClick={() => startChal(c.id)} disabled={busyChal === c.id}>
                          {busyChal === c.id ? <span className="spin on-dark" /> : "Start challenge round"}
                        </button>
                        <button className="btn ghost sm" style={{ height: 44 }} onClick={() => cancelChal(c.id)} disabled={busyChal === c.id}>Cancel</button>
                      </div>
                    </div>
                  );
                })}
                {inRound.map((c) => {
                  const other = c.challenger === myId ? c.defender_display : c.challenger_display;
                  const iKeepScore = c.scorekeeper === myId;
                  return (
                    <div key={c.id} className="card" style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, border: "1.5px solid var(--green-900)" }}>
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                        <span style={{ font: "600 14px var(--sans)", color: "var(--ink)" }}>Challenge round in progress · <span style={{ color: "var(--brass)" }}>{c.secret_name}</span></span>
                        <span style={{ font: "400 12px var(--sans)", color: "var(--faint)" }}>
                          You vs {other} · {iKeepScore ? "you're keeping score" : `${c.challenger === myId ? c.defender_display : c.challenger_display} is keeping score`}
                        </span>
                      </div>
                      {iKeepScore && c.round_id && (
                        <button className="btn sm" style={{ height: 40 }} onClick={() => navigate(`/rounds/${c.round_id}/score`)}>Score</button>
                      )}
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
                        style={{ width: 38, height: 46, flex: "none", borderRadius: 10, border: "none", background: "transparent", color: "#b58a78", cursor: "pointer", display: "grid", placeItems: "center" }}
                      >
                        <FontAwesomeIcon icon={faTrashCan} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 className="h-serif" style={{ font: "600 19px var(--serif)" }}>
                {new Date().getFullYear()} season{stats && stats.roundsPlayed > 0 ? ` (${stats.roundsPlayed} ${stats.roundsPlayed === 1 ? "round" : "rounds"})` : ""}
              </h2>
              <select
                value={statView}
                onChange={(e) => setStatView(e.target.value as "you" | "everyone")}
                style={{ font: "600 13px var(--sans)", color: "var(--green-900)", background: "var(--surface)", border: "1px solid var(--line-2)", borderRadius: 10, padding: "6px 10px", cursor: "pointer" }}
              >
                <option value="you">Your card</option>
                <option value="everyone">Everyone</option>
              </select>
            </div>
            {statView === "you" ? <StatTiles stats={stats} /> : <Leaderboard board={board} meId={profile?.id} />}
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

function StatTiles({ stats }: { stats: SeasonStats | null }) {
  const tiles: { label: string; value: string; accent?: boolean }[] = [
    { label: "9-hole avg", value: stats?.avg9 == null ? "—" : stats.avg9.toFixed(1) },
    { label: "18-hole avg", value: stats?.avg18 == null ? "—" : stats.avg18.toFixed(1) },
    { label: "GIR", value: stats?.girPct == null ? "—" : `${Math.round(stats.girPct)}%` },
    { label: "Birdies", value: stats ? String(stats.birdies) : "—", accent: true },
    { label: "Eagles", value: stats ? String(stats.eagles) : "—", accent: true },
    { label: "Pars", value: stats ? String(stats.pars) : "—" },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
      {tiles.map((t) => (
        <div key={t.label} className="card" style={{ padding: "14px 14px 13px", display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ font: "500 11px var(--sans)", letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--faint)" }}>{t.label}</span>
          <span className="tnum" style={{ font: "600 26px var(--sans)", lineHeight: 1, color: t.accent ? "var(--brass)" : "var(--green-900)" }}>{t.value}</span>
        </div>
      ))}
    </div>
  );
}

/** Member comparison across every stat — the signed-in member pinned top, active.
 *  Scrolls horizontally since there are more columns than fit on a phone. */
function Leaderboard({ board, meId }: { board: LeaderboardRow[]; meId?: string }) {
  const rows = [...board].sort((a, b) => {
    if (a.user_id === meId) return -1;
    if (b.user_id === meId) return 1;
    return 0; // already ordered by avg from the query
  });
  if (rows.length === 0) {
    return (
      <div className="card" style={{ padding: "22px 18px", textAlign: "center" }}>
        <span style={{ font: "400 14px var(--sans)", color: "var(--faint)" }}>No members yet.</span>
      </div>
    );
  }

  const cols: { key: string; label: string; get: (r: LeaderboardRow) => string; accent?: boolean }[] = [
    { key: "a9", label: "9 avg", get: (r) => (r.avg9 == null ? "—" : r.avg9.toFixed(1)), accent: true },
    { key: "a18", label: "18 avg", get: (r) => (r.avg18 == null ? "—" : r.avg18.toFixed(1)), accent: true },
    { key: "bird", label: "Bird", get: (r) => String(r.birdies) },
    { key: "eag", label: "Eag", get: (r) => String(r.eagles) },
    { key: "par", label: "Pars", get: (r) => String(r.pars) },
    { key: "gir", label: "GIR", get: (r) => (r.gir_pct == null ? "—" : `${r.gir_pct}%`) },
  ];
  const NAME_W = 150;
  const CELL_W = 52;

  return (
    <div style={{ overflowX: "auto", margin: "0 -24px", padding: "2px 24px 4px" }}>
      <div style={{ minWidth: NAME_W + cols.length * CELL_W, display: "flex", flexDirection: "column", gap: 8 }}>
        {/* header */}
        <div style={{ display: "flex", alignItems: "flex-end", padding: "0 6px" }}>
          <span style={{ width: NAME_W, flex: "none" }} />
          {cols.map((c) => (
            <span key={c.key} style={{ width: CELL_W, flex: "none", textAlign: "center", font: "500 10px var(--sans)", letterSpacing: "0.03em", textTransform: "uppercase", color: "var(--faint)" }}>{c.label}</span>
          ))}
        </div>
        {rows.map((r) => {
          const me = r.user_id === meId;
          const sub = personSub(r.first_name, r.last_name);
          const roundsLabel = `${r.rounds} ${r.rounds === 1 ? "round" : "rounds"}`;
          return (
            <div
              key={r.user_id}
              className="card"
              style={{
                display: "flex", alignItems: "center", padding: "10px 6px",
                background: "var(--surface)",
                border: me ? "2px solid var(--green-900)" : "1px solid var(--line)",
              }}
            >
              <Link to={`/player/${r.user_id}`} style={{ width: NAME_W, flex: "none", display: "flex", flexDirection: "column", paddingLeft: 6, minWidth: 0, textDecoration: "none" }}>
                <span style={{ font: "600 14px var(--sans)", color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {r.display_name}{me ? " · You" : ""}
                </span>
                <span style={{ font: "400 11px var(--sans)", color: "var(--faint)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {sub ? `${sub} · ${roundsLabel}` : roundsLabel}
                </span>
              </Link>
              {cols.map((c) => (
                <span key={c.key} className="tnum" style={{ width: CELL_W, flex: "none", textAlign: "center", font: "600 15px var(--sans)", color: c.accent ? "var(--brass)" : "var(--ink)" }}>
                  {c.get(r)}
                </span>
              ))}
            </div>
          );
        })}
      </div>
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

