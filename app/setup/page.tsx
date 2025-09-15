"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { User, Check, X } from "lucide-react";

export default function SetupPage() {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const router = useRouter();

  // Check auth and existing profile
  useEffect(() => {
    const supabase = supabaseBrowser();
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const user = data.session?.user;
        
        if (!user) {
          router.push('/auth');
          return;
        }

        setUserEmail(user.email || null);

        // Check if user already has a profile
        const { data: session } = await supabase.auth.getSession();
        if (session?.session?.access_token) {
          const res = await fetch('/api/user/profile', {
            headers: { Authorization: `Bearer ${session.session.access_token}` }
          });
          if (res.ok) {
            const profile = await res.json();
            if (profile.username) {
              // User already has username, redirect to home
              router.push('/');
              return;
            }
          }
        }
      } catch (e) {
        console.error('Auth check error:', e);
      } finally {
        setCheckingAuth(false);
      }
    })();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim()) return;

    try {
      setLoading(true);
      setError(null);

      const supabase = supabaseBrowser();
      const { data: session } = await supabase.auth.getSession();
      
      if (!session?.session?.access_token) {
        setError("Please sign in first");
        return;
      }

      const res = await fetch('/api/user/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`
        },
        body: JSON.stringify({ username: username.trim() })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to set username');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/');
      }, 2000);

    } catch (e: any) {
      setError(e?.message || 'Failed to set username');
    } finally {
      setLoading(false);
    }
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-fuchsia-200 via-white to-indigo-200 dark:from-fuchsia-900/30 dark:via-black dark:to-indigo-900/30">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto mb-4"></div>
          <p className="text-foreground/70">Loading...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-fuchsia-200 via-white to-indigo-200 dark:from-fuchsia-900/30 dark:via-black dark:to-indigo-900/30">
        <div className="w-full max-w-md px-6">
          <div className="rounded-2xl border border-foreground/10 bg-background/60 backdrop-blur p-8 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Welcome to K-Dle!</h1>
            <p className="text-foreground/70 mb-4">Your username has been set successfully.</p>
            <p className="text-sm text-foreground/60">Redirecting you to the game...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-fuchsia-200 via-white to-indigo-200 dark:from-fuchsia-900/30 dark:via-black dark:to-indigo-900/30">
      <div className="w-full max-w-md px-6">
        <div className="rounded-2xl border border-foreground/10 bg-background/60 backdrop-blur p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-fuchsia-100 dark:bg-fuchsia-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-fuchsia-600 dark:text-fuchsia-400" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Choose Your Username</h1>
            <p className="text-foreground/70 text-sm">
              Set up your profile to compete on the leaderboard
            </p>
            {userEmail && (
              <p className="text-xs text-foreground/60 mt-2">
                Signed in as {userEmail}
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium mb-2">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="w-full rounded-lg border border-foreground/15 bg-background/70 px-4 py-3 outline-none focus:ring-2 focus:ring-fuchsia-400"
                minLength={3}
                maxLength={20}
                pattern="[a-zA-Z0-9_]+"
                title="Username can only contain letters, numbers, and underscores"
                required
              />
              <p className="text-xs text-foreground/60 mt-1">
                3-20 characters, letters, numbers, and underscores only
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <X className="w-4 h-4 text-red-600 dark:text-red-400" />
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !username.trim()}
              className="w-full rounded-lg bg-foreground text-background py-3 font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
            >
              {loading ? "Setting up..." : "Continue"}
            </button>
          </form>

          <div className="text-center mt-6">
            <a
              href="/"
              className="text-sm text-foreground/60 hover:text-foreground/80"
            >
              Skip for now
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
