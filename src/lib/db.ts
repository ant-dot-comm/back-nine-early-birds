import { supabase } from "./supabase";
import { HOLES, PARS, initialsOf } from "./course";
import type { Player, Profile, Round, RoundDetail, HoleScore } from "./types";

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

/**
 * Save the display name: upsert the profile AND ensure a "self" player exists
 * (so the user shows up in rounds).
 */
export async function saveProfile(
  userId: string,
  displayName: string
): Promise<Profile> {
  const initials = initialsOf(displayName);
  const { data, error } = await supabase
    .from("profiles")
    .upsert({ id: userId, display_name: displayName, initials })
    .select()
    .single();
  if (error) throw error;

  // Ensure the self-player exists / stays in sync with the display name.
  const { data: selfPlayer } = await supabase
    .from("players")
    .select("id")
    .eq("is_self", true)
    .maybeSingle();

  if (selfPlayer) {
    await supabase
      .from("players")
      .update({ name: displayName, initials })
      .eq("id", selfPlayer.id);
  } else {
    await supabase
      .from("players")
      .insert({ name: displayName, initials, is_self: true });
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
  const initials = initialsOf(name);
  const { data, error } = await supabase
    .from("players")
    .insert({ name: name.trim(), initials, is_self: false })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ---- rounds -----------------------------------------------------------------

/** Create a draft round with the given players and blank par-scored holes. */
export async function createRound(
  playedOn: string,
  playerIds: string[]
): Promise<string> {
  const { data: round, error } = await supabase
    .from("rounds")
    .insert({ played_on: playedOn })
    .select()
    .single();
  if (error) throw error;

  const roundId = round.id as string;

  const rp = playerIds.map((player_id) => ({ round_id: roundId, player_id }));
  const { error: rpErr } = await supabase.from("round_players").insert(rp);
  if (rpErr) throw rpErr;

  // Seed every player's card at par so the steppers start sensibly.
  const seed = playerIds.flatMap((player_id) =>
    HOLES.map((hole) => ({
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

  return { round: round as Round, players, scores: (scores as HoleScore[]) ?? [] };
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

/** Recent final rounds with the signed-in user's own total for each. */
export async function listRecentRounds(limit = 20): Promise<RoundSummaryRow[]> {
  const { data: rounds, error } = await supabase
    .from("rounds")
    .select("*")
    .eq("is_final", true)
    .order("played_on", { ascending: false })
    .limit(limit);
  if (error) throw error;
  if (!rounds || rounds.length === 0) return [];

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
      round: round as Round,
      playerCount: counts.get(round.id) ?? 0,
      selfTotal: mine.length ? total : null,
      selfDiff: mine.length ? total - parSum : null,
    };
  });
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

  const { data: selfPlayer } = await supabase
    .from("players")
    .select("id")
    .eq("is_self", true)
    .maybeSingle();

  if (!selfPlayer) {
    return {
      roundsPlayed: 0,
      birdies: 0,
      eagles: 0,
      bestToPar: null,
      scoringAvg: null,
      girPct: null,
    };
  }

  const { data: rounds } = await supabase
    .from("rounds")
    .select("id")
    .eq("is_final", true)
    .gte("played_on", yearStart);

  const roundIds = (rounds ?? []).map((r) => r.id);
  if (roundIds.length === 0) {
    return {
      roundsPlayed: 0,
      birdies: 0,
      eagles: 0,
      bestToPar: null,
      scoringAvg: null,
      girPct: null,
    };
  }

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
    scoringAvg: totals.length
      ? totals.reduce((a, b) => a + b, 0) / totals.length
      : null,
    girPct: rows.length ? (girHit / rows.length) * 100 : null,
  };
}
