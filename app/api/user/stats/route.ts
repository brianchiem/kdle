import { NextResponse } from "next/server";

export async function GET() {
  // TODO: Require auth (Supabase) and fetch user stats from 'user_stats'.
  const placeholder = {
    streak: 0,
    longest_streak: 0,
    total_games: 0,
    win_rate: 0,
  };
  return NextResponse.json(placeholder);
}
