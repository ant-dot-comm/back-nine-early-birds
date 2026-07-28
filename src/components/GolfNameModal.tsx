import { useState } from "react";
import { GOLF_NAME_CHART } from "../lib/course";

export default function GolfNameModal({
  initial,
  first,
  last,
  onClose,
  onSave,
}: {
  initial: string;
  first: string;
  last: string;
  onClose: () => void;
  onSave: (v: string) => void;
}) {
  const [value, setValue] = useState(initial);
  const fInit = (first.trim()[0] ?? "").toUpperCase();
  const lInit = (last.trim()[0] ?? "").toUpperCase();
  const letters = Object.keys(GOLF_NAME_CHART);

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(20,25,12,.45)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 55 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="fade"
        style={{ width: "100%", maxWidth: "var(--maxw)", background: "var(--sand)", borderRadius: "24px 24px 0 0", padding: "22px 22px calc(26px + env(safe-area-inset-bottom))", maxHeight: "82vh", display: "flex", flexDirection: "column", gap: 14 }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 className="h-serif" style={{ font: "600 20px var(--serif)" }}>Your golf name</h2>
          <button onClick={onClose} style={{ border: "none", background: "transparent", font: "500 14px var(--sans)", color: "var(--muted-2)", cursor: "pointer" }}>Close</button>
        </div>

        <div className="field">
          <label className="label">Display name</label>
          <input className="input" autoFocus value={value} onChange={(e) => setValue(e.target.value)} placeholder="Type any name" />
        </div>

        <p style={{ margin: 0, font: "400 13px var(--sans)", color: "var(--muted)" }}>
          Pick from the chart (first letter of your first &amp; last name), or type your own above.
        </p>

        <div className="scroll" style={{ margin: "0 -6px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6, padding: "0 6px" }}>
            {letters.map((L) => {
              const active = L === fInit || L === lInit;
              return (
                <button
                  key={L}
                  onClick={() => setValue((v) => appendWord(v, GOLF_NAME_CHART[L]))}
                  style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 12, cursor: "pointer", textAlign: "left",
                    border: active ? "1.5px solid var(--brass)" : "1px solid var(--line-2)",
                    background: active ? "var(--chip-bg)" : "var(--surface)",
                  }}
                >
                  <span style={{ font: "700 12px var(--sans)", color: "var(--label-gold)", width: 16 }}>{L}</span>
                  <span style={{ font: "600 14px var(--sans)", color: "var(--ink)" }}>{GOLF_NAME_CHART[L]}</span>
                </button>
              );
            })}
          </div>
        </div>

        <button className="btn" onClick={() => onSave(value.trim())} disabled={!value.trim()}>
          Use this name
        </button>
      </div>
    </div>
  );
}

/** Append a chart word, keeping the display name to at most two words. */
function appendWord(current: string, word: string): string {
  const parts = current.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]} ${word}`;
  return [...parts, word].join(" ");
}
