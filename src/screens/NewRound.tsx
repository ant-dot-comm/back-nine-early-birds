import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  listPlayers, addPlayer, addMemberPlayer, listMembers, createRound, listRecentRounds,
} from "../lib/db";
import type { RoundSummaryRow } from "../lib/db";
import type { Player, Member, RoundMode } from "../lib/types";
import { Avatar, TopBar, FullSpinner, ErrorNote } from "../components/ui";
import AddPlayerModal from "../components/AddPlayerModal";
import { formatRoundDate, todayYMD } from "../lib/date";
import { modeLabel, toParLabel, personSub } from "../lib/course";

export default function NewRound() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [priorRounds, setPriorRounds] = useState<RoundSummaryRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [mode, setMode] = useState<RoundMode>("back9");
  const [compareId, setCompareId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const date = todayYMD();

  useEffect(() => {
    Promise.all([listPlayers(), listMembers(), listRecentRounds(10)])
      .then(([ps, ms, rr]) => {
        setPlayers(ps);
        setMembers(ms);
        setPriorRounds(rr);
        const self = ps.find((x) => x.is_self);
        setSelectedIds(self ? [self.id] : []);
      })
      .catch(() => setError("Couldn't load players."))
      .finally(() => setLoading(false));
  }, []);

  const selectedPlayers = useMemo(
    () =>
      selectedIds
        .map((id) => players.find((p) => p.id === id))
        .filter((p): p is Player => !!p)
        .sort((a, b) => Number(b.is_self) - Number(a.is_self)),
    [selectedIds, players]
  );

  const selectedMemberIds = new Set(
    selectedPlayers.map((p) => p.member_user_id).filter(Boolean) as string[]
  );

  // Candidates for the add sheet (exclude self and already-selected).
  const memberCandidates = members.filter(
    (m) => m.id !== session?.user.id && !selectedMemberIds.has(m.id)
  );
  const peopleCandidates = players.filter(
    (p) => !p.is_self && !p.member_user_id && !selectedIds.includes(p.id)
  );

  function select(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }
  function remove(id: string) {
    setSelectedIds((prev) => prev.filter((x) => x !== id));
  }

  async function onAddMember(m: Member) {
    try {
      const p = await addMemberPlayer(m);
      setPlayers((prev) => (prev.some((x) => x.id === p.id) ? prev : [...prev, p]));
      select(p.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add member.");
    }
  }
  async function onAddNew(name: string) {
    try {
      const p = await addPlayer(name);
      setPlayers((prev) => [...prev, p]);
      select(p.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add player.");
    }
  }

  async function start() {
    if (selectedIds.length === 0) return setError("Pick at least one player.");
    setStarting(true);
    setError(null);
    try {
      const id = await createRound(date, selectedIds, mode, compareId);
      navigate(`/rounds/${id}/score`, { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start the round.");
      setStarting(false);
    }
  }

  return (
    <div className="screen fade">
      <TopBar title="New round" onBack="auto" />
      {loading ? (
        <FullSpinner />
      ) : (
        <>
          <div className="scroll">
            <div className="pad" style={{ display: "flex", flexDirection: "column", gap: 22, paddingTop: 8 }}>
              {/* Format */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <span className="eyebrow">Format</span>
                <div style={{ display: "flex", gap: 4, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 14, padding: 4 }}>
                  {(["back9", "full18"] as RoundMode[]).map((m) => {
                    const on = mode === m;
                    return (
                      <button key={m} onClick={() => setMode(m)} style={{ flex: 1, height: 44, borderRadius: 11, border: "none", cursor: "pointer", font: "600 15px var(--sans)", background: on ? "var(--green-900)" : "transparent", color: on ? "var(--sand)" : "var(--muted)" }}>
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
                  <span style={{ font: "500 13px var(--sans)", color: "var(--muted-2)" }}>{selectedIds.length} selected</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {selectedPlayers.map((p) => (
                    <div key={p.id} className="card" style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px" }}>
                      <Avatar initials={p.initials} me={p.is_self} />
                      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                        <span style={{ font: "600 16px var(--sans)", color: "var(--ink)" }}>{p.name}</span>
                        <span style={{ font: "400 12px var(--sans)", color: "var(--faint)" }}>
                          {(() => {
                            if (p.is_self) return "You";
                            if (p.member_user_id) {
                              const m = members.find((x) => x.id === p.member_user_id);
                              const sub = m ? personSub(m.first_name, m.last_name) : "";
                              return sub ? `Member · ${sub}` : "Member";
                            }
                            return "Guest";
                          })()}
                        </span>
                      </div>
                      {!p.is_self && (
                        <button aria-label={`Remove ${p.name}`} onClick={() => remove(p.id)} style={{ width: 30, height: 30, borderRadius: "50%", border: "none", background: "transparent", color: "var(--muted-2)", cursor: "pointer", font: "400 20px var(--sans)", lineHeight: 1 }}>×</button>
                      )}
                    </div>
                  ))}

                  <button
                    onClick={() => setShowAdd(true)}
                    style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", borderRadius: "var(--r-card)", border: "1.5px dashed var(--line-2)", background: "transparent", cursor: "pointer", width: "100%" }}
                  >
                    <span style={{ width: 38, height: 38, borderRadius: "50%", border: "1.5px solid var(--line-2)", display: "grid", placeItems: "center", font: "400 22px var(--sans)", color: "var(--muted-2)" }}>+</span>
                    <span style={{ font: "600 15px var(--sans)", color: "var(--muted)" }}>Add a player</span>
                  </button>
                </div>
              </div>

              {/* Compare */}
              {priorRounds.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span className="eyebrow">Challenge yourself</span>
                    <span style={{ font: "400 13px var(--sans)", color: "var(--faint)" }}>Compare each hole against a past round.</span>
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

      {showAdd && (
        <AddPlayerModal
          members={memberCandidates}
          people={peopleCandidates}
          onAddMember={onAddMember}
          onAddExisting={(p) => select(p.id)}
          onAddNew={onAddNew}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  );
}
