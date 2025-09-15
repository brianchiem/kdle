"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { Trophy, Medal, Award, TrendingUp, Target, Users } from "lucide-react";

type LeaderboardEntry = {
  rank: number;
  username: string;
  email: string;
  current_streak: number;
  longest_streak: number;
  total_games: number;
  total_wins: number;
  win_rate: number;
  value: number;
};

type LeaderboardType = 'current_streak' | 'longest_streak' | 'total_wins' | 'win_rate';

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<LeaderboardType>('current_streak');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userRank, setUserRank] = useState<number | null>(null);

  const leaderboardTypes = [
    { key: 'current_streak' as LeaderboardType, label: 'Current Streak', icon: TrendingUp },
    { key: 'longest_streak' as LeaderboardType, label: 'Longest Streak', icon: Trophy },
    { key: 'total_wins' as LeaderboardType, label: 'Total Wins', icon: Target },
    { key: 'win_rate' as LeaderboardType, label: 'Win Rate', icon: Award },
  ];

  // Check user auth status
  useEffect(() => {
    const supabase = supabaseBrowser();
    (async () => {
      const { data } = await supabase.auth.getSession();
      setUserEmail(data.session?.user?.email ?? null);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Fetch leaderboard data
  useEffect(() => {
    fetchLeaderboard();
  }, [activeType]);

  async function fetchLeaderboard() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/leaderboard?type=${activeType}&limit=50`);
      if (!res.ok) throw new Error('Failed to fetch leaderboard');
      const data = await res.json();
      setLeaderboard(data.leaderboard || []);
      
      // Find current user's rank
      if (userEmail) {
        const userEntry = data.leaderboard?.find((entry: LeaderboardEntry) => entry.email === userEmail);
        setUserRank(userEntry?.rank || null);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  }

  function getRankIcon(rank: number) {
    switch (rank) {
      case 1: return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 2: return <Medal className="w-5 h-5 text-gray-400" />;
      case 3: return <Award className="w-5 h-5 text-amber-600" />;
      default: return <span className="w-5 h-5 flex items-center justify-center text-sm font-medium text-foreground/60">#{rank}</span>;
    }
  }

  function formatValue(value: number, type: LeaderboardType) {
    switch (type) {
      case 'win_rate': return `${value}%`;
      default: return value.toString();
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-fuchsia-200 via-white to-indigo-200 dark:from-fuchsia-900/30 dark:via-black dark:to-indigo-900/30">
      <header className="w-full max-w-4xl px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">Leaderboard</h1>
            <p className="text-sm text-foreground/70 mt-1">See how you stack up against other K-pop fans</p>
          </div>
          <div className="text-left sm:text-right">
            {userEmail ? (
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 rounded-full border border-foreground/15 px-3 py-1 text-xs">
                  <span className="opacity-70">Signed in as</span>
                  <span className="font-medium truncate max-w-[150px] sm:max-w-none">{userEmail}</span>
                </div>
                {userRank && (
                  <div className="text-xs text-foreground/60">
                    Your rank: #{userRank}
                  </div>
                )}
              </div>
            ) : (
              <a href="/auth" className="inline-flex items-center gap-2 rounded-full border border-foreground/15 px-3 py-1 text-xs hover:bg-black/5 dark:hover:bg-white/10">
                Sign in to compete
              </a>
            )}
          </div>
        </div>
      </header>

      <main className="w-full max-w-4xl px-4 sm:px-6 pb-12 space-y-6">
        {/* Category Tabs */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
          {leaderboardTypes.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveType(key)}
              className={`flex items-center justify-center sm:justify-start gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                activeType === key
                  ? 'bg-foreground text-background'
                  : 'bg-background/60 border border-foreground/15 hover:bg-black/5 dark:hover:bg-white/10'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{label.split(' ')[0]}</span>
            </button>
          ))}
        </div>

        {/* Leaderboard */}
        <div className="rounded-2xl border border-foreground/10 bg-background/60 backdrop-blur overflow-hidden">
          {loading && (
            <div className="p-8 text-center text-foreground/70">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
              Loading leaderboard...
            </div>
          )}

          {error && (
            <div className="p-8 text-center text-red-600">
              {error}
            </div>
          )}

          {!loading && !error && leaderboard.length === 0 && (
            <div className="p-8 text-center text-foreground/70">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
              No players yet. Be the first to play!
            </div>
          )}

          {!loading && !error && leaderboard.length > 0 && (
            <div className="divide-y divide-foreground/10">
              {leaderboard.map((entry) => (
                <div
                  key={`${entry.rank}-${entry.email}`}
                  className={`flex items-center justify-between p-3 sm:p-4 hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${
                    entry.email === userEmail ? 'bg-fuchsia-50 dark:bg-fuchsia-900/20 border-l-4 border-l-fuchsia-400' : ''
                  }`}
                >
                  <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
                    <div className="flex items-center justify-center w-6 sm:w-8 flex-shrink-0">
                      {getRankIcon(entry.rank)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">
                        {entry.username}
                        {entry.email === userEmail && (
                          <span className="ml-2 text-xs text-fuchsia-600 dark:text-fuchsia-400">(You)</span>
                        )}
                      </div>
                      <div className="text-xs text-foreground/60 flex flex-col sm:flex-row sm:space-x-3 space-y-1 sm:space-y-0">
                        <span>Games: {entry.total_games}</span>
                        <span>Wins: {entry.total_wins}</span>
                        <span className="hidden sm:inline">Win Rate: {entry.win_rate}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-base sm:text-lg font-bold">
                      {formatValue(entry.value, activeType)}
                    </div>
                    <div className="text-xs text-foreground/60 hidden sm:block">
                      Current: {entry.current_streak} | Best: {entry.longest_streak}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="text-center">
          <a
            href="/"
            className="inline-flex items-center justify-center gap-2 w-full sm:w-auto rounded-full border border-foreground/15 px-4 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10"
          >
            ← Back to Game
          </a>
        </div>
      </main>
    </div>
  );
}
