import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  listTournaments, getTournamentStandings, listMembers,
  addTournamentPlayer, removeTournamentPlayer, leaveTournament, cancelTournament,
} from "../lib/db";
import type { Tournament, TournamentStanding, Member } from "../lib/types";
import { FullSpinner, Avatar } from "../components/ui";
import { WaveDivider } from "../components/paint";
import ConfirmDialog from "../components/ConfirmDialog";
import { modeLabel, personSub } from "../lib/course";
import { scoringLabel } from "./Tournaments";
import { PAINT, C } from "../lib/paint";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrophy, faFlag, faUserPlus, faXmark } from "@fortawesome/free-solid-svg-icons";

function scoreColLabel(s: string): string { return s === "average" ? "Avg" : s === "single_best" ? "Best" : "Total"; }

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

  async function openAdd() { if (members.length === 0) { try { setMembers(await listMembers()); } catch { /* */ } } setShowAdd(true); }
  async function add(u: string) { if (!id) return; setBusy(u); try { await addTournamentPlayer(id, u); load(); } finally { setBusy(null); } }
  async function remove(u: string) { if (!id) return; setBusy(u); try { await removeTournamentPlayer(id, u); load(); } finally { setBusy(null); } }
  async function doCancel() { if (!id) return; setBusy("cancel"); try { await cancelTournament(id); setConfirm(null); load(); } finally { setBusy(null); } }
  async function doLeave() { if (!id) return; setBusy("leave"); try { await leaveTournament(id); setConfirm(null); navigate("/tournaments", { replace: true }); } finally { setBusy(null); } }

  if (t === undefined) return <div className="screen"><FullSpinner /></div>;
  if (t === null) return <div className="screen"><div className="center-screen"><span style={{ color: C.tx3 }}>Tournament not found.</span></div></div>;

  const inIds = new Set(standings.map((s) => s.user_id));
  const candidates = members.filter((m) => !inIds.has(m.id));

  return (
    <div className="screen fade" style={{ position: "relative", overflow: "hidden", background: C.shade }}>
      <img src={PAINT.fairwayBlobs} alt="" style={{ position: "absolute", left: 0, top: 0, width: "100%", height: 260, objectFit: "cover", objectPosition: "50% 30%" }} />
      <div className="safe-top" style={{ position: "relative", flex: "none", padding: "6px 20px 0" }}>
        <button aria-label="Back" onClick={() => navigate("/tournaments")} style={{ font: "600 20px var(--sans)", color: "#132009", background: "transparent", border: "none", cursor: "pointer", padding: 0 }}>‹</button>
      </div>
      <div style={{ position: "relative", flex: "none", padding: "10px 22px 0" }}>
        <span style={{ font: "600 10px var(--sans)", letterSpacing: ".18em", textTransform: "uppercase", color: "#2E3D18" }}>{t.status === "completed" ? "Final" : active ? "In progress" : "Canceled"} · {scoringLabel(t.scoring).toLowerCase()}</span>
        <h1 style={{ margin: "4px 0 0", font: "300 38px/1 var(--sans)", letterSpacing: "-.02em", color: "#132009" }}>{t.name}</h1>
        {t.description && <p style={{ margin: "6px 0 0", font: "400 14px/1.5 var(--sans)", color: "#2E3D18", maxWidth: 260 }}>{t.description}</p>}
      </div>
      <div style={{ position: "relative", marginTop: 34 }}><WaveDivider color={C.shade} height={50} /></div>

      <div className="scroll" style={{ position: "relative", background: C.shade }}>
        <div className="pad" style={{ display: "flex", flexDirection: "column", gap: 18, paddingTop: 2 }}>
          {t.status === "completed" && t.winner_display && (
            <div className="surf-flag" style={{ borderRadius: 16, padding: "16px 18px", display: "flex", alignItems: "center", gap: 12 }}>
              <FontAwesomeIcon icon={faTrophy} style={{ color: C.cream, fontSize: 22 }} />
              <div><span style={{ font: "600 9px var(--sans)", letterSpacing: ".1em", textTransform: "uppercase", color: "#F3D9C9" }}>Champion</span><div style={{ font: "600 17px var(--sans)", color: C.cream }}>{t.winner_display}</div></div>
            </div>
          )}

          {iNeedRounds && <button className="btn flag" style={{ height: 54 }} onClick={() => navigate(`/rounds/new?t=${t.id}`)}><FontAwesomeIcon icon={faFlag} style={{ fontSize: 15 }} /> Log a tournament round ({t.my_rounds_done}/{t.rounds_required})</button>}
          {t.am_in && active && !iNeedRounds && <div className="surf-panel" style={{ borderRadius: 14, padding: "13px 16px", font: "500 14px var(--sans)", color: C.sand, textAlign: "center" }}>You've finished your {t.rounds_required} rounds — waiting on the rest.</div>}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "0 2px" }}>
              <span className="eyebrow">{t.status === "completed" ? "Final standings" : "Standings"}</span>
              <span style={{ font: "600 10px var(--sans)", letterSpacing: ".1em", textTransform: "uppercase", color: C.tx3 }}>{scoreColLabel(t.scoring)}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {standings.map((s, i) => {
                const me = s.user_id === myId;
                const leader = t.status === "completed" && s.user_id === t.winner;
                const sub = personSub(s.first_name, s.last_name);
                return (
                  <div key={s.user_id} className={leader ? "surf-flag" : "surf-panel"} style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 13px", borderRadius: 12, border: me && !leader ? `1.5px solid ${C.fairway}` : "none" }}>
                    <span className="tnum" style={{ width: 16, textAlign: "center", font: "600 13px var(--sans)", color: leader ? "#F3D9C9" : C.tx3 }}>{i + 1}</span>
                    <Link to={`/player/${s.user_id}`} style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, minWidth: 0, textDecoration: "none" }}>
                      <Avatar initials={s.initials} me={me} size={30} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ font: "600 14px var(--sans)", color: leader ? C.cream : C.tx, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.display_name}{me ? " · you" : ""}</div>
                        <div style={{ font: "400 11px var(--sans)", color: leader ? "#F3D9C9" : s.is_complete ? C.sand : C.tx3 }}>{s.rounds_done}/{t.rounds_required} rounds{sub && !s.is_complete ? ` · ${sub}` : ""}{s.is_complete ? " · done" : ""}</div>
                      </div>
                    </Link>
                    <span className="tnum" style={{ font: "600 18px var(--sans)", color: s.counted_score == null ? C.tx3 : leader ? C.cream : C.tx }}>{s.counted_score == null ? "—" : s.counted_score}</span>
                    {isOrganizer && active && !me && <button aria-label={`Remove ${s.display_name}`} onClick={() => remove(s.user_id)} disabled={busy === s.user_id} style={{ width: 26, height: 26, borderRadius: "50%", border: "none", background: "transparent", color: C.tx3, cursor: "pointer" }}><FontAwesomeIcon icon={faXmark} style={{ fontSize: 13 }} /></button>}
                  </div>
                );
              })}
            </div>
            {isOrganizer && active && <button onClick={openAdd} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "12px", borderRadius: 14, border: `1.5px dashed ${C.line}`, background: "transparent", cursor: "pointer", width: "100%", font: "600 14px var(--sans)", color: C.tx3 }}><FontAwesomeIcon icon={faUserPlus} style={{ fontSize: 14 }} /> Add players</button>}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            <Pill>{modeLabel(t.mode)}</Pill><Pill>{t.rounds_required} rounds each</Pill><Pill>{scoringLabel(t.scoring)}</Pill>
          </div>

          {active && (isOrganizer ? <button onClick={() => setConfirm("cancel")} style={dangerBtn}>Cancel tournament</button> : t.am_in ? <button onClick={() => setConfirm("leave")} style={dangerBtn}>Leave tournament</button> : null)}
        </div>
      </div>

      {showAdd && (
        <div onClick={() => setShowAdd(false)} style={{ position: "fixed", inset: 0, background: "rgba(9,13,7,.55)", display: "flex", alignItems: "flex-end", zIndex: 70 }}>
          <div onClick={(e) => e.stopPropagation()} className="sheet-up" style={{ width: "100%", maxWidth: 460, margin: "0 auto", background: C.panel, borderRadius: "22px 22px 0 0", padding: "20px 18px calc(24px + env(safe-area-inset-bottom))", maxHeight: "72%", display: "flex", flexDirection: "column", gap: 12 }}>
            <span style={{ font: "600 18px var(--sans)", color: C.tx }}>Add players</span>
            <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
              {candidates.length === 0 ? <span style={{ font: "400 14px var(--sans)", color: C.tx3, padding: "8px 2px" }}>Everyone's already in.</span>
              : candidates.map((m) => {
                const sub = personSub(m.first_name, m.last_name);
                return (
                  <button key={m.id} onClick={() => add(m.id)} disabled={busy === m.id} className="surf-raised" style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", cursor: "pointer", textAlign: "left", width: "100%", borderRadius: 14 }}>
                    <Avatar initials={m.initials} size={34} />
                    <div style={{ flex: 1 }}><div style={{ font: "600 15px var(--sans)", color: C.tx }}>{m.display_name}</div>{sub && <div style={{ font: "400 12px var(--sans)", color: C.tx3 }}>{sub}</div>}</div>
                    <span style={{ font: "600 20px var(--sans)", color: C.sand }}>{busy === m.id ? "…" : "+"}</span>
                  </button>
                );
              })}
            </div>
            <button className="btn ghost" onClick={() => setShowAdd(false)}>Done</button>
          </div>
        </div>
      )}

      {confirm === "cancel" && <ConfirmDialog title="Cancel tournament?" body="This ends it for everyone. Rounds already played stay in career stats." confirmLabel="Cancel it" busy={busy === "cancel"} onCancel={() => setConfirm(null)} onConfirm={doCancel} />}
      {confirm === "leave" && <ConfirmDialog title="Leave tournament?" body="You'll be removed from the standings. You can be re-added by the organizer." confirmLabel="Leave" busy={busy === "leave"} onCancel={() => setConfirm(null)} onConfirm={doLeave} />}
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return <span style={{ font: "600 12px var(--sans)", color: C.tx2, border: `1px solid ${C.line}`, padding: "8px 13px", borderRadius: 18 }}>{children}</span>;
}
const dangerBtn = { border: "none", background: "transparent", font: "500 13px var(--sans)", color: C.tx3, cursor: "pointer", padding: "8px", alignSelf: "center" } as const;
