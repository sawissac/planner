/**
 * Planner image server.
 *
 *   pnpm image-server            # from the repo root (or: cd images && bun start)
 *                                # → http://127.0.0.1:3002
 *
 * Stores pictures attached to tasks' thoughts and comments: files under
 * `assets/`, records in Supabase (`planner_images`, see `store.ts`). Planner
 * loads them with the URL and token set in Settings → API keys → Image
 * server; agents upload through `planner.sh image …`.
 *
 * Auth (`auth.ts`): `Authorization: Bearer <token>`, this server's own token
 * from `config.json` (generated on first start), like `execute-cli/claude`.
 * Every image belongs to the paired Planner user: Settings → Image server
 * pairs on Test. An image is `{ id, name, type, size, fileId, todoId, url,
 * markdown, createdAt, updatedAt }`; `markdown` embeds `url`.
 *
 * Routes (all need the token; all but /health need pairing):
 *   GET    /health             → { ok, name, version, paired }. With
 *                                `X-Planner-Session: <Supabase access token>`
 *                                it pairs with that user first
 *   GET    /images             → { images }, newest first; `?todoId=` (+ `?fileId=`)
 *                                keeps one task's
 *   POST   /images             → 201 { image }. Multipart `file` field, or the raw
 *                                image as the body. `?name=` names it; `?todoId=`
 *                                (+ `?fileId=`) links it to that task
 *   GET    /images/:id         → { image }
 *   PUT    /images/:id         → { image }: replace the bytes (upload as POST);
 *                                id and url stay
 *   PATCH  /images/:id         → { image }: `{ "name": "…" }` renames it
 *   DELETE /images/:id         → 204
 *   GET    /images/:id/file    → the image (revalidated: `ETag`, 304)
 *
 * PNG, JPEG, GIF, WebP or AVIF, up to `maxMegabytes`. Settings live in
 * `config.json` next to this file (`config.ts`); Supabase's URL
 * and secret key come from the root `.env.local` / `.env`. The server only binds to
 * loopback, checks the Host header (DNS rebinding) and the Origin (CORS
 * allowlist), like `execute-cli/claude`.
 */
import { caller, type Caller, checkToken, db, HttpError, pair } from "./auth.ts";
import { CONFIG_PATH, config, LOOPBACK } from "./config.ts";
import {
  createImage,
  deleteImage,
  findImage,
  findTask,
  imageFile,
  imageJson,
  listImages,
  readImageUpload,
  renameImage,
  replaceImage,
} from "./store.ts";

const VERSION = "1.1.0";
const maxBytes = config.maxMegabytes * 1024 * 1024;
db(); // fail fast on a missing .env

function corsHeaders(origin: string | null): Record<string, string> {
  if (!origin || !config.allowedOrigins.includes(origin)) {
    return {};
  }
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, If-None-Match, X-Planner-Session",
    "Access-Control-Allow-Private-Network": "true",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
}

function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return Response.json(body, { status, headers });
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
  const body = (await request.json().catch(() => {
    throw new HttpError(400, "Request body must be JSON.");
  })) as unknown;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new HttpError(400, "Request body must be a JSON object.");
  }
  return body as Record<string, unknown>;
}

async function serveFile(request: Request, c: Caller, id: string): Promise<Response> {
  const row = await findImage(c, id);
  const etag = `"${row.id}-${Date.parse(row.updated_at)}"`;
  const headers = {
    ETag: etag,
    "Cache-Control": "private, no-cache",
    "X-Content-Type-Options": "nosniff",
  };
  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers });
  }
  const file = await imageFile(c, row);
  return new Response(file, {
    headers: {
      ...headers,
      "Content-Type": row.content_type,
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(row.name)}`,
    },
  });
}

/** Dispatch a request that carried the token; `null` for an unknown route. */
async function route(request: Request, url: URL): Promise<Response | null> {
  const { method } = request;
  const params = url.searchParams;
  const origin = url.origin;
  if (url.pathname === "/health" && method === "GET") {
    await pair(request);
    return json({ ok: true, name: "planner-images", version: VERSION, paired: !!config.ownerId });
  }
  const c = caller();
  if (url.pathname === "/images") {
    if (method === "GET") {
      const rows = await listImages(c, {
        todoId: params.get("todoId"),
        fileId: params.get("fileId"),
      });
      return json({ images: rows.map((r) => imageJson(r, origin)) });
    }
    if (method === "POST") {
      const todoId = params.get("todoId");
      const task = todoId ? await findTask(c, todoId, params.get("fileId")) : null;
      const row = await createImage(c, await readImageUpload(request, maxBytes), task);
      return json({ image: imageJson(row, origin) }, 201);
    }
    return null;
  }
  const match = /^\/images\/([\w-]+)(\/file)?$/.exec(url.pathname);
  if (!match) {
    return null;
  }
  const [, id, file] = match;
  if (file) {
    return method === "GET" ? serveFile(request, c, id) : null;
  }
  switch (method) {
    case "GET":
      return json({ image: imageJson(await findImage(c, id), origin) });
    case "PUT":
      return json({
        image: imageJson(
          await replaceImage(c, id, await readImageUpload(request, maxBytes)),
          origin,
        ),
      });
    case "PATCH":
      return json({ image: imageJson(await renameImage(c, id, await readJson(request)), origin) });
    case "DELETE":
      await deleteImage(c, id);
      return new Response(null, { status: 204 });
    default:
      return null;
  }
}

Bun.serve({
  hostname: config.host,
  port: config.port,
  // Room for the multipart envelope around a maximum-size image.
  maxRequestBodySize: maxBytes + 64 * 1024,
  async fetch(request) {
    const url = new URL(request.url);
    const origin = request.headers.get("origin");
    const cors = corsHeaders(origin);
    const host = (request.headers.get("host") ?? "").replace(/:\d+$/, "");
    if (!LOOPBACK.has(host)) {
      return json({ error: "Bad Host header." }, 421);
    }
    if (origin && !cors["Access-Control-Allow-Origin"]) {
      return json({ error: `Origin ${origin} is not in allowedOrigins.` }, 403);
    }
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }
    let response: Response;
    try {
      checkToken(request);
      response = (await route(request, url)) ?? json({ error: "Not found." }, 404);
    } catch (e) {
      if (e instanceof HttpError) {
        response = json({ error: e.message }, e.status);
      } else {
        console.error("[planner-images]", e);
        response = json({ error: "Internal server error." }, 500);
      }
    }
    for (const [k, v] of Object.entries(cors)) {
      response.headers.set(k, v);
    }
    return response;
  },
});

console.log(`[planner-images] listening on http://${config.host}:${config.port}`);
console.log(`[planner-images] allowed origins: ${config.allowedOrigins.join(", ")}`);
console.log(`[planner-images] token: in ${CONFIG_PATH}`);
if (!config.ownerId) {
  console.log("[planner-images] not paired: Planner → Settings → Image server → Test");
}
