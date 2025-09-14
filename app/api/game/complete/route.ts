import { NextResponse } from "next/server";
import { z } from "zod";

const CompleteSchema = z.object({
  guesses_used: z.number().min(0).max(6),
  won: z.boolean(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = CompleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // TODO: If authenticated, update user streaks in Supabase 'user_stats'.
  // For now, return placeholder streak metrics.
  return NextResponse.json({ streak: 0, longest_streak: 0 });
}
