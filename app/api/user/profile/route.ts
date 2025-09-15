import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServerWithAuth } from "@/lib/supabaseClient";
import { rateLimit, getRateLimitHeaders } from "@/lib/rate-limit";

const UpdateProfileSchema = z.object({
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores")
});

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const supabase = supabaseServerWithAuth(token);
    
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('username, created_at, updated_at')
      .eq('user_id', user.id)
      .single();

    return NextResponse.json({
      user_id: user.id,
      email: user.email,
      username: profile?.username || null,
      profile_created: !!profile,
      created_at: profile?.created_at,
      updated_at: profile?.updated_at
    });

  } catch (error: any) {
    console.error('Get profile error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const supabase = supabaseServerWithAuth(token);
    
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting - 3 profile updates per minute per user
    const rateLimitResult = rateLimit(`profile:${user.id}`, 3, 60 * 1000);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { 
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult.remaining, rateLimitResult.resetTime)
        }
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = UpdateProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ 
        error: "Invalid username", 
        details: parsed.error.issues.map(i => i.message).join(", ")
      }, { status: 400 });
    }

    const { username } = parsed.data;

    // Check if username is already taken
    const { data: existingUser } = await supabase
      .from('user_profiles')
      .select('user_id')
      .eq('username', username)
      .neq('user_id', user.id)
      .single();

    if (existingUser) {
      return NextResponse.json({ error: "Username already taken" }, { status: 409 });
    }

    // Upsert user profile
    const { error } = await supabase
      .from('user_profiles')
      .upsert({
        user_id: user.id,
        username,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('Profile upsert error:', error);
      return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }

    return NextResponse.json({ success: true, username });

  } catch (error: any) {
    console.error('Update profile error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const supabase = supabaseServerWithAuth(token);
    
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Delete user data (cascading deletes will handle related records)
    const { error: profileError } = await supabase
      .from('user_profiles')
      .delete()
      .eq('user_id', user.id);

    const { error: statsError } = await supabase
      .from('user_stats')
      .delete()
      .eq('user_id', user.id);

    const { error: gameError } = await supabase
      .from('game_results')
      .delete()
      .eq('user_id', user.id);

    // Delete the auth user account
    const { error: authError } = await supabase.auth.admin.deleteUser(user.id);

    if (authError) {
      console.error('Auth deletion error:', authError);
      return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Account deleted successfully" });

  } catch (error: any) {
    console.error('Delete account error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
