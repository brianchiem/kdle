"use client";
import { Play, Pause, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export default function Home() {
  const [guess, setGuess] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [today, setToday] = useState<{ date: string; preview_url: string | null; album_image?: string | null; max_guesses: number } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [guesses, setGuesses] = useState<{ text: string; correct: boolean }[]>([]);
  const [hint, setHint] = useState<{ level: number; text: string } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<{ id: string; label: string; album_image: string | null; preview_url: string | null }[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);

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

  // Setup audio element
  useEffect(() => {
    if (!today?.preview_url) return;
    const audio = new Audio(today.preview_url);
    audioRef.current = audio;
    audio.preload = "auto";
    audio.onended = () => setIsPlaying(false);
    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, [today?.preview_url]);

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
      <header className="w-full max-w-3xl px-6 py-8">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">K-Dle</h1>
        <p className="text-sm text-foreground/70 mt-1">Guess the K-pop song of the day</p>
      </header>

      <main className="w-full max-w-3xl px-6 flex-1 flex flex-col gap-6">
        <section className="rounded-2xl border border-foreground/10 bg-background/60 backdrop-blur p-6 flex flex-col items-center gap-4">
          {loading ? (
            <p className="text-sm text-foreground/70">Loading today’s challenge…</p>
          ) : error ? (
            <p className="text-sm text-red-500">{error}</p>
          ) : (
            <>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-base font-medium text-white bg-gradient-to-r from-fuchsia-500 to-indigo-500 hover:from-fuchsia-600 hover:to-indigo-600 active:scale-[.99] transition disabled:opacity-50"
                onClick={playSnippet}
                disabled={!today?.preview_url}
                aria-disabled={!today?.preview_url}
                title={!today?.preview_url ? "No preview available" : "Play 5s snippet"}
              >
                {isPlaying ? <Pause size={20} /> : <Play size={20} />} {isPlaying ? "Pause" : "Play snippet"}
              </button>
              {!today?.preview_url && (
                <p className="text-xs text-foreground/70">No preview available for today’s track.</p>
              )}

              <div className="w-full flex items-center gap-2">
                <input
                  value={guess}
                  onChange={(e) => setGuess(e.target.value)}
                  placeholder="Type your guess (Artist - Song)"
                  className="flex-1 rounded-lg border border-foreground/15 bg-background/70 px-3 py-2 outline-none focus:ring-2 focus:ring-fuchsia-400"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && guess.trim() && !submitting) submitGuess();
                  }}
                />
                <button
                  type="button"
                  className="rounded-lg border border-foreground/10 bg-foreground text-background px-4 py-2 disabled:opacity-50"
                  disabled={!guess.trim() || submitting || (remaining !== null && remaining <= 0) || (hint?.level === 999)}
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
              <p className="text-xs text-foreground/60">{today?.max_guesses ?? 6} guesses total. Hints unlock after each wrong guess.</p>
              {remaining !== null && (
                <p className="text-xs text-foreground/70">Remaining guesses: {remaining}</p>
              )}

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

        <section className="rounded-2xl border border-foreground/10 bg-background/60 backdrop-blur p-6">
          <h2 className="font-semibold mb-2">Developer quick links</h2>
          <ul className="list-disc list-inside text-sm text-foreground/80 space-y-1">
            <li>
              API stubs under <code className="px-1 py-0.5 rounded bg-black/5 dark:bg-white/10">app/api/*</code>
            </li>
            <li>
              Env template at <code className="px-1 py-0.5 rounded bg-black/5 dark:bg-white/10">env.example</code>
            </li>
          </ul>
        </section>
      </main>

      <footer className="w-full max-w-3xl px-6 py-8 text-xs text-foreground/60">
        Built with Next.js + Tailwind. © {new Date().getFullYear()} K‑Dle
      </footer>
    </div>
  );
}
