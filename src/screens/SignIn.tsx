import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Logo, ErrorNote } from "../components/ui";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  async function send() {
    const addr = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(addr)) {
      setError("Enter a valid email address.");
      return;
    }
    setSending(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: addr,
      options: { emailRedirectTo: window.location.origin },
    });
    setSending(false);
    if (error) {
      setError(error.message);
      return;
    }
    navigate("/check-email", { state: { email: addr } });
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
            gap: 10,
          }}
        >
          <Logo width={252} />
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
              onKeyDown={(e) => e.key === "Enter" && send()}
            />
          </div>
          <button className="btn" onClick={send} disabled={sending}>
            {sending ? <span className="spin on-dark" /> : "Send magic link"}
          </button>
          {error && <ErrorNote>{error}</ErrorNote>}
          <p
            style={{
              textAlign: "center",
              font: "400 13px/1.5 var(--sans)",
              color: "var(--faint)",
              margin: "6px 0 0",
            }}
          >
            No password. We'll email you a one-tap link to sign in.
          </p>
        </div>
      </div>
    </div>
  );
}
