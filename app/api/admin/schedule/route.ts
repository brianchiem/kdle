import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabaseClient";

const Schema = z.object({ spotify_id: z.string().min(5), date: z.string().optional() });

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  const { spotify_id, date } = parsed.data;

  const supabase = supabaseServer();
  const day = date ?? new Date().toISOString().slice(0, 10);
  const { data: song } = await supabase.from("songs").select("id").eq("spotify_id", spotify_id).single();
  if (!song) return NextResponse.json({ error: "Song not found" }, { status: 404 });

  const { error } = await supabase
    .from("daily_song")
    .upsert({ date: day, song_id: song.id })
    .eq("date", day);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, date: day, spotify_id });
}
