import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  listTournaments, getTournamentStandings, listMembers,
  addTournamentPlayer, removeTournamentPlayer, leaveTournament, cancelTournament,
} from "../lib/db";
import type { Tournament, TournamentStanding, Member } from "../lib/types";
import { TopBar, FullSpinner, Avatar } from "../components/ui";
import ConfirmDialog from "../components/ConfirmDialog";
import { modeLabel, personSub } from "../lib/course";
import { scoringLabel } from "./Tournaments";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrophy, faFlag, faUserPlus, faXmark } from "@fortawesome/free-solid-svg-icons";

function scoreColLabel(scoring: string): string {
  return scoring === "average" ? "Avg" : scoring === "single_best" ? "Best" : "Total";
}

export default function TournamentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [t, setT] = useState<Tournament | null | undefined>(undefined);
  const [standings, setStandings] = useState<TournamentStanding[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<null | "cancel" | "leave">(null);

  const load = useCallback(() => {
    if (!id) return;
    listTournaments().then((all) => setT(all.find((x) => x.id === id) ?? null)).catch(() => setT(null));
    getTournamentStandings(id).then(setStandings).catch(() => setStandings([]));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const myId = profile?.id;
  const isOrganizer = !!t && t.created_by === myId;
  const active = t?.status === "active";
  const iNeedRounds = !!t && t.am_in && active && t.my_rounds_done < t.rounds_required;

  async function openAdd() {
    if (members.length === 0) {
      try { setMembers(await listMembers()); } catch { /* ignore */ }
    }
    setShowAdd(true);
  }
  async function add(userId: string) {
    if (!id) return;
    setBusy(userId);
    try { await addTournamentPlayer(id, userId); load(); } finally { setBusy(null); }
  }
  async function remove(userId: string) {
    if (!id) return;
    setBusy(userId);
    try { await removeTournamentPlayer(id, userId); load(); } finally { setBusy(null); }
  }
  async function doCancel() {
    if (!id) return;
    setBusy("cancel");
    try { await cancelTournament(id); setConfirm(null); load(); } finally { setBusy(null); }
  }
  async function doLeave() {
    if (!id) return;
    setBusy("leave");
    try { await leaveTournament(id); setConfirm(null); navigate("/tournaments", { replace: true }); } finally { setBusy(null); }
  }

  if (t === undefined) return <div className="screen"><TopBar title="Tournament" onBack="auto" /><FullSpinner /></div>;
  if (t === null) return <div className="screen"><TopBar title="Tournament" onBack="auto" /><div className="center-screen"><span style={{ color: "var(--faint)" }}>Tournament not found.</span></div></div>;

  const inIds = new Set(standings.map((s) => s.user_id));
  const candidates = members.filter((m) => !inIds.has(m.id));

  return (
    <div className="screen fade">
      <TopBar title="Tournament" onBack={() => navigate("/tournaments")} />
      <div className="scroll">
        <div className="pad" style={{ display: "flex", flexDirection: "column", gap: 22, paddingTop: 8 }}>
          {/* Header */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span className="h-serif" style={{ font: "600 26px/1.15 var(--serif)" }}>{t.name}</span>
            {t.description && <span style={{ font: "400 14px/1.5 var(--sans)", color: "var(--muted)" }}>{t.description}</span>}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 2 }}>
              <Pill>{modeLabel(t.mode)}</Pill>
              <Pill>{t.rounds_required} rounds each</Pill>
              <Pill>{scoringLabel(t.scoring)}</Pill>
              {t.status !== "active" && <Pill accent>{t.status === "completed" ? "Completed" : "Canceled"}</Pill>}
            </div>
          </div>

          {/* Winner banner */}
          {t.status === "completed" && t.winner_display && (
            <div className="card" style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: 12, border: "1.5px solid var(--brass)", background: "#f0e8d6" }}>
              <FontAwesomeIcon icon={faTrophy} style={{ color: "var(--brass)", fontSize: 22 }} />
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ font: "400 12px var(--sans)", color: "var(--faint)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Champion</span>
                <span style={{ font: "600 17px var(--sans)", color: "var(--green-900)" }}>{t.winner_display}</span>
              </div>
            </div>
          )}

          {/* Log a round CTA */}
          {iNeedRounds && (
            <button className="btn" style={{ height: 54 }} onClick={() => navigate(`/rounds/new?t=${t.id}`)}>
              <FontAwesomeIcon icon={faFlag} style={{ color: "var(--gold)", fontSize: 15 }} />
              Log a tournament round ({t.my_rounds_done}/{t.rounds_required})
            </button>
          )}
          {t.am_in && active && !iNeedRounds && (
            <div className="card" style={{ padding: "13px 16px", font: "500 14px var(--sans)", color: "var(--brass)", textAlign: "center" }}>
              You've finished your {t.rounds_required} rounds — waiting on the rest.
            </div>
          )}

          {/* Standings */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
              <span className="eyebrow">{t.status === "completed" ? "Final standings" : "Standings"}</span>
              <span style={{ font: "500 11px var(--sans)", color: "var(--faint)", textTransform: "uppercase", letterSpacing: "0.03em" }}>{scoreColLabel(t.scoring)}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {standings.map((s, i) => {
                const me = s.user_id === myId;
                const leader = t.status === "completed" && s.user_id === t.winner;
                const sub = personSub(s.first_name, s.last_name);
                return (
                  <div key={s.user_id} className="card" style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", border: leader ? "1.5px solid var(--brass)" : me ? "1.5px solid var(--green-900)" : "1px solid var(--line)" }}>
                    <span className="tnum" style={{ width: 20, textAlign: "center", font: "600 15px var(--sans)", color: "var(--faint)" }}>{i + 1}</span>
                    <Link to={`/player/${s.user_id}`} style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, minWidth: 0, textDecoration: "none" }}>
                      <Avatar initials={s.initials} me={me} size={32} />
                      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                        <span style={{ font: "600 15px var(--sans)", color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.display_name}{leader ? " 🏆" : ""}</span>
                        <span style={{ font: "400 12px var(--sans)", color: s.is_complete ? "var(--brass)" : "var(--faint)" }}>
                          {s.rounds_done}/{t.rounds_required} rounds{sub && !s.is_complete ? ` · ${sub}` : ""}{s.is_complete ? " · done" : ""}
                        </span>
                      </div>
                    </Link>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span className="tnum" style={{ font: "600 18px var(--sans)", color: s.counted_score == null ? "var(--faint)" : "var(--green-900)" }}>
                        {s.counted_score == null ? "—" : s.counted_score}
                      </span>
                      {isOrganizer && active && !me && (
                        <button aria-label={`Remove ${s.display_name}`} onClick={() => remove(s.user_id)} disabled={busy === s.user_id} style={{ width: 26, height: 26, borderRadius: "50%", border: "none", background: "transparent", color: "var(--muted-2)", cursor: "pointer" }}>
                          <FontAwesomeIcon icon={faXmark} style={{ fontSize: 13 }} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {isOrganizer && active && (
              <button onClick={openAdd} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "12px", borderRadius: "var(--r-card)", border: "1.5px dashed var(--line-2)", background: "transparent", cursor: "pointer", width: "100%", font: "600 14px var(--sans)", color: "var(--muted)" }}>
                <FontAwesomeIcon icon={faUserPlus} style={{ fontSize: 14 }} /> Add players
              </button>
            )}
          </div>

          {/* Danger zone */}
          {active && (isOrganizer ? (
            <button onClick={() => setConfirm("cancel")} style={dangerBtn}>Cancel tournament</button>
          ) : t.am_in ? (
            <button onClick={() => setConfirm("leave")} style={dangerBtn}>Leave tournament</button>
          ) : null)}
        </div>
      </div>

      {showAdd && (
        <div onClick={() => setShowAdd(false)} style={{ position: "fixed", inset: 0, background: "rgba(20,25,12,.45)", display: "flex", alignItems: "flex-end", zIndex: 70 }}>
          <div onClick={(e) => e.stopPropagation()} className="fade" style={{ width: "100%", background: "var(--sand)", borderRadius: "22px 22px 0 0", padding: "20px 18px calc(24px + env(safe-area-inset-bottom))", maxHeight: "72%", display: "flex", flexDirection: "column", gap: 12 }}>
            <span className="h-serif" style={{ font: "600 19px var(--serif)" }}>Add players</span>
            <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
              {candidates.length === 0 ? (
                <span style={{ font: "400 14px var(--sans)", color: "var(--faint)", padding: "8px 2px" }}>Everyone's already in.</span>
              ) : candidates.map((m) => {
                const sub = personSub(m.first_name, m.last_name);
                return (
                  <button key={m.id} onClick={() => add(m.id)} disabled={busy === m.id} className="card" style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", cursor: "pointer", textAlign: "left", width: "100%" }}>
                    <Avatar initials={m.initials} size={34} />
                    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                      <span style={{ font: "600 15px var(--sans)", color: "var(--ink)" }}>{m.display_name}</span>
                      {sub && <span style={{ font: "400 12px var(--sans)", color: "var(--faint)" }}>{sub}</span>}
                    </div>
                    <span style={{ font: "600 20px var(--sans)", color: "var(--brass)" }}>{busy === m.id ? "…" : "+"}</span>
                  </button>
                );
              })}
            </div>
            <button className="btn ghost" onClick={() => setShowAdd(false)}>Done</button>
          </div>
        </div>
      )}

      {confirm === "cancel" && (
        <ConfirmDialog title="Cancel tournament?" body="This ends it for everyone. Rounds already played stay in career stats." confirmLabel="Cancel it" busy={busy === "cancel"} onCancel={() => setConfirm(null)} onConfirm={doCancel} />
      )}
      {confirm === "leave" && (
        <ConfirmDialog title="Leave tournament?" body="You'll be removed from the standings. You can be re-added by the organizer." confirmLabel="Leave" busy={busy === "leave"} onCancel={() => setConfirm(null)} onConfirm={doLeave} />
      )}
    </div>
  );
}

function Pill({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <span style={{ font: "600 11px var(--sans)", letterSpacing: "0.02em", padding: "4px 10px", borderRadius: 999, background: accent ? "var(--green-900)" : "var(--surface)", color: accent ? "var(--sand)" : "var(--muted)", border: accent ? "none" : "1px solid var(--line)" }}>{children}</span>
  );
}

const dangerBtn = {
  border: "none", background: "transparent", font: "500 13px var(--sans)", color: "var(--muted-2)",
  cursor: "pointer", padding: "8px", alignSelf: "center",
} as const;
