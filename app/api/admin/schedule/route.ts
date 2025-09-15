import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer, supabaseServerWithAuth } from "@/lib/supabaseClient";
import { todayPST } from "@/lib/date";

const Schema = z.object({ spotify_id: z.string().min(5), date: z.string().optional() });

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
  const { spotify_id, date } = parsed.data;

  const supabase = supabaseServer();
  const day = date ?? todayPST();
  const { data: song } = await supabase.from("songs").select("id").eq("spotify_id", spotify_id).single();
  if (!song) return NextResponse.json({ error: "Song not found" }, { status: 404 });

  const { error } = await supabase
    .from("daily_song")
    .upsert({ date: day, song_id: song.id })
    .eq("date", day);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, date: day, spotify_id });
}

