import { NextResponse } from "next/server";
import { getTodayDaily } from "@/lib/game";
import { findPreviewUrls } from "@/lib/spotify";
import { supabaseServer } from "@/lib/supabaseClient";

export async function GET() {
  const daily = await getTodayDaily();
  if (!daily) {
    return NextResponse.json(
      { error: "Today's song not set" },
      { status: 404, headers: { "Cache-Control": "no-store" } }
    );
  }
  let previewUrl = daily.preview_url;
  if (!previewUrl) {
    // Try to find preview URLs via community fallback
    const urls = await findPreviewUrls(daily.title, daily.artist, 2);
    previewUrl = urls[0] ?? null;
    // If found, cache it back to DB for faster subsequent loads
    if (previewUrl) {
      const supabase = supabaseServer();
      await supabase
        .from("songs")
        .update({ preview_url: previewUrl })
        .eq("spotify_id", daily.spotify_id);
    }
  }

  const data = {
    date: daily.date,
    preview_url: previewUrl,
    album_image: daily.album_image ?? null,
    hint_level: 0,
    max_guesses: 6,
  };
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
