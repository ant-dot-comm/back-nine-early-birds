import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { listMembers, createTournament } from "../lib/db";
import type { Member, RoundMode, TournamentScoring } from "../lib/types";
import { TopBar, FullSpinner, ErrorNote, Avatar } from "../components/ui";
import { modeLabel, personSub } from "../lib/course";
import { C, ELEV } from "../lib/paint";

const SCORING: { key: TournamentScoring; label: string; desc: string }[] = [
  { key: "total_strokes", label: "Total strokes", desc: "Add up each player's best rounds — lowest total wins." },
  { key: "average", label: "Average score", desc: "Rank by average round — fair if people play different amounts." },
  { key: "single_best", label: "Single best round", desc: "Only each player's lowest round counts." },
];

export default function CreateTournament() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [mode, setMode] = useState<RoundMode>("back9");
  const [rounds, setRounds] = useState(3);
  const [scoring, setScoring] = useState<TournamentScoring>("total_strokes");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listMembers().then((ms) => setMembers(ms.filter((m) => m.id !== session?.user.id))).catch(() => setError("Couldn't load members.")).finally(() => setLoading(false));
  }, [session]);

  function togglePick(id: string) { setPicked((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); }

  async function create() {
    if (!name.trim()) return setError("Give your tournament a name.");
    if (picked.size === 0) return setError("Add at least one other player.");
    setBusy(true); setError(null);
    try {
      const id = await createTournament({ name: name.trim(), description: description.trim() || null, mode, roundsRequired: rounds, scoring, playerIds: [...picked] });
      navigate(`/tournaments/${id}`, { replace: true });
    } catch (e) { setError(e instanceof Error ? e.message : "Could not create the tournament."); setBusy(false); }
  }

  return (
    <div className="screen fade">
      <TopBar title="New tournament" onBack="auto" />
      {loading ? <FullSpinner /> : (
        <>
          <div className="scroll">
            <div className="pad" style={{ display: "flex", flexDirection: "column", gap: 22, paddingTop: 4, paddingBottom: 120 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <span className="eyebrow">Name</span>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Summer Cup" maxLength={60} />
                <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional — a line about the event" maxLength={140} style={{ height: 44, font: "400 15px var(--sans)" }} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <span className="eyebrow">Format</span>
                <div style={{ display: "flex", gap: 4, background: C.shade2, boxShadow: ELEV.e0, borderRadius: 14, padding: 4 }}>
                  {(["back9", "full18"] as RoundMode[]).map((m) => {
                    const on = mode === m;
                    return <button key={m} onClick={() => setMode(m)} style={{ flex: 1, height: 44, borderRadius: 11, border: "none", cursor: "pointer", font: "600 15px var(--sans)", background: on ? C.paper : "transparent", color: on ? C.ink : C.tx3 }}>{modeLabel(m)}</button>;
                  })}
                </div>
                <span style={{ font: "400 13px var(--sans)", color: C.tx3 }}>Everyone plays this format so scores compare.</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <span className="eyebrow">Rounds each player logs</span>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <button onClick={() => setRounds((n) => Math.max(1, n - 1))} style={stepBtn}>–</button>
                  <span className="tnum" style={{ font: "600 24px var(--sans)", color: C.tx, minWidth: 28, textAlign: "center" }}>{rounds}</span>
                  <button onClick={() => setRounds((n) => Math.min(20, n + 1))} style={stepBtn}>+</button>
                  <span className="hand" style={{ font: "400 20px var(--hand)", color: C.tx3, marginLeft: 4 }}>tallies once everyone finishes</span>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <span className="eyebrow">Scoring</span>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {SCORING.map((s) => {
                    const on = scoring === s.key;
                    return (
                      <button key={s.key} onClick={() => setScoring(s.key)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", cursor: "pointer", textAlign: "left", width: "100%", borderRadius: 14, background: on ? "#3A3324" : C.panel, border: on ? `1.5px solid ${C.sand}` : "1px solid transparent", boxShadow: ELEV.e1 }}>
                        <div style={{ flex: 1 }}><div style={{ font: "600 15px var(--sans)", color: C.tx }}>{s.label}</div><div style={{ font: "400 12px var(--sans)", color: C.tx3 }}>{s.desc}</div></div>
                        <span style={{ width: 22, height: 22, borderRadius: "50%", flex: "none", border: on ? `7px solid ${C.sand}` : `2px solid ${C.line}`, background: C.shade2 }} />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                  <span className="eyebrow">Players</span>
                  <span style={{ font: "500 13px var(--sans)", color: C.tx3 }}>{picked.size + 1} in</span>
                </div>
                <span style={{ font: "400 13px var(--sans)", color: C.tx3 }}>You're in automatically. Pick other members to compete.</span>
                {members.length === 0 ? (
                  <div className="surf-panel" style={{ borderRadius: 14, padding: "18px", textAlign: "center", font: "400 14px var(--sans)", color: C.tx3 }}>No other members yet.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {members.map((m) => {
                      const on = picked.has(m.id);
                      const sub = personSub(m.first_name, m.last_name);
                      return (
                        <button key={m.id} onClick={() => togglePick(m.id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", cursor: "pointer", textAlign: "left", width: "100%", borderRadius: 14, background: on ? "#3A3324" : C.panel, border: on ? `1.5px solid ${C.sand}` : "1px solid transparent", boxShadow: ELEV.e1 }}>
                          <Avatar initials={m.initials} size={34} />
                          <div style={{ flex: 1 }}><div style={{ font: "600 15px var(--sans)", color: C.tx }}>{m.display_name}</div>{sub && <div style={{ font: "400 12px var(--sans)", color: C.tx3 }}>{sub}</div>}</div>
                          <span style={{ width: 24, height: 24, borderRadius: "50%", flex: "none", border: on ? "none" : `2px solid ${C.line}`, background: on ? C.sand : C.shade2, display: "grid", placeItems: "center" }}>
                            {on && <span style={{ width: 10, height: 6, borderLeft: `2px solid ${C.ink}`, borderBottom: `2px solid ${C.ink}`, transform: "rotate(-45deg)", marginTop: -2 }} />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {error && <ErrorNote>{error}</ErrorNote>}
            </div>
          </div>

          <div style={{ flex: "none", padding: "14px 24px calc(24px + env(safe-area-inset-bottom))", background: "linear-gradient(#20261C00, var(--shade) 24%)" }}>
            <button className="btn flag" onClick={create} disabled={busy}>{busy ? <span className="spin on-dark" /> : "Create tournament"}</button>
          </div>
        </>
      )}
    </div>
  );
}

const stepBtn = { width: 44, height: 44, borderRadius: 12, border: `1px solid ${C.line}`, background: C.panel, cursor: "pointer", font: "400 22px var(--sans)", color: C.tx, lineHeight: 1 } as const;
