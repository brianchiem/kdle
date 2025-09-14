import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import {
  COOKIE_NAME,
  MAX_GUESSES,
  getTodayDaily,
  isCorrectGuess,
  isArtistMatch,
  newState,
  nextHintLevel,
} from "@/lib/game";

const GuessSchema = z.object({
  guess: z.string().min(1),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = GuessSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const daily = await getTodayDaily();
  if (!daily) {
    return NextResponse.json({ error: "Today's song not set" }, { status: 404 });
  }

  const jar = await cookies();
  let stateRaw = jar.get(COOKIE_NAME)?.value;
  let state: ReturnType<typeof newState> = newState(daily.date);
  try {
    if (stateRaw) {
      const parsedCookie = JSON.parse(stateRaw);
      // sanitize ensures correct date and bounds
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      state = (await import("@/lib/game")).sanitizeState(parsedCookie, daily.date);
    }
  } catch {
    state = newState(daily.date);
  }

  if (state.won || state.guesses >= MAX_GUESSES) {
    return NextResponse.json(
      { error: "No guesses remaining" },
      { status: 400 }
    );
  }

  const correct = isCorrectGuess(parsed.data.guess, daily.title, daily.artist);
  const artistMatch = !correct && isArtistMatch(parsed.data.guess, daily.artist);
  state.guesses += 1;
  if (correct) {
    state.won = true;
  } else {
    state.hintLevel = nextHintLevel(state.hintLevel);
  }

  const remaining = Math.max(0, MAX_GUESSES - state.guesses);
  const resp = NextResponse.json({
    correct,
    remaining_guesses: remaining,
    next_hint_level: state.hintLevel,
    artist_match: artistMatch,
  });
  resp.cookies.set({
    name: COOKIE_NAME,
    value: JSON.stringify(state),
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 1 day
  });
  return resp;
}
