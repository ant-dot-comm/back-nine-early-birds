import { useState } from "react";
import type { Player, RoundMode } from "../lib/types";
import { createInvite, sendInviteEmail, inviteLink } from "../lib/db";
import { parTotalFor, toParLabel } from "../lib/course";
import { ErrorNote } from "./ui";

export default function ShareInviteModal({
  player,
  roundId,
  mode,
  playedOn,
  course,
  inviterDisplay,
  scores,
  onClose,
}: {
  player: Player;
  roundId: string;
  mode: RoundMode;
  playedOn: string;
  course: string;
  inviterDisplay: string;
  scores: { hole: number; par: number; strokes: number; gir: boolean }[];
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [emailed, setEmailed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = scores.reduce((s, x) => s + x.strokes, 0);
  const diff = total - parTotalFor(scores.map((s) => s.hole));

  async function send() {
    const addr = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(addr)) {
      return setError("Enter a valid email address.");
    }
    setBusy(true);
    setError(null);
    try {
      const token = await createInvite({
        roundId,
        playerId: player.id,
        email: addr,
        inviterDisplay,
        playerName: player.name,
        mode,
        playedOn,
        course,
        scores,
      });
      const [first, ...rest] = player.name.trim().split(/\s+/);
      setLink(inviteLink(token, first ?? "", rest.join(" ")));
      // Best-effort email; if the mailer isn't set up, the link still works.
      try {
        await sendInviteEmail(token);
        setEmailed(true);
      } catch {
        setEmailed(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the invite.");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(20,25,12,.45)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="fade"
        style={{ width: "100%", maxWidth: "var(--maxw)", background: "var(--sand)", borderRadius: "24px 24px 0 0", padding: "22px 22px calc(26px + env(safe-area-inset-bottom))", display: "flex", flexDirection: "column", gap: 14 }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 className="h-serif" style={{ font: "600 20px var(--serif)" }}>Share {player.name}'s round</h2>
          <button onClick={onClose} style={{ border: "none", background: "transparent", font: "500 14px var(--sans)", color: "var(--muted-2)", cursor: "pointer" }}>Close</button>
        </div>

        <div className="card" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px" }}>
          <div style={{ flex: 1 }}>
            <div style={{ font: "600 15px var(--sans)", color: "var(--ink)" }}>{player.name}</div>
            <div style={{ font: "400 12px var(--sans)", color: "var(--faint)" }}>{course}</div>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span className="tnum" style={{ font: "600 22px var(--sans)", color: "var(--ink)" }}>{total}</span>
            <span style={{ font: "600 13px var(--sans)", color: diff < 0 ? "var(--brass)" : "var(--faint)" }}>{toParLabel(diff)}</span>
          </div>
        </div>

        {!link ? (
          <>
            <div className="field">
              <label className="label">Their email</label>
              <input
                className="input"
                type="email"
                inputMode="email"
                autoFocus
                placeholder="friend@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
              />
            </div>
            <p style={{ margin: 0, font: "400 13px/1.5 var(--sans)", color: "var(--faint)" }}>
              We'll send {player.name.split(/\s+/)[0]} this score and an invite to join Back 9. When they sign up, this round lands in their profile automatically.
            </p>
            {error && <ErrorNote>{error}</ErrorNote>}
            <button className="btn" onClick={send} disabled={busy}>
              {busy ? <span className="spin on-dark" /> : "Send invite"}
            </button>
          </>
        ) : (
          <>
            <p style={{ margin: 0, font: "500 14px/1.5 var(--sans)", color: "var(--green-700)" }}>
              {emailed
                ? `Invite emailed to ${email}. `
                : "Invite created. Email isn't set up yet — copy this link and send it however you like:"}
            </p>
            <div className="card" style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px" }}>
              <span style={{ flex: 1, font: "400 12px var(--sans)", color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{link}</span>
              <button className="btn sm" style={{ height: 40 }} onClick={copy}>{copied ? "Copied" : "Copy"}</button>
            </div>
            <button className="btn ghost" onClick={onClose}>Done</button>
          </>
        )}
      </div>
    </div>
  );
}
