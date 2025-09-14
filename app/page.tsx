"use client";
import { Play } from "lucide-react";
import { useState } from "react";

export default function Home() {
  const [guess, setGuess] = useState("");
  const [playing, setPlaying] = useState(false);

  return (
    <div className="min-h-screen w-full flex flex-col items-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-fuchsia-200 via-white to-indigo-200 dark:from-fuchsia-900/30 dark:via-black dark:to-indigo-900/30">
      <header className="w-full max-w-3xl px-6 py-8">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">K-Dle</h1>
        <p className="text-sm text-foreground/70 mt-1">Guess the K-pop song of the day</p>
      </header>

      <main className="w-full max-w-3xl px-6 flex-1 flex flex-col gap-6">
        <section className="rounded-2xl border border-foreground/10 bg-background/60 backdrop-blur p-6 flex flex-col items-center gap-4">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-base font-medium text-white bg-gradient-to-r from-fuchsia-500 to-indigo-500 hover:from-fuchsia-600 hover:to-indigo-600 active:scale-[.99] transition"
            onClick={() => setPlaying(true)}
          >
            <Play size={20} /> Play snippet
          </button>
          {playing && (
            <p className="text-xs text-foreground/70">Playing 5-second preview…</p>
          )}

          <div className="w-full flex items-center gap-2">
            <input
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              placeholder="Type your guess (Artist - Song)"
              className="flex-1 rounded-lg border border-foreground/15 bg-background/70 px-3 py-2 outline-none focus:ring-2 focus:ring-fuchsia-400"
            />
            <button
              type="button"
              className="rounded-lg border border-foreground/10 bg-foreground text-background px-4 py-2 disabled:opacity-50"
              disabled={!guess}
            >
              Guess
            </button>
          </div>
          <p className="text-xs text-foreground/60">6 guesses total. Hints unlock after each guess.</p>
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
