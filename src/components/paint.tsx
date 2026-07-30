import type { CSSProperties, ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { C, ELEV, CIRC, SQ, type MarkKind } from "../lib/paint";

/* ---- Painting window: an image in an arch / lozenge, never a plain rectangle ---- */
const SHAPES: Record<string, string> = {
  arch: "150px 150px 26px 26px",
  archSm: "100px 100px 26px 26px",
  archWide: "110px 110px 26px 26px",
  archTall: "130px 130px 24px 24px",
  lozenge: "26px 120px 26px 120px",
  leafA: "70px 20px 70px 20px",
  leafB: "64px 20px 64px 20px",
  tile: "70px 70px 18px 18px",
};

export function PaintingWindow({
  src,
  height,
  shape = "arch",
  radius,
  objectPosition,
  elevation = "e3",
  children,
  style,
}: {
  src: string;
  height: number | string;
  shape?: keyof typeof SHAPES;
  radius?: string;
  objectPosition?: string;
  elevation?: "e2" | "e3";
  children?: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div style={{ position: "relative", height, borderRadius: radius ?? SHAPES[shape], overflow: "hidden", boxShadow: elevation === "e2" ? ELEV.e2 : ELEV.e3, ...style }}>
      <img src={src} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition }} />
      {children}
    </div>
  );
}

/* ---- Wave divider: steps the page onto a lower terrain layer instead of a border ---- */
export function WaveDivider({ color = C.terrain, height = 42, width = 390 }: { color?: string; height?: number; width?: number }) {
  const h = height;
  return (
    <svg viewBox={`0 0 ${width} ${h}`} preserveAspectRatio="none" style={{ display: "block", width: "100%", height, marginBottom: -1 }}>
      <path d={`M0 ${h} L0 ${h * 0.52} C${width * 0.16} -4 ${width * 0.32} -8 ${width * 0.5} ${h * 0.16} C${width * 0.66} ${h * 0.48} ${width * 0.82} ${h * 0.56} ${width} ${h * 0.2} L${width} ${h} Z`} fill={color} />
    </svg>
  );
}

/* ---- Hand-drawn mark around a stroke number (circle under par, box over) ---- */
export function HandMark({ kind, holeIndex = 0, size = 92, strokeWidth = 2.2 }: { kind: MarkKind; holeIndex?: number; size?: number; strokeWidth?: number }) {
  if (kind === "par") return null;
  const under = kind === "birdie" || kind === "eagle";
  const path = under ? CIRC[holeIndex % 4] : SQ[holeIndex % 4];
  const stroke = under ? C.flag : C.fescue;
  const rot = under ? -5 : 3;
  return (
    <svg viewBox="0 0 60 58" style={{ position: "absolute", left: "50%", top: "50%", width: size, height: size * 0.95, transform: `translate(-50%,-50%) rotate(${rot}deg)`, pointerEvents: "none" }}>
      <path d={path} fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ---- Floating dock: Play · Rounds · Stats · Bag · Me ---- */
type Tab = { to: string; label: string; icon: (active: boolean) => ReactNode };

function Ic({ d, active }: { d: ReactNode; active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? C.sand : "#7F866B"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {d}
    </svg>
  );
}

const TABS: Tab[] = [
  { to: "/", label: "Play", icon: (a) => <Ic active={a} d={<><path d="M7 21V4" /><path d="M7 4h11l-3 4 3 4H7" /></>} /> },
  { to: "/rounds", label: "Rounds", icon: (a) => <Ic active={a} d={<><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 10h18M9 10v10" /></>} /> },
  { to: "/stats", label: "Stats", icon: (a) => <Ic active={a} d={<path d="M5 20V11M12 20V4M19 20v-6" />} /> },
  { to: "/bag", label: "Bag", icon: (a) => <Ic active={a} d={<path d="M12 4l2.3 5 5.7.6-4.2 3.9 1.2 5.5L12 16.2 7 19l1.2-5.5L4 9.6 9.7 9z" />} /> },
];

export function Dock() {
  const { profile } = useAuth();
  const initials = profile?.initials ?? "9";
  return (
    <div style={{ position: "absolute", left: 16, right: 16, bottom: 14, height: 60, borderRadius: 30, background: `linear-gradient(rgba(18,22,15,.84),rgba(18,22,15,.84)), ${C.float} url(/paint/noise.png)`, boxShadow: ELEV.e4, display: "flex", alignItems: "center", justifyContent: "space-around", padding: "0 10px", zIndex: 20 }}>
      {TABS.map((t) => (
        <NavLink key={t.to} to={t.to} end={t.to === "/"} style={{ textDecoration: "none" }}>
          {({ isActive }) => (
            <span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              {t.icon(isActive)}
              <span style={{ font: "600 8px var(--sans)", letterSpacing: ".1em", textTransform: "uppercase", color: isActive ? C.sand : "#7F866B" }}>{t.label}</span>
            </span>
          )}
        </NavLink>
      ))}
      <NavLink to="/me" style={{ textDecoration: "none" }}>
        {({ isActive }) => (
          <span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <span style={{ width: 20, height: 20, borderRadius: "50%", background: isActive ? C.sand : C.moss, color: isActive ? C.ink : C.tx, font: "600 8px var(--sans)", display: "grid", placeItems: "center" }}>{initials}</span>
            <span style={{ font: "600 8px var(--sans)", letterSpacing: ".1em", textTransform: "uppercase", color: isActive ? C.sand : "#7F866B" }}>Me</span>
          </span>
        )}
      </NavLink>
    </div>
  );
}
