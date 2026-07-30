// v3 "painted scorecard" design-system helpers for inline styles.

/** Painting + wordmark asset paths (served from /public/paint). */
export const PAINT = {
  leanShadow: "/paint/paint-lean-shadow.jpg",
  fairwayBlobs: "/paint/paint-fairway-blobs.jpg",
  cart: "/paint/paint-cart.jpg",
  puttingGreen: "/paint/paint-putting-green.jpg",
  puttBlue: "/paint/paint-putt-blue.jpg",
  stripesWide: "/paint/paint-stripes-wide.jpg",
  stripesFour: "/paint/paint-stripes-four.jpg",
  walkRed: "/paint/paint-walk-red.jpg",
  teeShot: "/paint/paint-tee-shot.jpg",
  swingDark: "/paint/paint-swing-dark.jpg",
  noise: "/paint/noise.png",
  wordmarkCream: "/paint/wordmark-cream.svg",
  wordmarkPaper: "/paint/wordmark-paper.svg",
  wordmarkInk: "/paint/wordmark-ink.svg",
} as const;

/** Course palette (mirrors the CSS custom properties). */
export const C = {
  shade: "#20261C",
  shade2: "#1A2016",
  terrain: "#262E20",
  panel: "#2E3628",
  raised: "#39422F",
  moss: "#4A5C33",
  fairway: "#6E8746",
  fescue: "#8A9075",
  fescue2: "#A3A88C",
  sand: "#E3C98F",
  paper: "#E9DFC6",
  cream: "#F7EFDD",
  flag: "#C0512F",
  flagDeep: "#7C2E1A",
  float: "#12160F",
  tx: "#E9DFC6",
  tx2: "#BCC0A6",
  tx3: "#8A9075",
  ink: "#20261C",
  ink2: "#6A705A",
  line: "#4A5340",
  line2: "#333C2C",
  linePaper: "#C9C0A6",
} as const;

/** Elevation shadow strings (soft cast below + 1px light catch on top). */
export const ELEV = {
  e0: "inset 0 3px 6px rgba(9,13,7,.6), inset 0 -1px 0 rgba(233,223,198,.05)",
  e1: "0 3px 6px -3px rgba(9,13,7,.55), inset 0 1px 0 rgba(233,223,198,.07)",
  e2: "0 10px 20px -10px rgba(9,13,7,.72), 0 2px 4px -2px rgba(9,13,7,.5), inset 0 1px 0 rgba(233,223,198,.09)",
  e3: "0 20px 36px -16px rgba(9,13,7,.82), 0 5px 10px -5px rgba(9,13,7,.55), inset 0 1px 0 rgba(233,223,198,.11)",
  e4: "0 30px 50px -20px rgba(9,13,7,.88), 0 8px 16px -8px rgba(9,13,7,.65), inset 0 1px 0 rgba(233,223,198,.13)",
  btn: "0 12px 22px -10px rgba(9,13,7,.8), inset 0 2px 0 rgba(255,255,255,.65)",
  flag: "0 12px 22px -10px rgba(9,13,7,.8), inset 0 2px 0 rgba(255,255,255,.26)",
  paper: "0 14px 26px -12px rgba(9,13,7,.75), 0 3px 6px -3px rgba(9,13,7,.5), inset 0 1px 0 rgba(255,255,255,.6)",
} as const;

/** A colour veiled over the noise texture (matches the CSS .surf-* classes). */
export function veil(hex: string, alpha = 0.84): string {
  const n = hex.replace("#", "");
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  const rgba = `rgba(${r},${g},${b},${alpha})`;
  return `linear-gradient(${rgba},${rgba}), ${hex} url(${PAINT.noise})`;
}

/** Four hand-drawn "under par" circles — pick by hole so no two neighbours match. */
export const CIRC = [
  "M31 5 C46 4 55 16 54 29 C55 43 42 53 28 52 C14 53 5 41 6 28 C5 15 17 5 31 5",
  "M30 6 C45 3 57 15 55 30 C56 44 41 55 27 52 C12 54 4 39 7 26 C6 14 16 7 30 6",
  "M32 4 C47 6 54 18 53 30 C55 45 40 54 26 53 C13 52 6 40 7 27 C7 14 18 4 32 4",
  "M29 6 C44 5 56 17 54 28 C57 44 43 54 28 53 C13 53 4 40 6 27 C4 13 15 6 29 6",
];
/** Four hand-drawn "over par" boxes. */
export const SQ = [
  "M8 7 L53 4 L56 51 L5 53 Z",
  "M7 5 L54 7 L55 52 L6 50 Z",
  "M9 6 L52 5 L57 50 L5 54 Z",
  "M6 8 L55 5 L54 53 L7 51 Z",
];

/** Mark kind for a stroke vs par. */
export type MarkKind = "eagle" | "birdie" | "par" | "bogey" | "double";
export function markOf(strokes: number, par: number): MarkKind {
  const d = strokes - par;
  if (strokes <= par - 2) return "eagle";
  if (d === -1) return "birdie";
  if (d === 0) return "par";
  if (d === 1) return "bogey";
  return "double";
}
export const MARK_WORD: Record<MarkKind, string> = {
  eagle: "eagle — buy a round",
  birdie: "birdie",
  par: "par. move along",
  bogey: "bogey",
  double: "double. it happens",
};
