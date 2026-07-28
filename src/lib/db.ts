import { supabase } from "./supabase";
import { holesForMode, PARS, initialsFromNames, initialsOf } from "./course";
import type {
  Player,
  Profile,
  Round,
  RoundDetail,
  HoleScore,
  RoundMode,
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
}

/**
 * Save the profile (first/last/display) AND keep the "self" player in sync so
 * the user shows up on leaderboards under their display name.
 */
export async function saveProfile(
  userId: string,
  input: ProfileInput
): Promise<Profile> {
  let initials = initialsFromNames(input.firstName, input.lastName);
  if (initials === "?") initials = initialsOf(input.displayName);
  const { data, error } = await supabase
    .from("profiles")
    .upsert({
      id: userId,
      first_name: input.firstName.trim(),
      last_name: input.lastName.trim(),
      display_name: input.displayName.trim(),
      initials,
    })
    .select()
    .single();
  if (error) throw error;

  const { data: selfPlayer } = await supabase
    .from("players")
    .select("id")
    .eq("is_self", true)
    .maybeSingle();

  const playerFields = { name: input.displayName.trim(), initials };
  if (selfPlayer) {
    await supabase.from("players").update(playerFields).eq("id", selfPlayer.id);
  } else {
    await supabase.from("players").insert({ ...playerFields, is_self: true });
  }

  return data;
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

// ---- rounds -----------------------------------------------------------------

/** Create a draft round with the given players, mode, and blank par-scored holes. */
export async function createRound(
  playedOn: string,
  playerIds: string[],
  mode: RoundMode,
  compareRoundId: string | null
): Promise<string> {
  const { data: round, error } = await supabase
    .from("rounds")
    .insert({ played_on: playedOn, mode, compare_round_id: compareRoundId })
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

/** Update a single hole (strokes + gir) for a player. */
export async function updateHole(
  roundId: string,
  playerId: string,
  hole: number,
  patch: { strokes?: number; gir?: boolean }
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
  birdies: number;
  eagles: number;
  bestToPar: number | null;
  scoringAvg: number | null;
  girPct: number | null;
}

/** Aggregate stats for the signed-in user (their own card) this calendar year. */
export async function getSeasonStats(): Promise<SeasonStats> {
  const yearStart = `${new Date().getFullYear()}-01-01`;
  const empty: SeasonStats = {
    roundsPlayed: 0,
    birdies: 0,
    eagles: 0,
    bestToPar: null,
    scoringAvg: null,
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
    .select("id")
    .eq("is_final", true)
    .gte("played_on", yearStart);

  const roundIds = (rounds ?? []).map((r) => r.id);
  if (roundIds.length === 0) return empty;

  const { data: scores } = await supabase
    .from("hole_scores")
    .select("round_id, hole, par, strokes, gir")
    .eq("player_id", selfPlayer.id)
    .in("round_id", roundIds);

  const rows = scores ?? [];
  let birdies = 0;
  let eagles = 0;
  let girHit = 0;

  const perRound = new Map<string, { strokes: number; par: number }>();
  for (const s of rows) {
    if (s.strokes === s.par - 1) birdies++;
    if (s.strokes <= s.par - 2) eagles++;
    if (s.gir) girHit++;
    const acc = perRound.get(s.round_id) ?? { strokes: 0, par: 0 };
    acc.strokes += s.strokes;
    acc.par += s.par;
    perRound.set(s.round_id, acc);
  }

  const diffs = [...perRound.values()].map((r) => r.strokes - r.par);
  const totals = [...perRound.values()].map((r) => r.strokes);

  return {
    roundsPlayed: perRound.size,
    birdies,
    eagles,
    bestToPar: diffs.length ? Math.min(...diffs) : null,
    scoringAvg: totals.length ? totals.reduce((a, b) => a + b, 0) / totals.length : null,
    girPct: rows.length ? (girHit / rows.length) * 100 : null,
  };
}
