export type DisplayNameType = "custom" | "generated" | "secret";

export interface Profile {
  id: string;
  display_name: string;
  initials: string;
  first_name: string | null;
  last_name: string | null;
  display_name_type: DisplayNameType;
  secret_name: string | null;
  created_at: string;
}

export interface Player {
  id: string;
  user_id: string;
  name: string;
  initials: string;
  is_self: boolean;
  member_user_id: string | null;
  created_at: string;
}

/** A signed-up member (from the public members view). */
export interface Member {
  id: string;
  display_name: string;
  initials: string;
  first_name: string | null;
  last_name: string | null;
}

/** One member's aggregate season stats (from member_leaderboard()). */
export interface LeaderboardRow {
  user_id: string;
  display_name: string;
  first_name: string | null;
  last_name: string | null;
  initials: string;
  rounds: number;
  avg9: number | null;
  avg18: number | null;
  birdies: number;
  eagles: number;
  pars: number;
  gir_pct: number | null;
}

export interface ScoreShare {
  id: string;
  from_user: string;
  to_user: string;
  from_display: string | null;
  played_on: string;
  course: string;
  mode: RoundMode;
  scores: { hole: number; par: number; strokes: number; gir: boolean }[];
  status: "pending" | "accepted" | "dismissed";
  created_at: string;
}

export type RoundMode = "back9" | "full18";

export interface Round {
  id: string;
  user_id: string;
  played_on: string; // YYYY-MM-DD
  course: string;
  is_final: boolean;
  mode: RoundMode;
  compare_round_id: string | null;
  created_at: string;
}

export interface HoleScore {
  id: string;
  round_id: string;
  player_id: string;
  hole: number;
  par: number;
  strokes: number;
  gir: boolean;
  saved: boolean;
}

export interface RoundPlayer {
  id: string;
  round_id: string;
  player_id: string;
}

/** A round with everything needed to render the summary / score entry. */
export interface RoundDetail {
  round: Round;
  players: Player[];
  scores: HoleScore[];
  /** Comparison round (if set): the self player's strokes keyed by hole. */
  compare: { label: string; strokesByHole: Record<number, number> } | null;
}
