import type { CSSProperties, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft } from "@fortawesome/free-solid-svg-icons";

export function Logo({ width = 210 }: { width?: number }) {
  return (
    <img
      src="/logo.svg"
      alt="Back 9 Early Birds"
      width={width}
      style={{ width, height: "auto", display: "block" }}
    />
  );
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
    <span
      className={`avatar${me ? " me" : ""}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.37) }}
    >
      {initials}
    </span>
  );
}

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
    width: 48,
    height: 48,
    borderRadius: 14,
    display: "grid",
    placeItems: "center",
    font: "400 26px var(--sans)",
    lineHeight: 1,
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.4 : 1,
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <button
        aria-label="Decrease"
        disabled={disabled}
        onClick={onDec}
        style={{
          ...btn,
          border: "1.5px solid var(--green-900)",
          background: "transparent",
          color: "var(--green-900)",
        }}
      >
        −
      </button>
      <span
        className="tnum"
        style={{
          minWidth: 30,
          textAlign: "center",
          font: "600 30px var(--sans)",
          color: "var(--ink)",
        }}
      >
        {value}
      </span>
      <button
        aria-label="Increase"
        disabled={disabled}
        onClick={onInc}
        style={{
          ...btn,
          border: "none",
          background: "var(--green-900)",
          color: "var(--sand)",
        }}
      >
        +
      </button>
    </div>
  );
}

export function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      style={{
        width: 52,
        height: 30,
        borderRadius: 20,
        border: "none",
        position: "relative",
        cursor: "pointer",
        background: on ? "var(--green-900)" : "var(--line-2)",
        transition: "background 0.15s ease",
        flex: "none",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: on ? 25 : 3,
          width: 24,
          height: 24,
          borderRadius: "50%",
          background: on ? "var(--sand)" : "#fffdf7",
          transition: "left 0.16s ease",
        }}
      />
    </button>
  );
}

export function StatCard({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className="card"
      style={{
        flex: 1,
        padding: "16px 16px 15px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <span
        style={{
          font: "500 11px var(--sans)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--faint)",
        }}
      >
        {label}
      </span>
      <span
        className="tnum"
        style={{
          font: "600 34px var(--sans)",
          lineHeight: 1,
          color: accent ? "var(--brass)" : "var(--green-900)",
        }}
      >
        {value}
      </span>
    </div>
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
    <div
      className="safe-top"
      style={{
        flex: "none",
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "6px 18px 12px",
      }}
    >
      {back && (
        <button
          aria-label="Back"
          onClick={back}
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            border: "none",
            background: "transparent",
            display: "grid",
            placeItems: "center",
            cursor: "pointer",
          }}
        >
          <FontAwesomeIcon icon={faChevronLeft} style={{ color: "var(--green-900)", fontSize: 18 }} />
        </button>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1
          className="h-serif"
          style={{ font: "600 20px var(--serif)", color: "var(--green-900)" }}
        >
          {title}
        </h1>
        {subtitle && (
          <span style={{ font: "400 12px var(--sans)", color: "var(--faint)" }}>
            {subtitle}
          </span>
        )}
      </div>
      {right}
    </div>
  );
}

export function FullSpinner({ label }: { label?: string }) {
  return (
    <div className="center-screen" style={{ flexDirection: "column", gap: 16 }}>
      <span className="spin" />
      {label && (
        <span style={{ font: "500 14px var(--sans)", color: "var(--muted-2)" }}>
          {label}
        </span>
      )}
    </div>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p
      style={{
        margin: "8px 0 0",
        font: "500 13px var(--sans)",
        color: "#9a3b26",
        textAlign: "center",
      }}
    >
      {children}
    </p>
  );
}
