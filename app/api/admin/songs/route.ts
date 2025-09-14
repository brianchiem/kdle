import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseClient";

export async function GET() {
  try {
    const supabase = supabaseServer();
    const { data: songs } = await supabase
      .from("songs")
      .select("spotify_id,title,artist,album_image,release_year,preview_url")
      .order("id", { ascending: false })
      .limit(25);

    const { data: today } = await supabase
      .from("daily_song")
      .select("date,song:songs(spotify_id,title,artist,album_image)")
      .eq("date", new Date().toISOString().slice(0, 10))
      .single();

    return NextResponse.json({ songs: songs ?? [], today });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 });
  }
}
