import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { Logo, ErrorNote, FullSpinner } from "../components/ui";
import { capturePendingInviteFromUrl } from "../lib/invite";

export default function JoinInvite() {
  const { loading, session, signOut } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const token = params.get("invite") ?? "";
  const email0 = params.get("email") ?? "";
  const from = params.get("from") || "A friend";

  const [email, setEmail] = useState(email0);
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Keep the invite token/name around so onboarding can claim it after signup.
  useEffect(() => {
    capturePendingInviteFromUrl();
  }, []);

  if (loading) return <div className="screen"><FullSpinner /></div>;

  // No token → nothing to claim; send them to the normal sign-in.
  if (!token) {
    navigate("/login", { replace: true });
    return null;
  }

  async function createAccount() {
    const addr = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(addr)) return setError("Enter a valid email address.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    setBusy(true);
    setError(null);
    const { data, error } = await supabase.auth.signUp({ email: addr, password });
    setBusy(false);
    if (error) return setError(error.message);
    if (data.session) {
      navigate("/welcome", { replace: true }); // onboarding claims the invite
    } else {
      setNotice("Account created. Check your email to confirm, then sign in — your round will be waiting.");
    }
  }

  // Already signed in: don't silently hijack the invite into this account.
  if (session) {
    return (
      <div className="screen fade">
        <div className="pad safe-top" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 16 }}>
          <Logo width={210} />
          <h1 style={{ margin: 0, font: "300 24px var(--sans)", color: "var(--tx)", marginTop: 8 }}>{from} shared a round with you</h1>
          <p style={{ margin: 0, font: "400 15px/1.6 var(--sans)", color: "var(--tx-2)" }}>
            You're signed in as <b style={{ color: "var(--tx)" }}>{session.user.email}</b>. This invite is for{" "}
            <b style={{ color: "var(--tx)" }}>{email0 || "someone else"}</b> — log out to create their account and claim the round.
          </p>
          <button
            className="btn"
            style={{ maxWidth: 300 }}
            onClick={async () => { await signOut(); }}
          >
            Log out & accept invite
          </button>
          <button
            onClick={() => navigate("/")}
            style={{ border: "none", background: "transparent", font: "500 14px var(--sans)", color: "var(--tx-3)", cursor: "pointer" }}
          >
            Go to my dashboard
          </button>
        </div>
      </div>
    );
  }

  // Signed out: create-account form, prefilled + messaged.
  return (
    <div className="screen fade">
      <div className="pad safe-top" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, textAlign: "center" }}>
          <Logo width={230} />
          <div className="card" style={{ padding: "16px 18px", borderRadius: 16, border: "1px solid var(--sand)" }}>
            <p style={{ margin: 0, font: "500 15px/1.55 var(--sans)", color: "var(--tx-2)" }}>
              <b style={{ color: "var(--sand)" }}>{from}</b> shared your recent round score and invited you to join{" "}
              <b style={{ color: "var(--sand)" }}>Back 9 Early Birds</b>. Create your account to claim it.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="field">
            <label className="label" htmlFor="jemail">Email</label>
            <input id="jemail" className="input" type="email" inputMode="email" autoComplete="email"
              value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
          </div>
          <div className="field">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <label className="label" htmlFor="jpw">Choose a password</label>
              <button type="button" onClick={() => setShowPw((s) => !s)} style={{ border: "none", background: "transparent", font: "500 12px var(--sans)", color: "var(--sand)", cursor: "pointer", padding: 0 }}>
                {showPw ? "Hide" : "Show"}
              </button>
            </div>
            <input id="jpw" className="input" type={showPw ? "text" : "password"} autoComplete="new-password"
              placeholder="At least 6 characters" value={password} onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createAccount()} />
          </div>
          <button className="btn" onClick={createAccount} disabled={busy}>
            {busy ? <span className="spin on-dark" /> : "Create account & claim my round"}
          </button>
          {error && <ErrorNote>{error}</ErrorNote>}
          {notice && <p style={{ margin: 0, font: "500 13px/1.5 var(--sans)", color: "var(--sand)", textAlign: "center" }}>{notice}</p>}
          <button onClick={() => navigate("/login")} style={{ border: "none", background: "transparent", font: "500 14px var(--sans)", color: "var(--tx-3)", cursor: "pointer" }}>
            Already a member? Sign in
          </button>
        </div>
      </div>
    </div>
  );
}
