import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabaseClient";
import { findPreviewUrls, getTrackById } from "@/lib/spotify";

// Admin-only: enrich a song by spotify_id with album art, release year, and preview_url (if resolvable)
// RLS should restrict writes to admins via the songs_admin_write policy. Using service role bypasses RLS.

const Schema = z.object({
  spotify_id: z.string().min(5),
  override_preview: z.boolean().optional().default(false),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const { spotify_id, override_preview } = parsed.data;

  // Fetch track metadata from Spotify
  const track = await getTrackById(spotify_id);
  if (!track) {
    return NextResponse.json({ error: "Spotify track not found" }, { status: 404 });
  }

  const albumImage = track.album?.images?.[0]?.url ?? null;
  // release_date comes from album on the full track object
  const releaseDate = (track as any)?.album?.release_date as string | undefined;
  const releaseYear = releaseDate ? Number((releaseDate || "").slice(0, 4)) : undefined;

  // Determine preview: prefer official preview_url if present; otherwise try fallback
  let previewUrl: string | null = track.preview_url ?? null;
  if ((!previewUrl || override_preview) && track.name) {
    const artistName = track.artists?.[0]?.name;
    const urls = await findPreviewUrls(track.name, artistName, 2);
    previewUrl = urls[0] ?? previewUrl ?? null;
  }

  const supabase = supabaseServer();
  const { error } = await supabase
    .from("songs")
    .update({
      album_image: albumImage,
      release_year: releaseYear ?? null,
      preview_url: previewUrl,
      title: track.name,
      artist: track.artists?.map((a) => a.name).join(", ") || null,
    })
    .eq("spotify_id", spotify_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, album_image: albumImage, release_year: releaseYear ?? null, preview_url: previewUrl });
}
