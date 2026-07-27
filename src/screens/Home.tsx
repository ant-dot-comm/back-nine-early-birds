import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { listRecentRounds, getSeasonStats } from "../lib/db";
import type { RoundSummaryRow, SeasonStats } from "../lib/db";
import { Avatar, StatCard, FullSpinner } from "../components/ui";
import { toParLabel } from "../lib/course";
import { formatRoundDate } from "../lib/date";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function Home() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<SeasonStats | null>(null);
  const [rounds, setRounds] = useState<RoundSummaryRow[] | null>(null);

  useEffect(() => {
    getSeasonStats().then(setStats).catch(() => setStats(null));
    listRecentRounds(5).then(setRounds).catch(() => setRounds([]));
  }, []);

  const firstName = (profile?.display_name ?? "there").split(/\s+/)[0];

  return (
    <div className="screen fade">
      {/* brand bar */}
      <div
        className="safe-top"
        style={{
          flex: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "6px 24px 4px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              font: "700 18px var(--sans)",
              letterSpacing: "0.02em",
              color: "var(--green-900)",
            }}
          >
            BACK
          </span>
          <span
            style={{
              width: 27,
              height: 27,
              borderRadius: "50%",
              background: "var(--green-900)",
              color: "var(--gold)",
              font: "700 15px var(--sans)",
              display: "grid",
              placeItems: "center",
            }}
          >
            9
          </span>
        </div>
        <button
          onClick={() => navigate("/account")}
          aria-label="Account"
          style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer" }}
        >
          <Avatar initials={profile?.initials ?? "9"} me size={38} />
        </button>
      </div>

      <div className="scroll">
        <div className="pad" style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div>
            <h1 className="h-serif" style={{ font: "600 30px/1.1 var(--serif)" }}>
              {greeting()}, {firstName}.
            </h1>
            <p style={{ margin: "6px 0 0", font: "400 15px var(--sans)", color: "var(--muted-2)" }}>
              Early birds tee off Saturday at 6:40am.
            </p>
          </div>

          <button
            className="btn"
            style={{ height: 64, fontSize: 18 }}
            onClick={() => navigate("/rounds/new")}
          >
            <span style={{ position: "relative", width: 16, height: 20, display: "inline-block" }}>
              <span
                style={{
                  position: "absolute",
                  left: 2,
                  top: 0,
                  bottom: 0,
                  width: 2,
                  background: "var(--gold)",
                }}
              />
              <span
                style={{
                  position: "absolute",
                  left: 4,
                  top: 1,
                  width: 0,
                  height: 0,
                  borderTop: "5px solid transparent",
                  borderBottom: "5px solid transparent",
                  borderLeft: "11px solid var(--gold)",
                }}
              />
            </span>
            Log a round
          </button>

          <div style={{ display: "flex", gap: 12 }}>
            <StatCard
              label="Birdies this season"
              value={stats ? stats.birdies : "—"}
              accent
            />
            <StatCard label="Rounds played" value={stats ? stats.roundsPlayed : "—"} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
              <h2 className="h-serif" style={{ font: "600 19px var(--serif)" }}>
                Recent rounds
              </h2>
              <Link to="/stats" style={{ font: "500 13px var(--sans)", color: "var(--brass)" }}>
                See all
              </Link>
            </div>

            {rounds === null ? (
              <div style={{ padding: "24px 0" }}>
                <FullSpinner />
              </div>
            ) : rounds.length === 0 ? (
              <EmptyRounds />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {rounds.map((r) => (
                  <RoundRow key={r.round.id} row={r} onClick={() => navigate(`/rounds/${r.round.id}`)} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function RoundRow({ row, onClick }: { row: RoundSummaryRow; onClick: () => void }) {
  const under = row.selfDiff !== null && row.selfDiff < 0;
  return (
    <button
      onClick={onClick}
      className="card"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 16px",
        cursor: "pointer",
        textAlign: "left",
        width: "100%",
      }}
    >
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ font: "600 15px var(--sans)", color: "var(--ink)" }}>
          {formatRoundDate(row.round.played_on)}
        </span>
        <span style={{ font: "400 13px var(--sans)", color: "var(--faint)" }}>
          {row.playerCount} {row.playerCount === 1 ? "player" : "players"} · {row.round.course}
        </span>
      </div>
      {row.selfTotal !== null && (
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span className="tnum" style={{ font: "600 20px var(--sans)", color: "var(--ink)" }}>
            {row.selfTotal}
          </span>
          <span
            style={{
              font: "600 13px var(--sans)",
              color: under ? "var(--brass)" : "var(--faint)",
            }}
          >
            {toParLabel(row.selfDiff!)}
          </span>
        </div>
      )}
    </button>
  );
}

function EmptyRounds() {
  return (
    <div
      className="card"
      style={{
        padding: "26px 20px",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <span style={{ font: "600 16px var(--serif)", color: "var(--green-900)" }}>
        No rounds yet
      </span>
      <span style={{ font: "400 14px var(--sans)", color: "var(--faint)" }}>
        Tap “Log a round” after your next back nine.
      </span>
    </div>
  );
}
