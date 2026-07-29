import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  getSecretRoster, getUnlockedSecrets, listMyChallenges, claimSecret, createChallenge,
} from "../lib/db";
import type { RareName, Challenge } from "../lib/types";
import { TopBar, FullSpinner, ErrorNote } from "../components/ui";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faStar, faLock, faTrophy } from "@fortawesome/free-solid-svg-icons";
import { personSub } from "../lib/course";

export default function RareNames() {
  const { session, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [roster, setRoster] = useState<RareName[] | null>(null);
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set());
  const [mine, setMine] = useState<Challenge[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    getSecretRoster().then(setRoster).catch(() => setRoster([]));
    getUnlockedSecrets().then((u) => setUnlocked(new Set(u))).catch(() => setUnlocked(new Set()));
    listMyChallenges().then(setMine).catch(() => setMine([]));
  }, []);
  useEffect(() => { load(); }, [load]);

  const myId = profile?.id;
  const pendingFor = new Set(
    mine.filter((c) => c.challenger === myId && (c.status === "pending" || c.status === "accepted")).map((c) => c.secret_name)
  );

  async function claim(name: string) {
    if (!session) return;
    setBusy(name); setError(null);
    try {
      await claimSecret(session.user.id, name, profile?.first_name ?? "", profile?.last_name ?? "");
      await refreshProfile();
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't claim that name.");
    } finally { setBusy(null); }
  }
  async function challenge(holderId: string, name: string) {
    setBusy(name); setError(null);
    try {
      await createChallenge(holderId, name);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send the challenge.");
    } finally { setBusy(null); }
  }

  if (roster === null) return <div className="screen"><TopBar title="Rare names" onBack="auto" /><FullSpinner /></div>;

  const held = profile?.display_name_type === "secret" ? profile.display_name : null;
  const unlockedCount = unlocked.size;

  return (
    <div className="screen fade">
      <TopBar title="Rare names" onBack={() => navigate("/account")} />
      <div className="scroll">
        <div className="pad" style={{ display: "flex", flexDirection: "column", gap: 20, paddingTop: 8 }}>
          {held ? (
            <div style={{ background: "linear-gradient(135deg, #e7c877, #cb9f39)", borderRadius: 16, padding: "16px 18px", border: "2px solid #8a6620", display: "flex", alignItems: "center", gap: 14 }}>
              <FontAwesomeIcon icon={faTrophy} style={{ color: "var(--green-900)", fontSize: 22 }} />
              <div style={{ flex: 1 }}>
                <div style={{ font: "700 10px var(--sans)", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--green-900)" }}>You hold</div>
                <div className="h-serif" style={{ font: "700 22px var(--serif)", color: "var(--green-900)" }}>{held}</div>
              </div>
              {(profile?.challenges_won ?? 0) > 0 && (
                <div style={{ textAlign: "right" }}>
                  <div className="tnum" style={{ font: "700 22px var(--sans)", color: "var(--green-900)" }}>{profile?.challenges_won}</div>
                  <div style={{ font: "600 9px var(--sans)", textTransform: "uppercase", letterSpacing: "0.05em", color: "#5c4a1e" }}>duels won</div>
                </div>
              )}
            </div>
          ) : (
            <p style={{ margin: 0, font: "400 14px/1.6 var(--sans)", color: "var(--muted)" }}>
              Ultra-rare names are one-of-a-kind. Claim an unclaimed one you've unlocked, or challenge its holder — winner is decided by the lower score in a round you play together.
            </p>
          )}

          {error && <ErrorNote>{error}</ErrorNote>}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
              <span className="eyebrow">The collection</span>
              <span style={{ font: "400 12px var(--sans)", color: "var(--faint)" }}>{unlockedCount} of {roster.length} unlocked</span>
            </div>

            {roster.map((r) => {
              const isUnlocked = unlocked.has(r.name);
              const mineHold = r.holder === myId;
              const heldByOther = !!r.holder && !mineHold;
              const pending = pendingFor.has(r.name);
              return (
                <div key={r.name} className="card" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", opacity: isUnlocked || r.holder ? 1 : 0.55, border: mineHold ? "1.5px solid var(--brass)" : "1px solid var(--line)" }}>
                  <FontAwesomeIcon icon={isUnlocked || mineHold ? faStar : faLock} style={{ color: mineHold ? "var(--brass)" : isUnlocked ? "var(--label-gold)" : "var(--faint)", fontSize: 13, width: 16 }} />
                  <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                    <span style={{ font: "600 15px var(--sans)", color: "var(--ink)" }}>{r.name}</span>
                    <span style={{ font: "400 12px var(--sans)", color: "var(--faint)" }}>
                      {mineHold ? "Yours" : r.holder ? `Held by ${r.holder_display}${personSub(r.holder_first, r.holder_last) ? ` (${personSub(r.holder_first, r.holder_last)})` : ""}` : isUnlocked ? "Unclaimed" : "Locked"}
                    </span>
                  </div>
                  {mineHold ? (
                    <span className="chip" style={{ fontSize: 10 }}>Yours</span>
                  ) : !isUnlocked ? (
                    <span style={{ font: "500 11px var(--sans)", color: "var(--faint)" }}>Locked</span>
                  ) : pending ? (
                    <span className="chip" style={{ fontSize: 10 }}>Challenge sent</span>
                  ) : heldByOther ? (
                    <button className="btn sm" style={{ height: 38, padding: "0 16px", fontSize: 13 }} disabled={busy === r.name} onClick={() => challenge(r.holder!, r.name)}>
                      {busy === r.name ? <span className="spin on-dark" /> : "Challenge"}
                    </button>
                  ) : (
                    <button className="btn gold sm" style={{ height: 38, padding: "0 16px", fontSize: 13 }} disabled={busy === r.name} onClick={() => claim(r.name)}>
                      {busy === r.name ? <span className="spin" /> : "Claim"}
                    </button>
                  )}
                </div>
              );
            })}
            {unlockedCount === 0 && (
              <p style={{ margin: "4px 0 0", font: "400 13px var(--sans)", color: "var(--faint)", textAlign: "center" }}>
                Play 15 rounds to unlock your first rare names.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
