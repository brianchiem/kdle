import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServerWithAuth } from "@/lib/supabaseClient";
import { todayUTC } from "@/lib/date";
import { rateLimit, getRateLimitHeaders } from "@/lib/rate-limit";

const GuessSchema = z.object({
  artist: z.string(),
  title: z.string(),
  artistCorrect: z.boolean(),
  titleCorrect: z.boolean(),
});

const Schema = z.object({
  guesses: z.array(GuessSchema),
  completed: z.boolean(),
  won: z.boolean(),
});

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const supabase = supabaseServerWithAuth(token);
    
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting - 5 submissions per minute per user
    const rateLimitResult = rateLimit(`submit:${user.id}`, 5, 60 * 1000);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { 
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult.remaining, rateLimitResult.resetTime)
        }
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const { guesses, completed, won } = parsed.data;
    const today = new Date().toISOString().split('T')[0];

    // Get today's song
    const { data: dailySong } = await supabase
      .from('daily_song')
      .select('song_id, songs(*)')
      .eq('date', today)
      .single();

    if (!dailySong) {
      return NextResponse.json({ error: "No song scheduled for today" }, { status: 404 });
    }

    // Store guesses in the original format but ensure we have the data we need
    const guessesWithText = guesses.map((g, index) => ({
      ...g,
      guess_text: `${g.artist}${g.title ? ' - ' + g.title : ''}`,
      is_correct: g.titleCorrect && g.artistCorrect, // Both must be correct for a win
      attempt_number: index + 1
    }));

    // Upsert game result
    const { error: gameError } = await supabase
      .from('game_results')
      .upsert({
        user_id: user.id,
        date: today,
        song_id: dailySong.song_id,
        guesses: guessesWithText,
        completed,
        won,
        attempts: guesses.length,
      });

    if (gameError) {
      console.error('Game result error:', gameError);
      return NextResponse.json({ error: "Failed to save game result" }, { status: 500 });
    }

    // Update user stats
    const { data: currentStats } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', user.id)
      .single();

    let newStreak = 0;
    let newLongestStreak = 0;
    let newTotalGames = 1;
    let newTotalWins = won ? 1 : 0;

    if (currentStats) {
      newTotalGames = currentStats.total_games + 1;
      newTotalWins = currentStats.total_wins + (won ? 1 : 0);
      
      if (won) {
        newStreak = currentStats.streak + 1;
        newLongestStreak = Math.max(currentStats.longest_streak, newStreak);
      } else {
        newStreak = 0;
        newLongestStreak = currentStats.longest_streak;
      }
    } else {
      if (won) {
        newStreak = 1;
        newLongestStreak = 1;
      }
    }

    const { error: statsError } = await supabase
      .from('user_stats')
      .upsert({
        user_id: user.id,
        streak: newStreak,
        longest_streak: newLongestStreak,
        total_games: newTotalGames,
        total_wins: newTotalWins,
        updated_at: new Date().toISOString(),
      });

    if (statsError) {
      console.error('Stats error:', statsError);
      return NextResponse.json({ error: "Failed to update stats" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      stats: {
        streak: newStreak,
        longestStreak: newLongestStreak,
        totalGames: newTotalGames,
        totalWins: newTotalWins,
        winRate: Math.round((newTotalWins / newTotalGames) * 100),
      }
    });

  } catch (error: any) {
    console.error('Submit game error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
