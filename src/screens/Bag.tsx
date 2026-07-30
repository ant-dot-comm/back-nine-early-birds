import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getSecretRoster, createChallenge, getPublicBadges } from "../lib/db";
import type { RareName, Badge } from "../lib/types";
import { FullSpinner } from "../components/ui";
import { PaintingWindow, WaveDivider } from "../components/paint";
import { badgeEmoji } from "../components/ProfileBody";
import { PAINT, C } from "../lib/paint";
import { personSub } from "../lib/course";

const PLATE_BG = [C.moss, C.panel, C.fairway]; // rotating nameplate colours for held names

export default function Bag() {
  const { profile } = useAuth();
  const myId = profile?.id;
  const [tab, setTab] = useState<"names" | "badges">("names");
  const [roster, setRoster] = useState<RareName[] | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  function load() {
    getSecretRoster().then(setRoster).catch(() => setRoster([]));
    if (myId) getPublicBadges(myId).then(setBadges).catch(() => setBadges([]));
  }
  useEffect(load, [myId]);

  async function challenge(holderId: string, name: string) {
    setBusy(name); setNote(null);
    try { await createChallenge(holderId, name); setNote(`Challenge sent for ${name}.`); }
    catch (e) { setNote(e instanceof Error ? e.message.replace(/^.*: /, "") : "Couldn't send that challenge."); }
    finally { setBusy(null); }
  }

  const held = roster?.find((r) => r.holder === myId) ?? null;

  return (
    <div className="screen fade">
      <div className="safe-top" style={{ flex: "none", display: "flex", alignItems: "center", gap: 22, padding: "8px 22px 12px" }}>
        {(["names", "badges"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{ border: "none", background: "transparent", cursor: "pointer", font: "600 15px var(--sans)", color: tab === t ? C.tx : C.tx3, borderBottom: tab === t ? `2px solid ${C.flag}` : "2px solid transparent", padding: "0 0 5px" }}>{t === "names" ? "Names" : "Badges"}</button>
        ))}
      </div>

      <div className="scroll">
        <div className="pad pad-dock" style={{ paddingTop: 0 }}>
          {tab === "names" ? (
            roster === null ? <FullSpinner /> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {held ? (
                  <PaintingWindow src={PAINT.walkRed} height={186} shape="archWide" objectPosition="70% 50%" elevation="e3">
                    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: 16, background: "linear-gradient(#20261C00,#20261Cf2)" }}>
                      <span style={{ font: "600 9px var(--sans)", letterSpacing: ".18em", textTransform: "uppercase", color: C.sand }}>You currently hold</span>
                      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
                        <span className="hand" style={{ font: "400 44px/.9 var(--hand)", color: C.cream }}>{held.name}</span>
                        <span style={{ font: "600 11px var(--sans)", color: C.cream, background: C.flag, padding: "5px 10px", borderRadius: 20 }}>{profile?.challenges_won ?? 0} duels won</span>
                      </div>
                    </div>
                  </PaintingWindow>
                ) : (
                  <div className="surf-panel" style={{ borderRadius: 16, padding: "18px", textAlign: "center" }}>
                    <span className="hand" style={{ font: "400 26px var(--hand)", color: C.tx2 }}>no rare name yet — roll or win one</span>
                  </div>
                )}

                <WaveDivider color={C.terrain} height={38} />
                <div style={{ background: C.terrain, margin: "-14px -20px 0", padding: "4px 20px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "0 2px" }}>
                    <span className="eyebrow">The whole bag</span>
                    <span style={{ font: "400 12px var(--sans)", color: C.tx3 }}>{roster.filter((r) => r.holder).length} of {roster.length} claimed</span>
                  </div>
                  {note && <span style={{ font: "500 12px var(--sans)", color: C.sand, padding: "0 2px" }}>{note}</span>}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {roster.map((r, i) => {
                      const mine = r.holder === myId;
                      const held2 = !!r.holder && !mine;
                      const bg = mine ? C.sand : r.holder ? PLATE_BG[i % PLATE_BG.length] : C.flag;
                      const ink = bg === C.sand ? C.ink : C.cream;
                      return (
                        <div key={r.name} style={{ position: "relative", minHeight: 118, borderRadius: 14, overflow: "hidden", padding: 12, display: "flex", flexDirection: "column", justifyContent: "flex-end", background: bg }}>
                          <span className="hand" style={{ font: "400 26px/.95 var(--hand)", color: ink }}>{r.name}</span>
                          <span style={{ font: "600 10px var(--sans)", color: ink, opacity: .8 }}>{mine ? "yours" : r.holder ? `held by ${r.holder_display}${personSub(r.holder_first, r.holder_last) ? ` · ${personSub(r.holder_first, r.holder_last)}` : ""}` : "unclaimed — roll for it"}</span>
                          {held2 && <button onClick={() => challenge(r.holder!, r.name)} disabled={busy === r.name} style={{ position: "absolute", top: 10, right: 10, height: 28, padding: "0 12px", borderRadius: 14, border: "none", background: "rgba(18,22,15,.5)", color: C.cream, font: "600 11px var(--sans)", cursor: "pointer" }}>{busy === r.name ? "…" : "Challenge"}</button>}
                        </div>
                      );
                    })}
                  </div>
                  <p style={{ margin: "2px 4px 0", font: "400 21px var(--hand)", color: C.tx3, textAlign: "center" }} className="hand">one holder per name — win it in a round, or lose it</p>
                </div>
              </div>
            )
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingTop: 12 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <span className="tnum" style={{ font: "600 38px var(--sans)", color: C.tx }}>{badges.length}</span>
                <span className="hand" style={{ font: "400 22px var(--hand)", color: C.tx3 }}>in the bag</span>
              </div>
              {badges.length === 0 ? (
                <div className="surf-panel" style={{ borderRadius: 14, padding: "22px", textAlign: "center", font: "400 14px var(--sans)", color: C.tx3 }}>No badges yet — go earn one.</div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "16px 10px" }}>
                  {badges.map((b, i) => (
                    <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center" }}>
                      <span style={{ width: 80, height: 80, borderRadius: "50%", background: b.kind === "tourney_winner" || b.kind === "bogey_free" ? C.flag : b.kind.startsWith("won_") && b.kind !== "won_duel" ? C.paper : C.sand, boxShadow: "0 12px 20px -10px rgba(9,13,7,.8), inset 0 2px 0 rgba(255,255,255,.5)", display: "grid", placeItems: "center", fontSize: 32 }}>{badgeEmoji(b.kind)}</span>
                      <span style={{ font: "600 11px var(--sans)", color: C.tx, lineHeight: 1.15 }}>{b.label}</span>
                      <span className="hand" style={{ font: "400 17px/.9 var(--hand)", color: C.tx3 }}>{b.detail ?? (b.value != null ? `${b.value} rounds` : "")}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
