import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listPlayers, addPlayer, createRound, listRecentRounds } from "../lib/db";
import type { RoundSummaryRow } from "../lib/db";
import type { Player, RoundMode } from "../lib/types";
import { Avatar, TopBar, FullSpinner, ErrorNote } from "../components/ui";
import { formatRoundDate, todayYMD } from "../lib/date";
import { modeLabel, toParLabel } from "../lib/course";

export default function NewRound() {
  const navigate = useNavigate();
  const [players, setPlayers] = useState<Player[] | null>(null);
  const [priorRounds, setPriorRounds] = useState<RoundSummaryRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<RoundMode>("back9");
  const [compareId, setCompareId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const date = todayYMD();

  useEffect(() => {
    listPlayers()
      .then((p) => {
        setPlayers(p);
        const self = p.find((x) => x.is_self);
        setSelected(new Set(self ? [self.id] : []));
      })
      .catch(() => setPlayers([]));
    listRecentRounds(10).then(setPriorRounds).catch(() => setPriorRounds([]));
  }, []);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function submitNewPlayer() {
    const clean = newName.trim();
    if (clean.length < 1) return;
    try {
      const p = await addPlayer(clean);
      setPlayers((prev) => [...(prev ?? []), p]);
      setSelected((prev) => new Set(prev).add(p.id));
      setNewName("");
      setAdding(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add player.");
    }
  }

  async function start() {
    if (selected.size === 0) return setError("Pick at least one player.");
    setStarting(true);
    setError(null);
    try {
      const id = await createRound(date, [...selected], mode, compareId);
      navigate(`/rounds/${id}/score`, { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start the round.");
      setStarting(false);
    }
  }

  return (
    <div className="screen fade">
      <TopBar title="New round" onBack="auto" />
      {players === null ? (
        <FullSpinner />
      ) : (
        <>
          <div className="scroll">
            <div className="pad" style={{ display: "flex", flexDirection: "column", gap: 22, paddingTop: 8 }}>
              {/* Format */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <span className="eyebrow">Format</span>
                <div
                  style={{
                    display: "flex",
                    gap: 4,
                    background: "var(--surface)",
                    border: "1px solid var(--line)",
                    borderRadius: 14,
                    padding: 4,
                  }}
                >
                  {(["back9", "full18"] as RoundMode[]).map((m) => {
                    const on = mode === m;
                    return (
                      <button
                        key={m}
                        onClick={() => setMode(m)}
                        style={{
                          flex: 1,
                          height: 44,
                          borderRadius: 11,
                          border: "none",
                          cursor: "pointer",
                          font: "600 15px var(--sans)",
                          background: on ? "var(--green-900)" : "transparent",
                          color: on ? "var(--sand)" : "var(--muted)",
                        }}
                      >
                        {modeLabel(m)}
                      </button>
                    );
                  })}
                </div>
                <span style={{ font: "400 13px var(--sans)", color: "var(--faint)" }}>
                  {mode === "full18" ? "All 18 holes · par 72" : "Holes 10–18 · par 36"}
                </span>
              </div>

              {/* Date */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <span className="eyebrow">Date</span>
                <div className="card" style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 18px" }}>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ font: "600 16px var(--sans)", color: "var(--ink)" }}>{formatRoundDate(date, true)}</span>
                    <span style={{ font: "400 13px var(--sans)", color: "var(--faint)" }}>Mission Trails · {modeLabel(mode)}</span>
                  </div>
                </div>
              </div>

              {/* Players */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                  <span className="eyebrow">Who's playing</span>
                  <span style={{ font: "500 13px var(--sans)", color: "var(--muted-2)" }}>{selected.size} selected</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {players.map((p) => {
                    const on = selected.has(p.id);
                    return (
                      <button
                        key={p.id}
                        onClick={() => toggle(p.id)}
                        className="card"
                        style={{
                          display: "flex", alignItems: "center", gap: 14, padding: "12px 16px",
                          cursor: "pointer", textAlign: "left", width: "100%",
                          background: on ? "#f0e8d6" : "var(--surface)",
                          border: on ? "1.5px solid var(--green-900)" : "1px solid var(--line)",
                        }}
                      >
                        <Avatar initials={p.initials} me={p.is_self} />
                        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                          <span style={{ font: "600 16px var(--sans)", color: "var(--ink)" }}>{p.name}</span>
                          {p.is_self && <span style={{ font: "400 12px var(--sans)", color: "var(--faint)" }}>You</span>}
                        </div>
                        <Check on={on} />
                      </button>
                    );
                  })}

                  {adding ? (
                    <div className="card" style={{ display: "flex", gap: 8, padding: "10px 12px", alignItems: "center" }}>
                      <input
                        className="input" style={{ height: 46, flex: 1 }} autoFocus placeholder="Name"
                        value={newName} onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") submitNewPlayer();
                          if (e.key === "Escape") { setAdding(false); setNewName(""); }
                        }}
                      />
                      <button className="btn sm" style={{ height: 46, padding: "0 18px" }} onClick={submitNewPlayer}>Add</button>
                      <button
                        aria-label="Cancel"
                        onClick={() => { setAdding(false); setNewName(""); }}
                        style={{ width: 46, height: 46, flex: "none", borderRadius: 12, border: "1.5px solid var(--line-2)", background: "transparent", color: "var(--muted-2)", cursor: "pointer", font: "400 22px var(--sans)", lineHeight: 1 }}
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAdding(true)}
                      style={{
                        display: "flex", alignItems: "center", gap: 14, padding: "12px 16px",
                        borderRadius: "var(--r-card)", border: "1.5px dashed var(--line-2)",
                        background: "transparent", cursor: "pointer", width: "100%",
                      }}
                    >
                      <span style={{ width: 38, height: 38, borderRadius: "50%", border: "1.5px solid var(--line-2)", display: "grid", placeItems: "center", font: "400 22px var(--sans)", color: "var(--muted-2)" }}>+</span>
                      <span style={{ font: "600 15px var(--sans)", color: "var(--muted)" }}>Add a player</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Compare to a previous round */}
              {priorRounds.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span className="eyebrow">Challenge yourself</span>
                    <span style={{ font: "400 13px var(--sans)", color: "var(--faint)" }}>
                      Compare each hole against a past round.
                    </span>
                  </div>
                  <div style={{ position: "relative" }}>
                    <select
                      value={compareId ?? ""}
                      onChange={(e) => setCompareId(e.target.value || null)}
                      className="input"
                      style={{ appearance: "none", WebkitAppearance: "none", paddingRight: 40, cursor: "pointer", font: "500 16px var(--sans)" }}
                    >
                      <option value="">No comparison — just play</option>
                      {priorRounds.map((r) => (
                        <option key={r.round.id} value={r.round.id}>
                          {formatRoundDate(r.round.played_on)} · {modeLabel(r.round.mode)}
                          {r.selfTotal !== null ? ` · ${r.selfTotal} (${toParLabel(r.selfDiff ?? 0)})` : ""}
                        </option>
                      ))}
                    </select>
                    <span style={{ position: "absolute", right: 18, top: "50%", transform: "translateY(-70%) rotate(45deg)", width: 9, height: 9, borderRight: "2px solid var(--muted-2)", borderBottom: "2px solid var(--muted-2)", pointerEvents: "none" }} />
                  </div>
                </div>
              )}

              {error && <ErrorNote>{error}</ErrorNote>}
            </div>
          </div>

          <div style={{ flex: "none", padding: "14px 24px calc(28px + env(safe-area-inset-bottom))", background: "linear-gradient(#f4ecdd00, var(--sand) 24%)" }}>
            <button className="btn" onClick={start} disabled={starting}>
              {starting ? <span className="spin on-dark" /> : "Start round"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Check({ on }: { on: boolean }) {
  return (
    <span style={{ width: 26, height: 26, borderRadius: "50%", flex: "none", display: "grid", placeItems: "center", background: on ? "var(--green-900)" : "#fffdf7", border: on ? "none" : "2px solid #c9b797" }}>
      {on && <span style={{ width: 11, height: 6, borderLeft: "2px solid var(--sand)", borderBottom: "2px solid var(--sand)", transform: "rotate(-45deg)", marginTop: -2, display: "block" }} />}
    </span>
  );
}
