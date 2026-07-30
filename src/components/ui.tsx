import type { CSSProperties, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { PAINT, C, ELEV } from "../lib/paint";

export function Logo({ width = 210, variant = "cream" }: { width?: number; variant?: "cream" | "paper" | "ink" }) {
  const src = variant === "ink" ? PAINT.wordmarkInk : variant === "paper" ? PAINT.wordmarkPaper : PAINT.wordmarkCream;
  return <img src={src} alt="Back 9 Early Birds" width={width} style={{ width, height: "auto", display: "block" }} />;
}

export function Avatar({
  initials,
  me = false,
  size = 38,
}: {
  initials: string;
  me?: boolean;
  size?: number;
}) {
  return (
    <span className={`avatar${me ? " me" : ""}`} style={{ width: size, height: size, fontSize: Math.round(size * 0.37) }}>
      {initials}
    </span>
  );
}

/** v3 stepper: carved minus, flagstick plus. */
export function Stepper({
  value,
  onDec,
  onInc,
  disabled = false,
}: {
  value: number;
  onDec: () => void;
  onInc: () => void;
  disabled?: boolean;
}) {
  const btn: CSSProperties = {
    width: 48, height: 48, borderRadius: "50%", display: "grid", placeItems: "center",
    font: "300 26px var(--sans)", lineHeight: 1, cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.4 : 1,
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <button aria-label="Decrease" disabled={disabled} onClick={onDec}
        style={{ ...btn, border: "1px solid #55603F", background: C.panel, boxShadow: ELEV.e0, color: C.tx }}>−</button>
      <span className="tnum" style={{ minWidth: 30, textAlign: "center", font: "600 30px var(--sans)", color: C.tx }}>{value}</span>
      <button aria-label="Increase" disabled={disabled} onClick={onInc}
        style={{ ...btn, border: "none", background: C.flag, color: C.cream, boxShadow: "0 8px 14px -6px rgba(9,13,7,.7), inset 0 1px 0 rgba(255,255,255,.28)" }}>+</button>
    </div>
  );
}

export function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button role="switch" aria-checked={on} onClick={onToggle}
      style={{ width: 52, height: 30, borderRadius: 20, border: "none", position: "relative", cursor: "pointer",
        background: on ? C.fairway : C.shade2, boxShadow: on ? "none" : ELEV.e0, transition: "background .15s ease", flex: "none" }}>
      <span style={{ position: "absolute", top: 3, left: on ? 25 : 3, width: 24, height: 24, borderRadius: "50%",
        background: on ? C.cream : C.fescue, transition: "left .16s ease" }} />
    </button>
  );
}

export function TopBar({
  title,
  subtitle,
  onBack,
  right,
}: {
  title: string;
  subtitle?: string;
  onBack?: (() => void) | "auto";
  right?: ReactNode;
}) {
  const navigate = useNavigate();
  const back = onBack === "auto" ? () => navigate(-1) : onBack || undefined;
  return (
    <div className="safe-top" style={{ flex: "none", display: "flex", alignItems: "center", gap: 10, padding: "6px 18px 12px" }}>
      {back && (
        <button aria-label="Back" onClick={back}
          style={{ width: 34, height: 34, flex: "none", borderRadius: "50%", border: "1px solid var(--line)", background: "transparent", display: "grid", placeItems: "center", cursor: "pointer" }}>
          <span style={{ width: 8, height: 8, borderLeft: "2px solid var(--tx)", borderBottom: "2px solid var(--tx)", transform: "rotate(45deg)", marginLeft: 3 }} />
        </button>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1 style={{ margin: 0, font: "600 18px var(--sans)", color: C.tx }}>{title}</h1>
        {subtitle && <span style={{ font: "400 12px var(--sans)", color: C.fescue }}>{subtitle}</span>}
      </div>
      {right}
    </div>
  );
}

export function FullSpinner({ label }: { label?: string }) {
  return (
    <div className="center-screen" style={{ flexDirection: "column", gap: 16 }}>
      <span className="spin" />
      {label && <span style={{ font: "500 14px var(--sans)", color: C.fescue }}>{label}</span>}
    </div>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p style={{ margin: "8px 0 0", font: "500 13px var(--sans)", color: "#E5967E", textAlign: "center" }}>{children}</p>
  );
}

/** Eyebrow label. */
export function Eyebrow({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <span className="eyebrow" style={style}>{children}</span>;
}
