import { NextResponse } from "next/server";
import { supabaseServerWithAuth } from "@/lib/supabaseClient";
import { todayPST } from "@/lib/date";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const supabase = supabaseServerWithAuth(token);
    
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user stats
    const { data: stats } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Get today's game result
    const today = todayPST();
    const { data: todayResult } = await supabase
      .from('game_results')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .single();

    // If user has stats, and last update was over 24 hours ago, and they haven't completed today's game,
    // reset the current streak to 0. This handles missed days.
    if (stats && stats.updated_at && !todayResult?.completed) {
      try {
        const updatedAt = new Date(stats.updated_at);
        const now = new Date();
        const hoursSinceUpdate = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60);
        if (hoursSinceUpdate > 24 && stats.streak > 0) {
          const { error: resetErr } = await supabase
            .from('user_stats')
            .update({ streak: 0, updated_at: now.toISOString() })
            .eq('user_id', user.id);
          if (!resetErr) {
            // Reflect reset streak in the response
            if (stats) {
              stats.streak = 0;
              stats.updated_at = now.toISOString();
            }
          }
        }
      } catch {}
    }

    return NextResponse.json({
      stats: stats || {
        streak: 0,
        longest_streak: 0,
        total_games: 0,
        total_wins: 0,
      },
      todayCompleted: !!todayResult?.completed,
      todayWon: !!todayResult?.won,
      todayGuesses: todayResult?.guesses || [],
    });

  } catch (error: any) {
    console.error('Get stats error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
