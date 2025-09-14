import { NextResponse } from "next/server";
import { todayUTC } from "@/lib/date";

export async function GET() {
  // TODO: Fetch today's song from Supabase 'daily_song' joined with 'songs'.
  // For now, return a placeholder structure matching the PRD.
  const data = {
    date: todayUTC(),
    preview_url: null as string | null,
    hint_level: 0,
    max_guesses: 6,
  };
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
