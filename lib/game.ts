import { supabaseServer } from "@/lib/supabaseClient";
import { todayPST } from "@/lib/date";

export type DailyJoined = {
  date: string; // YYYY-MM-DD
  song_id: string;
  spotify_id: string;
  title: string;
  artist: string;
  preview_url: string | null;
  release_year: number | null;
  album_image: string | null;
};

export async function getTodayDaily(): Promise<DailyJoined | null> {
  const supabase = supabaseServer();
  const date = todayPST();
  const { data, error } = await supabase
    .from("daily_song")
    .select(
      `date, song_id, songs:song_id ( id, spotify_id, title, artist, preview_url, release_year, album_image )`
    )
    .eq("date", date)
    .maybeSingle();

  if (error) {
    console.error("getTodayDaily error", error);
    return null;
  }
  if (!data || !data.songs) return null;
  const s = data.songs as any;
  return {
    date,
    song_id: s.id,
    spotify_id: s.spotify_id,
    title: s.title,
    artist: s.artist,
    preview_url: s.preview_url ?? null,
    release_year: s.release_year ?? null,
    album_image: s.album_image ?? null,
  };
}

export function normalize(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // remove diacritics
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isCorrectGuess(guess: string, title: string, artist: string): boolean {
  const g = normalize(guess);
  const t = normalize(title);
  const a = normalize(artist);
  // Accept if the title is matched (exact or contained), with or without artist alongside.
  // Do NOT accept artist-only matches.
  if (g === t || g.includes(t)) return true;
  if (g.includes(a) && g.includes(t)) return true;
  return false;
}

export function isArtistMatch(guess: string, artist: string): boolean {
  const g = normalize(guess);
  const a = normalize(artist);
  return g === a || g.includes(a);
}

export type State = {
  date: string;
  guesses: number; // 0..6
  hintLevel: number; // 0..5
  won: boolean;
};

export const MAX_GUESSES = 6;
export const MAX_HINT_LEVEL = 5; // 1: year, 2: blurred art, 3: artist name, 4: first letter, 5: longer snippet

export function newState(date: string): State {
  return { date, guesses: 0, hintLevel: 0, won: false };
}

export function sanitizeState(input: any, date: string): State {
  // Ensure proper types and bounds; reset if corrupted or different date
  if (!input || typeof input !== "object" || input.date !== date) return newState(date);
  let guesses = Number(input.guesses);
  let hintLevel = Number(input.hintLevel);
  const won = Boolean(input.won);
  if (!Number.isFinite(guesses) || guesses < 0 || guesses > MAX_GUESSES) guesses = 0;
  if (!Number.isFinite(hintLevel) || hintLevel < 0 || hintLevel > MAX_HINT_LEVEL) hintLevel = 0;
  return { date, guesses, hintLevel, won };
}

export function nextHintLevel(current: number): number {
  return Math.min(current + 1, MAX_HINT_LEVEL);
}

export function buildHint(level: number, daily: DailyJoined): { hint_level: number; hint: string } {
  const safeLevel = Math.max(1, Math.min(level, MAX_HINT_LEVEL));
  switch (safeLevel) {
    case 1:
      return { hint_level: 1, hint: `Released in ${daily.release_year ?? "????"}` };
    case 2:
      return { hint_level: 2, hint: daily.album_image ? "Album art unlocked (blurred)" : "Album art unavailable" };
    case 3:
      return { hint_level: 3, hint: `Artist: ${daily.artist}` };
    case 4:
      return { hint_level: 4, hint: `First letter of title: ${daily.title?.[0]?.toUpperCase() ?? "?"}` };
    case 5:
    default:
      return { hint_level: 5, hint: "Longer snippet unlocked" };
  }
}

export const COOKIE_NAME = "kdle_state";

export const STATS_COOKIE = "kdle_stats";

export type Stats = {
  streak: number;
  longest_streak: number;
  total_games: number;
  total_wins: number;
  last_result_date?: string; // YYYY-MM-DD for when stats were last updated
};

export function defaultStats(): Stats {
  return { streak: 0, longest_streak: 0, total_games: 0, total_wins: 0 };
}

export function sanitizeStats(input: any): Stats {
  if (!input || typeof input !== "object") return defaultStats();
  const s: Stats = defaultStats();
  s.streak = Math.max(0, Number(input.streak) || 0);
  s.longest_streak = Math.max(0, Number(input.longest_streak) || 0);
  s.total_games = Math.max(0, Number(input.total_games) || 0);
  s.total_wins = Math.max(0, Number(input.total_wins) || 0);
  if (typeof input.last_result_date === "string") s.last_result_date = input.last_result_date;
  if (s.longest_streak < s.streak) s.longest_streak = s.streak;
  return s;
}
