import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { saveProfile } from "../lib/db";
import { Avatar, TopBar, ErrorNote } from "../components/ui";
import GolfNameModal from "../components/GolfNameModal";
import { golfName, initialsFromNames } from "../lib/course";

export default function Account() {
  const { session, profile, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();

  const [first, setFirst] = useState(profile?.first_name ?? "");
  const [last, setLast] = useState(profile?.last_name ?? "");
  const [display, setDisplay] = useState(profile?.display_name ?? "");
  const [displayTouched, setDisplayTouched] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initials = useMemo(
    () => (first || last ? initialsFromNames(first, last) : profile?.initials ?? "9"),
    [first, last, profile]
  );

  function onFirst(v: string) {
    setFirst(v);
    if (!displayTouched) setDisplay(golfName(v, last));
  }
  function onLast(v: string) {
    setLast(v);
    if (!displayTouched) setDisplay(golfName(first, v));
  }

  const dirty =
    first !== (profile?.first_name ?? "") ||
    last !== (profile?.last_name ?? "") ||
    display !== (profile?.display_name ?? "");

  async function save() {
    if (!session || display.trim().length < 1) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await saveProfile(session.user.id, {
        firstName: first,
        lastName: last,
        displayName: display.trim(),
      });
      await refreshProfile();
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="screen fade">
      <TopBar title="Account" onBack={() => navigate("/")} />
      <div className="scroll">
        <div className="pad" style={{ display: "flex", flexDirection: "column", gap: 22, paddingTop: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Avatar initials={initials} me size={64} />
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span className="h-serif" style={{ font: "600 24px var(--serif)" }}>{display || "—"}</span>
              <span style={{ font: "400 14px var(--sans)", color: "var(--faint)" }}>{session?.user.email}</span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <span className="eyebrow">Edit profile</span>
            <div style={{ display: "flex", gap: 10 }}>
              <div className="field" style={{ flex: 1 }}>
                <label className="label">First name</label>
                <input className="input" value={first} onChange={(e) => onFirst(e.target.value)} placeholder="First" />
              </div>
              <div className="field" style={{ flex: 1 }}>
                <label className="label">Last name</label>
                <input className="input" value={last} onChange={(e) => onLast(e.target.value)} placeholder="Last" />
              </div>
            </div>

            <div className="field">
              <label className="label">Display name (your golf name)</label>
              <div className="input" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ flex: 1, font: "600 17px var(--sans)", color: display ? "var(--ink)" : "var(--faint)" }}>
                  {display || "Set a display name"}
                </span>
                <button
                  type="button"
                  onClick={() => setEditingName(true)}
                  style={{ border: "none", background: "transparent", font: "600 13px var(--sans)", color: "var(--brass)", cursor: "pointer", padding: 0 }}
                >
                  Edit
                </button>
              </div>
            </div>

            {error && <ErrorNote>{error}</ErrorNote>}
            <button className="btn" onClick={save} disabled={busy || !dirty}>
              {busy ? <span className="spin on-dark" /> : saved && !dirty ? "Saved ✓" : "Save changes"}
            </button>
          </div>

          <button
            className="btn ghost"
            style={{ borderColor: "#b6603f", color: "#9a3b26" }}
            onClick={async () => {
              await signOut();
              navigate("/login", { replace: true });
            }}
          >
            Sign out
          </button>
        </div>
      </div>

      {editingName && (
        <GolfNameModal
          initial={display}
          first={first}
          last={last}
          onClose={() => setEditingName(false)}
          onSave={(v) => {
            setDisplay(v);
            setDisplayTouched(true);
            setEditingName(false);
          }}
        />
      )}
    </div>
  );
}
