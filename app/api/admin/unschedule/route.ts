import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer, supabaseServerWithAuth } from "@/lib/supabaseClient";

const Schema = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });

export async function POST(req: Request) {
  // Admin guard
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const supabase = supabaseServerWithAuth(token);
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    const allow = (process.env.ADMIN_EMAILS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (allow.length && !allow.includes((user.email || "").toLowerCase())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } catch {}

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  const { date } = parsed.data;

  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
  // Write with service role to bypass RLS after our own admin check
  const supabase = supabaseServer();
  const { error } = await supabase.from("daily_song").delete().eq("date", date);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, date });
}
