"use client";
import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";

export default function AdminPage() {
  const supabase = supabaseBrowser();
  const [spotifyId, setSpotifyId] = useState("");
  const [selectedSong, setSelectedSong] = useState<string>("");
  const [scheduleDate, setScheduleDate] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [playingPreview, setPlayingPreview] = useState<string | null>(null);
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);
  const [data, setData] = useState<{
    songs: Array<{ spotify_id: string; title: string; artist: string; album_image: string | null; release_year: number | null; preview_url: string | null }>;
    today: { date: string; song?: { spotify_id: string; title: string; artist: string; album_image: string | null } } | null;
  } | null>(null);
  const now = useMemo(() => new Date(), []);
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number>(now.getMonth() + 1); // 1-12
  type CalendarDay = { date: string; song?: { spotify_id: string; title: string; artist: string; album_image: string | null } };
  const [calendar, setCalendar] = useState<{ days: CalendarDay[] } | null>(null);
  const [popover, setPopover] = useState<{ date: string; song?: { spotify_id: string; title: string; artist: string; album_image: string | null } } | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSpotifySearch, setShowSpotifySearch] = useState(false);
  const [addId, setAddId] = useState("");

  async function refreshCalendar() {
    try {
      if (!accessToken) return;
      const res = await fetch(`/api/admin/calendar?year=${year}&month=${month}`, { cache: "no-store", headers: { Authorization: `Bearer ${accessToken}` } });
      if (res.ok) {
        setCalendar(await res.json());
        setAuthError(null);
      } else if (res.status === 401 || res.status === 403) {
        setAuthError(res.status === 401 ? "Please sign in to access admin features" : "Your account is not authorized for admin access");
      }
    } catch {}
  }

  async function refresh() {
    try {
      setLoading(true);
      setError(null);
      setAuthError(null);
      if (!accessToken) return; // wait until we have a token to avoid 401 flash
      const res = await fetch("/api/admin/songs", { cache: "no-store", headers: { Authorization: `Bearer ${accessToken}` } });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setAuthError(res.status === 401 ? "Please sign in to access admin features" : "Your account is not authorized for admin access");
          return;
        }
        throw new Error("Failed to load admin data");
      }
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (e: any) {
      setError(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!accessToken) return;
    refresh();
  }, [accessToken]);

  useEffect(() => {
    refreshCalendar();
  }, [year, month, accessToken]);

  // Keep access token in state
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (mounted) {
        setAccessToken(data.session?.access_token ?? null);
        setUserEmail(data.session?.user?.email ?? null);
      }
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setAccessToken(session?.access_token ?? null);
      setUserEmail(session?.user?.email ?? null);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Audio preview controls
  function playPreview(url: string, spotifyId: string) {
    if (playingPreview === spotifyId) {
      // Stop current preview
      audioRef?.pause();
      setPlayingPreview(null);
      return;
    }
    
    // Stop any existing audio
    audioRef?.pause();
    
    // Create new audio element
    const audio = new Audio(url);
    audio.volume = 0.5;
    audio.addEventListener('ended', () => setPlayingPreview(null));
    audio.addEventListener('error', () => setPlayingPreview(null));
    
    setAudioRef(audio);
    setPlayingPreview(spotifyId);
    audio.play().catch(() => setPlayingPreview(null));
  }

  async function fetchAnalytics() {
    try {
      if (!accessToken) return;
      const res = await fetch('/api/admin/analytics', { 
        cache: 'no-store', 
        headers: { Authorization: `Bearer ${accessToken}` } 
      });
      if (res.ok) {
        setAnalytics(await res.json());
      }
    } catch {}
  }

  async function searchSpotify() {
    if (!searchQuery.trim()) return;
    try {
      setSearchLoading(true);
      const res = await fetch('/api/admin/search-spotify', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
        },
        body: JSON.stringify({ query: searchQuery.trim(), limit: 20 })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Search failed');
      setSearchResults(json.results || []);
    } catch (e: any) {
      setError(e?.message || 'Search failed');
    } finally {
      setSearchLoading(false);
    }
  }

  async function addSongFromSearch(track: any) {
    try {
      setLoading(true);
      setError(null);
      setMessage(null);
      const res = await fetch("/api/admin/add-song", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
        body: JSON.stringify({ spotify_id: track.spotify_id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Add failed");
      setMessage(`Added "${track.title}" by ${track.artist}.`);
      await refresh();
      await refreshCalendar();
    } catch (e: any) {
      setError(e?.message || "Add failed");
    } finally {
      setLoading(false);
    }
  }

  async function addSong() {
    if (!spotifyId.trim()) return;
    try {
      setLoading(true);
      setError(null);
      setMessage(null);
      const res = await fetch("/api/admin/add-song", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
        body: JSON.stringify({ spotify_id: spotifyId.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Add failed");
      setMessage("Song added.");
      setSpotifyId("");
      await refresh();
      await refreshCalendar();
    } catch (e: any) {
      setError(e?.message || "Add failed");
    } finally {
      setLoading(false);
    }
  }

  async function enrichSong(id: string) {
    try {
      setLoading(true);
      setError(null);
      setMessage(null);
      const res = await fetch("/api/admin/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
        body: JSON.stringify({ spotify_id: id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Enrich failed");
      setMessage("Enriched.");
      await refresh();
      await refreshCalendar();
    } catch (e: any) {
      setError(e?.message || "Enrich failed");
    } finally {
      setLoading(false);
    }
  }

  async function scheduleToday(spotify_id?: string, date?: string) {
    const id = spotify_id || selectedSong;
    if (!id) {
      setError("Select a song first");
      return;
    }
    try {
      setLoading(true);
      setError(null);
      setMessage(null);
      const res = await fetch("/api/admin/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
        body: JSON.stringify({ spotify_id: id, date: date || scheduleDate || undefined }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Failed to schedule");
      const songInfo = data?.songs?.find(s => s.spotify_id === id);
      const songName = songInfo ? `${songInfo.artist} - ${songInfo.title}` : id;
      setMessage(`Scheduled "${songName}" for ${date || scheduleDate || "today"}`);
      setSelectedSong("");
      setScheduleDate("");
      await refresh();
      await refreshCalendar();
    } catch (e: any) {
      setError(e?.message || "Failed to schedule");
    } finally {
      setLoading(false);
    }
  }

  const todayLabel = useMemo(() => {
    if (!data?.today) return null;
    const t = data.today;
    if (!t.song) return `${t.date}: not set`;
    return `${t.date}: ${t.song.artist} – ${t.song.title}`;
  }, [data]);

  function monthName(y: number, m: number) {
    return new Date(y, m - 1, 1).toLocaleString(undefined, { month: "long", year: "numeric" });
  }

  function goPrevMonth() {
    const d = new Date(year, month - 2, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth() + 1);
  }
  function goNextMonth() {
    const d = new Date(year, month, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth() + 1);
  }

  function buildCalendarGrid(y: number, m: number) {
    const first = new Date(y, m - 1, 1);
    const last = new Date(y, m, 0);
    const startWeekday = (first.getDay() + 6) % 7; // make Monday=0
    const daysInMonth = last.getDate();
    const cells: Array<{ dateStr: string | null; label: string }> = [];
    for (let i = 0; i < startWeekday; i++) cells.push({ dateStr: null, label: "" });
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(y, m - 1, d));
      cells.push({ dateStr: ds, label: String(d) });
    }
    while (cells.length % 7 !== 0) cells.push({ dateStr: null, label: "" });
    return cells;
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-fuchsia-200 via-white to-indigo-200 dark:from-fuchsia-900/30 dark:via-black dark:to-indigo-900/30">
      <header className="w-full max-w-4xl px-6 py-8">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold">Admin</h1>
            <p className="text-sm text-foreground/70">Manage songs and schedule the daily.</p>
          </div>
          <div className="text-right flex items-center gap-2">
            <button
              onClick={async () => {
                setShowAnalytics(!showAnalytics);
                if (!showAnalytics && !analytics) {
                  await fetchAnalytics();
                }
              }}
              className="inline-flex items-center gap-2 rounded-full border border-foreground/15 px-3 py-1 text-xs hover:bg-black/5 dark:hover:bg-white/10"
            >
              📊 Analytics
            </button>
            {userEmail ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-foreground/15 px-3 py-1 text-xs">
                <span className="opacity-70">Signed in as</span>
                <span className="font-medium">{userEmail}</span>
              </div>
            ) : (
              <a href="/auth" className="inline-flex items-center gap-2 rounded-full border border-foreground/15 px-3 py-1 text-xs hover:bg-black/5 dark:hover:bg-white/10">
                Sign in
              </a>
            )}
          </div>
        </div>
      </header>

      <main className="w-full max-w-4xl px-6 flex-1 flex flex-col gap-6">
        {/* Auth error banner */}
        {authError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
            <div className="flex items-center justify-between">
              <span>{authError}</span>
              <button onClick={() => setAuthError(null)} className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200">×</button>
            </div>
            {authError.includes("not authorized") && (
              <div className="mt-2 text-sm opacity-80">
                Contact an admin to add your email to the allowlist.
              </div>
            )}
            {authError.includes("sign in") && (
              <div className="mt-2">
                <a href="/auth" className="text-sm underline hover:no-underline">Go to sign in page</a>
              </div>
            )}
          </div>
        )}
        
        {/* Analytics Dashboard */}
        {showAnalytics && analytics && (
          <section className="rounded-2xl border border-foreground/10 bg-background/60 backdrop-blur p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Analytics Dashboard</h2>
              <button 
                onClick={() => fetchAnalytics()}
                className="text-xs rounded border border-foreground/15 px-2 py-1 hover:bg-black/5 dark:hover:bg-white/10"
              >
                Refresh
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {/* User Stats */}
              <div className="rounded-lg border border-foreground/10 p-4">
                <div className="text-sm text-foreground/70 mb-1">Total Users</div>
                <div className="text-2xl font-semibold">{analytics.users.total}</div>
                <div className="text-xs text-foreground/60">
                  {analytics.users.active} active (7d)
                </div>
              </div>
              
              {/* Games Stats */}
              <div className="rounded-lg border border-foreground/10 p-4">
                <div className="text-sm text-foreground/70 mb-1">Total Games</div>
                <div className="text-2xl font-semibold">{analytics.games.total}</div>
                <div className="text-xs text-foreground/60">
                  {analytics.games.winRate}% win rate
                </div>
              </div>
              
              {/* Content Stats */}
              <div className="rounded-lg border border-foreground/10 p-4">
                <div className="text-sm text-foreground/70 mb-1">Songs</div>
                <div className="text-2xl font-semibold">{analytics.content.totalSongs}</div>
                <div className="text-xs text-foreground/60">
                  {analytics.content.scheduledSongs} scheduled
                </div>
              </div>
              
              {/* Streaks Stats */}
              <div className="rounded-lg border border-foreground/10 p-4">
                <div className="text-sm text-foreground/70 mb-1">Avg Streak</div>
                <div className="text-2xl font-semibold">{analytics.streaks.averageStreak}</div>
                <div className="text-xs text-foreground/60">
                  Best: {Math.max(...analytics.streaks.topStreaks, 0)}
                </div>
              </div>
            </div>
            
            {/* Recent Activity */}
            <div className="rounded-lg border border-foreground/10 p-4">
              <h3 className="font-medium mb-3">Recent Activity (30 days)</h3>
              <div className="grid grid-cols-7 gap-1 text-xs">
                {Object.entries(analytics.activity.dailyActivity)
                  .sort(([a], [b]) => b.localeCompare(a))
                  .slice(0, 28)
                  .reverse()
                  .map(([date, count]) => {
                    const numCount = Number(count);
                    return (
                      <div key={date} className="text-center">
                        <div className="text-foreground/60">{new Date(date).getDate()}</div>
                        <div 
                          className={`h-3 rounded-sm ${
                            numCount > 5 ? 'bg-green-500' : 
                            numCount > 2 ? 'bg-green-300' : 
                            numCount > 0 ? 'bg-green-100' : 'bg-foreground/10'
                          }`}
                          title={`${date}: ${numCount} games`}
                        />
                      </div>
                    );
                  })}
              </div>
            </div>
          </section>
        )}
        
        <section className="rounded-2xl border border-foreground/10 bg-background/60 backdrop-blur p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Schedule calendar</h2>
            <div className="flex items-center gap-2 text-sm">
              <button className="rounded border border-foreground/15 px-2 py-1" onClick={goPrevMonth}>&lt;</button>
              <div className="min-w-[10rem] text-center">{monthName(year, month)}</div>
              <button className="rounded border border-foreground/15 px-2 py-1" onClick={goNextMonth}>&gt;</button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 text-xs mb-1 text-foreground/70">
            {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d) => (
              <div key={d} className="p-1 text-center">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {buildCalendarGrid(year, month).map((cell, idx) => {
              const dayInfo: CalendarDay | undefined = cell.dateStr ? calendar?.days?.find((d) => d.date === cell.dateStr) : undefined;
              const scheduled = !!(dayInfo && dayInfo.song);
              return (
                <button
                  key={idx}
                  type="button"
                  className={`min-h-[72px] text-left rounded border ${scheduled ? 'border-fuchsia-400/50 bg-fuchsia-50 dark:bg-fuchsia-900/10' : 'border-foreground/10'} p-1 ${cell.dateStr ? 'hover:bg-black/5 dark:hover:bg-white/10' : ''}`}
                  disabled={!cell.dateStr}
                  title={selectedSong ? `Schedule selected song on ${cell.dateStr}` : 'Select a song above, then click a day'}
                  onClick={async () => {
                    if (!cell.dateStr) return;
                    if (scheduled && dayInfo) {
                      setPopover({ date: cell.dateStr, song: dayInfo.song });
                      return;
                    }
                    if (!selectedSong) {
                      setMessage('Select a song above, then click a day to schedule.');
                      return;
                    }
                    await scheduleToday(undefined, cell.dateStr);
                  }}
                >
                  <div className="text-[10px] text-foreground/60">{cell.label}</div>
                  {scheduled && dayInfo?.song && (
                    <div className="mt-1 flex items-center gap-1">
                      {dayInfo.song.album_image ? (
                        <img src={dayInfo.song.album_image} alt="cover" className="w-5 h-5 rounded object-cover" />
                      ) : (
                        <div className="w-5 h-5 rounded bg-foreground/10" />
                      )}
                      <div className="truncate" title={`${dayInfo.song.artist} – ${dayInfo.song.title}`}>
                        {dayInfo.song.artist} – {dayInfo.song.title}
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          {/* Popover for scheduled day */}
          {popover && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setPopover(null)}>
              <div className="w-full max-w-md rounded-xl border border-foreground/10 bg-background p-4" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-3">
                  {popover.song?.album_image ? (
                    <img src={popover.song.album_image} className="w-14 h-14 rounded object-cover" alt="cover" />
                  ) : (
                    <div className="w-14 h-14 rounded bg-foreground/10" />
                  )}
                  <div>
                    <div className="font-medium">{popover.song?.artist} – {popover.song?.title}</div>
                    <div className="text-xs text-foreground/60">{popover.date}</div>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  {popover.song?.spotify_id && (
                    <a
                      href={`https://open.spotify.com/track/${popover.song.spotify_id}`}
                      target="_blank"
                      className="text-xs rounded border border-foreground/15 px-3 py-1 hover:bg-black/5 dark:hover:bg-white/10"
                    >
                      Open on Spotify
                    </a>
                  )}
                  <button
                    className="text-xs rounded border border-foreground/15 px-3 py-1 hover:bg-black/5 dark:hover:bg-white/10"
                    onClick={async () => {
                      try {
                        const res = await fetch('/api/admin/unschedule', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
                          body: JSON.stringify({ date: popover.date }),
                        });
                        const j = await res.json();
                        if (!res.ok) throw new Error(j?.error || 'Failed to unschedule');
                        setPopover(null);
                        await refresh();
                        await refreshCalendar();
                      } catch (e: any) {
                        setError(e?.message || 'Failed to unschedule');
                      }
                    }}
                  >
                    Unset
                  </button>
                  <div className="flex-1" />
                  <button
                    className="text-xs rounded bg-foreground text-background px-3 py-1 disabled:opacity-50"
                    disabled={!selectedSong}
                    title={!selectedSong ? 'Select a song above to reschedule' : ''}
                    onClick={async () => {
                      try {
                        if (!selectedSong) return;
                        const res = await fetch('/api/admin/schedule', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
                          body: JSON.stringify({ spotify_id: selectedSong, date: popover.date }),
                        });
                        const j = await res.json();
                        if (!res.ok) throw new Error(j?.error || 'Failed to reschedule');
                        setPopover(null);
                        await refresh();
                        const resCal = await fetch(`/api/admin/calendar?year=${year}&month=${month}`, { cache: 'no-store', headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {} });
                        if (resCal.ok) setCalendar(await resCal.json());
                      } catch (e: any) {
                        setError(e?.message || 'Failed to reschedule');
                      }
                    }}
                  >
                    Reschedule to ID above
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-foreground/10 bg-background/60 backdrop-blur p-6">
          <h2 className="font-semibold mb-3">Schedule song</h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-foreground/70 block mb-2">Select song from database:</label>
              <select
                value={selectedSong}
                onChange={(e) => setSelectedSong(e.target.value)}
                className="w-full rounded border border-foreground/15 bg-background/70 px-3 py-2 outline-none focus:ring-2 focus:ring-fuchsia-400"
              >
                <option value="">Choose a song...</option>
                {data?.songs?.map((song) => (
                  <option key={song.spotify_id} value={song.spotify_id}>
                    {song.artist} - {song.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="flex-1 rounded border border-foreground/15 bg-background/70 px-3 py-2 text-sm"
                title="Pick a date (YYYY-MM-DD). Leave empty for today."
                placeholder="Leave empty for today"
              />
              <button
                className="rounded bg-foreground text-background px-4 py-2 text-sm disabled:opacity-50"
                onClick={() => scheduleToday()}
                disabled={!selectedSong || loading}
              >
                {loading ? "..." : "Schedule"}
              </button>
            </div>
          </div>
          <div className="text-xs text-foreground/70 mt-2">Today: {todayLabel ?? "loading..."}</div>
        </section>

        <section className="rounded-2xl border border-foreground/10 bg-background/60 backdrop-blur p-6">
          <h2 className="font-semibold mb-3">Add song</h2>
          <div className="flex gap-2 mb-3">
            <button
              className={`text-xs rounded border px-3 py-1 ${!showSpotifySearch ? 'bg-foreground text-background' : 'border-foreground/15 hover:bg-black/5 dark:hover:bg-white/10'}`}
              onClick={() => setShowSpotifySearch(false)}
            >
              📝 Manual ID
            </button>
            <button
              className={`text-xs rounded border px-3 py-1 ${showSpotifySearch ? 'bg-foreground text-background' : 'border-foreground/15 hover:bg-black/5 dark:hover:bg-white/10'}`}
              onClick={() => setShowSpotifySearch(true)}
            >
              🔍 Search Spotify
            </button>
          </div>
          
          {!showSpotifySearch ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={addId}
                onChange={(e) => setAddId(e.target.value)}
                placeholder="Spotify track ID"
                className="flex-1 rounded border border-foreground/15 bg-background/70 px-3 py-2 outline-none focus:ring-2 focus:ring-fuchsia-400"
              />
              <button
                className="rounded bg-foreground text-background px-4 py-2 text-sm disabled:opacity-50"
                onClick={addSong}
                disabled={!addId || loading}
              >
                {loading ? "..." : "Add"}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for artist, song, or album..."
                  className="flex-1 rounded border border-foreground/15 bg-background/70 px-3 py-2 outline-none focus:ring-2 focus:ring-fuchsia-400"
                  onKeyDown={(e) => e.key === 'Enter' && searchSpotify()}
                />
                <button
                  className="rounded bg-foreground text-background px-4 py-2 text-sm disabled:opacity-50"
                  onClick={searchSpotify}
                  disabled={!searchQuery.trim() || searchLoading}
                >
                  {searchLoading ? "..." : "Search"}
                </button>
              </div>
              
              {searchResults.length > 0 && (
                <div className="max-h-96 overflow-y-auto space-y-2 border border-foreground/10 rounded-lg p-3">
                  {searchResults.map((track: any) => (
                    <div key={track.spotify_id} className="flex items-center gap-3 p-2 rounded border border-foreground/5 hover:bg-black/5 dark:hover:bg-white/5">
                      {track.album_image ? (
                        <img src={track.album_image} alt="cover" className="w-12 h-12 rounded object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded bg-foreground/10" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium line-clamp-1">{track.title}</div>
                        <div className="text-sm text-foreground/70 line-clamp-1">
                          {track.artist}
                        </div>
                        <div className="text-xs text-foreground/60">
                          {track.album} • {track.release_year}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {track.preview_url && (
                          <button
                            className={`text-xs rounded border border-foreground/15 px-2 py-1 hover:bg-black/5 dark:hover:bg-white/10 ${playingPreview === track.spotify_id ? 'bg-green-100 border-green-300 text-green-800 dark:bg-green-900/20 dark:border-green-700 dark:text-green-200' : ''}`}
                            onClick={() => playPreview(track.preview_url, track.spotify_id)}
                            title={playingPreview === track.spotify_id ? 'Stop preview' : 'Play preview'}
                          >
                            {playingPreview === track.spotify_id ? '⏸️' : '▶️'}
                          </button>
                        )}
                        <button
                          className="text-xs rounded bg-foreground text-background px-3 py-1 hover:opacity-80"
                          onClick={() => addSongFromSearch(track)}
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-foreground/10 bg-background/60 backdrop-blur p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Latest songs</h2>
            <button
              className="text-xs rounded border border-foreground/15 px-3 py-1 hover:bg-black/5 dark:hover:bg-white/10"
              onClick={refresh}
            >
              Refresh
            </button>
          </div>
          {loading && <div className="text-sm text-foreground/70">Loading…</div>}
          {error && <div className="text-sm text-red-600">{error}</div>}
          {message && <div className="text-sm text-green-600">{message}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {data?.songs?.map((s) => (
              <div key={s.spotify_id} className="rounded-xl border border-foreground/10 p-3 space-y-2">
                <div className="flex items-center gap-3">
                  {s.album_image ? (
                    <img src={s.album_image} alt="cover" className="w-12 h-12 rounded object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded bg-foreground/10" />
                  )}
                  <div className="text-sm">
                    <div className="font-medium line-clamp-1">{s.title}</div>
                    <div className="text-foreground/70 line-clamp-1">{s.artist}</div>
                    <div className="text-foreground/60 text-xs">{s.release_year ?? ""}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {s.preview_url && (
                    <button
                      className={`text-xs rounded border border-foreground/15 px-2 py-1 hover:bg-black/5 dark:hover:bg-white/10 ${playingPreview === s.spotify_id ? 'bg-green-100 border-green-300 text-green-800 dark:bg-green-900/20 dark:border-green-700 dark:text-green-200' : ''}`}
                      onClick={() => playPreview(s.preview_url!, s.spotify_id)}
                      title={playingPreview === s.spotify_id ? 'Stop preview' : 'Play preview'}
                    >
                      {playingPreview === s.spotify_id ? '⏸️ Stop' : '▶️ Play'}
                    </button>
                  )}
                  <button
                    className="text-xs rounded border border-foreground/15 px-2 py-1 hover:bg-black/5 dark:hover:bg-white/10"
                    onClick={() => enrichSong(s.spotify_id)}
                  >
                    Enrich
                  </button>
                  <button
                    className="text-xs rounded border border-foreground/15 px-2 py-1 hover:bg-black/5 dark:hover:bg-white/10"
                    onClick={() => scheduleToday(s.spotify_id)}
                  >
                    Schedule today
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
