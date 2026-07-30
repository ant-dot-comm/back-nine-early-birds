import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { listPlayers, addPlayer, addMemberPlayer, listMembers, createRound, listTournaments } from "../lib/db";
import type { Player, Member, RoundMode, Tournament } from "../lib/types";
import { TopBar, FullSpinner, ErrorNote } from "../components/ui";
import AddPlayerModal from "../components/AddPlayerModal";
import { todayYMD } from "../lib/date";
import { modeLabel } from "../lib/course";
import { SIDE_GAMES } from "../lib/sidegames";
import { PAINT, C, ELEV } from "../lib/paint";

export default function NewRound() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { session } = useAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [tournamentId, setTournamentId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [mode, setMode] = useState<RoundMode>("back9");
  const [sideGames, setSideGames] = useState<Set<string>>(new Set());
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const date = todayYMD();

  // slide-to-tee
  const [slide, setSlide] = useState(0);
  const [starting, setStarting] = useState(false);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const drag = useRef(false);
  const startRef = useRef<() => void>(() => {});

  useEffect(() => {
    Promise.all([listPlayers(), listMembers(), listTournaments()]).then(([ps, ms, ts]) => {
      setPlayers(ps); setMembers(ms); setTournaments(ts);
      const self = ps.find((x) => x.is_self);
      setSelectedIds(self ? [self.id] : []);
      const preset = params.get("t");
      const t = preset && ts.find((x) => x.id === preset && x.am_in && x.status === "active");
      if (t) { setTournamentId(t.id); setMode(t.mode); }
    }).catch(() => setError("Couldn't load players.")).finally(() => setLoading(false));
  }, [params]);

  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (!drag.current || !trackRef.current) return;
      const r = trackRef.current.getBoundingClientRect();
      let p = (e.clientX - r.left - 27) / (r.width - 54);
      setSlide(Math.max(0, Math.min(1, p)));
    };
    const up = () => {
      if (!drag.current) return;
      drag.current = false;
      setSlide((p) => { if (p >= 0.75) { startRef.current(); return 1; } return 0; });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
  }, []); // eslint-disable-line

  const eligible = tournaments.filter((t) => t.am_in && t.status === "active" && t.my_rounds_done < t.rounds_required);
  const selTourney = tournaments.find((t) => t.id === tournamentId) ?? null;
  const selectedPlayers = useMemo(() => selectedIds.map((id) => players.find((p) => p.id === id)).filter((p): p is Player => !!p).sort((a, b) => Number(b.is_self) - Number(a.is_self)), [selectedIds, players]);
  const selectedMemberIds = new Set(selectedPlayers.map((p) => p.member_user_id).filter(Boolean) as string[]);
  const memberCandidates = members.filter((m) => m.id !== session?.user.id && !selectedMemberIds.has(m.id));
  const peopleCandidates = players.filter((p) => !p.is_self && !p.member_user_id && !selectedIds.includes(p.id));

  function select(id: string) { setSelectedIds((prev) => (prev.includes(id) ? prev : [...prev, id])); }
  function remove(id: string) { setSelectedIds((prev) => prev.filter((x) => x !== id)); }
  function toggleGame(k: string) { setSideGames((p) => { const n = new Set(p); n.has(k) ? n.delete(k) : n.add(k); return n; }); }
  function pickTournament(id: string | null) { setTournamentId(id); const t = id ? tournaments.find((x) => x.id === id) : null; if (t) setMode(t.mode); }

  async function onAddMember(m: Member) { try { const p = await addMemberPlayer(m); setPlayers((prev) => (prev.some((x) => x.id === p.id) ? prev : [...prev, p])); select(p.id); } catch (e) { setError(e instanceof Error ? e.message : "Could not add member."); } }
  async function onAddNew(name: string) { try { const p = await addPlayer(name); setPlayers((prev) => [...prev, p]); select(p.id); } catch (e) { setError(e instanceof Error ? e.message : "Could not add player."); } }

  async function start() {
    if (selectedIds.length === 0 || starting) return;
    setStarting(true); setError(null);
    try {
      const games = selectedIds.length >= 2 ? [...sideGames] : [];
      const id = await createRound(date, selectedIds, mode, null, games, tournamentId);
      navigate(`/rounds/${id}/score`, { replace: true });
    } catch (e) { setError(e instanceof Error ? e.message : "Could not start the round."); setStarting(false); setSlide(0); }
  }
  startRef.current = start;

  if (loading) return <div className="screen"><FullSpinner /></div>;

  return (
    <div className="screen fade">
      <TopBar title="Set up the round" onBack="auto" />
      <div className="scroll">
        <div className="pad" style={{ display: "flex", flexDirection: "column", gap: 20, paddingBottom: 130 }}>
          {eligible.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span className="eyebrow">Tournament</span>
              <select className="input" value={tournamentId ?? ""} onChange={(e) => pickTournament(e.target.value || null)}>
                <option value="">Not a tournament round</option>
                {eligible.map((t) => <option key={t.id} value={t.id}>{t.name} · {modeLabel(t.mode)} · {t.my_rounds_done}/{t.rounds_required} done</option>)}
              </select>
            </div>
          )}

          {/* format tiles */}
          <div style={{ display: "flex", gap: 10, height: 122 }}>
            <button onClick={() => !selTourney && setMode("back9")} disabled={!!selTourney} style={{ flex: 1.4, position: "relative", border: "none", padding: 0, cursor: selTourney ? "default" : "pointer", borderRadius: "70px 70px 18px 18px", overflow: "hidden", outline: mode === "back9" ? `3px solid ${C.flag}` : "none", outlineOffset: -3, boxShadow: ELEV.e2 }}>
              <img src={PAINT.puttingGreen} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
              <div style={{ position: "absolute", left: 12, bottom: 11, textAlign: "left" }}><div style={{ font: "600 17px var(--sans)", color: C.cream, textShadow: "0 1px 6px rgba(16,24,10,.5)" }}>Back 9</div><div style={{ font: "600 10px var(--sans)", letterSpacing: ".1em", textTransform: "uppercase", color: C.sand }}>Holes 10–18 · par 36</div></div>
            </button>
            <button onClick={() => !selTourney && setMode("full18")} disabled={!!selTourney} className="surf-well" style={{ flex: 1, position: "relative", border: "none", cursor: selTourney ? "default" : "pointer", borderRadius: "18px 70px 70px 18px", overflow: "hidden", outline: mode === "full18" ? `3px solid ${C.flag}` : "none", outlineOffset: -3 }}>
              <div style={{ position: "absolute", left: 12, bottom: 11, textAlign: "left" }}><div style={{ font: "600 17px var(--sans)", color: mode === "full18" ? C.tx : C.tx2 }}>Full 18</div><div style={{ font: "600 10px var(--sans)", letterSpacing: ".1em", textTransform: "uppercase", color: C.tx3 }}>par 72</div></div>
            </button>
          </div>
          {selTourney && <span style={{ font: "400 13px var(--sans)", color: C.tx3, marginTop: -12 }}>Format is set by {selTourney.name}.</span>}

          {/* who's out */}
          <div>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
              <span className="eyebrow">Who's out</span>
              <span style={{ font: "600 11px var(--sans)", color: C.flag }}>{selectedIds.length} in the group</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: "13px 8px" }}>
              {selectedPlayers.map((p) => (
                <div key={p.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                  <span style={{ position: "relative", width: 52, height: 52, borderRadius: "50%", background: p.is_self ? C.fairway : C.moss, boxShadow: "0 8px 14px -7px rgba(9,13,7,.75), inset 0 1px 0 rgba(233,223,198,.18)", color: C.cream, font: "600 15px var(--sans)", display: "grid", placeItems: "center" }}>
                    {p.initials}
                    {!p.is_self && <button aria-label={`Remove ${p.name}`} onClick={() => remove(p.id)} style={{ position: "absolute", right: -2, bottom: -2, width: 19, height: 19, borderRadius: "50%", background: C.flag, border: `2px solid ${C.shade}`, color: C.cream, font: "400 12px var(--sans)", lineHeight: 1, cursor: "pointer", display: "grid", placeItems: "center" }}>×</button>}
                  </span>
                  <span style={{ font: "600 10px var(--sans)", color: C.tx }}>{p.is_self ? "You" : p.name.split(/\s+/)[0]}</span>
                </div>
              ))}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                <button onClick={() => setShowAdd(true)} style={{ width: 52, height: 52, borderRadius: "50%", border: `1.5px dashed ${C.line}`, background: "transparent", color: C.fescue, font: "400 22px var(--sans)", cursor: "pointer", display: "grid", placeItems: "center" }}>+</button>
                <span style={{ font: "600 10px var(--sans)", color: C.tx3 }}>Add</span>
              </div>
            </div>
          </div>

          {/* side games */}
          {selectedIds.length >= 2 && (
            <div>
              <span className="eyebrow" style={{ display: "block", marginBottom: 10 }}>Side games</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {SIDE_GAMES.map((g) => (
                  <button key={g.key} onClick={() => toggleGame(g.key)} className={`chip${sideGames.has(g.key) ? " on" : ""}`} style={{ cursor: "pointer", fontSize: 13, padding: "9px 15px" }}>{g.label}</button>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 12, borderTop: `1px solid ${C.line}`, paddingTop: 14 }}>
            <span className="hand" style={{ font: "400 22px/1.05 var(--hand)", color: C.fescue, flex: 1 }}>today · Mission Trails · {modeLabel(mode)}</span>
          </div>
          {error && <ErrorNote>{error}</ErrorNote>}
        </div>
      </div>

      {/* slide to tee off */}
      <div style={{ flex: "none", padding: "14px 20px calc(24px + env(safe-area-inset-bottom))", background: "linear-gradient(#20261C00, var(--shade) 30%)" }}>
        <div ref={trackRef} style={{ position: "relative", height: 62, borderRadius: 31, background: C.shade2, boxShadow: ELEV.e0, overflow: "hidden", userSelect: "none", touchAction: "none" }}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${slide * 100}%`, background: C.fairway }} />
          <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", font: "600 12px var(--sans)", letterSpacing: ".2em", textTransform: "uppercase", color: slide > 0.5 ? "#132009" : C.fescue, pointerEvents: "none" }}>{starting ? "On the tee ✓" : "Slide to tee off"}</span>
          <div onPointerDown={() => { drag.current = true; }} style={{ position: "absolute", top: 4, left: `calc(${slide} * (100% - 54px))`, width: 54, height: 54, borderRadius: "50%", background: C.paper, boxShadow: "0 8px 14px -6px rgba(9,13,7,.8), inset 0 2px 0 rgba(255,255,255,.7)", cursor: "grab", backgroundImage: "radial-gradient(circle,rgba(60,50,25,.16) 1.2px,transparent 1.7px)", backgroundSize: "8px 8px" }} />
        </div>
      </div>

      {showAdd && <AddPlayerModal members={memberCandidates} people={peopleCandidates} onAddMember={onAddMember} onAddExisting={(p) => select(p.id)} onAddNew={onAddNew} onClose={() => setShowAdd(false)} />}
    </div>
  );
}
