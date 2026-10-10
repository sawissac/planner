import type { NextRequest } from "next/server";

import { customToken, serviceAccount } from "@/firebase/server";
import { ApiError, authenticate, handle } from "@/lib/plan-api";

/**
 * Firebase custom token for the signed-in Supabase user, so the browser can
 * sign in to Firebase as that same uid and read its live agent runs
 * (`agentRuns/<uid>`, private per `database.rules.json`).
 *
 * Auth: `Authorization: Bearer <Supabase access token>`.
 * Needs `FIREBASE_SERVICE_ACCOUNT` (see `firebase/server.ts`); without it:
 * 501, and the client reads unsigned.
 *
 * - `POST` → `{ "token": "<custom token>" }`.
 */
export async function POST(request: NextRequest) {
  return handle(async () => {
    const api = await authenticate(request);
    const account = serviceAccount();
    if (!account) {
      throw new ApiError(501, "FIREBASE_SERVICE_ACCOUNT is not set.");
    }
    return Response.json({ token: customToken(account, api.userId) });
  });
}
