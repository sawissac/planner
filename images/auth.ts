import { timingSafeEqual } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { config, setOwner } from "./config.ts";

/**
 * Auth, like `execute-cli/claude`: every request carries this server's own
 * token (`Authorization: Bearer pim_…`, generated into `config.json` on first
 * start, pasted into Settings → API keys → Image server).
 *
 * The images belong to one Planner user, the owner. Planner pairs on Test /
 * Save in Settings: it calls `/health` with the token plus the signed-in
 * user's Supabase access token (`X-Planner-Session`), checked with Supabase
 * Auth, and the server saves that user's id as `ownerId`. From then on the
 * token alone acts as the owner — for the app and for agents.
 *
 * The server talks to Supabase with the secret key (`SUPABASE_SECRET_KEY` in
 * the root `.env.local` / `.env`), which bypasses RLS, so every query in
 * `store.ts` filters by the owner's id itself.
 */

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export type Caller = { userId: string; db: SupabaseClient };

const NO_SESSION = { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false };

let admin: SupabaseClient | null = null;

/** The secret-key client; throws at startup when the env lacks it. */
export function db(): SupabaseClient {
  if (!admin) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !secret) {
      throw new Error(
        "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in the root .env.local or .env (bun start reads both).",
      );
    }
    admin = createClient(url, secret, { auth: NO_SESSION });
  }
  return admin;
}

function tokenOk(request: Request): boolean {
  const header = request.headers.get("authorization") ?? "";
  const given = Buffer.from(header.replace(/^Bearer\s+/i, ""));
  const want = Buffer.from(config.token);
  return given.length === want.length && timingSafeEqual(given, want);
}

/** Throws 401 unless the request carries this server's token. */
export function checkToken(request: Request): void {
  if (!tokenOk(request)) {
    throw new HttpError(401, "Missing or wrong token: use the one in images/config.json.");
  }
}

/**
 * Pair with the Planner user whose session token is in `X-Planner-Session`,
 * if any: the first user becomes the owner; another user is refused.
 */
export async function pair(request: Request): Promise<void> {
  const session = request.headers.get("x-planner-session");
  if (!session) {
    return;
  }
  const { data, error } = await db().auth.getUser(session);
  if (error || !data.user) {
    throw new HttpError(401, "Planner session expired: sign in again.");
  }
  if (!config.ownerId) {
    setOwner(data.user.id);
    console.log("[planner-images] paired with this Planner account");
  } else if (config.ownerId !== data.user.id) {
    throw new HttpError(
      403,
      "This image server is paired with another Planner account (ownerId in images/config.json).",
    );
  }
}

/** The owner, acting through the token; 409 until Planner has paired. */
export function caller(): Caller {
  if (!config.ownerId) {
    throw new HttpError(
      409,
      "Not paired yet: in Planner, open Settings → API keys → Image server and press Test.",
    );
  }
  return { userId: config.ownerId, db: db() };
}
