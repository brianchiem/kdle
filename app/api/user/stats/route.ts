import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { STATS_COOKIE, sanitizeStats } from "@/lib/game";

export async function GET() {
  const jar = await cookies();
  const raw = jar.get(STATS_COOKIE)?.value;
  const stats = sanitizeStats(raw ? JSON.parse(raw) : null);
  const res = {
    streak: stats.streak,
    longest_streak: stats.longest_streak,
    total_games: stats.total_games,
    win_rate: stats.total_games ? stats.total_wins / stats.total_games : 0,
  };
  return NextResponse.json(res);
}
