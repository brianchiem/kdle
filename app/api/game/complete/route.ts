import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { STATS_COOKIE, defaultStats, sanitizeStats } from "@/lib/game";
import { todayUTC } from "@/lib/date";

const CompleteSchema = z.object({
  guesses_used: z.number().min(0).max(6),
  won: z.boolean(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = CompleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { won } = parsed.data;
  const jar = await cookies();
  const raw = jar.get(STATS_COOKIE)?.value;
  let stats = sanitizeStats(raw ? JSON.parse(raw) : null);

  const today = todayUTC();
  if (stats.last_result_date === today) {
    // Already recorded for today; return current stats
    const resp = NextResponse.json({
      streak: stats.streak,
      longest_streak: stats.longest_streak,
      total_games: stats.total_games,
      win_rate: stats.total_games ? stats.total_wins / stats.total_games : 0,
    });
    return resp;
  }

  // Determine whether to maintain streak: simple rule
  // If last_result_date is yesterday and won, increment; else if won start at 1; if not won, reset to 0.
  const last = stats.last_result_date ? new Date(stats.last_result_date + "T00:00:00Z") : undefined;
  const now = new Date(today + "T00:00:00Z");
  const yesterday = new Date(now);
  yesterday.setUTCDate(now.getUTCDate() - 1);
  const isYesterday = last ? last.getTime() === yesterday.getTime() : false;

  stats.total_games += 1;
  if (won) {
    stats.total_wins += 1;
    if (isYesterday) stats.streak += 1;
    else stats.streak = 1;
  } else {
    stats.streak = 0;
  }
  if (stats.streak > stats.longest_streak) stats.longest_streak = stats.streak;
  stats.last_result_date = today;

  const resp = NextResponse.json({
    streak: stats.streak,
    longest_streak: stats.longest_streak,
    total_games: stats.total_games,
    win_rate: stats.total_games ? stats.total_wins / stats.total_games : 0,
  });
  resp.cookies.set({
    name: STATS_COOKIE,
    value: JSON.stringify(stats),
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });
  return resp;
}
