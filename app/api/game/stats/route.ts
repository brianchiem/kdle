import { NextResponse } from "next/server";
import { supabaseServerWithAuth } from "@/lib/supabaseClient";

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
    const today = new Date().toISOString().split('T')[0];
    const { data: todayResult } = await supabase
      .from('game_results')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .single();

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
