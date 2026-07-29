import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getPublicProfile, getPublicBadges } from "../lib/db";
import type { PublicProfile, Badge } from "../lib/types";
import { Avatar, TopBar, FullSpinner } from "../components/ui";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faStar } from "@fortawesome/free-solid-svg-icons";
import { personSub } from "../lib/course";

function badgeEmoji(kind: string): string {
  if (kind.startsWith("rounds_")) return "⛳️";
  if (kind === "bogey_free") return "🎯";
  if (kind === "won_duel") return "🏆";
  if (kind.startsWith("won_")) return "🥇";
  return "🎖️";
}

export default function PlayerProfile() {
  const { id } = useParams<{ id: string }>();
  const [p, setP] = useState<PublicProfile | null | undefined>(undefined);
  const [badges, setBadges] = useState<Badge[]>([]);

  useEffect(() => {
    if (!id) return;
    getPublicProfile(id).then(setP).catch(() => setP(null));
    getPublicBadges(id).then(setBadges).catch(() => setBadges([]));
  }, [id]);

  if (p === undefined) return <div className="screen"><TopBar title="Player" onBack="auto" /><FullSpinner /></div>;
  if (p === null) return <div className="screen"><TopBar title="Player" onBack="auto" /><div className="center-screen"><span style={{ color: "var(--faint)" }}>Player not found.</span></div></div>;

  const sub = personSub(p.first_name, p.last_name);
  const since = new Date(p.member_since).toLocaleDateString(undefined, { month: "short", year: "numeric" });
  const tiles: { label: string; value: string; accent?: boolean }[] = [
    { label: "Rounds", value: String(p.rounds) },
    { label: "9-hole avg", value: p.avg9 == null ? "—" : p.avg9.toFixed(1) },
    { label: "18-hole avg", value: p.avg18 == null ? "—" : p.avg18.toFixed(1) },
    { label: "Birdies", value: String(p.birdies), accent: true },
    { label: "Eagles", value: String(p.eagles), accent: true },
    { label: "Pars", value: String(p.pars) },
    { label: "GIR", value: p.gir_pct == null ? "—" : `${p.gir_pct}%` },
    { label: "Duels won", value: String(p.challenges_won), accent: true },
  ];

  return (
    <div className="screen fade">
      <TopBar title="Player" onBack="auto" />
      <div className="scroll">
        <div className="pad" style={{ display: "flex", flexDirection: "column", gap: 22, paddingTop: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Avatar initials={p.initials} size={64} />
            <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
              <span className="h-serif" style={{ font: "600 24px var(--serif)" }}>{p.display_name}</span>
              {p.is_secret && (
                <span className="chip" style={{ alignSelf: "flex-start", fontSize: 9, letterSpacing: "0.03em", textTransform: "uppercase", padding: "4px 9px" }}>
                  <FontAwesomeIcon icon={faStar} /> Ultra-rare name
                </span>
              )}
              {sub && <span style={{ font: "400 14px var(--sans)", color: "var(--faint)" }}>{sub} · member since {since}</span>}
            </div>
          </div>

          <div>
            <span className="eyebrow">This season</span>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginTop: 8 }}>
              {tiles.map((t) => (
                <div key={t.label} className="card" style={{ padding: "12px 10px", display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ font: "500 10px var(--sans)", letterSpacing: "0.03em", textTransform: "uppercase", color: "var(--faint)" }}>{t.label}</span>
                  <span className="tnum" style={{ font: "600 20px var(--sans)", lineHeight: 1, color: t.accent ? "var(--brass)" : "var(--green-900)" }}>{t.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <span className="eyebrow">Badges {badges.length > 0 ? `· ${badges.length}` : ""}</span>
            {badges.length === 0 ? (
              <div className="card" style={{ padding: "20px 18px", textAlign: "center" }}>
                <span style={{ font: "400 14px var(--sans)", color: "var(--faint)" }}>No badges yet.</span>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {badges.map((b, i) => (
                  <div key={i} className="card" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px" }}>
                    <span style={{ fontSize: 24, flex: "none", width: 30, textAlign: "center" }}>{badgeEmoji(b.kind)}</span>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                      <span style={{ font: "600 15px var(--sans)", color: "var(--ink)" }}>{b.label}</span>
                      {(b.detail || b.value != null) && (
                        <span style={{ font: "400 12px var(--sans)", color: "var(--faint)" }}>
                          {b.detail ?? `${b.value} rounds`}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
