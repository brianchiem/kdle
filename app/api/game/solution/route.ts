import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_NAME, newState } from "@/lib/game";
import { getTodayDaily } from "@/lib/game";

export async function GET() {
  const daily = await getTodayDaily();
  if (!daily) return NextResponse.json({ error: "Today's song not set" }, { status: 404 });

  const jar = await cookies();
  const raw = jar.get(COOKIE_NAME)?.value;
  let won = false;
  try {
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.date === daily.date && parsed?.won === true) won = true;
    }
  } catch {}

  if (!won) {
    return NextResponse.json({ error: "Solution locked until you win" }, { status: 403 });
  }

  return NextResponse.json({ title: daily.title, artist: daily.artist });
}
