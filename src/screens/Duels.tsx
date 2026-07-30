import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { listMyChallenges, respondChallenge, startChallengeRound, cancelChallenge } from "../lib/db";
import type { Challenge } from "../lib/types";
import { TopBar, FullSpinner } from "../components/ui";
import { PAINT, C } from "../lib/paint";

export default function Duels() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const myId = profile?.id;
  const [ch, setCh] = useState<Challenge[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  function load() { listMyChallenges().then(setCh).catch(() => setCh([])); }
  useEffect(load, []);

  async function respond(id: string, ok: boolean) { setBusy(id); try { await respondChallenge(id, ok); load(); } finally { setBusy(null); } }
  async function start(id: string) { setBusy(id); try { const r = await startChallengeRound(id, "back9"); navigate(`/rounds/${r}/score`); } catch { setBusy(null); } }
  async function cancel(id: string) { setBusy(id); try { await cancelChallenge(id); load(); } finally { setBusy(null); } }

  if (ch === null) return <div className="screen"><TopBar title="Duels" onBack="auto" /><FullSpinner /></div>;

  const incoming = ch.filter((c) => c.status === "pending" && c.defender === myId);
  const outgoing = ch.filter((c) => c.status === "pending" && c.challenger === myId);
  const live = ch.filter((c) => c.status === "accepted" || c.status === "in_round");
  const settled = ch.filter((c) => c.status === "settled");
  const feature = incoming[0] ?? live[0];

  return (
    <div className="screen fade">
      <div className="safe-top" style={{ flex: "none", display: "flex", alignItems: "center", gap: 10, padding: "6px 20px 8px" }}>
        <button aria-label="Back" onClick={() => navigate(-1)} style={{ width: 34, height: 34, borderRadius: "50%", border: `1px solid ${C.line}`, background: "transparent", display: "grid", placeItems: "center", cursor: "pointer" }}>
          <span style={{ width: 8, height: 8, borderLeft: `2px solid ${C.tx}`, borderBottom: `2px solid ${C.tx}`, transform: "rotate(45deg)", marginLeft: 3 }} />
        </button>
        <div><h1 style={{ margin: 0, font: "300 27px var(--sans)", color: C.tx }}>Duels</h1><span className="hand" style={{ font: "400 22px var(--hand)", color: C.tx3 }}>names change hands out here</span></div>
      </div>

      <div className="scroll">
        <div className="pad" style={{ paddingTop: 4, display: "flex", flexDirection: "column", gap: 16 }}>
          {feature && (() => {
            const iChallenger = feature.challenger === myId;
            const mine = { name: iChallenger ? feature.challenger_display : feature.defender_display, side: iChallenger ? "Challenger" : "Defending" };
            const them = { name: iChallenger ? feature.defender_display : feature.challenger_display, side: iChallenger ? "Defending" : "Challenger" };
            return (
              <div style={{ position: "relative", height: 250, borderRadius: "110px 110px 26px 26px", overflow: "hidden", boxShadow: "0 20px 36px -16px rgba(9,13,7,.82), inset 0 1px 0 rgba(233,223,198,.11)", display: "flex" }}>
                <div style={{ flex: 1, position: "relative" }}><img src={PAINT.swingDark} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "55% 45%" }} /><div style={{ position: "absolute", left: 14, bottom: 14 }}><div style={{ font: "600 9px var(--sans)", letterSpacing: ".16em", textTransform: "uppercase", color: C.sand }}>{them.side}</div><div style={{ font: "600 17px var(--sans)", color: C.cream }}>{them.name}</div></div></div>
                <div style={{ flex: 1, position: "relative" }}><img src={PAINT.teeShot} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "40% 50%" }} /><div style={{ position: "absolute", right: 14, bottom: 14, textAlign: "right" }}><div style={{ font: "600 9px var(--sans)", letterSpacing: ".16em", textTransform: "uppercase", color: C.sand }}>{mine.side}</div><div style={{ font: "600 17px var(--sans)", color: C.cream }}>You</div><div className="hand" style={{ font: "400 22px/.95 var(--hand)", color: C.cream }}>{feature.secret_name}</div></div></div>
                <span style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: 52, height: 52, borderRadius: "50%", background: C.shade, color: C.sand, font: "600 14px var(--sans)", display: "grid", placeItems: "center" }}>vs</span>
              </div>
            );
          })()}

          {incoming.map((c) => (
            <div key={c.id} className="surf-flag" style={{ borderRadius: 16, padding: "15px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
              <span style={{ font: "400 15px/1.5 var(--sans)", color: C.cream }}>Lower score in a round you both play keeps <b style={{ fontWeight: 600 }}>{c.secret_name}</b>.</span>
              <div style={{ display: "flex", gap: 9 }}>
                <button className="btn sm" style={{ flex: 1, height: 44, background: C.cream }} onClick={() => respond(c.id, true)} disabled={busy === c.id}>Accept the duel</button>
                <button onClick={() => respond(c.id, false)} disabled={busy === c.id} style={{ height: 44, padding: "0 18px", border: "1px solid #E9C6B8", borderRadius: 22, background: "transparent", color: "#F3D9C9", font: "600 14px var(--sans)", cursor: "pointer" }}>Decline</button>
              </div>
            </div>
          ))}

          {live.length > 0 && (
            <Section title="Live now">
              {live.map((c) => {
                const other = c.challenger === myId ? c.defender_display : c.challenger_display;
                const iScore = c.scorekeeper === myId;
                return (
                  <div key={c.id} className="surf-panel" style={{ borderRadius: 14, padding: "13px 15px", display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ flex: 1 }}><div style={{ font: "600 14px var(--sans)", color: C.tx }}>You vs {other} · <span style={{ color: C.sand }}>{c.secret_name}</span></div><div style={{ font: "400 11px var(--sans)", color: C.tx3 }}>{c.status === "in_round" ? (iScore ? "you're keeping score" : "they're keeping score") : "start when you're together"}</div></div>
                    {c.status === "accepted" ? <button className="btn sand sm" style={{ height: 38 }} onClick={() => start(c.id)} disabled={busy === c.id}>Start</button>
                    : iScore && c.round_id ? <button className="btn sm" style={{ height: 38 }} onClick={() => navigate(`/rounds/${c.round_id}/score`)}>Score</button> : null}
                  </div>
                );
              })}
            </Section>
          )}

          {outgoing.length > 0 && (
            <Section title="Sent">
              {outgoing.map((c) => (
                <div key={c.id} className="surf-panel" style={{ borderRadius: 14, padding: "13px 15px", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ flex: 1 }}><div style={{ font: "600 14px var(--sans)", color: C.tx }}>{c.defender_display} · <span style={{ color: C.sand }}>{c.secret_name}</span></div><div style={{ font: "400 11px var(--sans)", color: C.tx3 }}>waiting on their answer</div></div>
                  <button onClick={() => cancel(c.id)} disabled={busy === c.id} style={{ border: "none", background: "transparent", color: C.tx3, font: "500 12px var(--sans)", cursor: "pointer" }}>Cancel</button>
                </div>
              ))}
            </Section>
          )}

          {settled.length > 0 && (
            <Section title="Settled">
              {settled.map((c) => {
                const iWon = c.winner === myId;
                const other = c.challenger === myId ? c.defender_display : c.challenger_display;
                return (
                  <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 2px", borderBottom: `1px solid ${C.line2}` }}>
                    <span style={{ width: 26, height: 26, borderRadius: "50%", background: iWon ? C.flag : "#3D452F", color: iWon ? C.cream : C.tx3, font: "600 11px var(--sans)", display: "grid", placeItems: "center" }}>{iWon ? "W" : "L"}</span>
                    <div style={{ flex: 1 }}><div style={{ font: "600 14px var(--sans)", color: C.tx }}>{iWon ? "Took" : "Lost"} {c.secret_name} {iWon ? "from" : "to"} {other}</div></div>
                  </div>
                );
              })}
            </Section>
          )}

          {ch.length === 0 && <div className="surf-panel" style={{ borderRadius: 14, padding: "24px", textAlign: "center", font: "400 14px var(--sans)", color: C.tx3 }}>No duels yet — challenge a name holder from the Bag.</div>}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div><span className="eyebrow" style={{ display: "block", marginBottom: 10 }}>{title}</span><div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{children}</div></div>
  );
}
