import type { NextRequest } from "next/server";

import { ApiError, authenticate, check, handle } from "@/lib/plan-api";

/**
 * Plan API — where the caller's image server is, for agents: the URL and
 * token saved in Settings → API keys → Image server (the `images` row of
 * `planner_agent_servers`, see `src/lib/image-server.ts`). `planner.sh image …`
 * reads it here, so an agent needs only its Plan API key.
 *
 * Auth: as every Plan API route (`authenticate` in `@/lib/plan-api`).
 *
 * - `GET` → `{ "url": "http://localhost:3033", "token": "pim_…" }`; 404 when
 *           none is set.
 */
export async function GET(request: NextRequest) {
  return handle(async () => {
    const api = await authenticate(request);
    const { data, error } = await api
      .table("planner_agent_servers")
      .select("url, token")
      .eq("provider", "images")
      .maybeSingle();
    check(error);
    if (!data) {
      throw new ApiError(404, "No image server set: Settings → API keys → Image server.");
    }
    const row = data as unknown as { url: string; token: string };
    return Response.json({ url: row.url, token: row.token });
  });
}
