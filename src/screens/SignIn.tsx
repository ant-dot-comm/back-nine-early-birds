import { useState, type CSSProperties } from "react";
import { supabase } from "../lib/supabase";
import { Logo, ErrorNote } from "../components/ui";
import { WaveDivider } from "../components/paint";
import { PAINT, C } from "../lib/paint";

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
    setError(null); setNotice(null);
    const addr = email.trim().toLowerCase();
    if (!emailOk) return setError("Enter a valid email address.");
    if (mode === "forgot") {
      setBusy(true);
      const { error } = await supabase.auth.resetPasswordForEmail(addr, { redirectTo: `${window.location.origin}/reset` });
      setBusy(false);
      if (error) return setError(error.message);
      return setNotice("Check your email for a link to reset your password.");
    }
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    setBusy(true);
    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email: addr, password });
      setBusy(false);
      if (error) setError(error.message);
    } else {
      const { data, error } = await supabase.auth.signUp({ email: addr, password });
      setBusy(false);
      if (error) return setError(error.message);
      if (!data.session) {
        setNotice("Account created. Check your email to confirm, then sign in.");
        setMode("signin"); setPassword("");
      }
    }
  }

  function switchTo(m: Mode) { setMode(m); setError(null); setNotice(null); }

  const title = mode === "signin" ? "Morning, early bird." : mode === "signup" ? "Join the club." : "Reset it.";
  const cta = mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link";

  return (
    <div className="screen fade" style={{ position: "relative", overflow: "hidden", background: C.shade }}>
      <img src={PAINT.leanShadow} alt="" style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "46vh", minHeight: 320, objectFit: "cover" }} />
      <div className="safe-top" style={{ position: "relative", flex: "none", padding: "16px 26px 0" }}>
        <Logo width={200} />
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ position: "relative", flex: "none" }}>
        <WaveDivider color={C.shade} height={46} />
        <div style={{ background: C.shade, padding: "2px 26px calc(30px + env(safe-area-inset-bottom))", display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <span className="eyebrow">Members only · Mission Trails</span>
            <h1 className="display" style={{ marginTop: 3 }}>{title}</h1>
          </div>

          <div className="field">
            <label className="label" htmlFor="email">Email</label>
            <input id="email" className="input" type="email" autoComplete="email" inputMode="email" placeholder="you@email.com"
              value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
          </div>

          {mode !== "forgot" && (
            <div className="field">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <label className="label" htmlFor="password">Password</label>
                <button type="button" onClick={() => setShowPw((s) => !s)} style={{ border: "none", background: "transparent", font: "600 11px var(--sans)", color: C.sand, cursor: "pointer", padding: 0 }}>{showPw ? "Hide" : "Show"}</button>
              </div>
              <input id="password" className="input" type={showPw ? "text" : "password"} autoComplete={mode === "signup" ? "new-password" : "current-password"}
                placeholder={mode === "signup" ? "At least 6 characters" : "Your password"} value={password}
                onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 4 }}>
            <button className="btn" style={{ flex: 1 }} onClick={submit} disabled={busy}>{busy ? <span className="spin on-dark" /> : cta}</button>
            {mode === "signin" && <span className="hand" onClick={() => switchTo("forgot")} style={{ font: "400 24px/1 var(--hand)", color: C.fescue, maxWidth: 96, cursor: "pointer" }}>forgot it again?</span>}
          </div>

          {error && <ErrorNote>{error}</ErrorNote>}
          {notice && <p style={{ margin: 0, font: "500 13px/1.5 var(--sans)", color: C.sand, textAlign: "center" }}>{notice}</p>}

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, marginTop: 2 }}>
            {mode === "signin" && <span style={{ font: "400 13px var(--sans)", color: C.fescue }}>New here? <button style={linkStrong} onClick={() => switchTo("signup")}>Ask for an invite</button></span>}
            {mode === "signup" && <span style={{ font: "400 13px var(--sans)", color: C.fescue }}>Already a member? <button style={linkStrong} onClick={() => switchTo("signin")}>Sign in</button></span>}
            {mode === "forgot" && <button style={linkStrong} onClick={() => switchTo("signin")}>Back to sign in</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

const linkStrong: CSSProperties = { border: "none", background: "transparent", font: "600 13px var(--sans)", color: C.sand, cursor: "pointer", padding: 0 };
