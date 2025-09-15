import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { STATS_COOKIE, sanitizeStats } from "@/lib/game";
import { supabaseServer } from "@/lib/supabaseClient";

export async function GET() {
  try {
    const supabase = supabaseServer();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (user) {
      const { data } = await supabase
        .from("user_stats")
        .select("streak,longest_streak,total_games,total_wins")
        .eq("user_id", user.id)
        .single();
      if (data) {
        return NextResponse.json({
          streak: data.streak ?? 0,
          longest_streak: data.longest_streak ?? 0,
          total_games: data.total_games ?? 0,
          total_wins: data.total_wins ?? 0,
          win_rate: (data.total_games ?? 0) ? (data.total_wins ?? 0) / (data.total_games ?? 0) : 0,
        });
      }
    }
  } catch {
    // ignore and fall back to cookie
  }

  const jar = await cookies();
  const raw = jar.get(STATS_COOKIE)?.value;
  const stats = sanitizeStats(raw ? JSON.parse(raw) : null);
  return NextResponse.json({
    streak: stats.streak,
    longest_streak: stats.longest_streak,
    total_games: stats.total_games,
    total_wins: stats.total_wins,
    win_rate: stats.total_games ? stats.total_wins / stats.total_games : 0,
  });
}
