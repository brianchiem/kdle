import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabaseClient";
import { getTrackById, findPreviewUrls } from "@/lib/spotify";

const Schema = z.object({ spotify_id: z.string().min(5) });

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  const { spotify_id } = parsed.data;

  const track = await getTrackById(spotify_id);
  if (!track) return NextResponse.json({ error: "Spotify track not found" }, { status: 404 });

  // Prepare fields
  const title = track.name;
  const artist = track.artists?.map((a) => a.name).join(", ") || null;
  const album_image = track.album?.images?.[0]?.url ?? null;
  const releaseDate = (track as any)?.album?.release_date as string | undefined;
  const release_year = releaseDate ? Number(releaseDate.slice(0, 4)) : null;

  let preview_url: string | null = track.preview_url ?? null;
  if (!preview_url && title) {
    const urls = await findPreviewUrls(title, track.artists?.[0]?.name, 2);
    preview_url = urls[0] ?? null;
  }

  const supabase = supabaseServer();
  const { error } = await supabase
    .from("songs")
    .upsert({
      spotify_id,
      title,
      artist,
      album_image,
      release_year,
      preview_url,
      difficulty_tag: "easy",
    })
    .eq("spotify_id", spotify_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, spotify_id });
}
