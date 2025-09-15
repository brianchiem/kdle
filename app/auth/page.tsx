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

  async function signInWithProvider(provider: "google") {
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

            <button
              onClick={() => signInWithProvider("google")}
              className="w-full rounded border border-foreground/15 px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            {message && <div className="text-xs text-green-600">{message}</div>}
            {error && <div className="text-xs text-red-600">{error}</div>}
          </div>
        )}
      </main>
    </div>
  );
}
