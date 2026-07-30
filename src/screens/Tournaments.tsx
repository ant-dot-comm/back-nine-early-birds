import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { listTournaments } from "../lib/db";
import type { Tournament } from "../lib/types";
import { TopBar, FullSpinner } from "../components/ui";
import { modeLabel } from "../lib/course";
import { C } from "../lib/paint";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrophy, faPlus } from "@fortawesome/free-solid-svg-icons";

export function scoringLabel(s: string): string {
  return s === "average" ? "Average score" : s === "single_best" ? "Best single round" : "Total strokes";
}

export function TournamentRow({ t, meId }: { t: Tournament; meId?: string }) {
  const done = t.status === "completed";
  const iWon = done && t.winner === meId;
  return (
    <Link to={`/tournaments/${t.id}`} className="surf-panel" style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", textDecoration: "none", borderRadius: 14, border: iWon ? `1.5px solid ${C.sand}` : "none" }}>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
        <span style={{ font: "600 16px var(--sans)", color: C.tx, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.name}</span>
        <span style={{ font: "400 12px var(--sans)", color: C.tx3 }}>{modeLabel(t.mode)} · {t.rounds_required} rounds · {t.participant_count} {t.participant_count === 1 ? "player" : "players"}</span>
      </div>
      {done ? (
        <span style={{ display: "flex", alignItems: "center", gap: 6, font: "600 12px var(--sans)", color: C.sand }}><FontAwesomeIcon icon={faTrophy} style={{ fontSize: 12 }} />{t.winner_display ? t.winner_display.split(/\s+/)[0] : "Done"}</span>
      ) : t.am_in ? (
        <span className="tnum" style={{ font: "600 13px var(--sans)", color: t.my_rounds_done >= t.rounds_required ? C.sand : C.tx }}>{t.my_rounds_done}/{t.rounds_required}</span>
      ) : (
        <span style={{ font: "500 12px var(--sans)", color: C.tx3 }}>Active</span>
      )}
    </Link>
  );
}

export default function Tournaments() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Tournament[] | null>(null);
  useEffect(() => { listTournaments().then(setRows).catch(() => setRows([])); }, []);
  const active = (rows ?? []).filter((t) => t.status === "active");
  const past = (rows ?? []).filter((t) => t.status !== "active");

  return (
    <div className="screen fade">
      <TopBar title="Tournaments" onBack="auto" />
      <div className="scroll">
        <div className="pad" style={{ display: "flex", flexDirection: "column", gap: 22, paddingTop: 4 }}>
          <button className="btn flag" style={{ height: 54 }} onClick={() => navigate("/tournaments/new")}><FontAwesomeIcon icon={faPlus} style={{ fontSize: 15 }} /> New tournament</button>
          {rows === null ? <div style={{ padding: "24px 0" }}><FullSpinner /></div>
          : rows.length === 0 ? (
            <div className="surf-panel" style={{ borderRadius: 16, padding: "26px 20px", textAlign: "center", display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 30 }}>🏆</span>
              <span style={{ font: "600 16px var(--sans)", color: C.tx }}>No tournaments yet</span>
              <span style={{ font: "400 13px var(--sans)", color: C.tx3 }}>Start one, add your crew, and play your rounds whenever.</span>
            </div>
          ) : (
            <>
              {active.length > 0 && <Section title="Active">{active.map((t) => <TournamentRow key={t.id} t={t} />)}</Section>}
              {past.length > 0 && <Section title="Past">{past.map((t) => <TournamentRow key={t.id} t={t} />)}</Section>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <span className="eyebrow">{title}</span>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{children}</div>
    </div>
  );
}
