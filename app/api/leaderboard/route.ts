import { NextResponse } from "next/server";

export async function GET() {
  // TODO: Aggregate top streaks globally from Supabase.
  const placeholder = [
    { username: "kpopfan1", streak: 10 },
    { username: "idollover", streak: 8 },
  ];
  return NextResponse.json(placeholder);
}
