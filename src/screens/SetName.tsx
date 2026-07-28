import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { saveProfile, claimInvite } from "../lib/db";
import { Avatar, ErrorNote } from "../components/ui";
import { golfName, initialsFromNames, GOLF_NAME_CHART } from "../lib/course";
import { getPendingInvite, clearPendingInvite } from "../lib/invite";

export default function SetName() {
  const { session, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  // Prefill from an invite link (via storage) or the URL query.
  const pending = getPendingInvite();
  const prefillFirst = pending?.first || params.get("first") || "";
  const prefillLast = pending?.last || params.get("last") || "";

  const [first, setFirst] = useState(prefillFirst);
  const [last, setLast] = useState(prefillLast);
  const [display, setDisplay] = useState(golfName(prefillFirst, prefillLast));
  const [displayTouched, setDisplayTouched] = useState(!!(prefillFirst && prefillLast));
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initials = useMemo(() => initialsFromNames(first, last), [first, last]);
  const autoName = useMemo(() => golfName(first, last), [first, last]);
  const shownDisplay = displayTouched ? display : autoName;

  function onFirst(v: string) {
    setFirst(v);
    if (!displayTouched) setDisplay(golfName(v, last));
  }
  function onLast(v: string) {
    setLast(v);
    if (!displayTouched) setDisplay(golfName(first, v));
  }

  async function submit() {
    if (first.trim().length < 1 || last.trim().length < 1) {
      return setError("Please enter your first and last name.");
    }
    const displayName = (shownDisplay || autoName || first).trim();
    if (!session) return;
    setBusy(true);
    setError(null);
    try {
      await saveProfile(session.user.id, {
        firstName: first,
        lastName: last,
        displayName,
      });
      // If they arrived from a score invite, claim it into their new account.
      const inv = getPendingInvite();
      if (inv) {
        try {
          await claimInvite(inv.token);
        } catch {
          /* already claimed or invalid — ignore */
        }
        clearPendingInvite();
      }
      await refreshProfile();
      navigate("/", { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <div className="screen fade">
      <div className="pad safe-top" style={{ flex: 1, display: "flex", flexDirection: "column", paddingTop: 40 }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
          <Avatar initials={initials} me size={64} />
          <h1 className="h-serif" style={{ font: "600 30px/1.15 var(--serif)", marginTop: 12 }}>
            Welcome to the group
          </h1>
          <p style={{ margin: 0, font: "400 15px/1.5 var(--sans)", color: "var(--muted)" }}>
            Tell us who you are — we'll spin up your golf name.
          </p>

          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <div className="field" style={{ flex: 1 }}>
              <label className="label">First name</label>
              <input className="input" autoFocus value={first} onChange={(e) => onFirst(e.target.value)} placeholder="Antoni" />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label className="label">Last name</label>
              <input className="input" value={last} onChange={(e) => onLast(e.target.value)} placeholder="Commodore" />
            </div>
          </div>

          <div className="field">
            <label className="label">Display name (your golf name)</label>
            <div
              className="input"
              style={{ display: "flex", alignItems: "center", gap: 10, cursor: "default" }}
            >
              <span style={{ flex: 1, font: "600 17px var(--sans)", color: shownDisplay ? "var(--ink)" : "var(--faint)" }}>
                {shownDisplay || "Enter your name above"}
              </span>
              <button
                type="button"
                onClick={() => {
                  setDisplay(shownDisplay);
                  setEditing(true);
                }}
                style={{ border: "none", background: "transparent", font: "600 13px var(--sans)", color: "var(--brass)", cursor: "pointer", padding: 0 }}
              >
                Edit
              </button>
            </div>
            <p style={{ margin: "2px 0 0", font: "400 13px var(--sans)", color: "var(--faint)" }}>
              Auto-picked from your initials · {initials}. Tap Edit to change it.
            </p>
          </div>
          {error && <ErrorNote>{error}</ErrorNote>}
        </div>
        <button className="btn" onClick={submit} disabled={busy}>
          {busy ? <span className="spin on-dark" /> : "Continue"}
        </button>
      </div>

      {editing && (
        <GolfNameModal
          initial={shownDisplay}
          first={first}
          last={last}
          onClose={() => setEditing(false)}
          onSave={(v) => {
            setDisplay(v);
            setDisplayTouched(true);
            setEditing(false);
          }}
        />
      )}
    </div>
  );
}

function GolfNameModal({
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
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(20,25,12,.45)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        zIndex: 50,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="fade"
        style={{
          width: "100%",
          maxWidth: "var(--maxw)",
          background: "var(--sand)",
          borderRadius: "24px 24px 0 0",
          padding: "22px 22px calc(26px + env(safe-area-inset-bottom))",
          maxHeight: "82vh",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 className="h-serif" style={{ font: "600 20px var(--serif)" }}>
            Your golf name
          </h2>
          <button onClick={onClose} style={{ border: "none", background: "transparent", font: "500 14px var(--sans)", color: "var(--muted-2)", cursor: "pointer" }}>
            Close
          </button>
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
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "9px 12px",
                    borderRadius: 12,
                    cursor: "pointer",
                    textAlign: "left",
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
