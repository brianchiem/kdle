import { env } from "@/lib/env";

// Minimal Spotify Web API client using Client Credentials flow for server-side calls.
// NOTE: For track previews and search used server-side, this is sufficient.
// Do NOT expose client secret to the browser.

let cachedToken: { access_token: string; expires_at: number } | null = null;

async function getAppAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expires_at - 60 > now) {
    return cachedToken.access_token;
  }
  const basic = Buffer.from(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`).toString("base64");
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basic}`,
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to get Spotify token: ${res.status}`);
  }
  const data = (await res.json()) as { access_token: string; token_type: string; expires_in: number };
  cachedToken = {
    access_token: data.access_token,
    expires_at: Math.floor(Date.now() / 1000) + data.expires_in,
  };
  return cachedToken.access_token;
}

export type SpotifyTrack = {
  id: string;
  name: string;
  artists: { name: string }[];
  preview_url: string | null;
  album: { images: { url: string; width: number; height: number }[] };
  external_urls?: { spotify?: string };
};

export async function searchKpopTracks(query: string, limit = 5): Promise<SpotifyTrack[]> {
  const token = await getAppAccessToken();
  const params = new URLSearchParams({ q: `${query} genre:k-pop`, type: "track", limit: String(limit) });
  const res = await fetch(`https://api.spotify.com/v1/search?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Spotify search failed: ${res.status}`);
  }
  const json = await res.json();
  return (json?.tracks?.items ?? []) as SpotifyTrack[];
}

export async function getTrackById(id: string): Promise<SpotifyTrack | null> {
  const token = await getAppAccessToken();
  const res = await fetch(`https://api.spotify.com/v1/tracks/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return (await res.json()) as SpotifyTrack;
}

// Fallback: use the community package 'spotify-preview-finder' when preview_url is unavailable.
// This runs server-side and uses your SPOTIFY_CLIENT_ID/SECRET from env.
export async function findPreviewUrls(title: string, artist?: string, limit = 3): Promise<string[]> {
  try {
    // Dynamic import to support CommonJS default export
    const mod: any = await import("spotify-preview-finder");
    const finder = mod?.default ?? mod;

    let result: any;
    if (artist && artist.trim()) {
      result = await finder(title, artist, limit);
    } else {
      // Backward compatible signature: (title, limit)
      result = await finder(title, limit);
    }
    if (result?.success && Array.isArray(result.results)) {
      const urls: string[] = [];
      for (const r of result.results) {
        if (Array.isArray(r.previewUrls)) {
          for (const u of r.previewUrls) if (u) urls.push(u);
        }
      }
      return urls;
    }
  } catch (err) {
    console.warn("preview-finder fallback failed:", (err as Error)?.message);
  }
  return [];
}
