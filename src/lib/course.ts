// Mission Trails — the back nine (holes 10–18).
export const HOLES = [10, 11, 12, 13, 14, 15, 16, 17, 18] as const;

export const PARS: Record<number, number> = {
  10: 4,
  11: 3,
  12: 4,
  13: 5,
  14: 4,
  15: 3,
  16: 4,
  17: 4,
  18: 5,
};

export const PAR_TOTAL = HOLES.reduce((s, h) => s + PARS[h], 0); // 36

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

/** Best-effort initials from a display name: "Mike D." -> "MD", "Sal" -> "S". */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
