import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * GET /auth/callback
 *
 * Exchanges a PKCE `code` (password-reset / email-confirm links) for a session,
 * setting the auth cookies, then forwards to `next` (defaults to `/app`). On a
 * missing or invalid code, redirects to `/login` with an error flag.
 *
 * Public route — Planner has no auth gate, but this must work before any
 * session exists.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/app";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback`);
}
