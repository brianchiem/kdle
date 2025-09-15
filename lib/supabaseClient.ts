import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

// Browser/client-side Supabase
export const supabaseBrowser = () => {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.warn("Supabase env not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
};

// Server-side Supabase with optional service key (for admin routes)
export const supabaseServer = () => {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.warn("Supabase server env not fully configured.");
  }
  return createClient(url, key, { auth: { persistSession: false } });
};

// Server-side Supabase bound to a bearer access token (from Authorization header)
export const supabaseServerWithAuth = (accessToken?: string | null) => {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  // IMPORTANT: use anon key when validating a user bearer token
  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const headers: Record<string, string> = {};
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
  return createClient(url, key, {
    global: { headers },
    auth: { persistSession: false },
  });
};
