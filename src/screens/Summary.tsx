import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getRoundDetail } from "../lib/db";
import type { Player, HoleScore } from "../lib/types";
import { HOLES, PARS, PAR_TOTAL, toParLabel, isBirdie, scoreTone } from "../lib/course";
import { Avatar, TopBar, FullSpinner } from "../components/ui";
import { formatLongDate } from "../lib/date";

interface Standing {
  player: Player;
  total: number;
  diff: number;
  birdies: number;
  eagles: number;
  isLow: boolean;
}

export default function Summary() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [players, setPlayers] = useState<Player[]>([]);
  const [scores, setScores] = useState<HoleScore[]>([]);
  const [playedOn, setPlayedOn] = useState("");
  const [course, setCourse] = useState("Mission Trails");
  const [loading, setLoading] = useState(true);
  const [gridPlayer, setGridPlayer] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getRoundDetail(id)
      .then((d) => {
        setPlayers(d.players);
        setScores(d.scores);
        setPlayedOn(d.round.played_on);
        setCourse(d.round.course);
        const self = d.players.find((p) => p.is_self);
        setGridPlayer(self?.id ?? d.players[0]?.id ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const standings = useMemo<Standing[]>(() => {
    const rows = players.map((player) => {
      const mine = scores.filter((s) => s.player_id === player.id);
      const total = mine.reduce((sum, s) => sum + s.strokes, 0);
      const birdies = mine.filter((s) => isBirdie(s.strokes, s.par)).length;
      const eagles = mine.filter((s) => s.strokes <= s.par - 2).length;
      return { player, total, diff: total - PAR_TOTAL, birdies, eagles, isLow: false };
    });
    rows.sort((a, b) => a.total - b.total);
    if (rows.length) {
      const best = rows[0].total;
      rows.forEach((r) => (r.isLow = r.total === best));
    }
    return rows;
  }, [players, scores]);

  if (loading) return <div className="screen"><FullSpinner /></div>;

  const gridScores = scores
    .filter((s) => s.player_id === gridPlayer)
    .sort((a, b) => a.hole - b.hole);
  const gridTotal = gridScores.reduce((s, x) => s + x.strokes, 0);
  const gridName = players.find((p) => p.id === gridPlayer)?.name ?? "";

  function annotation(s: Standing): string {
    const parts: string[] = [];
    if (s.eagles > 0) parts.push(`${s.eagles} ${s.eagles === 1 ? "eagle" : "eagles"}`);
    if (s.birdies > 0) parts.push(`${s.birdies} ${s.birdies === 1 ? "birdie" : "birdies"}`);
    if (s.isLow && standings.length > 1) parts.push("Low round");
    return parts.length ? parts.join(" · ") : "—";
  }

  return (
    <div className="screen fade">
      <TopBar title="Round summary" onBack={() => navigate("/", { replace: true })} />
      <div className="scroll">
        <div className="pad" style={{ display: "flex", flexDirection: "column", gap: 20, paddingTop: 8 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <span className="h-serif" style={{ font: "600 22px var(--serif)" }}>
              {formatLongDate(playedOn)}
            </span>
            <span style={{ font: "400 13px var(--sans)", color: "var(--faint)" }}>
              {course} · Back 9 · {players.length} {players.length === 1 ? "player" : "players"}
            </span>
          </div>

          {/* leaderboard */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {standings.map((s) => {
              const leader = s.isLow && standings.length > 1;
              return (
                <div
                  key={s.player.id}
                  className="card"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "13px 16px",
                    border: leader ? "1.5px solid var(--brass)" : "1px solid var(--line)",
                  }}
                >
                  <Avatar initials={s.player.initials} me={s.player.is_self} size={34} />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 1 }}>
                    <span style={{ font: "600 16px var(--sans)", color: "var(--ink)" }}>
                      {s.player.name}
                    </span>
                    <span
                      style={{
                        font: "500 12px var(--sans)",
                        color: leader || s.birdies > 0 ? "var(--brass)" : "var(--faint)",
                      }}
                    >
                      {annotation(s)}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span className="tnum" style={{ font: "600 24px var(--sans)", color: "var(--ink)" }}>
                      {s.total}
                    </span>
                    <span
                      style={{
                        font: "600 14px var(--sans)",
                        color: s.diff < 0 ? "var(--brass)" : "var(--faint)",
                      }}
                    >
                      {toParLabel(s.diff)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* hole-by-hole */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {players.length > 1 && (
              <div style={{ display: "flex", gap: 8, overflowX: "auto" }}>
                {players.map((p) => {
                  const on = p.id === gridPlayer;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setGridPlayer(p.id)}
                      className="chip"
                      style={{
                        cursor: "pointer",
                        border: on ? "1px solid var(--green-900)" : "1px solid var(--line-2)",
                        background: on ? "var(--green-900)" : "transparent",
                        color: on ? "var(--sand)" : "var(--muted)",
                      }}
                    >
                      {p.name.split(/\s+/)[0]}
                    </button>
                  );
                })}
              </div>
            )}
            <span className="eyebrow">{gridName.split(/\s+/)[0]} — hole by hole</span>
            <div
              className="card"
              style={{ padding: 12, display: "flex", flexDirection: "column", gap: 6 }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "repeat(9,1fr) 46px", gap: 4 }}>
                {HOLES.map((h) => (
                  <span
                    key={h}
                    style={{ textAlign: "center", font: "500 11px var(--sans)", color: "var(--faint)" }}
                  >
                    {h}
                  </span>
                ))}
                <span
                  style={{ textAlign: "center", font: "600 11px var(--sans)", color: "var(--green-900)" }}
                >
                  Out
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(9,1fr) 46px", gap: 4 }}>
                {HOLES.map((h) => {
                  const cell = gridScores.find((x) => x.hole === h);
                  const strokes = cell?.strokes ?? PARS[h];
                  const tone = scoreTone(strokes, PARS[h]);
                  const under = tone === "under";
                  const over = tone === "over";
                  return (
                    <span
                      key={h}
                      className="tnum"
                      style={{
                        textAlign: "center",
                        font: "600 16px var(--sans)",
                        padding: "5px 0",
                        borderRadius: 8,
                        color: under ? "var(--label-gold)" : "var(--ink)",
                        background: under ? "var(--chip-bg)" : over ? "#efe7d6" : "transparent",
                        border: under
                          ? "1px solid var(--chip-line)"
                          : over
                          ? "1px solid #e2d6bd"
                          : "1px solid transparent",
                      }}
                    >
                      {strokes}
                    </span>
                  );
                })}
                <span
                  className="tnum"
                  style={{
                    textAlign: "center",
                    font: "600 16px var(--sans)",
                    color: "var(--sand)",
                    background: "var(--green-900)",
                    padding: "5px 0",
                    borderRadius: 8,
                  }}
                >
                  {gridTotal}
                </span>
              </div>
            </div>
          </div>

          <button className="btn ghost" onClick={() => navigate("/", { replace: true })}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
