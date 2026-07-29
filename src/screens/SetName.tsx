import { useCallback, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { saveProfile, claimInvite } from "../lib/db";
import { ErrorNote } from "../components/ui";
import GolfNameGenerator, { type NameSelection } from "../components/GolfNameGenerator";
import { getPendingInvite, clearPendingInvite } from "../lib/invite";

export default function SetName() {
  const { session, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const pending = getPendingInvite();
  const [first, setFirst] = useState(pending?.first || params.get("first") || "");
  const [last, setLast] = useState(pending?.last || params.get("last") || "");
  const [sel, setSel] = useState<NameSelection | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onNameChange = useCallback((s: NameSelection) => setSel(s), []);

  async function submit() {
    if (first.trim().length < 1 || last.trim().length < 1) {
      return setError("Please enter your first and last name.");
    }
    const name = sel?.name?.trim();
    if (!name) return setError("Pick or enter a display name.");
    if (!session) return;
    setBusy(true);
    setError(null);
    try {
      await saveProfile(session.user.id, {
        firstName: first,
        lastName: last,
        displayName: name,
        type: sel!.type,
        parts: sel!.parts,
        secret: sel!.secret,
      });
      const inv = getPendingInvite();
      if (inv) {
        try {
          await claimInvite(inv.token);
        } catch {
          /* already claimed or invalid — ignore */
        }
        clearPendingInvite();
      }
      await refreshProfile();
      navigate("/", { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <div className="screen fade">
      <div className="scroll">
        <div className="pad safe-top" style={{ display: "flex", flexDirection: "column", gap: 16, paddingTop: 36 }}>
          <div>
            <h1 className="h-serif" style={{ font: "600 30px/1.15 var(--serif)" }}>Welcome to the group</h1>
            <p style={{ margin: "6px 0 0", font: "400 15px/1.5 var(--sans)", color: "var(--muted)" }}>
              Build your own golf alter ego or roll the dice for a random one. Every reroll here has a tiny chance of uncovering an <b style={{ color: "var(--brass)" }}>ultra-rare secret name</b> — only discoverable during signup, so choose carefully.
            </p>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <div className="field" style={{ flex: 1 }}>
              <label className="label">First name</label>
              <input className="input" autoFocus value={first} onChange={(e) => setFirst(e.target.value)} placeholder="Antoni" />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label className="label">Last name</label>
              <input className="input" value={last} onChange={(e) => setLast(e.target.value)} placeholder="Commodore" />
            </div>
          </div>

          <div className="field">
            <label className="label">Display name</label>
            <GolfNameGenerator allowSecret onChange={onNameChange} />
          </div>

          {error && <ErrorNote>{error}</ErrorNote>}
          <button className="btn" onClick={submit} disabled={busy} style={{ marginTop: 4 }}>
            {busy ? <span className="spin on-dark" /> : "Continue"}
          </button>
          <p style={{ margin: "0 0 8px", font: "400 12px/1.5 var(--sans)", color: "var(--faint)", textAlign: "center" }}>
            You can change your display name later — but secret rolls are only available here.
          </p>
        </div>
      </div>
    </div>
  );
}
