"use server";

import { headers } from "next/headers";

import { createClient } from "@/lib/supabase/server";

/**
 * Resolve the public site origin used to build auth-email links.
 *
 * Prefers `NEXT_PUBLIC_SITE_URL` so confirmation/reset links always point at
 * the real deployed site instead of whatever host the request came in on.
 * Falls back to request headers for local dev.
 */
async function getOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) {
    return configured.replace(/\/$/, "");
  }
  const h = await headers();
  const origin = h.get("origin");
  if (origin) {
    return origin;
  }
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

/**
 * Sign in with email + password.
 *
 * Returns `{ error }` on failure; `undefined` on success. Deliberately does
 * NOT `redirect()` — that's a soft (SPA) navigation, which leaves the
 * browser's Supabase client singleton (used by `useAuth` / cloud sync)
 * unaware of the session this server action just wrote to cookies (it only
 * reacts to auth calls made through itself). The caller does a hard
 * navigation instead, so the browser client re-initializes and picks up the
 * fresh cookies.
 */
export async function signIn(
  email: string,
  password: string,
): Promise<{ error: string } | undefined> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  return undefined;
}

/**
 * Sign up with email + password.
 * Returns `{ error }` on failure; returns `undefined` on success so the client
 * can show the "check your email" confirmation state.
 */
export async function signUp(
  email: string,
  password: string,
): Promise<{ error: string } | undefined> {
  const supabase = await createClient();
  const origin = await getOrigin();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    // After the user clicks the confirmation link, land them on /login.
    options: { emailRedirectTo: `${origin}/login` },
  });

  if (error) {
    return { error: error.message };
  }

  return undefined;
}

/**
 * Send a password-reset email. The link lands on `/auth/callback`, which
 * exchanges the recovery code for a session and forwards to `/reset-password`.
 *
 * Returns `{ error }` on failure; `undefined` on success so the client can show
 * a "check your email" state. Note: Supabase does not reveal whether the email
 * exists, so success here does not confirm an account.
 */
export async function requestPasswordReset(email: string): Promise<{ error: string } | undefined> {
  const supabase = await createClient();
  const origin = await getOrigin();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

  if (error) {
    return { error: error.message };
  }

  return undefined;
}

/**
 * Set a new password for the currently authenticated (recovery-session) user.
 * Reached only after `/auth/callback` established the recovery session.
 *
 * Returns `{ error }` on failure; `undefined` on success — see the `signIn`
 * comment above for why the caller does a hard navigation instead of this
 * action calling `redirect()`.
 */
export async function updatePassword(password: string): Promise<{ error: string } | undefined> {
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: error.message };
  }

  return undefined;
}
