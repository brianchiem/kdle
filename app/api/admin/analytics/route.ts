import { NextResponse } from "next/server";
import { supabaseServer, supabaseServerWithAuth } from "@/lib/supabaseClient";
import { todayPST } from "@/lib/date";

export async function GET(req: Request) {
  // Admin guard
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const supabase = supabaseServerWithAuth(token);
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    const allow = (process.env.ADMIN_EMAILS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (allow.length && !allow.includes((user.email || "").toLowerCase())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } catch {}

  const supabase = supabaseServer();
  const today = todayPST();

  try {
    // Total users with stats
    const { count: totalUsers } = await supabase
      .from("user_stats")
      .select("*", { count: "exact", head: true });

    // Active users (played in last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const { count: activeUsers } = await supabase
      .from("user_stats")
      .select("*", { count: "exact", head: true })
      .gte("updated_at", sevenDaysAgo.toISOString());

    // Total games played
    const { data: gameStats } = await supabase
      .from("user_stats")
      .select("total_games, total_wins");
    
    const totalGames = gameStats?.reduce((sum, user) => sum + (user.total_games || 0), 0) || 0;
    const totalWins = gameStats?.reduce((sum, user) => sum + (user.total_wins || 0), 0) || 0;
    const overallWinRate = totalGames > 0 ? (totalWins / totalGames * 100) : 0;

    // Top streaks
    const { data: topStreaks } = await supabase
      .from("user_stats")
      .select("longest_streak")
      .order("longest_streak", { ascending: false })
      .limit(10);

    // Songs in database
    const { count: totalSongs } = await supabase
      .from("songs")
      .select("*", { count: "exact", head: true });

    // Scheduled songs
    const { count: scheduledSongs } = await supabase
      .from("daily_song")
      .select("*", { count: "exact", head: true });

    // Recent activity (last 30 days of user stats updates)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const { data: recentActivity } = await supabase
      .from("user_stats")
      .select("updated_at, total_games")
      .gte("updated_at", thirtyDaysAgo.toISOString())
      .order("updated_at", { ascending: false });

    // Group activity by day
    const activityByDay: Record<string, number> = {};
    recentActivity?.forEach(stat => {
      const day = stat.updated_at.split('T')[0];
      activityByDay[day] = (activityByDay[day] || 0) + 1;
    });

    return NextResponse.json({
      users: {
        total: totalUsers ?? 0,
        active: activeUsers ?? 0,
        retention: (totalUsers ?? 0) > 0 ? ((activeUsers ?? 0) / (totalUsers ?? 0) * 100) : 0
      },
      games: {
        total: totalGames,
        wins: totalWins,
        winRate: Math.round(overallWinRate * 100) / 100
      },
      content: {
        totalSongs: totalSongs || 0,
        scheduledSongs: scheduledSongs || 0,
        unscheduledSongs: Math.max(0, (totalSongs || 0) - (scheduledSongs || 0))
      },
      streaks: {
        topStreaks: topStreaks?.map(s => s.longest_streak) || [],
        averageStreak: topStreaks?.length ? 
          Math.round((topStreaks.reduce((sum, s) => sum + s.longest_streak, 0) / topStreaks.length) * 100) / 100 : 0
      },
      activity: {
        dailyActivity: activityByDay,
        totalDays: Object.keys(activityByDay).length
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
