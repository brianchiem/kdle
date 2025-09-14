"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";

export default function AuthPage() {
  const supabase = supabaseBrowser();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setUserEmail(data.user?.email ?? null);
    })();
  }, []);

  async function sendMagicLink() {
    try {
      setLoading(true);
      setError(null);
      setMessage(null);
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
        },
      });
      if (error) throw error;
      setMessage("Check your email for a sign-in link.");
    } catch (e: any) {
      setError(e?.message || "Failed to send magic link");
    } finally {
      setLoading(false);
    }
  }

  async function signInWithProvider(provider: "google" | "github") {
    try {
      setLoading(true);
      setError(null);
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
        },
      });
      if (error) throw error;
    } catch (e: any) {
      setError(e?.message || "OAuth sign-in failed");
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUserEmail(null);
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-fuchsia-200 via-white to-indigo-200 dark:from-fuchsia-900/30 dark:via-black dark:to-indigo-900/30">
      <header className="w-full max-w-md px-6 py-8">
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <p className="text-sm text-foreground/70">Use email magic link or OAuth.</p>
      </header>
      <main className="w-full max-w-md px-6 flex-1">
        {userEmail ? (
          <div className="rounded-xl border border-foreground/10 bg-background/60 p-6 space-y-3">
            <p className="text-sm">Signed in as <span className="font-medium">{userEmail}</span></p>
            <button
              onClick={signOut}
              className="text-sm rounded border border-foreground/15 px-3 py-2 hover:bg-black/5 dark:hover:bg-white/10"
            >
              Sign out
            </button>
          </div>
        ) : (
          <div className="rounded-xl border border-foreground/10 bg-background/60 p-6 space-y-4">
            <div className="space-y-2">
              <label className="text-xs text-foreground/70">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded border border-foreground/15 bg-background/70 px-3 py-2 outline-none focus:ring-2 focus:ring-fuchsia-400"
              />
              <button
                disabled={!email || loading}
                onClick={sendMagicLink}
                className="w-full rounded bg-foreground text-background px-3 py-2 text-sm disabled:opacity-50"
              >
                {loading ? "Sending…" : "Send magic link"}
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs text-foreground/60">
              <div className="flex-1 h-px bg-foreground/10" /> or <div className="flex-1 h-px bg-foreground/10" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={() => signInWithProvider("google")}
                className="rounded border border-foreground/15 px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10"
              >
                Continue with Google
              </button>
              <button
                onClick={() => signInWithProvider("github")}
                className="rounded border border-foreground/15 px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10"
              >
                Continue with GitHub
              </button>
            </div>

            {message && <div className="text-xs text-green-600">{message}</div>}
            {error && <div className="text-xs text-red-600">{error}</div>}
          </div>
        )}
      </main>
    </div>
  );
}
