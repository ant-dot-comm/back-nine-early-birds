export interface Profile {
  id: string;
  display_name: string;
  initials: string;
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

export interface Round {
  id: string;
  user_id: string;
  played_on: string; // YYYY-MM-DD
  course: string;
  is_final: boolean;
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
}
