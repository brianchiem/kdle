import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServerWithAuth } from "@/lib/supabaseClient";

const Schema = z.object({ 
  query: z.string().min(1),
  limit: z.number().min(1).max(50).optional()
});

export async function POST(req: Request) {
  // Admin guard
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const supabase = supabaseServerWithAuth(token);
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    const allow = (process.env.ADMIN_EMAILS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (allow.length && !allow.includes((user.email || "").toLowerCase())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } catch {}

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  
  const { query, limit = 20 } = parsed.data;

  try {
    // Get Spotify access token
    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(
          `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
        ).toString("base64")}`,
      },
      body: "grant_type=client_credentials",
    });

    if (!tokenRes.ok) {
      throw new Error("Failed to get Spotify token");
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // Search Spotify
    const searchUrl = new URL("https://api.spotify.com/v1/search");
    searchUrl.searchParams.set("q", query);
    searchUrl.searchParams.set("type", "track");
    searchUrl.searchParams.set("limit", limit.toString());

    const searchRes = await fetch(searchUrl.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!searchRes.ok) {
      throw new Error("Spotify search failed");
    }

    const searchData = await searchRes.json();
    const tracks = searchData.tracks?.items || [];

    // Format results
    const results = tracks.map((track: any) => ({
      spotify_id: track.id,
      title: track.name,
      artist: track.artists?.[0]?.name || "Unknown Artist",
      album: track.album?.name || "Unknown Album",
      release_year: track.album?.release_date ? new Date(track.album.release_date).getFullYear() : null,
      album_image: track.album?.images?.[0]?.url || null,
      preview_url: track.preview_url,
      duration_ms: track.duration_ms,
      popularity: track.popularity,
      external_url: track.external_urls?.spotify
    }));

    return NextResponse.json({ results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
