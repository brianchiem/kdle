import { NextResponse } from "next/server";
import { getTodayDaily } from "@/lib/game";
import { findPreviewUrls } from "@/lib/spotify";

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
  }

  const data = {
    date: daily.date,
    preview_url: previewUrl,
    hint_level: 0,
    max_guesses: 6,
  };
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
