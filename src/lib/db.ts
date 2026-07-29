import { supabase } from "./supabase";
import { holesForMode, PARS } from "./course";
import type {
  Player,
  Profile,
  Round,
  RoundDetail,
  HoleScore,
  RoundMode,
  Member,
  LeaderboardRow,
  ScoreShare,
  DisplayNameType,
  RareName,
  Challenge,
  Badge,
  PublicProfile,
  Tournament,
  TournamentStanding,
  TournamentScoring,
} from "./types";
import { formatRoundDate } from "./date";

// ---- profile ----------------------------------------------------------------

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export interface ProfileInput {
  firstName: string;
  lastName: string;
  displayName: string;
  type?: DisplayNameType;
  parts?: { adjective: string; noun: string; nickname: string } | null;
  secret?: string | null;
}

/**
 * Save the profile via a server RPC that validates secret-name entitlement and
 * keeps the "self" player in sync. Secret status can't be forged from the client.
 */
export async function saveProfile(_userId: string, input: ProfileInput): Promise<void> {
  const { error } = await supabase.rpc("save_profile", {
    p_first: input.firstName,
    p_last: input.lastName,
    p_display: input.displayName,
    p_type: input.type ?? "custom",
    p_parts: input.parts ?? null,
    p_secret: input.secret ?? null,
  });
  if (error) throw error;
}

/** Signup-only: server-side 1-in-N roll. Returns a secret name on a hit, else null. */
export async function rollSecretName(): Promise<string | null> {
  const { data, error } = await supabase.rpc("roll_secret_name");
  if (error) throw error;
  return (data as string | null) ?? null;
}

/** Secret names the signed-in user has unlocked via the rounds-played achievement. */
export async function getUnlockedSecrets(): Promise<string[]> {
  const { data, error } = await supabase.rpc("unlocked_secret_names");
  if (error) throw error;
  return (data as string[]) ?? [];
}

// ---- rare-name holdings & challenges ----------------------------------------

/** Every rare name and its current holder (null = unclaimed). */
export async function getSecretRoster(): Promise<RareName[]> {
  const { data, error } = await supabase.rpc("secret_roster");
  if (error) throw error;
  return (data as RareName[]) ?? [];
}

/** Claim an unclaimed rare name you've unlocked (sets it as your display name). */
export async function claimSecret(
  userId: string,
  name: string,
  first: string,
  last: string
): Promise<void> {
  await saveProfile(userId, { firstName: first, lastName: last, displayName: name, type: "secret", secret: name });
}

export async function createChallenge(defender: string, name: string): Promise<void> {
  const { error } = await supabase.rpc("create_challenge", { p_defender: defender, p_secret: name });
  if (error) throw error;
}

export async function respondChallenge(id: string, accept: boolean): Promise<void> {
  const { error } = await supabase.rpc("respond_challenge", { p_id: id, p_accept: accept });
  if (error) throw error;
}

export async function cancelChallenge(id: string): Promise<void> {
  const { error } = await supabase.rpc("cancel_challenge", { p_id: id });
  if (error) throw error;
}

export async function listMyChallenges(): Promise<Challenge[]> {
  const { data, error } = await supabase.rpc("list_my_challenges");
  if (error) throw error;
  return (data as Challenge[]) ?? [];
}

/** Start the live round that settles an accepted challenge; returns its round id. */
export async function startChallengeRound(challengeId: string, mode: RoundMode): Promise<string> {
  const { data, error } = await supabase.rpc("start_challenge_round", { p_challenge: challengeId, p_mode: mode });
  if (error) throw error;
  return data as string;
}

export async function getPublicProfile(userId: string): Promise<PublicProfile | null> {
  const { data, error } = await supabase.rpc("public_profile", { p_user: userId });
  if (error) throw error;
  const rows = data as PublicProfile[];
  return rows && rows.length ? rows[0] : null;
}

export async function getPublicBadges(userId: string): Promise<Badge[]> {
  const { data, error } = await supabase.rpc("public_badges", { p_user: userId });
  if (error) throw error;
  return (data as Badge[]) ?? [];
}

// ---- tournaments ------------------------------------------------------------

export async function listTournaments(): Promise<Tournament[]> {
  const { data, error } = await supabase.rpc("list_tournaments");
  if (error) throw error;
  return (data as Tournament[]) ?? [];
}

export async function getTournamentStandings(tournamentId: string): Promise<TournamentStanding[]> {
  const { data, error } = await supabase.rpc("tournament_standings", { p_tournament: tournamentId });
  if (error) throw error;
  return (data as TournamentStanding[]) ?? [];
}

export interface CreateTournamentInput {
  name: string;
  description: string | null;
  mode: RoundMode;
  roundsRequired: number;
  scoring: TournamentScoring;
  playerIds: string[];
}

export async function createTournament(t: CreateTournamentInput): Promise<string> {
  const { data, error } = await supabase.rpc("create_tournament", {
    p_name: t.name,
    p_description: t.description,
    p_mode: t.mode,
    p_rounds_required: t.roundsRequired,
    p_scoring: t.scoring,
    p_players: t.playerIds,
  });
  if (error) throw error;
  return data as string;
}

export async function addTournamentPlayer(tournamentId: string, userId: string): Promise<void> {
  const { error } = await supabase.rpc("add_tournament_player", { p_tournament: tournamentId, p_user: userId });
  if (error) throw error;
}

export async function removeTournamentPlayer(tournamentId: string, userId: string): Promise<void> {
  const { error } = await supabase.rpc("remove_tournament_player", { p_tournament: tournamentId, p_user: userId });
  if (error) throw error;
}

export async function leaveTournament(tournamentId: string): Promise<void> {
  const { error } = await supabase.rpc("leave_tournament", { p_tournament: tournamentId });
  if (error) throw error;
}

export async function cancelTournament(tournamentId: string): Promise<void> {
  const { error } = await supabase.rpc("cancel_tournament", { p_tournament: tournamentId });
  if (error) throw error;
}

// ---- players ----------------------------------------------------------------

export async function listPlayers(): Promise<Player[]> {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .order("is_self", { ascending: false })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function addPlayer(name: string): Promise<Player> {
  const initials = name.trim().split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  const { data, error } = await supabase
    .from("players")
    .insert({ name: name.trim(), initials, is_self: false })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ---- members (other signed-up users) ----------------------------------------

export async function listMembers(): Promise<Member[]> {
  const { data, error } = await supabase
    .from("members")
    .select("id, display_name, initials, first_name, last_name")
    .order("display_name", { ascending: true });
  if (error) throw error;
  return (data as Member[]) ?? [];
}

/** Season leaderboard across all members (aggregate stats only). */
export async function getMemberLeaderboard(): Promise<LeaderboardRow[]> {
  const { data, error } = await supabase.rpc("member_leaderboard");
  if (error) throw error;
  return (data as LeaderboardRow[]) ?? [];
}

/** Get-or-create a roster player linked to a member account. */
export async function addMemberPlayer(member: Member): Promise<Player> {
  const { data: existing } = await supabase
    .from("players")
    .select("*")
    .eq("member_user_id", member.id)
    .maybeSingle();
  if (existing) return existing as Player;

  const { data, error } = await supabase
    .from("players")
    .insert({
      name: member.display_name,
      initials: member.initials,
      is_self: false,
      member_user_id: member.id,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Player;
}

// ---- rounds -----------------------------------------------------------------

/** Create a draft round with the given players, mode, and blank par-scored holes. */
export async function createRound(
  playedOn: string,
  playerIds: string[],
  mode: RoundMode,
  compareRoundId: string | null,
  sideGames: string[] = [],
  tournamentId: string | null = null
): Promise<string> {
  const { data: round, error } = await supabase
    .from("rounds")
    .insert({ played_on: playedOn, mode, compare_round_id: compareRoundId, side_games: sideGames, tournament_id: tournamentId })
    .select()
    .single();
  if (error) throw error;

  const roundId = round.id as string;

  const rp = playerIds.map((player_id) => ({ round_id: roundId, player_id }));
  const { error: rpErr } = await supabase.from("round_players").insert(rp);
  if (rpErr) throw rpErr;

  const holes = holesForMode(mode);
  const seed = playerIds.flatMap((player_id) =>
    holes.map((hole) => ({
      round_id: roundId,
      player_id,
      hole,
      par: PARS[hole],
      strokes: PARS[hole],
      gir: false,
    }))
  );
  const { error: hsErr } = await supabase.from("hole_scores").insert(seed);
  if (hsErr) throw hsErr;

  return roundId;
}

export async function deleteRound(roundId: string): Promise<void> {
  // round_players + hole_scores cascade via FK ON DELETE CASCADE.
  const { error } = await supabase.from("rounds").delete().eq("id", roundId);
  if (error) throw error;
}

export async function getRoundDetail(roundId: string): Promise<RoundDetail> {
  const { data: round, error } = await supabase
    .from("rounds")
    .select("*")
    .eq("id", roundId)
    .single();
  if (error) throw error;

  const { data: rp, error: rpErr } = await supabase
    .from("round_players")
    .select("player_id, players(*)")
    .eq("round_id", roundId);
  if (rpErr) throw rpErr;

  const { data: scores, error: sErr } = await supabase
    .from("hole_scores")
    .select("*")
    .eq("round_id", roundId);
  if (sErr) throw sErr;

  const players = (rp ?? [])
    .map((r) => (r as unknown as { players: Player }).players)
    .filter(Boolean)
    .sort((a, b) => Number(b.is_self) - Number(a.is_self));

  // Comparison round (self player's strokes per hole).
  let compare: RoundDetail["compare"] = null;
  const typed = round as Round;
  if (typed.compare_round_id) {
    const self = players.find((p) => p.is_self);
    if (self) {
      const { data: cmpRound } = await supabase
        .from("rounds")
        .select("played_on")
        .eq("id", typed.compare_round_id)
        .maybeSingle();
      const { data: cmpScores } = await supabase
        .from("hole_scores")
        .select("hole, strokes")
        .eq("round_id", typed.compare_round_id)
        .eq("player_id", self.id);
      if (cmpScores && cmpScores.length) {
        const strokesByHole: Record<number, number> = {};
        for (const s of cmpScores) strokesByHole[s.hole] = s.strokes;
        compare = {
          label: cmpRound ? formatRoundDate(cmpRound.played_on) : "last round",
          strokesByHole,
        };
      }
    }
  }

  return {
    round: typed,
    players,
    scores: (scores as HoleScore[]) ?? [],
    compare,
  };
}

/** Update a single hole (strokes, gir, and/or saved state) for a player. */
export async function updateHole(
  roundId: string,
  playerId: string,
  hole: number,
  patch: { strokes?: number; gir?: boolean; saved?: boolean }
): Promise<void> {
  const { error } = await supabase
    .from("hole_scores")
    .update(patch)
    .eq("round_id", roundId)
    .eq("player_id", playerId)
    .eq("hole", hole);
  if (error) throw error;
}

export async function finalizeRound(roundId: string): Promise<void> {
  const { error } = await supabase
    .from("rounds")
    .update({ is_final: true })
    .eq("id", roundId);
  if (error) throw error;
}

// ---- invites (share a score + invite to sign up) ----------------------------

export interface InviteInput {
  roundId: string;
  playerId: string;
  email: string;
  inviterDisplay: string;
  playerName: string;
  mode: RoundMode;
  playedOn: string;
  course: string;
  scores: { hole: number; par: number; strokes: number; gir: boolean }[];
}

/** Create an invite (snapshotting the player's card) and return its token. */
export async function createInvite(i: InviteInput): Promise<string> {
  const [first, ...rest] = i.playerName.trim().split(/\s+/);
  const { data, error } = await supabase
    .from("invites")
    .insert({
      round_id: i.roundId,
      player_id: i.playerId,
      recipient_email: i.email,
      inviter_display: i.inviterDisplay,
      player_name: i.playerName,
      prefill_first: first ?? "",
      prefill_last: rest.join(" "),
      mode: i.mode,
      played_on: i.playedOn,
      course: i.course,
      scores: i.scores,
    })
    .select("token")
    .single();
  if (error) throw error;
  return data.token as string;
}

/** Ask the edge function to email the invite. Throws if email isn't configured. */
export async function sendInviteEmail(token: string): Promise<void> {
  const { error } = await supabase.functions.invoke("send-invite-email", {
    body: { token },
  });
  if (error) throw error;
}

/** Claim an invite into the signed-in user's account; returns the new round id. */
export async function claimInvite(token: string): Promise<string> {
  const { data, error } = await supabase.rpc("claim_invite", { p_token: token });
  if (error) throw error;
  return data as string;
}

export function inviteLink(
  token: string,
  opts: { email?: string; first?: string; last?: string; from?: string } = {}
): string {
  const q = new URLSearchParams({ invite: token });
  if (opts.email) q.set("email", opts.email);
  if (opts.first) q.set("first", opts.first);
  if (opts.last) q.set("last", opts.last);
  if (opts.from) q.set("from", opts.from);
  return `${window.location.origin}/join?${q.toString()}`;
}

// ---- score shares to signed-up members --------------------------------------

/** On finalize, push each member-player's card to their account as a pending share. */
export async function pushMemberShares(roundId: string, fromDisplay: string): Promise<void> {
  const detail = await getRoundDetail(roundId);
  const memberPlayers = detail.players.filter((p) => p.member_user_id && !p.is_self);
  if (memberPlayers.length === 0) return;

  // Idempotent: clear any prior shares for this round before re-inserting.
  await supabase.from("score_shares").delete().eq("round_id", roundId);

  const rows = memberPlayers.map((p) => ({
    to_user: p.member_user_id,
    from_display: fromDisplay,
    round_id: roundId,
    played_on: detail.round.played_on,
    course: detail.round.course,
    mode: detail.round.mode,
    scores: detail.scores
      .filter((s) => s.player_id === p.id)
      .sort((a, b) => a.hole - b.hole)
      .map((s) => ({ hole: s.hole, par: s.par, strokes: s.strokes, gir: s.gir })),
  }));
  const { error } = await supabase.from("score_shares").insert(rows);
  if (error) throw error;
}

/** Post one member-player's card straight to their account as a pending share. */
export async function shareScoreToMember(
  roundId: string,
  player: Player,
  scores: { hole: number; par: number; strokes: number; gir: boolean }[],
  round: { played_on: string; course: string; mode: RoundMode },
  fromDisplay: string
): Promise<void> {
  if (!player.member_user_id) throw new Error("That player isn't a member.");
  // Idempotent per round + recipient.
  await supabase
    .from("score_shares")
    .delete()
    .eq("round_id", roundId)
    .eq("to_user", player.member_user_id);
  const { error } = await supabase.from("score_shares").insert({
    to_user: player.member_user_id,
    from_display: fromDisplay,
    round_id: roundId,
    played_on: round.played_on,
    course: round.course,
    mode: round.mode,
    scores,
  });
  if (error) throw error;
}

export async function listPendingShares(): Promise<ScoreShare[]> {
  const { data: u } = await supabase.auth.getUser();
  const me = u.user?.id;
  if (!me) return [];
  const { data, error } = await supabase
    .from("score_shares")
    .select("*")
    .eq("to_user", me)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as ScoreShare[]) ?? [];
}

/** Accept a shared score: copy it into my account as a finished round. */
export async function acceptShare(shareId: string): Promise<string> {
  const { data: share, error } = await supabase
    .from("score_shares")
    .select("*")
    .eq("id", shareId)
    .single();
  if (error) throw error;
  const s = share as ScoreShare;

  const { data: selfp } = await supabase
    .from("players")
    .select("id")
    .eq("is_self", true)
    .maybeSingle();
  if (!selfp) throw new Error("No profile yet");

  const { data: round, error: rErr } = await supabase
    .from("rounds")
    .insert({ played_on: s.played_on, course: s.course, mode: s.mode, is_final: true })
    .select()
    .single();
  if (rErr) throw rErr;

  await supabase.from("round_players").insert({ round_id: round.id, player_id: selfp.id });
  await supabase.from("hole_scores").insert(
    s.scores.map((x) => ({
      round_id: round.id,
      player_id: selfp.id,
      hole: x.hole,
      par: x.par,
      strokes: x.strokes,
      gir: x.gir,
      saved: true,
    }))
  );
  await supabase
    .from("score_shares")
    .update({ status: "accepted", accepted_round_id: round.id })
    .eq("id", shareId);
  return round.id as string;
}

export async function dismissShare(shareId: string): Promise<void> {
  const { error } = await supabase
    .from("score_shares")
    .update({ status: "dismissed" })
    .eq("id", shareId);
  if (error) throw error;
}

// ---- home / stats -----------------------------------------------------------

export interface RoundSummaryRow {
  round: Round;
  playerCount: number;
  selfTotal: number | null;
  selfDiff: number | null;
}

async function summarizeRounds(rounds: Round[]): Promise<RoundSummaryRow[]> {
  if (rounds.length === 0) return [];
  const ids = rounds.map((r) => r.id);

  const { data: rp } = await supabase
    .from("round_players")
    .select("round_id")
    .in("round_id", ids);

  const { data: selfPlayer } = await supabase
    .from("players")
    .select("id")
    .eq("is_self", true)
    .maybeSingle();

  const { data: scores } = await supabase
    .from("hole_scores")
    .select("round_id, player_id, strokes, par")
    .in("round_id", ids);

  const counts = new Map<string, number>();
  (rp ?? []).forEach((r) => counts.set(r.round_id, (counts.get(r.round_id) ?? 0) + 1));

  return rounds.map((round) => {
    const mine = (scores ?? []).filter(
      (s) => s.round_id === round.id && selfPlayer && s.player_id === selfPlayer.id
    );
    const total = mine.reduce((sum, s) => sum + s.strokes, 0);
    const parSum = mine.reduce((sum, s) => sum + s.par, 0);
    return {
      round,
      playerCount: counts.get(round.id) ?? 0,
      selfTotal: mine.length ? total : null,
      selfDiff: mine.length ? total - parSum : null,
    };
  });
}

/** Recent *finalized* rounds with the signed-in user's own total for each. */
export async function listRecentRounds(limit = 20): Promise<RoundSummaryRow[]> {
  const { data, error } = await supabase
    .from("rounds")
    .select("*")
    .eq("is_final", true)
    .order("played_on", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return summarizeRounds((data as Round[]) ?? []);
}

/** In-progress (not yet saved) rounds. */
export async function listDraftRounds(): Promise<RoundSummaryRow[]> {
  const { data, error } = await supabase
    .from("rounds")
    .select("*")
    .eq("is_final", false)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return summarizeRounds((data as Round[]) ?? []);
}

export interface SeasonStats {
  roundsPlayed: number;
  avg9: number | null;
  avg18: number | null;
  birdies: number;
  eagles: number;
  pars: number;
  girPct: number | null;
}

/** Career card for the signed-in user: cumulative counts + separate 9/18 averages. */
export async function getSeasonStats(): Promise<SeasonStats> {
  const empty: SeasonStats = {
    roundsPlayed: 0,
    avg9: null,
    avg18: null,
    birdies: 0,
    eagles: 0,
    pars: 0,
    girPct: null,
  };

  const { data: selfPlayer } = await supabase
    .from("players")
    .select("id")
    .eq("is_self", true)
    .maybeSingle();
  if (!selfPlayer) return empty;

  const { data: rounds } = await supabase
    .from("rounds")
    .select("id, mode")
    .eq("is_final", true);

  const roundMode = new Map<string, RoundMode>();
  (rounds ?? []).forEach((r) => roundMode.set(r.id, r.mode as RoundMode));
  const roundIds = [...roundMode.keys()];
  if (roundIds.length === 0) return empty;

  const { data: scores } = await supabase
    .from("hole_scores")
    .select("round_id, par, strokes, gir")
    .eq("player_id", selfPlayer.id)
    .in("round_id", roundIds);

  const rows = scores ?? [];
  let birdies = 0;
  let eagles = 0;
  let pars = 0;
  let girHit = 0;
  const perRound = new Map<string, number>();
  for (const s of rows) {
    if (s.strokes === s.par - 1) birdies++;
    if (s.strokes <= s.par - 2) eagles++;
    if (s.strokes === s.par) pars++;
    if (s.gir) girHit++;
    perRound.set(s.round_id, (perRound.get(s.round_id) ?? 0) + s.strokes);
  }

  const avg = (mode: RoundMode) => {
    const totals = [...perRound.entries()].filter(([id]) => roundMode.get(id) === mode).map(([, t]) => t);
    return totals.length ? Math.round((totals.reduce((a, b) => a + b, 0) / totals.length) * 10) / 10 : null;
  };

  return {
    roundsPlayed: perRound.size,
    avg9: avg("back9"),
    avg18: avg("full18"),
    birdies,
    eagles,
    pars,
    girPct: rows.length ? (girHit / rows.length) * 100 : null,
  };
}
