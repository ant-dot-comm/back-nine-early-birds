import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { saveProfile } from "../lib/db";
import { Avatar, ErrorNote } from "../components/ui";
import { initialsOf } from "../lib/course";

export default function SetName() {
  const { session, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initials = name.trim() ? initialsOf(name) : "9";

  async function submit() {
    const clean = name.trim();
    if (clean.length < 2) {
      setError("Please enter your name.");
      return;
    }
    if (!session) return;
    setBusy(true);
    setError(null);
    try {
      await saveProfile(session.user.id, clean);
      await refreshProfile();
      navigate("/", { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <div className="screen fade">
      <div
        className="pad safe-top"
        style={{ flex: 1, display: "flex", flexDirection: "column", paddingTop: 44 }}
      >
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
          <Avatar initials={initials} me size={64} />
          <h1 className="h-serif" style={{ font: "600 32px/1.15 var(--serif)", marginTop: 14 }}>
            Welcome to the group
          </h1>
          <p style={{ margin: 0, font: "400 16px/1.55 var(--sans)", color: "var(--muted)" }}>
            How should we list you on the leaderboard and round summaries?
          </p>
          <div className="field" style={{ marginTop: 14 }}>
            <label className="label" htmlFor="name">
              Display name
            </label>
            <input
              id="name"
              className="input"
              style={{ borderColor: "var(--green-900)", font: "500 18px var(--sans)" }}
              placeholder="Mike D."
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
          </div>
          <p style={{ margin: "2px 0 0", font: "400 13px var(--sans)", color: "var(--faint)" }}>
            Most members use a first name and last initial.
          </p>
          {error && <ErrorNote>{error}</ErrorNote>}
        </div>
        <button className="btn" onClick={submit} disabled={busy}>
          {busy ? <span className="spin on-dark" /> : "Continue"}
        </button>
      </div>
    </div>
  );
}
