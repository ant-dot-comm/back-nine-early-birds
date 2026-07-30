import type { PublicProfile, Badge } from "../lib/types";
import { PaintingWindow } from "./paint";
import { PAINT, C } from "../lib/paint";
import { personSub } from "../lib/course";

export function badgeEmoji(kind: string): string {
  if (kind === "tourney_winner") return "🏆";
  if (kind.startsWith("rounds_")) return "⛳️";
  if (kind === "bogey_free") return "🎯";
  if (kind === "won_duel") return "🗡️";
  if (kind.startsWith("won_")) return "🥇";
  return "🎖️";
}

export default function ProfileBody({ p, badges }: { p: PublicProfile; badges: Badge[] }) {
  const sub = personSub(p.first_name, p.last_name);
  const since = new Date(p.member_since).toLocaleDateString(undefined, { month: "short", year: "numeric" });
  const name = p.held_name || p.display_name;

  const tiles: { label: string; value: string; tone?: "flag" | "sand" }[] = [
    { label: "GIR", value: p.gir_pct == null ? "—" : `${p.gir_pct}%` },
    { label: "Duels", value: String(p.challenges_won), tone: "sand" },
    { label: "Eagles", value: String(p.eagles), tone: "sand" },
    { label: "Pars", value: String(p.pars) },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <PaintingWindow src={PAINT.leanShadow} height={236} shape="archTall" objectPosition="50% 35%" elevation="e3">
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: 16, background: "linear-gradient(#20261C00,#20261Cf5)" }}>
          <span className="hand" style={{ font: "400 40px/.9 var(--hand)", color: C.cream }}>{name}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 6 }}>
            {p.is_secret && <span style={{ font: "600 9px var(--sans)", letterSpacing: ".1em", textTransform: "uppercase", color: C.cream, background: C.flag, padding: "4px 9px", borderRadius: 20 }}>One of one</span>}
            <span style={{ font: "400 12px var(--sans)", color: C.tx2 }}>{[sub, `member since ${since}`].filter(Boolean).join(" · ")}</span>
          </div>
        </div>
      </PaintingWindow>

      {/* scoring avg + birdies/rounds */}
      <div style={{ display: "grid", gridTemplateColumns: "1.35fr 1fr", gap: 10 }}>
        <div className="surf-paper" style={{ borderRadius: 16, padding: "14px 15px", color: C.ink }}>
          <span style={{ font: "600 9px var(--sans)", letterSpacing: ".14em", textTransform: "uppercase", color: C.ink2 }}>Scoring avg · back 9</span>
          <div className="tnum" style={{ font: "600 46px var(--sans)", lineHeight: 1, marginTop: 4 }}>{p.avg9 == null ? "—" : p.avg9.toFixed(1)}</div>
          <span className="hand" style={{ font: "400 20px var(--hand)", color: C.ink2 }}>{p.rounds} rounds in the books</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="surf-flag" style={{ flex: 1, borderRadius: 16, padding: "12px 14px" }}>
            <span style={{ font: "600 9px var(--sans)", letterSpacing: ".14em", textTransform: "uppercase", color: "#F3D9C9" }}>Birdies</span>
            <div className="tnum" style={{ font: "600 30px var(--sans)", lineHeight: 1.1, color: C.cream }}>{p.birdies}</div>
          </div>
          <div className="surf-panel" style={{ flex: 1, borderRadius: 16, padding: "12px 14px" }}>
            <span style={{ font: "600 9px var(--sans)", letterSpacing: ".14em", textTransform: "uppercase", color: C.tx3 }}>Tourneys won</span>
            <div className="tnum" style={{ font: "600 30px var(--sans)", lineHeight: 1.1, color: C.sand }}>{p.tournaments_won}</div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        {tiles.map((t) => (
          <div key={t.label} className="surf-panel" style={{ flex: 1, borderRadius: 14, padding: "12px 13px" }}>
            <span style={{ font: "600 9px var(--sans)", letterSpacing: ".12em", textTransform: "uppercase", color: C.tx3 }}>{t.label}</span>
            <div className="tnum" style={{ font: "600 24px var(--sans)", lineHeight: 1.15, color: t.tone === "sand" ? C.sand : C.tx }}>{t.value}</div>
          </div>
        ))}
      </div>

      {/* badges rail */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 2 }}>
        <span className="eyebrow">Badges {badges.length > 0 ? `· ${badges.length}` : ""}</span>
        {badges.length === 0 ? (
          <div className="surf-panel" style={{ borderRadius: 14, padding: "18px", textAlign: "center", font: "400 14px var(--sans)", color: C.tx3 }}>No badges yet.</div>
        ) : (
          <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 2 }}>
            {badges.map((b, i) => (
              <div key={i} style={{ flex: "none", width: 78, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, textAlign: "center" }}>
                <span style={{ width: 60, height: 60, borderRadius: "50%", background: b.kind.startsWith("won_") && b.kind !== "won_duel" ? C.paper : b.kind === "tourney_winner" || b.kind === "bogey_free" ? C.flag : C.sand, boxShadow: "0 10px 16px -8px rgba(9,13,7,.75), inset 0 2px 0 rgba(255,255,255,.5)", display: "grid", placeItems: "center", fontSize: 26 }}>{badgeEmoji(b.kind)}</span>
                <span style={{ font: "600 9px var(--sans)", color: C.tx2, lineHeight: 1.15 }}>{b.label}</span>
                {(b.detail || b.value != null) && <span className="hand" style={{ font: "400 15px/.9 var(--hand)", color: C.tx3 }}>{b.detail ?? `${b.value} rounds`}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
