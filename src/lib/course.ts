// Mission Trails — pars for all 18 holes (front nine 36 + back nine 36 = 72).
export const PARS: Record<number, number> = {
  1: 4, 2: 5, 3: 4, 4: 3, 5: 4, 6: 4, 7: 3, 8: 5, 9: 4,
  10: 4, 11: 3, 12: 4, 13: 5, 14: 4, 15: 3, 16: 4, 17: 4, 18: 5,
};

export type RoundMode = "back9" | "full18";

export const BACK_NINE = [10, 11, 12, 13, 14, 15, 16, 17, 18];
export const ALL_18 = Array.from({ length: 18 }, (_, i) => i + 1);

/** Which holes a round covers, given its mode. */
export function holesForMode(mode: RoundMode): number[] {
  return mode === "full18" ? ALL_18 : BACK_NINE;
}

export function parTotalFor(holes: number[]): number {
  return holes.reduce((s, h) => s + PARS[h], 0);
}

export function modeLabel(mode: RoundMode): string {
  return mode === "full18" ? "Full 18" : "Back 9";
}

/** Range label like "Holes 10–18" or "Holes 1–18". */
export function holesLabel(mode: RoundMode): string {
  const h = holesForMode(mode);
  return `Holes ${h[0]}–${h[h.length - 1]}`;
}

/** e.g. -2 -> "−2", 0 -> "E", +3 -> "+3" (uses a real minus glyph). */
export function toParLabel(diff: number): string {
  if (diff === 0) return "E";
  return diff > 0 ? `+${diff}` : `−${Math.abs(diff)}`;
}

/** Short label for a single hole result relative to par. */
export function holeDiffLabel(strokes: number, par: number): string | null {
  const d = strokes - par;
  if (d <= -3) return "Albatross";
  if (d === -2) return "Eagle";
  if (d === -1) return "Birdie";
  if (d === 1) return "Bogey";
  if (d === 2) return "Double";
  return null; // par, or worse-than-double we leave unlabeled
}

export function isBirdieOrBetter(strokes: number, par: number): boolean {
  return strokes <= par - 1;
}

export function isBirdie(strokes: number, par: number): boolean {
  return strokes === par - 1;
}

/** Color a hole cell/score gets in summaries. */
export function scoreTone(strokes: number, par: number): "under" | "over" | "par" {
  if (strokes < par) return "under";
  if (strokes > par) return "over";
  return "par";
}

/** Best-effort initials: "Mike D." -> "MD", "Sal" -> "S". */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function initialsFromNames(first: string, last: string): string {
  const f = first.trim()[0] ?? "";
  const l = last.trim()[0] ?? "";
  const combined = (f + l).toUpperCase();
  return combined || "?";
}

// ---- "What's your golf name?" letter chart ---------------------------------
export const GOLF_NAME_CHART: Record<string, string> = {
  A: "Master", B: "Wedge", C: "Iron", D: "Swing", E: "Grips", F: "Parson",
  G: "Hazard", H: "Putter", I: "Carts", J: "Chipper", K: "Flags", L: "Bunker",
  M: "Water", N: "Divot", O: "Wild", P: "Tee", Q: "Driver", R: "Rookie",
  S: "Lucky", T: "Eagle", U: "Hook", V: "Jackpot", W: "Kingpin", X: "Grip",
  Y: "Slice", Z: "Ace",
};

/** Golf name from initials: first-name letter word + last-name letter word. */
export function golfName(first: string, last: string): string {
  const f = (first.trim()[0] ?? "").toUpperCase();
  const l = (last.trim()[0] ?? "").toUpperCase();
  const words = [GOLF_NAME_CHART[f], GOLF_NAME_CHART[l]].filter(Boolean);
  return words.join(" ");
}
