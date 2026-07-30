import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { Logo, ErrorNote, FullSpinner } from "../components/ui";

export default function ResetPassword() {
  const navigate = useNavigate();
  const { clearRecovery, session } = useAuth();
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkDead, setLinkDead] = useState(false);

  // The recovery session is established asynchronously from the URL hash.
  // If it never arrives, the link was invalid or already used.
  useEffect(() => {
    if (session) return;
    const t = setTimeout(() => setLinkDead(true), 5000);
    return () => clearTimeout(t);
  }, [session]);

  if (!session && !linkDead) {
    return (
      <div className="screen">
        <FullSpinner label="Verifying your reset link…" />
      </div>
    );
  }

  if (!session && linkDead) {
    return (
      <div className="screen fade">
        <div
          className="pad safe-top"
          style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 16 }}
        >
          <Logo width={200} />
          <h1 style={{ margin: 0, font: "300 24px var(--sans)", color: "var(--tx)", marginTop: 8 }}>
            This reset link has expired
          </h1>
          <p style={{ margin: 0, font: "400 15px/1.6 var(--sans)", color: "var(--tx-2)" }}>
            Reset links can only be used once. Head back and request a fresh one.
          </p>
          <button
            className="btn"
            style={{ maxWidth: 260 }}
            onClick={() => {
              clearRecovery();
              navigate("/login", { replace: true });
            }}
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  async function save() {
    setError(null);
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return setError(error.message);
    clearRecovery();
    navigate("/", { replace: true });
  }

  return (
    <div className="screen fade">
      <div className="pad safe-top" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Logo width={210} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <h1 className="display" style={{ fontSize: 26 }}>Set a new password</h1>
          <div className="field">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <label className="label" htmlFor="np">
                New password
              </label>
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                style={{ border: "none", background: "transparent", font: "600 12px var(--sans)", color: "var(--sand)", cursor: "pointer", padding: 0 }}
              >
                {showPw ? "Hide" : "Show"}
              </button>
            </div>
            <input
              id="np"
              className="input"
              type={showPw ? "text" : "password"}
              autoComplete="new-password"
              autoFocus
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save()}
            />
          </div>
          <button className="btn" onClick={save} disabled={busy}>
            {busy ? <span className="spin on-dark" /> : "Save password"}
          </button>
          {error && <ErrorNote>{error}</ErrorNote>}
        </div>
      </div>
    </div>
  );
}
