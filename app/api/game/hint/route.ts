import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_NAME, buildHint, getTodayDaily, newState } from "@/lib/game";

export async function GET() {
  const daily = await getTodayDaily();
  if (!daily) {
    return NextResponse.json({ error: "Today's song not set" }, { status: 404 });
  }
  const jar = await cookies();
  let state = newState(daily.date);
  const raw = jar.get(COOKIE_NAME)?.value;
  try {
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.date === daily.date) state = parsed;
    }
  } catch {}

  if (!state.hintLevel || state.hintLevel <= 0) {
    return NextResponse.json({ hint_level: 0, hint: "No hint unlocked yet" });
  }
  const hint = buildHint(state.hintLevel, daily);
  return NextResponse.json(hint);
}
