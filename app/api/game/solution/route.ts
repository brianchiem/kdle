import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_NAME, newState } from "@/lib/game";
import { getTodayDaily } from "@/lib/game";
import { supabaseServer, supabaseServerWithAuth } from "@/lib/supabaseClient";
import { todayPST } from "@/lib/date";

export async function GET(req: Request) {
  const daily = await getTodayDaily();
  if (!daily) return NextResponse.json({ error: "Today's song not set" }, { status: 404 });

  let won = false;

  // First check if user is authenticated and has won in database
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    
    if (token) {
      const supabase = supabaseServerWithAuth(token);
      const { data: userData } = await supabase.auth.getUser();
      
      if (userData.user) {
        const today = todayPST();
        const { data: todayResult } = await supabase
          .from('game_results')
          .select('won')
          .eq('user_id', userData.user.id)
          .eq('date', today)
          .single();
        
        if (todayResult?.won) {
          won = true;
        }
      }
    }
  } catch {
    // Fall back to cookie check if database check fails
  }

  // Fall back to cookie-based check if not authenticated or no database record
  if (!won) {
    const jar = await cookies();
    const raw = jar.get(COOKIE_NAME)?.value;
    try {
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.date === daily.date && parsed?.won === true) won = true;
      }
    } catch {}
  }

  if (!won) {
    return NextResponse.json({ error: "Solution locked until you win" }, { status: 403 });
  }

  return NextResponse.json({ title: daily.title, artist: daily.artist });
}
