"use client";
import { Play, Pause, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";

export default function Home() {
  const [guess, setGuess] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [today, setToday] = useState<{ date: string; preview_url: string | null; album_image?: string | null; max_guesses: number } | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [hasUsername, setHasUsername] = useState<boolean | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [guesses, setGuesses] = useState<{ text: string; correct: boolean }[]>([]);
  const [hint, setHint] = useState<{ level: number; text: string } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<{ id: string; label: string; album_image: string | null; preview_url: string | null }[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [stats, setStats] = useState<{ streak: number; longest_streak: number; total_games: number; total_wins: number; win_rate: number } | null>(null);
  const [shareText, setShareText] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [songInfo, setSongInfo] = useState<{ artist: string; title: string } | null>(null);
  const [volume, setVolume] = useState(0.5);

  // Load today's challenge
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/game/today", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load today's challenge");
        const json = await res.json();
        if (!ignore) {
          setToday({ date: json.date, preview_url: json.preview_url ?? null, album_image: json.album_image ?? null, max_guesses: json.max_guesses ?? 6 });
          // Reset local game UI state
          setGuesses([]);
          setHint(null);
          setRemaining(json.max_guesses ?? 6);
        }
      } catch (e: any) {
        if (!ignore) setError(e?.message || "Failed to load");
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);

  // Check auth status and load user rank
  useEffect(() => {
    const supabase = supabaseBrowser();
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const user = data.session?.user;
        setUserEmail(user?.email || null);

        // Check if user has username and load user data if signed in
        if (user && data.session?.access_token) {
          try {
            // Check if user has a username
            const profileRes = await fetch('/api/user/profile', {
              headers: { Authorization: `Bearer ${data.session.access_token}` }
            });
            if (profileRes.ok) {
              const profile = await profileRes.json();
              setHasUsername(!!profile.username);
            } else {
              setHasUsername(false);
            }

            // Load user stats and today's game state
            const statsRes = await fetch('/api/game/stats', {
              headers: { Authorization: `Bearer ${data.session.access_token}` }
            });
            if (statsRes.ok) {
              const statsData = await statsRes.json();
              setStats({
                streak: statsData.stats.streak,
                longest_streak: statsData.stats.longest_streak,
                total_games: statsData.stats.total_games,
                total_wins: statsData.stats.total_wins,
                win_rate: statsData.stats.total_games > 0 ? Math.round((statsData.stats.total_wins / statsData.stats.total_games) * 100) : 0
              });
              // Restore game state if completed today
              if (statsData.todayCompleted) {
                setGameCompleted(true);
                setGameWon(statsData.todayWon);
                setGuesses(statsData.todayGuesses.map((g: any) => ({
                  text: g.guess_text || `${g.artist}${g.title ? ' - ' + g.title : ''}`,
                  correct: g.is_correct || (g.titleCorrect && g.artistCorrect)
                })));
                setRemaining(6 - statsData.todayGuesses.length);
                
                // Fetch song info if won
                if (statsData.todayWon) {
                  try {
                    const solRes = await fetch("/api/game/solution", { cache: "no-store" });
                    if (solRes.ok) {
                      const sol = await solRes.json();
                      if (sol?.artist && sol?.title) {
                        setSongInfo({ artist: sol.artist, title: sol.title });
                      }
                    }
                  } catch {}
                }
                
                // Generate share text
                const guessCount = statsData.todayGuesses.length;
                const shareEmojis = statsData.todayGuesses.map((g: any) => (g.is_correct || (g.titleCorrect && g.artistCorrect)) ? '🟩' : '🟥').join('');
                const shareText = `K-Dle ${new Date().toISOString().split('T')[0]} ${guessCount}/6\n\n${shareEmojis}\n\nPlay at ${window.location.origin}\nLeaderboard: ${window.location.origin}/leaderboard`;
                setShareText(shareText);
              }
            }

            // Load user rank
            const leaderboardRes = await fetch('/api/leaderboard?type=current_streak&limit=100', {
              headers: { Authorization: `Bearer ${data.session.access_token}` }
            });
            if (leaderboardRes.ok) {
              const leaderboard = await leaderboardRes.json();
              const userRank = leaderboard.leaderboard.findIndex((entry: any) => entry.email === user.email) + 1;
              setUserRank(userRank > 0 ? userRank : null);
            }
          } catch (e) {
            console.error('Failed to load user data:', e);
          }
        } else {
          setHasUsername(null);
        }
      } catch (e) {
        console.error('Auth check error:', e);
      }
    })();
  }, []);

  // Setup audio element
  useEffect(() => {
    if (!today?.preview_url) return;
    const audio = new Audio(today.preview_url);
    audioRef.current = audio;
    audio.preload = "auto";
    audio.volume = volume;
    audio.onended = () => setIsPlaying(false);
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [today?.preview_url, volume]);

  // Update volume when changed
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  async function playSnippet() {
    if (!today?.preview_url) return;
    const a = audioRef.current;
    if (!a) return;
    try {
      if (isPlaying) {
        a.pause();
        setIsPlaying(false);
      } else {
        // play the first ~5 seconds
        a.currentTime = 0;
        const playPromise = a.play();
        setIsPlaying(true);
        // Stop after 5 or 10 seconds depending on unlocked hint level
        const ms = hint?.level && hint.level >= 5 ? 10000 : 5000;
        setTimeout(() => {
          a.pause();
          setIsPlaying(false);
        }, ms);
        if (playPromise) await playPromise;
      }
    } catch (e) {
      console.warn("Audio play failed", e);
    }
  }

  async function submitGuess() {
    if (!guess.trim()) return;
    try {
      setSubmitting(true);
      setError(null);
      const res = await fetch("/api/game/guess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guess }),
      });
      if (!res.ok) {
        let msg = "Guess failed";
        try {
          const err = await res.json();
          if (err?.error) msg = err.error;
        } catch {}
        throw new Error(msg);
      }
      const json = await res.json();
      setGuesses((g) => [...g, { text: guess, correct: json.correct }]);
      setGuess("");
      if (typeof json.remaining_guesses === "number") setRemaining(json.remaining_guesses);
      // Fetch hint if unlocked
      if (!json.correct && json.next_hint_level > 0) {
        const hres = await fetch("/api/game/hint", { cache: "no-store" });
        if (hres.ok) {
          const hjson = await hres.json();
          let text = hjson.hint;
          if (json.artist_match) {
            text = `Artist is correct! ${text}`;
          }
          setHint({ level: hjson.hint_level, text });
        }
      }
      if (json.correct) {
        setHint({ level: 999, text: "Correct!" });
        setGameCompleted(true);
        setGameWon(true);
        
        try {
          // Submit game result to database
          const supabase = supabaseBrowser();
          const { data: session } = await supabase.auth.getSession();
          
          const gameGuesses = guesses.concat([{ text: guess, correct: true }]).map(g => ({
            artist: g.text.split(' - ')[0] || g.text,
            title: g.text.split(' - ')[1] || '',
            artistCorrect: json.artist_match || g.correct,
            titleCorrect: g.correct,
          }));

          if (session?.session?.access_token) {
            await fetch("/api/game/submit", {
              method: "POST",
              headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${session.session.access_token}`
              },
              body: JSON.stringify({ 
                guesses: gameGuesses,
                completed: true,
                won: true 
              }),
            });
          }

          // Update cookie-based stats (fallback)
          await fetch("/api/game/complete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ guesses_used: (today?.max_guesses ?? 6) - (remaining ?? 6), won: true }),
          });
          
          // Fetch latest stats
          const sres = await fetch("/api/user/stats", { cache: "no-store" });
          if (sres.ok) setStats(await sres.json());
          // Try to fetch solution (artist + title) now that the user has won
          let solutionLabel: string | null = null;
          try {
            const solRes = await fetch("/api/game/solution", { cache: "no-store" });
            if (solRes.ok) {
              const sol = await solRes.json();
              if (sol?.artist && sol?.title) {
                solutionLabel = `${sol.artist} – ${sol.title}`;
                setSongInfo({ artist: sol.artist, title: sol.title });
              }
            }
          } catch {}
          // Build share text using server-returned remaining_guesses to avoid stale state
          const attempts = Math.max(1, (today?.max_guesses ?? 6) - (json.remaining_guesses ?? 0));
          const total = today?.max_guesses ?? 6;
          const date = today?.date ?? "";
          const rows = (attempts > 1 ? new Array(attempts - 1).fill("🟥") : [])
            .concat(["🟩"]) 
            .join("");
          const header = solutionLabel
            ? `K‑Dle ${date} — ${attempts}/${total}`
            : `K‑Dle ${date} — ${attempts}/${total}`;
          const shareUrl = `${window.location.origin}/leaderboard`;
          setShareText(`${header}\n${rows}\n\nPlay K‑Dle: ${shareUrl}`);
        } catch {}
      }
    } catch (e: any) {
      setError(e?.message || "Error submitting guess");
    } finally {
      setSubmitting(false);
    }
  }

  // Autocomplete: debounce search as user types
  useEffect(() => {
    let t: any;
    if (!guess.trim()) {
      setSuggestions([]);
      return;
    }
    t = setTimeout(async () => {
      try {
        setSuggestLoading(true);
        const res = await fetch(`/api/search?q=${encodeURIComponent(guess)}&limit=5`, { cache: "no-store" });
        const j = await res.json();
        setSuggestions(Array.isArray(j.results) ? j.results : []);
      } catch {
        setSuggestions([]);
      } finally {
        setSuggestLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [guess]);

  return (
    <div className="min-h-screen w-full flex flex-col items-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-fuchsia-200 via-white to-indigo-200 dark:from-fuchsia-900/30 dark:via-black dark:to-indigo-900/30">
      <header className="w-full max-w-3xl px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">K-DLE</h1>
            <p className="text-sm text-foreground/70 mt-1">Guess the K-Pop song of the day</p>
            <p className="text-xs text-foreground/50 mt-1">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <a href="/leaderboard" className="inline-flex items-center gap-1 rounded-full border border-foreground/15 px-3 py-1 text-xs hover:bg-black/5 dark:hover:bg-white/10 whitespace-nowrap">
              <span>🏆</span>
              <span>Leaderboard</span>
            </a>
            {userEmail ? (
              <>
                <a href="/settings" className="inline-flex items-center gap-1 rounded-full border border-foreground/15 px-3 py-1 text-xs hover:bg-black/5 dark:hover:bg-white/10 whitespace-nowrap">
                  <span>⚙️</span>
                  <span>Settings</span>
                </a>
                <button
                  onClick={async () => {
                    const supabase = supabaseBrowser();
                    await supabase.auth.signOut();
                    window.location.reload();
                  }}
                  className="inline-flex items-center gap-1 rounded-full border border-foreground/15 px-3 py-1 text-xs hover:bg-black/5 dark:hover:bg-white/10 whitespace-nowrap"
                >
                  <span>🚪</span>
                  <span>Sign out</span>
                </button>
                <div className="inline-flex items-center gap-1 rounded-full border border-foreground/15 px-3 py-1 text-xs min-w-0">
                  <span className="opacity-70">😊</span>
                  <span className="font-medium truncate max-w-[120px] sm:max-w-none">{userEmail}</span>
                </div>
              </>
            ) : (
              <a href="/auth" className="inline-flex items-center gap-1 rounded-full border border-foreground/15 px-3 py-1 text-xs hover:bg-black/5 dark:hover:bg-white/10 whitespace-nowrap">
                Sign in
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Username setup prompt */}
      {userEmail && hasUsername === false && (
        <div className="w-full max-w-2xl px-6">
          <div className="rounded-lg bg-fuchsia-50 dark:bg-fuchsia-900/20 border border-fuchsia-200 dark:border-fuchsia-800 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-fuchsia-800 dark:text-fuchsia-200">Set up your username</h3>
                <p className="text-sm text-fuchsia-700 dark:text-fuchsia-300 mt-1">
                  Create a username to appear on the leaderboard and track your progress.
                </p>
              </div>
              <a
                href="/setup"
                className="rounded-lg bg-fuchsia-600 text-white px-4 py-2 text-sm font-medium hover:bg-fuchsia-700 transition-colors"
              >
                Set Username
              </a>
            </div>
          </div>
        </div>
      )}

      <main className="w-full max-w-2xl px-4 sm:px-6 pb-12 space-y-6">
        <section className="rounded-2xl border border-foreground/10 bg-background/60 backdrop-blur p-4 sm:p-6 flex flex-col items-center gap-4">
          {loading ? (
            <p className="text-sm text-foreground/70">Loading today’s challenge…</p>
          ) : error ? (
            <p className="text-sm text-red-500">{error}</p>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full px-4 sm:px-6 py-3 text-sm sm:text-base font-medium text-white bg-gradient-to-r from-fuchsia-500 to-indigo-500 hover:from-fuchsia-600 hover:to-indigo-600 active:scale-[.99] transition disabled:opacity-50 w-full sm:w-auto justify-center"
                  onClick={playSnippet}
                  disabled={!today?.preview_url}
                  aria-disabled={!today?.preview_url}
                  title={!today?.preview_url ? "No preview available" : "Play 5s snippet"}
                >
                  {isPlaying ? <Pause size={18} /> : <Play size={18} />} 
                  <span className="ml-1">{isPlaying ? "Pause" : "Play snippet"}</span>
                </button>
                
                {/* Volume Control */}
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <span className="text-xs text-foreground/60">🔊</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={volume}
                    onChange={(e) => {
                      const newVolume = parseFloat(e.target.value);
                      setVolume(newVolume);
                      // Don't interrupt playback, just update volume
                      if (audioRef.current) {
                        audioRef.current.volume = newVolume;
                      }
                    }}
                    className="w-16 sm:w-20 h-2 bg-foreground/20 rounded-lg appearance-none cursor-pointer slider"
                    style={{
                      background: `linear-gradient(to right, rgb(217, 70, 239) 0%, rgb(217, 70, 239) ${volume * 100}%, rgb(0, 0, 0, 0.2) ${volume * 100}%, rgb(0, 0, 0, 0.2) 100%)`
                    }}
                  />
                  <span className="text-xs text-foreground/60 w-8">{Math.round(volume * 100)}%</span>
                </div>
              </div>
              {!today?.preview_url && (
                <p className="text-xs text-foreground/70">No preview available for today’s track.</p>
              )}

              <div className="w-full flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-2">
                <input
                  value={guess}
                  onChange={(e) => setGuess(e.target.value.slice(0, 100))}
                  placeholder="Type your guess (Artist - Song)"
                  className="flex-1 rounded-lg border border-foreground/15 bg-background/70 px-3 py-3 sm:py-2 text-base sm:text-sm outline-none focus:ring-2 focus:ring-fuchsia-400"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && guess.trim() && !submitting && !gameCompleted) submitGuess();
                  }}
                  disabled={gameCompleted}
                  maxLength={100}
                />
                <button
                  type="button"
                  className="rounded-lg border border-foreground/10 bg-foreground text-background px-4 py-3 sm:py-2 text-base sm:text-sm font-medium disabled:opacity-50 whitespace-nowrap"
                  disabled={!guess.trim() || submitting || gameCompleted || (remaining !== null && remaining <= 0) || (hint?.level === 999)}
                  onClick={submitGuess}
                >
                  {submitting ? "..." : "Guess"}
                </button>
              </div>
              {/* Suggestions dropdown */}
              {suggestions.length > 0 && (
                <div className="w-full border border-foreground/10 rounded-lg bg-background/95 shadow-sm divide-y divide-foreground/10">
                  {suggestions.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-black/5 dark:hover:bg-white/10"
                      onClick={() => {
                        setGuess(s.label);
                        setSuggestions([]);
                      }}
                    >
                      {s.album_image ? (
                        <img src={s.album_image} alt="cover" className="w-8 h-8 rounded object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded bg-foreground/10" />
                      )}
                      <span className="text-sm">{s.label}</span>
                    </button>
                  ))}
                  <div className="flex items-center justify-between px-3 py-2 text-xs text-foreground/60">
                    <span>{suggestLoading ? "Searching…" : "Top results"}</span>
                    <button className="inline-flex items-center gap-1" onClick={() => setSuggestions([])}>
                      <X size={12} /> close
                    </button>
                  </div>
                </div>
              )}

              {/* Share button and completion message */}
              {gameCompleted && (
                <div className="w-full space-y-4">
                  <div className="text-center p-4 rounded-lg bg-gradient-to-r from-fuchsia-50 to-indigo-50 dark:from-fuchsia-900/20 dark:to-indigo-900/20 border border-fuchsia-200 dark:border-fuchsia-800">
                    <h3 className="text-lg font-semibold mb-2">
                      {gameWon ? "🎉 Congratulations!" : "😔 Better luck tomorrow!"}
                    </h3>
                    <p className="text-sm text-foreground/70 mb-3">
                      {gameWon 
                        ? `You got it in ${guesses.length} guess${guesses.length === 1 ? '' : 'es'}!`
                        : "You've used all your guesses for today."
                      }
                    </p>
                    
                    {/* Song information */}
                    {(gameWon && songInfo) || (!gameWon) ? (
                      <div className="flex items-center justify-center gap-3 p-3 rounded-lg bg-white/50 dark:bg-black/20">
                        {today?.album_image && (
                          <img
                            src={today.album_image}
                            alt="Album art"
                            className="w-16 h-16 object-cover rounded-lg"
                          />
                        )}
                        <div className="text-left">
                          <div className="font-semibold text-sm">
                            {songInfo ? `${songInfo.artist} - ${songInfo.title}` : "Song will be revealed after completion"}
                          </div>
                          {songInfo && (
                            <div className="text-xs text-foreground/60 mt-1">
                              Today's K-DLE song
                            </div>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                  
                  {shareText && (
                    <button
                      type="button"
                      className="w-full rounded-lg bg-gradient-to-r from-fuchsia-500 to-indigo-500 text-white py-3 px-4 font-medium hover:from-fuchsia-600 hover:to-indigo-600 transition-all"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(shareText);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        } catch {
                          // Fallback for browsers that don't support clipboard API
                          const textArea = document.createElement('textarea');
                          textArea.value = shareText;
                          document.body.appendChild(textArea);
                          textArea.select();
                          document.execCommand('copy');
                          document.body.removeChild(textArea);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }
                      }}
                    >
                      <Sparkles className="inline w-4 h-4 mr-2" />
                      Share your result
                    </button>
                  )}
                </div>
              )}
              <div className="text-center space-y-1">
                <p className="text-xs text-foreground/60">{today?.max_guesses ?? 6} guesses total. Hints unlock after each wrong guess.</p>
                {remaining !== null && (
                  <p className="text-xs text-foreground/60">
                    {remaining} {remaining === 1 ? "guess" : "guesses"} remaining
                  </p>
                )}
              </div>
              {hint && (
                <div className="w-full rounded-lg border border-fuchsia-300/30 bg-fuchsia-50 dark:bg-fuchsia-900/20 p-3 text-sm">
                  <div className="flex items-center gap-2 font-medium"><Sparkles size={16}/> Hint {hint.level !== 999 ? `#${hint.level}` : ""}</div>
                  <div className="text-foreground/80 mt-1">{hint.text}</div>
                  {hint.level >= 2 && today?.album_image && (
                    <div className="mt-3">
                      <img
                        src={today.album_image}
                        alt="Album art"
                        className="w-40 h-40 object-cover rounded-lg filter blur-sm"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Stats panel */}
              <div className="w-full flex items-center gap-3">
                <button
                  className="text-xs rounded border border-foreground/15 px-2 py-1 hover:bg-black/5 dark:hover:bg-white/10"
                  onClick={async () => {
                    try {
                      const supabase = supabaseBrowser();
                      const { data: session } = await supabase.auth.getSession();
                      
                      if (session?.session?.access_token) {
                        const sres = await fetch("/api/game/stats", { 
                          cache: "no-store",
                          headers: { Authorization: `Bearer ${session.session.access_token}` }
                        });
                        if (sres.ok) {
                          const statsData = await sres.json();
                          setStats({
                            streak: statsData.stats.streak,
                            longest_streak: statsData.stats.longest_streak,
                            total_games: statsData.stats.total_games,
                            total_wins: statsData.stats.total_wins,
                            win_rate: statsData.stats.total_games > 0 ? Math.round((statsData.stats.total_wins / statsData.stats.total_games) * 100) : 0
                          });
                        }
                      }
                    } catch {}
                  }}
                >
                  View stats
                </button>
              </div>
              {stats && userEmail && (
                <section className="rounded-2xl border border-foreground/10 bg-background/60 backdrop-blur p-4 sm:p-6">
                  <h2 className="font-semibold mb-4 text-center sm:text-left">Your Stats</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-xl sm:text-2xl font-bold text-fuchsia-600">{stats.streak}</div>
                      <div className="text-xs text-foreground/60">Current Streak</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl sm:text-2xl font-bold text-indigo-600">{stats.longest_streak}</div>
                      <div className="text-xs text-foreground/60">Longest Streak</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl sm:text-2xl font-bold text-emerald-600">{stats.total_wins}</div>
                      <div className="text-xs text-foreground/60">Total Wins</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl sm:text-2xl font-bold text-amber-600">{stats.win_rate}%</div>
                      <div className="text-xs text-foreground/60">Win Rate</div>
                    </div>
                  </div>
                </section>
              )}
              {guesses.length > 0 && (
                <div className="w-full">
                  <h3 className="font-semibold mb-2">Your guesses</h3>
                  <ul className="space-y-1 text-sm">
                    {guesses.map((g, i) => (
                      <li key={i} className="flex items-center justify-between rounded-md border border-foreground/10 px-3 py-2">
                        <span>{g.text}</span>
                        <span className={g.correct ? "text-green-600" : "text-foreground/60"}>
                          {g.correct ? "Correct" : "Incorrect"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </section>

      </main>

      <footer className="w-full max-w-3xl px-4 sm:px-6 py-6 sm:py-8 text-xs text-foreground/60 text-center">
        Built with Next.js + Tailwind. © {new Date().getFullYear()} K‑DLE
      </footer>

      {/* Toast */}
      {copied && (
        <div className="fixed bottom-6 right-6 rounded-lg bg-foreground text-background px-3 py-2 text-sm shadow-lg">
          Copied!
        </div>
      )}
    </div>
  );
}
