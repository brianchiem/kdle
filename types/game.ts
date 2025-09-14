export type DailySong = {
  date: string; // YYYY-MM-DD
  song_id: string;
  spotify_id: string;
  title: string;
  artist: string;
  preview_url: string | null;
  release_year?: number;
  album_image?: string | null;
  difficulty_tag?: string;
};

export type GuessRequest = {
  guess: string;
};

export type GuessResponse = {
  correct: boolean;
  remaining_guesses: number;
  next_hint_level: number;
};

export type HintResponse = {
  hint_level: number;
  hint: string;
};

export type CompleteRequest = {
  guesses_used: number;
  won: boolean;
};

export type StatsResponse = {
  streak: number;
  longest_streak: number;
  total_games: number;
  win_rate: number;
};
