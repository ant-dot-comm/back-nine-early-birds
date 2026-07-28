import { useState } from "react";
import { supabase } from "../lib/supabase";
import { Logo, ErrorNote } from "../components/ui";

type Mode = "signin" | "signup" | "forgot";

export default function SignIn() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());

  async function submit() {
    setError(null);
    setNotice(null);
    const addr = email.trim().toLowerCase();
    if (!emailOk) return setError("Enter a valid email address.");

    if (mode === "forgot") {
      setBusy(true);
      const { error } = await supabase.auth.resetPasswordForEmail(addr, {
        redirectTo: `${window.location.origin}/reset`,
      });
      setBusy(false);
      if (error) return setError(error.message);
      return setNotice("Check your email for a link to reset your password.");
    }

    if (password.length < 6) {
      return setError("Password must be at least 6 characters.");
    }

    setBusy(true);
    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email: addr, password });
      setBusy(false);
      if (error) setError(error.message);
      // On success, AuthProvider's listener takes over and routes into the app.
    } else {
      const { data, error } = await supabase.auth.signUp({ email: addr, password });
      setBusy(false);
      if (error) return setError(error.message);
      if (!data.session) {
        // Email confirmation is on: no session yet.
        setNotice("Account created. Check your email to confirm, then sign in.");
        setMode("signin");
        setPassword("");
      }
      // If a session came back, the listener signs the user straight in.
    }
  }

  const title =
    mode === "signin" ? "Welcome back" : mode === "signup" ? "Create your account" : "Reset password";
  const cta = mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link";

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
            gap: 10,
          }}
        >
          <Logo width={230} />
          <span
            style={{
              font: "500 12px var(--sans)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--label-gold)",
              marginTop: 6,
            }}
          >
            Mission Trails · Members
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <h1 className="h-serif" style={{ font: "600 22px var(--serif)" }}>
            {title}
          </h1>

          <div className="field">
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              className="input"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
          </div>

          {mode !== "forgot" && (
            <div className="field">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <label className="label" htmlFor="password">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  style={{
                    border: "none",
                    background: "transparent",
                    font: "500 12px var(--sans)",
                    color: "var(--brass)",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  {showPw ? "Hide" : "Show"}
                </button>
              </div>
              <input
                id="password"
                className="input"
                type={showPw ? "text" : "password"}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                placeholder={mode === "signup" ? "At least 6 characters" : "Your password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
              />
            </div>
          )}

          <button className="btn" onClick={submit} disabled={busy}>
            {busy ? <span className="spin on-dark" /> : cta}
          </button>

          {error && <ErrorNote>{error}</ErrorNote>}
          {notice && (
            <p style={{ margin: 0, font: "500 13px/1.5 var(--sans)", color: "var(--green-700)", textAlign: "center" }}>
              {notice}
            </p>
          )}

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginTop: 4 }}>
            {mode === "signin" && (
              <>
                <button style={linkBtn} onClick={() => switchTo("forgot")}>
                  Forgot password?
                </button>
                <span style={{ font: "400 13px var(--sans)", color: "var(--faint)" }}>
                  New here?{" "}
                  <button style={linkBtnStrong} onClick={() => switchTo("signup")}>
                    Create an account
                  </button>
                </span>
              </>
            )}
            {mode === "signup" && (
              <span style={{ font: "400 13px var(--sans)", color: "var(--faint)" }}>
                Already a member?{" "}
                <button style={linkBtnStrong} onClick={() => switchTo("signin")}>
                  Sign in
                </button>
              </span>
            )}
            {mode === "forgot" && (
              <button style={linkBtnStrong} onClick={() => switchTo("signin")}>
                Back to sign in
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  function switchTo(m: Mode) {
    setMode(m);
    setError(null);
    setNotice(null);
  }
}

const linkBtn: React.CSSProperties = {
  border: "none",
  background: "transparent",
  font: "500 14px var(--sans)",
  color: "var(--muted-2)",
  cursor: "pointer",
  padding: 0,
};
const linkBtnStrong: React.CSSProperties = {
  border: "none",
  background: "transparent",
  font: "600 13px var(--sans)",
  color: "var(--brass)",
  cursor: "pointer",
  padding: 0,
};
