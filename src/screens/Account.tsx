import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { saveProfile, getUnlockedSecrets } from "../lib/db";
import { Avatar, TopBar, ErrorNote } from "../components/ui";
import ConfirmDialog from "../components/ConfirmDialog";
import GolfNameGenerator, { type NameSelection } from "../components/GolfNameGenerator";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faStar } from "@fortawesome/free-solid-svg-icons";

export default function Account() {
  const { session, profile, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();

  const [first, setFirst] = useState(profile?.first_name ?? "");
  const [last, setLast] = useState(profile?.last_name ?? "");
  const [unlocked, setUnlocked] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);
  const [sel, setSel] = useState<NameSelection | null>(null);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getUnlockedSecrets().then(setUnlocked).catch(() => setUnlocked([]));
  }, []);

  const onNameChange = useCallback((s: NameSelection) => { setSel(s); setSaved(false); }, []);

  const isSecret = profile?.display_name_type === "secret";
  const shownName = editing && sel ? sel.name : profile?.display_name ?? "";
  const dirty =
    first !== (profile?.first_name ?? "") ||
    last !== (profile?.last_name ?? "") ||
    (editing && !!sel && sel.name.trim() !== (profile?.display_name ?? ""));

  function startEditing() {
    if (isSecret) setConfirmReplace(true);
    else setEditing(true);
  }

  async function save() {
    if (!session) return;
    const name = (editing && sel ? sel.name : profile?.display_name ?? "").trim();
    if (name.length < 1) return setError("Set a display name.");
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await saveProfile(session.user.id, {
        firstName: first,
        lastName: last,
        displayName: name,
        type: editing && sel ? sel.type : profile?.display_name_type ?? "custom",
        parts: editing && sel ? sel.parts : null,
        secret: editing && sel ? sel.secret : profile?.secret_name,
      });
      await refreshProfile();
      setEditing(false);
      setSel(null);
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
            <Avatar initials={profile?.initials ?? "9"} me size={64} />
            <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
              <span className="h-serif" style={{ font: "600 24px var(--serif)" }}>{profile?.display_name ?? "—"}</span>
              {isSecret && (
                <span className="chip" style={{ alignSelf: "flex-start", fontSize: 9, letterSpacing: "0.03em", textTransform: "uppercase", padding: "4px 9px" }}>
                  <FontAwesomeIcon icon={faStar} /> Ultra-rare name unlocked
                </span>
              )}
              <span style={{ font: "400 14px var(--sans)", color: "var(--faint)" }}>{session?.user.email}</span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <span className="eyebrow">Edit profile</span>
            <div style={{ display: "flex", gap: 10 }}>
              <div className="field" style={{ flex: 1 }}>
                <label className="label">First name</label>
                <input className="input" value={first} onChange={(e) => setFirst(e.target.value)} placeholder="First" />
              </div>
              <div className="field" style={{ flex: 1 }}>
                <label className="label">Last name</label>
                <input className="input" value={last} onChange={(e) => setLast(e.target.value)} placeholder="Last" />
              </div>
            </div>

            <div className="field">
              <label className="label">Display name</label>
              {editing ? (
                <>
                  <GolfNameGenerator unlockedSecrets={unlocked} onChange={onNameChange} />
                  <button type="button" onClick={() => { setEditing(false); setSel(null); }} style={{ border: "none", background: "transparent", font: "500 13px var(--sans)", color: "var(--muted-2)", cursor: "pointer", alignSelf: "center", marginTop: 4 }}>
                    Cancel name change
                  </button>
                </>
              ) : (
                <div className="input" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ flex: 1, font: "600 17px var(--sans)", color: shownName ? "var(--ink)" : "var(--faint)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {shownName || "Set a display name"}
                  </span>
                  <button type="button" onClick={startEditing} style={{ border: "none", background: "transparent", font: "600 13px var(--sans)", color: "var(--brass)", cursor: "pointer", padding: 0 }}>
                    Change
                  </button>
                </div>
              )}
              {!editing && unlocked.length > 0 && (
                <p style={{ margin: "4px 0 0", font: "400 12px var(--sans)", color: "var(--brass)" }}>
                  <FontAwesomeIcon icon={faStar} /> You've unlocked {unlocked.length} secret name{unlocked.length === 1 ? "" : "s"} — tap Change to use one.
                </p>
              )}
            </div>

            {error && <ErrorNote>{error}</ErrorNote>}
            <button className="btn" onClick={save} disabled={busy || !dirty}>
              {busy ? <span className="spin on-dark" /> : saved && !dirty ? "Saved ✓" : "Save changes"}
            </button>
          </div>

          <button
            className="btn ghost"
            style={{ borderColor: "#b6603f", color: "#9a3b26" }}
            onClick={async () => { await signOut(); navigate("/login", { replace: true }); }}
          >
            Sign out
          </button>
        </div>
      </div>

      {confirmReplace && (
        <ConfirmDialog
          title="Replace your ultra-rare name?"
          body="Your current name is ultra-rare. If you replace it, the rare status is lost permanently and can't be restored from here."
          confirmLabel="Replace it"
          onCancel={() => setConfirmReplace(false)}
          onConfirm={() => { setConfirmReplace(false); setEditing(true); }}
        />
      )}
    </div>
  );
}
