import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseClient";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'current_streak';
    const limit = parseInt(searchParams.get('limit') || '10');

    const supabase = supabaseServer();

    // Get user stats with email from auth.users
    const { data, error } = await supabase
      .from('user_stats')
      .select(`
        user_id,
        streak,
        longest_streak,
        total_games,
        total_wins
      `)
      .gt('total_games', 0);

    if (error) {
      console.error('Leaderboard query error:', error);
      return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ leaderboard: [], type });
    }

    // Get user profiles for usernames
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('user_id, username');

    const { data: users } = await supabase.auth.admin.listUsers();
    
    const userEmailMap = new Map();
    const usernameMap = new Map();
    
    users?.users?.forEach(user => {
      userEmailMap.set(user.id, user.email);
    });
    
    profiles?.forEach(profile => {
      usernameMap.set(profile.user_id, profile.username);
    });

    // Process and sort data
    let processedData = data.map(stat => ({
      ...stat,
      email: userEmailMap.get(stat.user_id) || null,
      username: usernameMap.get(stat.user_id) || userEmailMap.get(stat.user_id)?.split('@')[0] || 'Anonymous',
      win_rate: Math.round((stat.total_wins / stat.total_games) * 100)
    }));

    // Sort by different criteria
    switch (type) {
      case 'current_streak':
        processedData.sort((a, b) => b.streak - a.streak);
        break;
      case 'longest_streak':
        processedData.sort((a, b) => b.longest_streak - a.longest_streak);
        break;
      case 'total_wins':
        processedData.sort((a, b) => b.total_wins - a.total_wins);
        break;
      case 'win_rate':
        processedData.sort((a, b) => b.win_rate - a.win_rate);
        break;
      default:
        processedData.sort((a, b) => b.streak - a.streak);
    }

    // Limit results and add rankings
    const leaderboard = processedData.slice(0, limit).map((stat, index) => ({
      rank: index + 1,
      username: stat.username,
      email: stat.email,
      current_streak: stat.streak,
      longest_streak: stat.longest_streak,
      total_games: stat.total_games,
      total_wins: stat.total_wins,
      win_rate: stat.win_rate,
      value: type === 'current_streak' ? stat.streak :
             type === 'longest_streak' ? stat.longest_streak :
             type === 'total_wins' ? stat.total_wins :
             type === 'win_rate' ? stat.win_rate : stat.streak
    }));

    return NextResponse.json({ leaderboard, type });

  } catch (error: any) {
    console.error('Leaderboard error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
