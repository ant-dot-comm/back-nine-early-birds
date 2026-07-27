import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listPlayers, addPlayer, createRound } from "../lib/db";
import type { Player } from "../lib/types";
import { Avatar, TopBar, FullSpinner, ErrorNote } from "../components/ui";
import { formatRoundDate, todayYMD } from "../lib/date";

export default function NewRound() {
  const navigate = useNavigate();
  const [players, setPlayers] = useState<Player[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const date = todayYMD();

  useEffect(() => {
    listPlayers()
      .then((p) => {
        setPlayers(p);
        // Preselect the user (self) so a solo round is one tap.
        const self = p.find((x) => x.is_self);
        setSelected(new Set(self ? [self.id] : []));
      })
      .catch(() => setPlayers([]));
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
    if (selected.size === 0) {
      setError("Pick at least one player.");
      return;
    }
    setStarting(true);
    setError(null);
    try {
      const id = await createRound(date, [...selected]);
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
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <span className="eyebrow">Date</span>
                <div
                  className="card"
                  style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 18px" }}
                >
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ font: "600 16px var(--sans)", color: "var(--ink)" }}>
                      {formatRoundDate(date, true)}
                    </span>
                    <span style={{ font: "400 13px var(--sans)", color: "var(--faint)" }}>
                      Mission Trails · Back 9
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                  <span className="eyebrow">Who's playing</span>
                  <span style={{ font: "500 13px var(--sans)", color: "var(--muted-2)" }}>
                    {selected.size} selected
                  </span>
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
                          display: "flex",
                          alignItems: "center",
                          gap: 14,
                          padding: "12px 16px",
                          cursor: "pointer",
                          textAlign: "left",
                          width: "100%",
                          background: on ? "#f0e8d6" : "var(--surface)",
                          border: on ? "1.5px solid var(--green-900)" : "1px solid var(--line)",
                        }}
                      >
                        <Avatar initials={p.initials} me={p.is_self} />
                        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                          <span style={{ font: "600 16px var(--sans)", color: "var(--ink)" }}>
                            {p.name}
                          </span>
                          {p.is_self && (
                            <span style={{ font: "400 12px var(--sans)", color: "var(--faint)" }}>
                              You
                            </span>
                          )}
                        </div>
                        <Check on={on} />
                      </button>
                    );
                  })}

                  {adding ? (
                    <div
                      className="card"
                      style={{ display: "flex", gap: 10, padding: "10px 12px", alignItems: "center" }}
                    >
                      <input
                        className="input"
                        style={{ height: 46, flex: 1 }}
                        autoFocus
                        placeholder="Name"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") submitNewPlayer();
                          if (e.key === "Escape") {
                            setAdding(false);
                            setNewName("");
                          }
                        }}
                      />
                      <button className="btn sm" style={{ height: 46 }} onClick={submitNewPlayer}>
                        Add
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAdding(true)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        padding: "12px 16px",
                        borderRadius: "var(--r-card)",
                        border: "1.5px dashed var(--line-2)",
                        background: "transparent",
                        cursor: "pointer",
                        width: "100%",
                      }}
                    >
                      <span
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: "50%",
                          border: "1.5px solid var(--line-2)",
                          display: "grid",
                          placeItems: "center",
                          font: "400 22px var(--sans)",
                          color: "var(--muted-2)",
                        }}
                      >
                        +
                      </span>
                      <span style={{ font: "600 15px var(--sans)", color: "var(--muted)" }}>
                        Add a player
                      </span>
                    </button>
                  )}
                </div>
              </div>

              {error && <ErrorNote>{error}</ErrorNote>}
            </div>
          </div>

          <div
            style={{
              flex: "none",
              padding: "14px 24px calc(28px + env(safe-area-inset-bottom))",
              background: "linear-gradient(#f4ecdd00, var(--sand) 24%)",
            }}
          >
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
    <span
      style={{
        width: 26,
        height: 26,
        borderRadius: "50%",
        flex: "none",
        display: "grid",
        placeItems: "center",
        background: on ? "var(--green-900)" : "#fffdf7",
        border: on ? "none" : "2px solid #c9b797",
      }}
    >
      {on && (
        <span
          style={{
            width: 11,
            height: 6,
            borderLeft: "2px solid var(--sand)",
            borderBottom: "2px solid var(--sand)",
            transform: "rotate(-45deg)",
            marginTop: -2,
            display: "block",
          }}
        />
      )}
    </span>
  );
}
