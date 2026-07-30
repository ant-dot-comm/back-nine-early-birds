import { useCallback, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { saveProfile, claimInvite } from "../lib/db";
import { ErrorNote } from "../components/ui";
import { PaintingWindow } from "../components/paint";
import GolfNameGenerator, { type NameSelection } from "../components/GolfNameGenerator";
import { getPendingInvite, clearPendingInvite } from "../lib/invite";
import { PAINT, C } from "../lib/paint";

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
    if (first.trim().length < 1 || last.trim().length < 1) return setError("Please enter your first and last name.");
    const name = sel?.name?.trim();
    if (!name) return setError("Pick or enter a display name.");
    if (!session) return;
    setBusy(true); setError(null);
    try {
      await saveProfile(session.user.id, { firstName: first, lastName: last, displayName: name, type: sel!.type, parts: sel!.parts, secret: sel!.secret });
      const inv = getPendingInvite();
      if (inv) { try { await claimInvite(inv.token); } catch { /* ignore */ } clearPendingInvite(); }
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
        <div className="pad safe-top" style={{ display: "flex", flexDirection: "column", gap: 18, paddingTop: 20 }}>
          <div>
            <span className="eyebrow">First login · step 2 of 2</span>
            <h1 className="display" style={{ marginTop: 3, fontSize: 29 }}>Nobody plays<br />under their own name.</h1>
          </div>

          <PaintingWindow src={PAINT.teeShot} height={150} shape="lozenge" elevation="e3">
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 22px" }}>
              <span className="hand" style={{ font: "400 26px/1 var(--hand)", color: C.cream, textShadow: "0 2px 10px rgba(16,24,10,.5)" }}>roll for your alter ego —</span>
              <span className="hand" style={{ font: "400 22px/1 var(--hand)", color: C.sand }}>1 in 50 is one-of-one</span>
            </div>
          </PaintingWindow>

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

          <GolfNameGenerator allowSecret previewSecret={params.get("rare") === "1"} onChange={onNameChange} />

          {error && <ErrorNote>{error}</ErrorNote>}
          <button className="btn" onClick={submit} disabled={busy} style={{ marginTop: 2 }}>
            {busy ? <span className="spin on-dark" /> : "Lock it in"}
          </button>
          <p style={{ margin: "0 0 8px", font: "400 12px/1.5 var(--sans)", color: C.tx3, textAlign: "center" }}>
            You can change your display name later — but secret rolls only happen here.
          </p>
        </div>
      </div>
    </div>
  );
}
