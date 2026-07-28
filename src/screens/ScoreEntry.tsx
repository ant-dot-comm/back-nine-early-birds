import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getRoundDetail, updateHole, finalizeRound } from "../lib/db";
import type { Player, RoundMode, RoundDetail } from "../lib/types";
import {
  holesForMode, parTotalFor, PARS, toParLabel, holeDiffLabel, isBirdieOrBetter, holesLabel,
} from "../lib/course";
import { Avatar, Stepper, Toggle, TopBar, FullSpinner, ErrorNote } from "../components/ui";
import { formatRoundDate } from "../lib/date";

type Key = string; // `${playerId}:${hole}`
const key = (p: string, h: number): Key => `${p}:${h}`;

interface Cell {
  strokes: number;
  gir: boolean;
}

export default function ScoreEntry() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [players, setPlayers] = useState<Player[]>([]);
  const [playedOn, setPlayedOn] = useState<string>("");
  const [mode, setMode] = useState<RoundMode>("back9");
  const [compare, setCompare] = useState<RoundDetail["compare"]>(null);
  const [cells, setCells] = useState<Record<Key, Cell>>({});
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const holes = useMemo(() => holesForMode(mode), [mode]);
  const parTotal = useMemo(() => parTotalFor(holes), [holes]);

  useEffect(() => {
    if (!id) return;
    getRoundDetail(id)
      .then((detail) => {
        setPlayers(detail.players);
        setPlayedOn(detail.round.played_on);
        setMode(detail.round.mode);
        setCompare(detail.compare);
        const map: Record<Key, Cell> = {};
        for (const s of detail.scores) map[key(s.player_id, s.hole)] = { strokes: s.strokes, gir: s.gir };
        for (const p of detail.players) {
          for (const h of holesForMode(detail.round.mode)) {
            if (!map[key(p.id, h)]) map[key(p.id, h)] = { strokes: PARS[h], gir: false };
          }
        }
        setCells(map);
        setLoading(false);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Could not load the round.");
        setLoading(false);
      });
  }, [id]);

  const player = players[active];
  const isSelf = !!player?.is_self;

  const { total, diff } = useMemo(() => {
    if (!player) return { total: 0, diff: 0 };
    let t = 0;
    for (const h of holes) t += cells[key(player.id, h)]?.strokes ?? PARS[h];
    return { total: t, diff: t - parTotal };
  }, [cells, player, holes, parTotal]);

  function patchCell(hole: number, patch: Partial<Cell>) {
    if (!player || !id) return;
    const k = key(player.id, hole);
    setCells((prev) => {
      const cur = prev[k] ?? { strokes: PARS[hole], gir: false };
      updateHole(id, player.id, hole, patch).catch((e) =>
        setError(e instanceof Error ? e.message : "Save failed — check your connection.")
      );
      return { ...prev, [k]: { ...cur, ...patch } };
    });
  }

  function step(hole: number, delta: number) {
    const cur = cells[key(player!.id, hole)]?.strokes ?? PARS[hole];
    const v = Math.max(1, Math.min(12, cur + delta));
    if (v !== cur) patchCell(hole, { strokes: v });
  }

  async function save() {
    if (!id) return;
    setSaving(true);
    setError(null);
    try {
      await finalizeRound(id);
      navigate(`/rounds/${id}`, { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the round.");
      setSaving(false);
    }
  }

  if (loading) return <div className="screen"><FullSpinner label="Loading scorecard…" /></div>;

  return (
    <div className="screen fade">
      <TopBar
        title="Scorecard"
        subtitle={playedOn ? `Mission Trails · ${formatRoundDate(playedOn)}` : "Mission Trails"}
        onBack="auto"
        right={<span className="chip">{holesLabel(mode)}</span>}
      />

      {players.length > 1 && (
        <div style={{ flex: "none", display: "flex", gap: 8, padding: "2px 16px 10px", overflowX: "auto" }}>
          {players.map((p, i) => {
            const on = i === active;
            let t = 0;
            for (const h of holes) t += cells[key(p.id, h)]?.strokes ?? PARS[h];
            return (
              <button
                key={p.id}
                onClick={() => setActive(i)}
                style={{
                  flex: "none", display: "flex", alignItems: "center", gap: 8,
                  padding: "7px 12px 7px 8px", borderRadius: 20, cursor: "pointer",
                  border: on ? "1.5px solid var(--green-900)" : "1px solid var(--line)",
                  background: on ? "var(--green-900)" : "var(--surface)",
                }}
              >
                <Avatar initials={p.initials} me={p.is_self} size={26} />
                <span style={{ font: "600 14px var(--sans)", color: on ? "var(--sand)" : "var(--ink)" }}>{p.name.split(/\s+/)[0]}</span>
                <span className="tnum" style={{ font: "600 14px var(--sans)", color: on ? "var(--gold)" : "var(--faint)" }}>{t}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="scroll">
        <div style={{ padding: "2px 16px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          {holes.map((h) => {
            const c = cells[key(player!.id, h)] ?? { strokes: PARS[h], gir: false };
            const par = PARS[h];
            const label = holeDiffLabel(c.strokes, par);
            const under = isBirdieOrBetter(c.strokes, par);
            const last = isSelf && compare ? compare.strokesByHole[h] : undefined;
            return (
              <div key={h} className="card" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 12px 12px 14px" }}>
                <div style={{ flex: "none", width: 44, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                  <span className="tnum" style={{ width: 42, height: 42, borderRadius: 13, background: "var(--green-900)", color: "var(--sand)", font: "600 19px var(--sans)", display: "grid", placeItems: "center" }}>{h}</span>
                  <span style={{ font: "500 11px var(--sans)", color: "var(--faint)" }}>Par {par}</span>
                </div>

                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7, minWidth: 0 }}>
                  {label && (
                    <span
                      className="chip"
                      style={{
                        alignSelf: "flex-start", fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase",
                        color: under ? "var(--label-gold)" : "var(--muted-2)",
                        background: under ? "var(--chip-bg)" : "#efe7d6",
                        borderColor: under ? "var(--chip-line)" : "#e2d6bd",
                      }}
                    >
                      {label}
                    </span>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <span style={{ font: "600 12px var(--sans)", color: "var(--muted)" }}>GIR</span>
                    <Toggle on={c.gir} onToggle={() => patchCell(h, { gir: !c.gir })} />
                  </div>
                  {last !== undefined && <CompareTag current={c.strokes} last={last} />}
                </div>

                <div style={{ flex: "none" }}>
                  <Stepper value={c.strokes} onDec={() => step(h, -1)} onInc={() => step(h, 1)} />
                </div>
              </div>
            );
          })}
          {error && <ErrorNote>{error}</ErrorNote>}
        </div>
      </div>

      <div style={{ flex: "none", background: "var(--green-900)", color: "var(--sand)", padding: "16px 20px calc(26px + env(safe-area-inset-bottom))", display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ font: "500 11px var(--sans)", letterSpacing: "0.12em", textTransform: "uppercase", color: "#9fb39a" }}>
            {player?.name.split(/\s+/)[0]} · Through {holes.length}
          </span>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span className="tnum" style={{ font: "600 34px var(--sans)", lineHeight: 1 }}>{total}</span>
            <span style={{ font: "600 17px var(--sans)", color: "var(--gold)" }}>{toParLabel(diff)}</span>
          </div>
        </div>
        <button className="btn gold sm" style={{ marginLeft: "auto" }} onClick={save} disabled={saving}>
          {saving ? <span className="spin" /> : "Save round"}
        </button>
      </div>
    </div>
  );
}

/** Subtle "vs last round" delta shown per hole for the self player. */
function CompareTag({ current, last }: { current: number; last: number }) {
  const d = current - last;
  const better = d < 0;
  const worse = d > 0;
  const color = better ? "var(--brass)" : worse ? "#a8654a" : "var(--faint)";
  const arrow = better ? "▼" : worse ? "▲" : "＝";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, font: "500 11px var(--sans)", color: "var(--faint)" }}>
      <span>Last {last}</span>
      <span style={{ color, fontWeight: 600 }}>
        {arrow} {d === 0 ? "even" : `${Math.abs(d)}`}
      </span>
    </span>
  );
}
