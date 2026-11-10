"use client";

import { normalizeUrl } from "@/lib/agent-servers";
import { createClient } from "@/lib/supabase/client";

/**
 * The image server (`images/`, a Bun server on http://localhost:3033 by
 * default) that stores pictures embedded in thoughts and comments.
 *
 * Its URL and token (the server's own `pim_…` token from `images/config.json`)
 * are set in Settings → API keys → Image server and kept as the `images` row
 * of `planner_agent_servers` (owner-only RLS, see
 * `supabase/migrations/20261015000000_image_server.sql`), so they need a
 * signed-in user. Agents read them through `/api/image-server`.
 *
 * Markdown embeds an image by its file url (`…/images/<id>/file`). An `<img>`
 * can't send a token, so {@link resolveImageSrc} fetches the file from the
 * configured server with it and hands the editor a blob URL. Only the image
 * id is read from the embed: the token only ever goes to the configured
 * server, and embeds keep working when its URL changes.
 */

export type ImageServer = { url: string; token: string };

export const DEFAULT_IMAGE_SERVER_URL = "http://localhost:3033";

const PROVIDER = "images";

/** `…/images/<id>/file`, also the older same-origin `/api/images/<id>/file`. */
const IMAGE_SRC = /\/(?:api\/)?images\/([\w-]+)\/file(?:[?#]|$)/;

const supabase = createClient();

let current: Promise<ImageServer | null> | null = null;
const blobs = new Map<string, Promise<string>>();

function reset(server: ImageServer | null = null): void {
  current = server ? Promise.resolve(server) : null;
  for (const url of blobs.values()) {
    void url.then(URL.revokeObjectURL, () => {});
  }
  blobs.clear();
}

supabase.auth.onAuthStateChange((event) => {
  if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
    reset();
  }
});

export async function getImageServer(): Promise<ImageServer | null> {
  const { data, error } = await supabase
    .from("planner_agent_servers")
    .select("url, token")
    .eq("provider", PROVIDER)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

export async function saveImageServer(server: ImageServer): Promise<ImageServer> {
  const row = { url: normalizeUrl(server.url), token: server.token.trim() };
  const { error } = await supabase
    .from("planner_agent_servers")
    .upsert({ provider: PROVIDER, ...row }, { onConflict: "user_id,provider" });
  if (error) {
    throw new Error(error.message);
  }
  reset(row);
  return row;
}

export async function removeImageServer(): Promise<void> {
  const { error } = await supabase.from("planner_agent_servers").delete().eq("provider", PROVIDER);
  if (error) {
    throw new Error(error.message);
  }
  reset();
}

const authHeaders = (server: ImageServer): Record<string, string> =>
  server.token ? { Authorization: `Bearer ${server.token}` } : {};

/**
 * Check the server and pair it with the signed-in user: the server takes
 * this user's session token once and saves them as the images' owner (it
 * refuses another account). Throws with the reason when the server is
 * unreachable, rejects the token, or belongs to someone else.
 */
export async function checkImageServer(server: ImageServer): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const session = data.session?.access_token;
  let res: Response;
  try {
    res = await fetch(`${normalizeUrl(server.url)}/health`, {
      headers: { ...authHeaders(server), ...(session ? { "X-Planner-Session": session } : {}) },
    });
  } catch {
    throw new Error(
      "Can't reach the image server. Is it running, and is this site in allowedOrigins?",
    );
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: unknown };
    throw new Error(typeof body.error === "string" ? body.error : `HTTP ${res.status}`);
  }
}

/**
 * MDXEditor's `imagePreviewHandler`: the displayable src for an embed. An
 * image-server embed becomes a blob URL fetched with the token (cached per
 * image for the page's life); anything else, or a failed fetch, keeps `src`.
 */
export async function resolveImageSrc(src: string): Promise<string> {
  const id = IMAGE_SRC.exec(src)?.[1];
  if (!id) {
    return src;
  }
  current ??= getImageServer().catch(() => null);
  const server = await current;
  if (!server) {
    return src;
  }
  let blob = blobs.get(id);
  if (!blob) {
    blob = fetch(`${server.url}/images/${encodeURIComponent(id)}/file`, {
      headers: authHeaders(server),
    }).then(async (res) => {
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      return URL.createObjectURL(await res.blob());
    });
    blob.catch(() => blobs.delete(id));
    blobs.set(id, blob);
  }
  return blob.catch(() => src);
}

/** An image record as the image server returns it. */
export type ServerImage = {
  id: string;
  name: string;
  type: string;
  size: number;
  todoId: string | null;
  createdAt: string;
  updatedAt: string;
};

/** The markdown that embeds an image; {@link resolveImageSrc} loads it. */
export function imageEmbed(server: ImageServer, image: Pick<ServerImage, "id" | "name">): string {
  const alt = image.name.replace(/[[\]()\\]/g, "").trim() || "image";
  return `![${alt}](${server.url}/images/${encodeURIComponent(image.id)}/file)`;
}

async function call(server: ImageServer, path: string, init: RequestInit = {}): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(`${server.url}${path}`, {
      ...init,
      headers: { ...authHeaders(server), ...init.headers },
    });
  } catch {
    throw new Error("Can't reach the image server. Is it running?");
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: unknown };
    throw new Error(typeof body.error === "string" ? body.error : `HTTP ${res.status}`);
  }
  return res;
}

/** The configured server, or an error pointing at Settings when there is none. */
export async function requireImageServer(): Promise<ImageServer> {
  current ??= getImageServer().catch(() => null);
  const server = await current;
  if (!server) {
    throw new Error("No image server set. Add one in Settings → API keys → Image server.");
  }
  return server;
}

export async function listImages(): Promise<ServerImage[]> {
  const server = await requireImageServer();
  const res = await call(server, "/images");
  return ((await res.json()) as { images: ServerImage[] }).images;
}

export async function uploadImage(file: File): Promise<ServerImage> {
  const server = await requireImageServer();
  const form = new FormData();
  form.append("file", file);
  const res = await call(server, `/images?name=${encodeURIComponent(file.name)}`, {
    method: "POST",
    body: form,
  });
  return ((await res.json()) as { image: ServerImage }).image;
}

export async function deleteImage(id: string): Promise<void> {
  const server = await requireImageServer();
  await call(server, `/images/${encodeURIComponent(id)}`, { method: "DELETE" });
  const blob = blobs.get(id);
  blobs.delete(id);
  void blob?.then(URL.revokeObjectURL, () => {});
}

/** Embed markdown for an uploaded file: what the editor's image dialog needs. */
export async function uploadForEditor(file: File): Promise<string> {
  const [server, image] = [await requireImageServer(), await uploadImage(file)];
  return `${server.url}/images/${encodeURIComponent(image.id)}/file`;
}

/** Blob URL of an image's file, cached with the embeds. */
export function imageBlobUrl(server: ImageServer, id: string): Promise<string> {
  return resolveImageSrc(`${server.url}/images/${encodeURIComponent(id)}/file`);
}

/** Drag-and-drop type carrying an image's embed markdown from the gallery to an editor. */
export const IMAGE_DRAG_TYPE = "application/x-planner-image";

/** Upload image files and return their embed markdown, one per file. */
export async function uploadEmbeds(files: File[]): Promise<string[]> {
  const server = await requireImageServer();
  const out: string[] = [];
  for (const file of files) {
    out.push(imageEmbed(server, await uploadImage(file)));
  }
  return out;
}
