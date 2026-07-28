import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { Logo, ErrorNote } from "../components/ui";

export default function ResetPassword() {
  const navigate = useNavigate();
  const { clearRecovery } = useAuth();
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          <h1 className="h-serif" style={{ font: "600 24px var(--serif)" }}>
            Set a new password
          </h1>
          <div className="field">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <label className="label" htmlFor="np">
                New password
              </label>
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                style={{ border: "none", background: "transparent", font: "500 12px var(--sans)", color: "var(--brass)", cursor: "pointer", padding: 0 }}
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
