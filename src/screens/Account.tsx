import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { saveProfile } from "../lib/db";
import { Avatar, TopBar, ErrorNote } from "../components/ui";

export default function Account() {
  const { session, profile, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile?.display_name ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!session || name.trim().length < 2) return;
    setBusy(true);
    setError(null);
    try {
      await saveProfile(session.user.id, name.trim());
      await refreshProfile();
      setEditing(false);
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
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span className="h-serif" style={{ font: "600 24px var(--serif)" }}>
                {profile?.display_name ?? "—"}
              </span>
              <span style={{ font: "400 14px var(--sans)", color: "var(--faint)" }}>
                {session?.user.email}
              </span>
            </div>
          </div>

          {editing ? (
            <div className="field">
              <label className="label">Display name</label>
              <input
                className="input"
                value={name}
                autoFocus
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && save()}
              />
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button className="btn" onClick={save} disabled={busy}>
                  {busy ? <span className="spin on-dark" /> : "Save"}
                </button>
                <button className="btn ghost" onClick={() => setEditing(false)}>
                  Cancel
                </button>
              </div>
              {error && <ErrorNote>{error}</ErrorNote>}
            </div>
          ) : (
            <button className="btn ghost" onClick={() => setEditing(true)}>
              Edit display name
            </button>
          )}

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
    </div>
  );
}
