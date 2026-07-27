import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { ErrorNote } from "../components/ui";

export default function CheckEmail() {
  const location = useLocation();
  const navigate = useNavigate();
  const email = (location.state as { email?: string } | null)?.email;
  const [resent, setResent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Deep-linked here without an email in state -> nothing to resend to.
  if (!email) {
    navigate("/login", { replace: true });
    return null;
  }

  async function resend() {
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email!,
      options: { emailRedirectTo: window.location.origin },
    });
    setBusy(false);
    if (error) setError(error.message);
    else setResent(true);
  }

  return (
    <div className="screen fade">
      <div
        className="pad safe-top"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          gap: 18,
        }}
      >
        <div
          style={{
            width: 88,
            height: 88,
            borderRadius: 26,
            background: "#eee0c2",
            display: "grid",
            placeItems: "center",
          }}
        >
          <span
            style={{
              position: "relative",
              width: 44,
              height: 32,
              border: "2.5px solid var(--green-900)",
              borderRadius: 6,
              overflow: "hidden",
              display: "block",
            }}
          >
            <span
              style={{
                position: "absolute",
                top: -3,
                left: "50%",
                transform: "translateX(-50%)",
                width: 0,
                height: 0,
                borderLeft: "22px solid transparent",
                borderRight: "22px solid transparent",
                borderTop: "20px solid var(--green-900)",
              }}
            />
          </span>
        </div>

        <h2 className="h-serif" style={{ font: "600 27px var(--serif)", marginTop: 6 }}>
          Check your email
        </h2>
        <p style={{ margin: 0, font: "400 16px/1.6 var(--sans)", color: "var(--muted)" }}>
          We sent a magic link to
          <br />
          <b style={{ color: "var(--ink)", fontWeight: 600 }}>{email}</b>.
          <br />
          Tap it on this phone to sign in.
        </p>

        <button className="btn ghost sm" onClick={resend} disabled={busy}>
          {busy ? <span className="spin" /> : resent ? "Link sent again" : "Resend link"}
        </button>
        {error && <ErrorNote>{error}</ErrorNote>}
        <button
          onClick={() => navigate("/login")}
          style={{
            border: "none",
            background: "transparent",
            font: "500 14px var(--sans)",
            color: "var(--faint)",
            cursor: "pointer",
          }}
        >
          Use a different email
        </button>
      </div>
    </div>
  );
}
