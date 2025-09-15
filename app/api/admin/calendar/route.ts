import { NextResponse } from "next/server";
import { supabaseServerWithAuth } from "@/lib/supabaseClient";
import { formatDateInTZ } from "@/lib/date";

export async function GET(req: Request) {
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
  const url = new URL(req.url);
  const year = Number(url.searchParams.get("year"));
  const month = Number(url.searchParams.get("month")); // 1-12
  if (!year || !month || month < 1 || month > 12) {
    return NextResponse.json({ error: "Invalid year/month" }, { status: 400 });
  }
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0); // last day of month
  const startStr = formatDateInTZ(start, 'America/Los_Angeles');
  const endStr = formatDateInTZ(end, 'America/Los_Angeles');

  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
  const supabase = supabaseServerWithAuth(token);
  const { data, error } = await supabase
    .from("daily_song")
    .select("date,song:songs(spotify_id,title,artist,album_image)")
    .gte("date", startStr)
    .lte("date", endStr)
    .order("date", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    year,
    month,
    days: data?.map((d) => ({
      date: d.date,
      song: d.song,
    })) ?? [],
  });
}
