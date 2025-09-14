import { NextResponse } from "next/server";
import { z } from "zod";

// Requires admin auth via Supabase RLS/claims; placeholder only.
const SongSchema = z.object({
  spotify_id: z.string(),
  title: z.string(),
  artist: z.string(),
  preview_url: z.string().url().nullable(),
  difficulty_tag: z.string().optional(),
  release_year: z.number().int().optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = SongSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  // TODO: Insert into Supabase 'songs' table.
  return NextResponse.json({ ok: true });
}
