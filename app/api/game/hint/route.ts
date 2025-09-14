import { NextResponse } from "next/server";

export async function GET() {
  // TODO: Compute next hint level based on user's progress (session/cookie or Supabase user data).
  // Placeholder returns release year as first hint per PRD.
  return NextResponse.json({ hint_level: 1, hint: "Released in YYYY" });
}
