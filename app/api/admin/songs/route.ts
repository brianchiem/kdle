import { NextResponse } from "next/server";
import { supabaseServer, supabaseServerWithAuth } from "@/lib/supabaseClient";
import { todayPST } from "@/lib/date";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const supabase = supabaseServerWithAuth(token);
    // Admin guard
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      const allow = (process.env.ADMIN_EMAILS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
      if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      if (allow.length && !allow.includes((user.email || "").toLowerCase())) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } catch {}
    const { data: songs } = await supabase
      .from("songs")
      .select("spotify_id,title,artist,album_image,release_year,preview_url")
      .order("id", { ascending: false })
      .limit(25);

    const { data: today } = await supabase
      .from("daily_song")
      .select("date,song:songs(spotify_id,title,artist,album_image)")
      .eq("date", todayPST())
      .single();

    return NextResponse.json({ songs: songs ?? [], today });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 });
  }
}
