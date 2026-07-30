import type { ReactNode } from "react";
import { C, ELEV } from "../lib/paint";

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
    <div onClick={onCancel} style={{ position: "fixed", inset: 0, background: "rgba(9,13,7,.6)", display: "grid", placeItems: "center", padding: 24, zIndex: 60 }}>
      <div onClick={(e) => e.stopPropagation()} className="fade-pop surf-raised" style={{ width: "100%", maxWidth: 360, borderRadius: 22, padding: 24, display: "flex", flexDirection: "column", gap: 10, boxShadow: ELEV.e4 }}>
        <h2 style={{ margin: 0, font: "600 20px var(--sans)", color: C.tx }}>{title}</h2>
        <p style={{ margin: 0, font: "400 15px/1.5 var(--sans)", color: C.tx2 }}>{body}</p>
        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <button className="btn ghost" onClick={onCancel} disabled={busy}>Cancel</button>
          <button className={danger ? "btn flag" : "btn"} onClick={onConfirm} disabled={busy}>{busy ? <span className={danger ? "spin on-dark" : "spin on-dark"} /> : confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
