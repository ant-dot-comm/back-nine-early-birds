import type { ReactNode } from "react";

export default function ConfirmDialog({
  title,
  body,
  confirmLabel = "Delete",
  busy = false,
  danger = true,
  onCancel,
  onConfirm,
}: {
  title: string;
  body: ReactNode;
  confirmLabel?: string;
  busy?: boolean;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      onClick={onCancel}
      style={{ position: "fixed", inset: 0, background: "rgba(20,25,12,.45)", display: "grid", placeItems: "center", padding: 24, zIndex: 60 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="fade"
        style={{ width: "100%", maxWidth: 360, background: "var(--sand)", borderRadius: 22, padding: 24, display: "flex", flexDirection: "column", gap: 10 }}
      >
        <h2 className="h-serif" style={{ font: "600 20px var(--serif)" }}>{title}</h2>
        <p style={{ margin: 0, font: "400 15px/1.5 var(--sans)", color: "var(--muted)" }}>{body}</p>
        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <button className="btn ghost" onClick={onCancel} disabled={busy}>Cancel</button>
          <button
            className="btn"
            style={danger ? { background: "#a8654a" } : undefined}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? <span className="spin on-dark" /> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
