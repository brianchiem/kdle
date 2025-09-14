"use client";
import { useEffect, useMemo, useState } from "react";

export default function AdminPage() {
  const [spotifyId, setSpotifyId] = useState("");
  const [scheduleId, setScheduleId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [data, setData] = useState<{
    songs: Array<{ spotify_id: string; title: string; artist: string; album_image: string | null; release_year: number | null; preview_url: string | null }>;
    today: { date: string; song?: { spotify_id: string; title: string; artist: string; album_image: string | null } } | null;
  } | null>(null);

  async function refresh() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/songs", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load admin data");
      setData(await res.json());
    } catch (e: any) {
      setError(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function addSong() {
    if (!spotifyId.trim()) return;
    try {
      setLoading(true);
      setError(null);
      setMessage(null);
      const res = await fetch("/api/admin/add-song", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spotify_id: spotifyId.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Add failed");
      setMessage("Song added.");
      setSpotifyId("");
      await refresh();
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spotify_id: id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Enrich failed");
      setMessage("Enriched.");
      await refresh();
    } catch (e: any) {
      setError(e?.message || "Enrich failed");
    } finally {
      setLoading(false);
    }
  }

  async function scheduleToday(id?: string) {
    const target = (id ?? scheduleId).trim();
    if (!target) return;
    try {
      setLoading(true);
      setError(null);
      setMessage(null);
      const res = await fetch("/api/admin/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spotify_id: target }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Schedule failed");
      setMessage(`Scheduled ${target} for ${json.date}.`);
      setScheduleId("");
      await refresh();
    } catch (e: any) {
      setError(e?.message || "Schedule failed");
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

  return (
    <div className="min-h-screen w-full flex flex-col items-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-fuchsia-200 via-white to-indigo-200 dark:from-fuchsia-900/30 dark:via-black dark:to-indigo-900/30">
      <header className="w-full max-w-4xl px-6 py-8">
        <h1 className="text-2xl sm:text-3xl font-semibold">Admin</h1>
        <p className="text-sm text-foreground/70">Manage songs and schedule the daily.</p>
      </header>

      <main className="w-full max-w-4xl px-6 flex-1 flex flex-col gap-6">
        <section className="rounded-2xl border border-foreground/10 bg-background/60 backdrop-blur p-6 space-y-4">
          <h2 className="font-semibold">Add song by Spotify ID</h2>
          <div className="flex items-center gap-2">
            <input
              value={spotifyId}
              onChange={(e) => setSpotifyId(e.target.value)}
              placeholder="Spotify track ID"
              className="flex-1 rounded border border-foreground/15 bg-background/70 px-3 py-2 outline-none focus:ring-2 focus:ring-fuchsia-400"
            />
            <button
              className="rounded bg-foreground text-background px-4 py-2 text-sm disabled:opacity-50"
              onClick={addSong}
              disabled={!spotifyId || loading}
            >
              {loading ? "..." : "Add"}
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-foreground/10 bg-background/60 backdrop-blur p-6 space-y-3">
          <h2 className="font-semibold">Schedule today</h2>
          <div className="flex items-center gap-2">
            <input
              value={scheduleId}
              onChange={(e) => setScheduleId(e.target.value)}
              placeholder="Spotify track ID"
              className="flex-1 rounded border border-foreground/15 bg-background/70 px-3 py-2 outline-none focus:ring-2 focus:ring-fuchsia-400"
            />
            <button
              className="rounded bg-foreground text-background px-4 py-2 text-sm disabled:opacity-50"
              onClick={() => scheduleToday()}
              disabled={!scheduleId || loading}
            >
              {loading ? "..." : "Schedule"}
            </button>
          </div>
          <div className="text-xs text-foreground/70">Today: {todayLabel ?? "loading..."}</div>
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
