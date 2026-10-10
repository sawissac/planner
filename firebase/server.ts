import { sign } from "node:crypto";

/**
 * Server-side Firebase, without the Admin SDK: a service account signs
 *   - custom tokens, so the browser can sign in as the Supabase user
 *     (`/api/firebase/token`), and
 *   - OAuth access tokens for the Realtime Database REST API, which the Plan
 *     API's `event` route writes agent progress with (admin access, past the
 *     rules).
 *
 * The service account comes from Firebase console → Project settings →
 * Service accounts → Generate new private key (a JSON file). Put it in `.env`
 * either way:
 *   - `FIREBASE_SERVICE_ACCOUNT` — the whole JSON, on one line, or
 *   - `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY` — its `client_email`
 *     and `private_key` (double-quoted, `\n` escapes as in the JSON).
 * Without it, database writes go unsigned — which only works while the
 * database rules are open (test mode).
 */

type ServiceAccount = { client_email: string; private_key: string };

const CUSTOM_TOKEN_AUDIENCE =
  "https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit";
const OAUTH_URL = "https://oauth2.googleapis.com/token";
const DB_SCOPES = [
  "https://www.googleapis.com/auth/firebase.database",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

export function serviceAccount(): ServiceAccount | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  const parsed: Partial<ServiceAccount> = raw
    ? (JSON.parse(raw) as Partial<ServiceAccount>)
    : {
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        private_key: process.env.FIREBASE_PRIVATE_KEY,
      };
  if (!parsed.client_email && !parsed.private_key) {
    return null;
  }
  if (!parsed.client_email || !parsed.private_key) {
    throw new Error(
      "Firebase service account needs both client_email and private_key (FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY).",
    );
  }
  // A key pasted with literal "\n" escapes still needs real newlines.
  return {
    client_email: parsed.client_email,
    private_key: parsed.private_key.replace(/\\n/g, "\n"),
  };
}

const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");

function jwt(account: ServiceAccount, claims: Record<string, unknown>): string {
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({
    iss: account.client_email,
    iat: now,
    exp: now + 3600,
    ...claims,
  })}`;
  const signature = sign("RSA-SHA256", Buffer.from(unsigned), account.private_key);
  return `${unsigned}.${signature.toString("base64url")}`;
}

/** Firebase Auth custom token (1 hour) that signs the browser in as `uid`. */
export function customToken(account: ServiceAccount, uid: string): string {
  return jwt(account, { sub: account.client_email, aud: CUSTOM_TOKEN_AUDIENCE, uid });
}

let cached: { token: string; expires: number } | null = null;

async function accessToken(account: ServiceAccount): Promise<string> {
  if (cached && cached.expires > Date.now() + 60_000) {
    return cached.token;
  }
  const res = await fetch(OAUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt(account, { scope: DB_SCOPES, aud: OAUTH_URL }),
    }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
  };
  if (!res.ok || !body.access_token) {
    throw new Error(`Firebase service-account sign-in failed (HTTP ${res.status}).`);
  }
  cached = { token: body.access_token, expires: Date.now() + (body.expires_in ?? 3600) * 1000 };
  return cached.token;
}

/** `{".sv": "timestamp"}` — the database fills in its own time. */
export const SERVER_TIME = { ".sv": "timestamp" } as const;

/**
 * One Realtime Database REST call on `path` (segments are encoded here).
 * Resolves the parsed response (`null` for a missing node).
 */
export async function rtdb(
  method: "GET" | "PUT" | "PATCH" | "POST" | "DELETE",
  path: string[],
  body?: unknown,
): Promise<unknown> {
  const base = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
  if (!base?.startsWith("https://")) {
    throw new Error(
      "NEXT_PUBLIC_FIREBASE_DATABASE_URL must be the database URL (https://<project>-default-rtdb.firebaseio.com).",
    );
  }
  const url = new URL(`${path.map(encodeURIComponent).join("/")}.json`, `${base}/`);
  const account = serviceAccount();
  if (account) {
    url.searchParams.set("access_token", await accessToken(account));
  }
  const res = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Realtime Database ${method} failed (HTTP ${res.status}): ${text}`);
  }
  return text ? (JSON.parse(text) as unknown) : null;
}
