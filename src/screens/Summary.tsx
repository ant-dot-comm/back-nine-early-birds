import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getRoundDetail, deleteRound, shareScoreToMember } from "../lib/db";
import type { Player, HoleScore, RoundMode } from "../lib/types";
import ConfirmDialog from "../components/ConfirmDialog";
import { holesForMode, parTotalFor, PARS, isBirdie, modeLabel } from "../lib/course";
import { TopBar, FullSpinner } from "../components/ui";
import { HandMark } from "../components/paint";
import { formatLongDate } from "../lib/date";
import { useAuth } from "../context/AuthContext";
import ShareInviteModal from "../components/ShareInviteModal";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPaperPlane, faCheck, faTrophy } from "@fortawesome/free-solid-svg-icons";
import { computeSideGame, type SideGame } from "../lib/sidegames";
import { C, markOf } from "../lib/paint";

interface Standing { player: Player; total: number; diff: number; birdies: number; eagles: number; isLow: boolean; }

export default function Summary() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [scores, setScores] = useState<HoleScore[]>([]);
  const [playedOn, setPlayedOn] = useState("");
  const [course, setCourse] = useState("Mission Trails");
  const [mode, setMode] = useState<RoundMode>("back9");
  const [sideGames, setSideGames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [cardPlayer, setCardPlayer] = useState<string | null>(null);
  const [shareFor, setShareFor] = useState<Player | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());

  const cardScores = (pid: string) => scores.filter((s) => s.player_id === pid).sort((a, b) => a.hole - b.hole).map((s) => ({ hole: s.hole, par: s.par, strokes: s.strokes, gir: s.gir }));

  async function shareToMember(p: Player) {
    if (!id) return;
    setSharingId(p.id);
    try { await shareScoreToMember(id, p, cardScores(p.id), { played_on: playedOn, course, mode }, profile?.display_name ?? "A friend"); setSentIds((prev) => new Set(prev).add(p.id)); }
    catch { /* ignore */ } finally { setSharingId(null); }
  }
  async function doDelete() { if (!id) return; setDeleting(true); try { await deleteRound(id); navigate("/", { replace: true }); } catch { setDeleting(false); setConfirmDel(false); } }

  useEffect(() => {
    if (!id) return;
    getRoundDetail(id).then((d) => {
      setPlayers(d.players); setScores(d.scores); setPlayedOn(d.round.played_on);
      setCourse(d.round.course); setMode(d.round.mode); setSideGames(d.round.side_games ?? []);
      setCardPlayer(d.players.find((p) => p.is_self)?.id ?? d.players[0]?.id ?? null);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  const holes = useMemo(() => holesForMode(mode), [mode]);
  const parTotal = useMemo(() => parTotalFor(holes), [holes]);
  const standings = useMemo<Standing[]>(() => {
    const rows = players.map((player) => {
      const mine = scores.filter((s) => s.player_id === player.id);
      const total = mine.reduce((s, x) => s + x.strokes, 0);
      return { player, total, diff: total - parTotal, birdies: mine.filter((s) => isBirdie(s.strokes, s.par)).length, eagles: mine.filter((s) => s.strokes <= s.par - 2).length, isLow: false };
    });
    rows.sort((a, b) => a.total - b.total);
    if (rows.length) { const best = rows[0].total; rows.forEach((r) => (r.isLow = r.total === best)); }
    return rows;
  }, [players, scores, parTotal]);

  if (loading) return <div className="screen"><FullSpinner /></div>;

  const me = standings.find((s) => s.player.is_self) ?? standings[0];
  const card = players.find((p) => p.id === cardPlayer) ?? me?.player;
  const cardRows = card ? cardScores(card.id) : [];
  const cardTotal = cardRows.reduce((s, r) => s + r.strokes, 0);
  const girN = cardRows.filter((r) => r.gir).length;
  const birdN = cardRows.filter((r) => isBirdie(r.strokes, r.par)).length;
  const parN = cardRows.filter((r) => r.strokes === r.par).length;

  return (
    <div className="screen fade">
      <TopBar title="" onBack={() => navigate("/", { replace: true })} />
      <div className="scroll">
        <div className="pad" style={{ display: "flex", flexDirection: "column", gap: 20, paddingTop: 0 }}>
          <div>
            <span className="eyebrow">{formatLongDate(playedOn)} · {modeLabel(mode).toLowerCase()} · {players.length} out</span>
            <h1 className="display" style={{ marginTop: 3 }}>You shot <b style={{ fontWeight: 600 }}>{me?.total ?? "—"}</b>.</h1>
            {me?.isLow && players.length > 1 && <span className="hand" style={{ font: "400 26px var(--hand)", color: C.flag }}>low round of the morning</span>}
          </div>

          {/* paper hole-by-hole */}
          {card && (
            <div className="surf-paper" style={{ borderRadius: 18, padding: "16px 14px", color: C.ink }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 11 }}>
                <span style={{ font: "600 11px var(--sans)", letterSpacing: ".16em", textTransform: "uppercase", color: C.ink2 }}>{card.name.split(/\s+/)[0]} — hole by hole</span>
                <span className="hand" style={{ font: "400 20px var(--hand)", color: C.ink2 }}>signed</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${holes.length}, 1fr) 40px`, gap: 2, borderBottom: `1px solid ${C.linePaper}`, paddingBottom: 4 }}>
                {holes.map((h) => <span key={h} style={{ textAlign: "center", font: "400 10px var(--sans)", color: C.ink2 }}>{h}</span>)}
                <span style={{ textAlign: "center", font: "600 10px var(--sans)", color: C.flag }}>OUT</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${holes.length}, 1fr) 40px`, gap: 2, alignItems: "center", paddingTop: 6 }}>
                {holes.map((h, i) => {
                  const r = cardRows.find((x) => x.hole === h);
                  const st = r?.strokes ?? PARS[h];
                  const kind = markOf(st, PARS[h]);
                  return (
                    <span key={h} style={{ position: "relative", textAlign: "center", font: "600 16px var(--sans)", height: 30, display: "grid", placeItems: "center", color: C.ink }} className="tnum">
                      {st}
                      <HandMark kind={kind} holeIndex={i} size={29} strokeWidth={3} />
                    </span>
                  );
                })}
                <span className="tnum" style={{ textAlign: "center", font: "600 16px var(--sans)", color: C.cream, background: C.flag, borderRadius: 6, height: 30, display: "grid", placeItems: "center" }}>{cardTotal}</span>
              </div>
              <div style={{ display: "flex", gap: 16, marginTop: 12, paddingTop: 10, borderTop: `1px solid ${C.linePaper}` }}>
                <span style={{ font: "400 12px var(--sans)", color: C.ink2 }}>GIR <b style={{ color: C.ink }}>{girN}/{holes.length}</b></span>
                <span style={{ font: "400 12px var(--sans)", color: C.ink2 }}>Birdies <b style={{ color: C.ink }}>{birdN}</b></span>
                <span style={{ font: "400 12px var(--sans)", color: C.ink2 }}>Pars <b style={{ color: C.ink }}>{parN}</b></span>
              </div>
              {players.length > 1 && (
                <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
                  {players.map((p) => (
                    <button key={p.id} onClick={() => setCardPlayer(p.id)} style={{ border: "none", cursor: "pointer", font: "600 11px var(--sans)", padding: "5px 10px", borderRadius: 14, background: p.id === card.id ? C.ink : "transparent", color: p.id === card.id ? C.paper : C.ink2 }}>{p.name.split(/\s+/)[0]}</button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* finishing order */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
              <h2 style={{ margin: 0, font: "600 15px var(--sans)", color: C.tx }}>Finishing order</h2>
              <span style={{ font: "600 10px var(--sans)", letterSpacing: ".14em", textTransform: "uppercase", color: C.tx3 }}>Strokes</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {standings.map((s, i) => {
                const leader = i === 0;
                const linkTo = s.player.is_self ? profile?.id : s.player.member_user_id;
                const inner = (
                  <>
                    <span style={{ width: 32, height: 32, borderRadius: "50%", background: leader ? C.flagDeep : C.moss, color: leader ? C.cream : C.tx, font: "600 11px var(--sans)", display: "grid", placeItems: "center" }}>{s.player.initials}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ font: "600 15px var(--sans)", color: leader ? C.cream : C.tx }}>{s.player.name}{s.player.is_self ? " — you" : ""}</div>
                      {leader && (s.birdies > 0 || (s.isLow && players.length > 1)) && <div className="hand" style={{ font: "400 18px/1 var(--hand)", color: "#F3D9C9" }}>{[s.isLow && players.length > 1 ? "low round" : "", s.birdies > 0 ? `${s.birdies} ${s.birdies === 1 ? "birdie" : "birdies"}` : ""].filter(Boolean).join(" + ")}</div>}
                    </div>
                  </>
                );
                return (
                  <div key={s.player.id} className={leader ? "surf-flag" : undefined} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 12px", borderRadius: leader ? 12 : 0, borderBottom: leader ? "none" : `1px solid ${C.line2}` }}>
                    <span style={{ width: 14, font: "600 13px var(--sans)", color: leader ? C.cream : C.tx3 }}>{i + 1}</span>
                    {linkTo ? <Link to={`/player/${linkTo}`} style={{ flex: 1, display: "flex", alignItems: "center", gap: 12, minWidth: 0, textDecoration: "none" }}>{inner}</Link> : <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>{inner}</div>}
                    <span className="tnum" style={{ font: "600 22px var(--sans)", color: leader ? C.cream : C.tx }}>{s.total}</span>
                    {!s.player.is_self && (
                      s.player.member_user_id
                        ? <button onClick={() => shareToMember(s.player)} disabled={sharingId === s.player.id || sentIds.has(s.player.id)} title="Send to their account" style={{ width: 34, height: 34, flex: "none", borderRadius: 10, border: "none", background: sentIds.has(s.player.id) ? C.fairway : leader ? "rgba(255,255,255,.2)" : C.panel, cursor: "pointer", display: "grid", placeItems: "center", color: C.cream }}>{sharingId === s.player.id ? <span className="spin on-dark" style={{ width: 15, height: 15 }} /> : <FontAwesomeIcon icon={sentIds.has(s.player.id) ? faCheck : faPaperPlane} style={{ fontSize: 13 }} />}</button>
                        : <button onClick={() => setShareFor(s.player)} title="Email + invite" style={{ width: 34, height: 34, flex: "none", borderRadius: 10, border: "none", background: leader ? "rgba(255,255,255,.2)" : C.panel, cursor: "pointer", display: "grid", placeItems: "center", color: C.cream }}><FontAwesomeIcon icon={faPaperPlane} style={{ fontSize: 13 }} /></button>
                    )}
                  </div>
                );
              })}
            </div>
            {sentIds.size > 0 && <span style={{ font: "500 12px var(--sans)", color: C.sand }}>Score sent — they'll see it on their dashboard.</span>}
          </div>

          {/* side games */}
          {sideGames.length > 0 && players.length > 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <span className="eyebrow">Side games</span>
              <div className="card" style={{ padding: "4px 4px", display: "flex", flexDirection: "column" }}>
                {sideGames.map((g, i) => {
                  const byP: Record<string, HoleScore[]> = {};
                  players.forEach((p) => { byP[p.id] = scores.filter((s) => s.player_id === p.id); });
                  const res = computeSideGame(g as SideGame, players, byP);
                  return (
                    <div key={g} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 12px", borderTop: i === 0 ? "none" : `1px solid ${C.line2}` }}>
                      <FontAwesomeIcon icon={faTrophy} style={{ color: C.sand, fontSize: 14, width: 18 }} />
                      <span style={{ flex: 1, font: "600 14px var(--sans)", color: C.tx }}>{res.label}</span>
                      <span style={{ font: "600 14px var(--sans)", color: C.tx }}>{res.winners.map((w) => w.name.split(/\s+/)[0]).join(", ")}</span>
                      <span className="tnum" style={{ font: "600 13px var(--sans)", color: C.sand, minWidth: 42, textAlign: "right" }}>{res.display}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <button className="btn ghost" onClick={() => navigate("/", { replace: true })}>Done</button>
          <button onClick={() => setConfirmDel(true)} style={{ alignSelf: "center", border: "none", background: "transparent", font: "500 13px var(--sans)", color: C.tx3, cursor: "pointer", padding: "4px 8px" }}>Delete round</button>
        </div>
      </div>

      {confirmDel && <ConfirmDialog title="Delete this round?" body="This permanently removes the round, every score in it, and any badges or awards earned from it. This can't be undone." busy={deleting} onCancel={() => setConfirmDel(false)} onConfirm={doDelete} />}
      {shareFor && id && <ShareInviteModal player={shareFor} roundId={id} mode={mode} playedOn={playedOn} course={course} inviterDisplay={profile?.display_name ?? "A friend"} scores={cardScores(shareFor.id)} onClose={() => setShareFor(null)} />}
    </div>
  );
}
