export interface Profile {
  id: string;
  display_name: string;
  initials: string;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
}

export interface Player {
  id: string;
  user_id: string;
  name: string;
  initials: string;
  is_self: boolean;
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
