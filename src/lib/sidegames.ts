import type { HoleScore, Player } from "./types";

export type SideGame = "low_score" | "most_birdies" | "fewest_bogeys" | "best_gir";

export const SIDE_GAMES: { key: SideGame; label: string; desc: string; better: "low" | "high" }[] = [
  { key: "low_score", label: "Low round", desc: "Lowest total score", better: "low" },
  { key: "most_birdies", label: "Most birdies", desc: "Most holes under par", better: "high" },
  { key: "fewest_bogeys", label: "Fewest bogeys", desc: "Fewest holes over par", better: "low" },
  { key: "best_gir", label: "Best GIR", desc: "Most greens in regulation", better: "high" },
];

export function sideGameLabel(key: string): string {
  return SIDE_GAMES.find((g) => g.key === key)?.label ?? key;
}

/** Per-player value for a side game. */
export function sideGameValue(game: SideGame, scores: HoleScore[]): number {
  switch (game) {
    case "low_score":
      return scores.reduce((s, x) => s + x.strokes, 0);
    case "most_birdies":
      return scores.filter((x) => x.strokes <= x.par - 1).length;
    case "fewest_bogeys":
      return scores.filter((x) => x.strokes >= x.par + 1).length;
    case "best_gir":
      return scores.filter((x) => x.gir).length;
  }
}

export interface SideGameResult {
  game: SideGame;
  label: string;
  winners: Player[];
  value: number;
  display: string;
}

/** Compute the winner(s) of a side game across a round's players. */
export function computeSideGame(
  game: SideGame,
  players: Player[],
  scoresByPlayer: Record<string, HoleScore[]>
): SideGameResult {
  const def = SIDE_GAMES.find((g) => g.key === game)!;
  const rows = players.map((p) => ({ p, v: sideGameValue(game, scoresByPlayer[p.id] ?? []) }));
  const best = rows.reduce(
    (acc, r) => (def.better === "low" ? Math.min(acc, r.v) : Math.max(acc, r.v)),
    def.better === "low" ? Infinity : -Infinity
  );
  const winners = rows.filter((r) => r.v === best).map((r) => r.p);
  const display =
    game === "best_gir" ? `${best} GIR` : game === "low_score" ? `${best}` : `${best}`;
  return { game, label: def.label, winners, value: best, display };
}
