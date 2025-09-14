import { NextResponse } from "next/server";
import { z } from "zod";

const GuessSchema = z.object({
  guess: z.string().min(1),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = GuessSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // TODO: Compare guess against today's song (Supabase) using normalized title + artist.
  // Placeholder response follows the PRD shape.
  const resp = {
    correct: false,
    remaining_guesses: 5,
    next_hint_level: 1,
  };
  return NextResponse.json(resp);
}
