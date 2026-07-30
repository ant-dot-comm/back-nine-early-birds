import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  listRecentRounds, listDraftRounds, listPendingShares, acceptShare, dismissShare,
  listMyChallenges, respondChallenge, startChallengeRound, listTournaments, deleteRound,
} from "../lib/db";
import type { RoundSummaryRow } from "../lib/db";
import type { ScoreShare, Challenge, Tournament } from "../lib/types";
import { Logo, FullSpinner } from "../components/ui";
import { PaintingWindow, WaveDivider } from "../components/paint";
import { PAINT, C, ELEV, veil } from "../lib/paint";
import { toParLabel, modeLabel } from "../lib/course";
import { formatRoundDate } from "../lib/date";

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export default function Home() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const myId = profile?.id;
  const [rounds, setRounds] = useState<RoundSummaryRow[] | null>(null);
  const [drafts, setDrafts] = useState<RoundSummaryRow[]>([]);
  const [shares, setShares] = useState<ScoreShare[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  function load() {
    listRecentRounds(6).then(setRounds).catch(() => setRounds([]));
    listDraftRounds().then(setDrafts).catch(() => setDrafts([]));
    listPendingShares().then(setShares).catch(() => setShares([]));
    listMyChallenges().then(setChallenges).catch(() => setChallenges([]));
    listTournaments().then(setTournaments).catch(() => setTournaments([]));
  }
  useEffect(load, []);

  const first = profile?.first_name?.trim() || (profile?.display_name ?? "there").split(/\s+/)[0];
  const incoming = challenges.filter((c) => c.status === "pending" && c.defender === myId);
  const accepted = challenges.filter((c) => c.status === "accepted");
  const inRound = challenges.filter((c) => c.status === "in_round");
  const myTourneys = tournaments.filter((t) => t.am_in && t.status === "active");

  async function respondChal(id: string, accept: boolean) { setBusy(id); try { await respondChallenge(id, accept); load(); } finally { setBusy(null); } }
  async function startChal(id: string) { setBusy(id); try { const r = await startChallengeRound(id, "back9"); navigate(`/rounds/${r}/score`); } catch { setBusy(null); } }
  async function accept(id: string) { setBusy(id); try { const r = await acceptShare(id); navigate(`/rounds/${r}`); } finally { setBusy(null); } }
  async function dismiss(id: string) { setBusy(id); try { await dismissShare(id); load(); } finally { setBusy(null); } }
  async function delDraft(id: string) { setBusy(id); try { await deleteRound(id); load(); } finally { setBusy(null); } }

  return (
    <div className="screen fade">
      <div className="scroll">
        <div className="pad pad-dock safe-top" style={{ paddingTop: 6 }}>
          {/* header */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "0 2px 14px" }}>
            <div>
              <h1 className="display" style={{ fontSize: 27 }}>{greeting()}, {first}.</h1>
              {profile?.display_name && <span className="hand" style={{ font: "400 26px var(--hand)", color: C.sand }}>aka {profile.display_name}</span>}
            </div>
            <Link to="/me" style={{ textDecoration: "none" }}><span className="avatar me" style={{ width: 38, height: 38, fontSize: 13 }}>{profile?.initials ?? "9"}</span></Link>
          </div>

          {/* log-a-round hero */}
          <PaintingWindow src={PAINT.cart} height={264} shape="arch" elevation="e3">
            <span style={{ position: "absolute", left: 0, right: 0, top: 16, textAlign: "center", font: "600 9px var(--sans)", letterSpacing: ".18em", textTransform: "uppercase", color: C.cream }}>Mission Trails · your tee</span>
            <div className="surf-panel" style={{ position: "absolute", left: 14, right: 14, bottom: 14, borderRadius: 16, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ font: "600 16px var(--sans)", color: C.tx }}>Ready when you are</div>
                <div style={{ font: "400 12px var(--sans)", color: C.tx3 }}>Back nine or the full 18</div>
              </div>
              <button className="btn flag sm" style={{ height: 46, padding: "0 20px" }} onClick={() => navigate("/rounds/new")}>Log it</button>
            </div>
          </PaintingWindow>

          <WaveDivider color={C.terrain} height={42} />
          <div style={{ background: C.terrain, margin: "0 -20px", padding: "4px 20px 8px", display: "flex", flexDirection: "column", gap: 22 }}>

            {/* incoming duels */}
            {incoming.length > 0 && (
              <Section title="Open challenge" note={`${incoming.length} waiting`}>
                {incoming.map((c) => (
                  <div key={c.id} className="surf-panel" style={{ borderRadius: 16, padding: "15px 17px", display: "flex", flexDirection: "column", gap: 12 }}>
                    <span style={{ font: "400 15px/1.5 var(--sans)", color: C.tx }}><b style={{ fontWeight: 600 }}>{c.challenger_display}</b> wants <b style={{ color: C.sand }}>{c.secret_name}</b>. Lower score in a round together keeps it.</span>
                    <div style={{ display: "flex", gap: 9 }}>
                      <button className="btn sand sm" style={{ flex: 1, height: 42 }} onClick={() => respondChal(c.id, true)} disabled={busy === c.id}>{busy === c.id ? <span className="spin on-dark" /> : "Accept"}</button>
                      <button className="btn ghost sm" style={{ height: 42 }} onClick={() => respondChal(c.id, false)} disabled={busy === c.id}>Not today</button>
                    </div>
                  </div>
                ))}
              </Section>
            )}

            {/* accepted / in-round duels */}
            {(accepted.length > 0 || inRound.length > 0) && (
              <Section title="Duels in play">
                {accepted.map((c) => {
                  const other = c.challenger === myId ? c.defender_display : c.challenger_display;
                  return (
                    <Row key={c.id} title={`You vs ${other}`} sub={`${c.secret_name} · start when you're together`}
                      action={<button className="btn sand sm" style={{ height: 38 }} onClick={() => startChal(c.id)} disabled={busy === c.id}>{busy === c.id ? "…" : "Start"}</button>} />
                  );
                })}
                {inRound.map((c) => {
                  const other = c.challenger === myId ? c.defender_display : c.challenger_display;
                  const iScore = c.scorekeeper === myId;
                  return (
                    <Row key={c.id} title={`You vs ${other} · in play`} sub={iScore ? "you're keeping score" : "they're keeping score"}
                      action={iScore && c.round_id ? <button className="btn sm" style={{ height: 38 }} onClick={() => navigate(`/rounds/${c.round_id}/score`)}>Score</button> : undefined} />
                  );
                })}
              </Section>
            )}

            {/* shared with you */}
            {shares.length > 0 && (
              <Section title="Shared with you">
                {shares.map((s) => (
                  <div key={s.id} className="surf-panel" style={{ borderRadius: 14, padding: "13px 15px", display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ font: "600 14px var(--sans)", color: C.tx }}>{s.from_display ?? "A friend"} sent your card</div>
                      <div style={{ font: "400 11px var(--sans)", color: C.tx3 }}>{formatRoundDate(s.played_on)} · {modeLabel(s.mode)}</div>
                    </div>
                    <button className="btn sand sm" style={{ height: 36 }} onClick={() => accept(s.id)} disabled={busy === s.id}>Add</button>
                    <button onClick={() => dismiss(s.id)} disabled={busy === s.id} style={{ border: "none", background: "transparent", color: C.tx3, font: "500 12px var(--sans)", cursor: "pointer" }}>Skip</button>
                  </div>
                ))}
              </Section>
            )}

            {/* drafts */}
            {drafts.length > 0 && (
              <Section title="In progress">
                {drafts.map((d) => (
                  <Row key={d.round.id} title={formatRoundDate(d.round.played_on, true)} sub={`${modeLabel(d.round.mode)} · unfinished`}
                    action={<>
                      <button className="btn sand sm" style={{ height: 38 }} onClick={() => navigate(`/rounds/${d.round.id}/score`)}>Continue</button>
                      <button onClick={() => delDraft(d.round.id)} disabled={busy === d.round.id} style={{ border: "none", background: "transparent", color: C.tx3, font: "500 18px var(--sans)", cursor: "pointer", padding: "0 4px" }}>×</button>
                    </>} />
                ))}
              </Section>
            )}

            {/* last cards carousel */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "0 2px" }}>
                <h2 style={{ margin: 0, font: "600 15px var(--sans)", color: C.tx }}>Your last cards</h2>
                <Link to="/rounds" style={{ font: "600 10px var(--sans)", letterSpacing: ".14em", textTransform: "uppercase", color: C.flag }}>Rounds ▸</Link>
              </div>
              {rounds === null ? <div style={{ padding: 20 }}><FullSpinner /></div>
              : rounds.length === 0 ? (
                <div className="surf-panel" style={{ borderRadius: 14, padding: "20px", textAlign: "center", font: "400 14px var(--sans)", color: C.tx3 }}>No cards yet — log your first round.</div>
              ) : (
                <div style={{ display: "flex", gap: 11, overflowX: "auto", padding: "0 2px 4px" }}>
                  {rounds.map((r, i) => {
                    const low = i === 0;
                    return (
                      <Link key={r.round.id} to={`/rounds/${r.round.id}`} className={low ? "surf-paper" : "surf-panel"} style={{ flex: "none", width: 158, borderRadius: 16, padding: 14, display: "flex", flexDirection: "column", gap: 2, textDecoration: "none" }}>
                        <span style={{ font: "600 9px var(--sans)", letterSpacing: ".14em", textTransform: "uppercase", color: low ? C.ink2 : C.tx3 }}>{formatRoundDate(r.round.played_on)}</span>
                        <span className="tnum" style={{ font: "600 40px/1.05 var(--sans)", color: low ? C.ink : C.tx }}>{r.selfTotal ?? "—"}</span>
                        <span style={{ font: "600 13px var(--sans)", color: r.selfDiff != null && r.selfDiff < 0 ? C.flag : low ? C.ink2 : C.tx3 }}>{r.selfDiff != null ? toParLabel(r.selfDiff) : modeLabel(r.round.mode)}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* tournaments */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "0 2px" }}>
                <h2 style={{ margin: 0, font: "600 15px var(--sans)", color: C.tx }}>Tournaments</h2>
                <Link to="/tournaments" style={{ font: "600 10px var(--sans)", letterSpacing: ".14em", textTransform: "uppercase", color: C.flag }}>See all ▸</Link>
              </div>
              {myTourneys.length > 0 ? myTourneys.map((t) => (
                <Link key={t.id} to={`/tournaments/${t.id}`} style={{ display: "flex", alignItems: "stretch", gap: 10, textDecoration: "none" }}>
                  <div style={{ flex: "none", width: 70, borderRadius: 14, overflow: "hidden" }}><img src={PAINT.stripesFour} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /></div>
                  <div className="surf-panel" style={{ flex: 1, borderRadius: 14, padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div><div style={{ font: "600 14px var(--sans)", color: C.tx }}>{t.name}</div><div style={{ font: "400 11px var(--sans)", color: C.tx3 }}>{modeLabel(t.mode)} · {t.my_rounds_done}/{t.rounds_required} in</div></div>
                    <span className="tnum" style={{ font: "600 15px var(--sans)", color: C.sand }}>{t.my_rounds_done}/{t.rounds_required}</span>
                  </div>
                </Link>
              )) : (
                <button onClick={() => navigate("/tournaments/new")} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 14, border: "1px dashed var(--line)", background: veil(C.panel), boxShadow: ELEV.e1, cursor: "pointer", textAlign: "left" }}>
                  <span style={{ fontSize: 22 }}>🏆</span>
                  <div><div style={{ font: "600 14px var(--sans)", color: C.tx }}>Start a tournament</div><div style={{ font: "400 12px var(--sans)", color: C.tx3 }}>Rally the crew, play at your pace.</div></div>
                </button>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "center", paddingTop: 6, opacity: .5 }}><Logo width={110} /></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "0 2px" }}>
        <h2 style={{ margin: 0, font: "600 15px var(--sans)", color: C.tx }}>{title}</h2>
        {note && <span style={{ font: "600 10px var(--sans)", letterSpacing: ".14em", textTransform: "uppercase", color: C.tx3 }}>{note}</span>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{children}</div>
    </div>
  );
}

function Row({ title, sub, action }: { title: string; sub: string; action?: React.ReactNode }) {
  return (
    <div className="surf-panel" style={{ borderRadius: 14, padding: "12px 15px", display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ font: "600 14px var(--sans)", color: C.tx, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
        <div style={{ font: "400 11px var(--sans)", color: C.tx3 }}>{sub}</div>
      </div>
      {action}
    </div>
  );
}
