"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { User, Check, X, Trash2, AlertTriangle } from "lucide-react";

export default function SettingsPage() {
  const [username, setUsername] = useState("");
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const router = useRouter();

  // Check auth and load profile
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

        // Load current profile
        if (data.session?.access_token) {
          const res = await fetch('/api/user/profile', {
            headers: { Authorization: `Bearer ${data.session.access_token}` }
          });
          if (res.ok) {
            const profile = await res.json();
            setCurrentUsername(profile.username);
            setUsername(profile.username || "");
          }
        }
      } catch (e) {
        console.error('Auth check error:', e);
      }
    })();
  }, [router]);

  async function handleUpdateUsername(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim()) return;

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

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
        throw new Error(data.error || 'Failed to update username');
      }

      setCurrentUsername(username.trim());
      setSuccess("Username updated successfully!");
      setTimeout(() => setSuccess(null), 3000);

    } catch (e: any) {
      setError(e?.message || 'Failed to update username');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirmText !== "DELETE") {
      setError("Please type DELETE to confirm");
      return;
    }

    try {
      setDeleteLoading(true);
      setError(null);

      const supabase = supabaseBrowser();
      const { data: session } = await supabase.auth.getSession();
      
      if (!session?.session?.access_token) {
        setError("Please sign in first");
        return;
      }

      const res = await fetch('/api/user/profile', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`
        }
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete account');
      }

      // Sign out and redirect
      await supabase.auth.signOut();
      router.push('/');

    } catch (e: any) {
      setError(e?.message || 'Failed to delete account');
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-fuchsia-200 via-white to-indigo-200 dark:from-fuchsia-900/30 dark:via-black dark:to-indigo-900/30">
      <header className="w-full max-w-2xl px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Account Settings</h1>
            <p className="text-sm text-foreground/70 mt-1">Manage your profile and account</p>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <button
              onClick={async () => {
                const supabase = supabaseBrowser();
                await supabase.auth.signOut();
                router.push('/');
              }}
              className="inline-flex items-center gap-1 rounded-full border border-foreground/15 px-3 py-1 text-xs hover:bg-black/5 dark:hover:bg-white/10"
            >
              <span>🚪</span>
              <span>Sign out</span>
            </button>
            <a
              href="/"
              className="inline-flex items-center gap-1 rounded-full border border-foreground/15 px-3 py-1 text-xs hover:bg-black/5 dark:hover:bg-white/10"
            >
              <span>←</span>
              <span>Back to Game</span>
            </a>
          </div>
        </div>
      </header>

      <main className="w-full max-w-2xl px-4 sm:px-6 pb-12 space-y-6">
        {/* Profile Section */}
        <div className="rounded-2xl border border-foreground/10 bg-background/60 backdrop-blur p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-6">
            <User className="w-5 h-5 text-fuchsia-600 dark:text-fuchsia-400" />
            <h2 className="text-lg font-semibold">Profile</h2>
          </div>

          {userEmail && (
            <div className="mb-4 p-3 rounded-lg bg-foreground/5">
              <p className="text-sm text-foreground/70 break-all">Email: {userEmail}</p>
            </div>
          )}

          <form onSubmit={handleUpdateUsername} className="space-y-4">
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
                className="w-full rounded-lg border border-foreground/15 bg-background/70 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base outline-none focus:ring-2 focus:ring-fuchsia-400"
                minLength={3}
                maxLength={20}
                pattern="[a-zA-Z0-9_]+"
                title="Username can only contain letters, numbers, and underscores"
              />
              <p className="text-xs text-foreground/60 mt-1">
                3-20 characters, letters, numbers, and underscores only
              </p>
            </div>

            {(error || success) && (
              <div className={`flex items-center gap-2 p-3 rounded-lg ${
                success 
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
              }`}>
                {success ? (
                  <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                ) : (
                  <X className="w-4 h-4 text-red-600 dark:text-red-400" />
                )}
                <p className={`text-sm ${
                  success 
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {success || error}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !username.trim() || username === currentUsername}
              className="w-full sm:w-auto rounded-lg bg-foreground text-background px-4 sm:px-6 py-2 sm:py-2 text-sm sm:text-base font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
            >
              {loading ? "Updating..." : "Update Username"}
            </button>
          </form>
        </div>

        {/* Danger Zone */}
        <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10 backdrop-blur p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <h2 className="text-lg font-semibold text-red-800 dark:text-red-200">Danger Zone</h2>
          </div>

          <p className="text-sm text-red-700 dark:text-red-300 mb-4">
            Deleting your account will permanently remove all your game data, stats, and progress. This action cannot be undone.
          </p>

          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center justify-center sm:justify-start gap-2 w-full sm:w-auto rounded-lg border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-2 text-sm hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete Account
            </button>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                  Type "DELETE" to confirm:
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="w-full rounded-lg border border-red-300 dark:border-red-700 bg-background/70 px-3 sm:px-4 py-2 text-sm sm:text-base outline-none focus:ring-2 focus:ring-red-400"
                  placeholder="DELETE"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteLoading || deleteConfirmText !== "DELETE"}
                  className="flex items-center justify-center gap-2 rounded-lg bg-red-600 text-white px-4 py-2 text-sm disabled:opacity-50 hover:bg-red-700 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  {deleteLoading ? "Deleting..." : "Delete Account"}
                </button>
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteConfirmText("");
                    setError(null);
                  }}
                  className="rounded-lg border border-foreground/15 px-4 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
