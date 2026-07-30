import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getRoundDetail, updateHole, finalizeRound, pushMemberShares } from "../lib/db";
import { useAuth } from "../context/AuthContext";
import type { Player, RoundMode } from "../lib/types";
import { holesForMode, parTotalFor, PARS, YARDS, NOTES, toParLabel } from "../lib/course";
import { FullSpinner, ErrorNote } from "../components/ui";
import { HandMark } from "../components/paint";
import { C, ELEV, PAINT, markOf, MARK_WORD, veil } from "../lib/paint";
import { formatRoundDate } from "../lib/date";

type Key = string;
const key = (p: string, h: number): Key => `${p}:${h}`;
interface Cell { strokes: number; gir: boolean; }

export default function ScoreEntry() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [playedOn, setPlayedOn] = useState("");
  const [mode, setMode] = useState<RoundMode>("back9");
  const [cells, setCells] = useState<Record<Key, Cell>>({});
  const [active, setActive] = useState(0);
  const [focus, setFocus] = useState(10);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const holes = useMemo(() => holesForMode(mode), [mode]);
  const parTotal = useMemo(() => parTotalFor(holes), [holes]);

  useEffect(() => {
    if (!id) return;
    getRoundDetail(id).then((d) => {
      setPlayers(d.players);
      setPlayedOn(d.round.played_on);
      setMode(d.round.mode);
      const hs = holesForMode(d.round.mode);
      const map: Record<Key, Cell> = {};
      for (const s of d.scores) map[key(s.player_id, s.hole)] = { strokes: s.strokes, gir: s.gir };
      for (const p of d.players) for (const h of hs) if (!map[key(p.id, h)]) map[key(p.id, h)] = { strokes: PARS[h], gir: false };
      setCells(map);
      setFocus(hs[0]);
      setLoading(false);
    }).catch((e) => { setError(e instanceof Error ? e.message : "Could not load the round."); setLoading(false); });
  }, [id]);

  const player = players[active];
  const totalFor = (p: Player) => holes.reduce((t, h) => t + (cells[key(p.id, h)]?.strokes ?? PARS[h]), 0);

  // Live commit: update local + persist immediately.
  function commit(playerId: string, hole: number, patch: Partial<Cell>) {
    const k = key(playerId, hole);
    setCells((prev) => {
      const cur = prev[k] ?? { strokes: PARS[hole], gir: false };
      const next = { ...cur, ...patch };
      updateHole(id!, playerId, hole, { strokes: next.strokes, gir: next.gir, saved: true }).catch(() =>
        setError("Couldn't save — check your connection."));
      return { ...prev, [k]: next };
    });
  }
  function step(playerId: string, hole: number, d: number) {
    const cur = cells[key(playerId, hole)]?.strokes ?? PARS[hole];
    const v = Math.max(1, Math.min(12, cur + d));
    if (v !== cur) commit(playerId, hole, { strokes: v });
  }

  async function finish() {
    if (!id) return;
    setSaving(true); setError(null);
    try {
      await finalizeRound(id);
      try { await pushMemberShares(id, profile?.display_name ?? "A friend"); } catch { /* non-fatal */ }
      navigate(`/rounds/${id}`, { replace: true });
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save the round."); setSaving(false); }
  }

  if (loading) return <div className="screen"><FullSpinner label="Loading scorecard…" /></div>;
  if (!player) return <div className="screen"><FullSpinner /></div>;

  const fc = cells[key(player.id, focus)] ?? { strokes: PARS[focus], gir: false };
  const fpar = PARS[focus];
  const fmark = markOf(fc.strokes, fpar);
  const holeIdx = holes.indexOf(focus);

  return (
    <div className="screen fade" style={{ position: "relative", overflow: "hidden", background: C.shade }}>
      <img src={PAINT.puttBlue} alt="" style={{ position: "absolute", left: 0, top: 0, width: "100%", height: 300, objectFit: "cover" }} />

      <div className="safe-top" style={{ position: "relative", flex: "none", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 20px 0" }}>
        <button aria-label="Back" onClick={() => navigate(-1)} style={{ font: "600 10px var(--sans)", letterSpacing: ".16em", textTransform: "uppercase", color: C.cream, background: "transparent", border: "none", cursor: "pointer", padding: 0 }}>‹ {playedOn ? formatRoundDate(playedOn) : "Mission Trails"}</button>
        <span style={{ font: "600 10px var(--sans)", letterSpacing: ".1em", textTransform: "uppercase", color: C.ink, background: C.sand, padding: "5px 10px", borderRadius: 20 }}>Hole {focus} of {mode === "full18" ? 18 : 18}</span>
      </div>

      {/* focus header */}
      <div style={{ position: "relative", flex: "none", padding: "14px 20px 0", display: "flex", alignItems: "flex-end", gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ font: "300 62px/.86 var(--sans)", letterSpacing: "-.03em", color: C.cream, textShadow: "0 2px 14px rgba(16,24,10,.45)" }}>{focus}</div>
          <div style={{ font: "600 11px var(--sans)", letterSpacing: ".16em", textTransform: "uppercase", color: C.sand, marginTop: 6 }}>Par {fpar} · {YARDS[focus]} yds</div>
        </div>
        <span className="hand" style={{ font: "400 24px/1 var(--hand)", color: C.cream, maxWidth: 150, textAlign: "right", textShadow: "0 2px 10px rgba(16,24,10,.5)" }}>{NOTES[focus]}</span>
      </div>

      {/* stroke panel */}
      <div className="surf-lifted" style={{ position: "relative", flex: "none", margin: "16px 14px 0", borderRadius: 22, padding: "14px 16px 12px", display: "flex", flexDirection: "column", gap: 11 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20 }}>
          <button onClick={() => step(player.id, focus, -1)} style={roundBtn(false)}>−</button>
          <div style={{ position: "relative", width: 96, height: 76, display: "grid", placeItems: "center" }}>
            <span className="tnum" style={{ font: "600 58px var(--sans)", color: C.tx, lineHeight: 1 }}>{fc.strokes}</span>
            <HandMark kind={fmark} holeIndex={holeIdx} size={92} />
          </div>
          <button onClick={() => step(player.id, focus, 1)} style={roundBtn(true)}>+</button>
        </div>
        <div style={{ textAlign: "center" }}><span className="hand" style={{ font: "400 24px var(--hand)", color: C.sand }}>{MARK_WORD[fmark]}</span></div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, borderTop: `1px solid ${C.line}`, paddingTop: 12 }}>
          <span style={{ flex: 1, font: "600 11px var(--sans)", letterSpacing: ".14em", textTransform: "uppercase", color: C.fescue2 }}>Green in regulation</span>
          <button onClick={() => commit(player.id, focus, { gir: !fc.gir })}
            style={{ height: 36, padding: "0 15px", borderRadius: 18, border: fc.gir ? "none" : `1px solid ${C.line}`, background: fc.gir ? C.fairway : "transparent", color: fc.gir ? C.cream : C.fescue, font: "600 13px var(--sans)", cursor: "pointer" }}>
            {fc.gir ? "Hit it ✓" : "Missed"}
          </button>
        </div>

        {players.length > 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, borderTop: `1px solid ${C.line}`, paddingTop: 10 }}>
            <span style={{ font: "600 10px var(--sans)", letterSpacing: ".16em", textTransform: "uppercase", color: C.fescue2 }}>Rest of the group · hole {focus}</span>
            {players.filter((p) => p.id !== player.id).map((p) => {
              const s = cells[key(p.id, focus)]?.strokes ?? PARS[focus];
              return (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 26, height: 26, borderRadius: "50%", background: C.shade, color: C.tx, font: "600 9px var(--sans)", display: "grid", placeItems: "center", flex: "none" }}>{p.initials}</span>
                  <span style={{ flex: 1, font: "600 14px var(--sans)", color: C.tx }}>{p.name.split(/\s+/)[0]}</span>
                  <button onClick={() => step(p.id, focus, -1)} style={miniBtn(false)}>−</button>
                  <span className="tnum" style={{ width: 30, textAlign: "center", font: "600 21px var(--sans)", color: C.tx }}>{s}</span>
                  <button onClick={() => step(p.id, focus, 1)} style={miniBtn(true)}>+</button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* hole strip + player rail */}
      <div style={{ position: "relative", flex: 1, minHeight: 0, overflowY: "auto", padding: "14px 14px 0", display: "flex", flexDirection: "column", gap: 10 }}>
        <span style={{ font: "600 10px var(--sans)", letterSpacing: ".18em", textTransform: "uppercase", color: C.fescue, padding: "0 4px" }}>{player.name.split(/\s+/)[0]} · tap a hole</span>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${holes.length}, 1fr)`, gap: 4, background: C.shade2, boxShadow: ELEV.e0, borderRadius: 14, padding: 5 }}>
          {holes.map((h) => {
            const c = cells[key(player.id, h)] ?? { strokes: PARS[h], gir: false };
            const m = markOf(c.strokes, PARS[h]);
            const on = h === focus;
            const dot = m === "birdie" || m === "eagle" ? C.flag : m === "bogey" || m === "double" ? C.fescue : "transparent";
            return (
              <button key={h} onClick={() => setFocus(h)} style={{ border: "none", cursor: "pointer", padding: "7px 0 6px", borderRadius: 9, background: on ? C.paper : C.panel, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                <span style={{ font: "600 9px var(--sans)", color: on ? C.ink2 : C.fescue }}>{h}</span>
                <span className="tnum" style={{ font: "600 16px var(--sans)", color: on ? C.ink : C.tx }}>{c.strokes}</span>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: dot }} />
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 7, marginTop: "auto", padding: "10px 0 2px", borderTop: `1px solid ${C.line}` }}>
          {players.map((p, i) => {
            const on = i === active;
            const t = totalFor(p);
            return (
              <button key={p.id} onClick={() => setActive(i)} style={{ flex: 1, border: "none", cursor: "pointer", padding: "7px 4px 6px", borderRadius: 12, boxShadow: ELEV.e2, background: on ? C.paper : veil(C.panel), display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                <span style={{ font: "600 9px var(--sans)", letterSpacing: ".08em", color: on ? C.ink2 : C.fescue }}>{p.initials}</span>
                <span className="tnum" style={{ font: "600 21px var(--sans)", color: on ? C.ink : C.tx, lineHeight: 1 }}>{t}</span>
                <span style={{ font: "600 10px var(--sans)", color: on ? C.ink2 : C.fescue }}>{toParLabel(t - parTotal)}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ position: "relative", flex: "none", padding: "10px 20px calc(20px + env(safe-area-inset-bottom))" }}>
        {error && <ErrorNote>{error}</ErrorNote>}
        <button className="btn" onClick={finish} disabled={saving}>{saving ? <span className="spin on-dark" /> : "Sign the card"}</button>
      </div>
    </div>
  );
}

function roundBtn(primary: boolean): React.CSSProperties {
  return { width: 52, height: 52, borderRadius: "50%", border: primary ? "none" : "1px solid #55603F", background: primary ? C.flag : C.panel, boxShadow: primary ? "0 8px 14px -6px rgba(9,13,7,.7), inset 0 1px 0 rgba(255,255,255,.28)" : ELEV.e0, color: primary ? C.cream : C.tx, font: "300 26px var(--sans)", lineHeight: 1, display: "grid", placeItems: "center", cursor: "pointer" };
}
function miniBtn(primary: boolean): React.CSSProperties {
  return { width: 34, height: 34, borderRadius: "50%", border: primary ? "none" : "1px solid #55603F", background: primary ? C.shade : C.panel, boxShadow: primary ? "0 6px 12px -6px rgba(9,13,7,.75), inset 0 1px 0 rgba(233,223,198,.1)" : ELEV.e0, color: C.tx, font: "300 19px var(--sans)", lineHeight: 1, display: "grid", placeItems: "center", cursor: "pointer" };
}
