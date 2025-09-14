import { NextResponse } from "next/server";
import { z } from "zod";

// Requires admin auth via Supabase RLS/claims; placeholder only.
const ScheduleSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  song_id: z.string(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = ScheduleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  // TODO: Upsert into Supabase 'daily_song' table for the given date.
  return NextResponse.json({ ok: true });
}
