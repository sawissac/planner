import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { nanoid } from "nanoid";

import { type Caller, HttpError } from "./auth.ts";

/**
 * Image storage: pictures attached to a task's thought or comments.
 *
 * An image is a row in `planner_images` (name, type, size, the task it was
 * uploaded for; `supabase/migrations/20261014000000_planner_images.sql`) plus
 * its file at `images/assets/<user id>/<image id>.<ext>` (git-ignored). Every
 * query filters by the caller's user id, and the file path is built from it.
 *
 * Replacing an image's bytes keeps its id, so every embed shows the new
 * picture.
 */

const ASSETS_DIR = join(import.meta.dir, "assets");
const MAX_NAME = 200;

export type ImageRow = {
  id: string;
  name: string;
  content_type: string;
  size: number;
  file_id: string | null;
  todo_id: string | null;
  created_at: string;
  updated_at: string;
};

const IMAGE_COLUMNS = "id, name, content_type, size, file_id, todo_id, created_at, updated_at";

export type ImageUpload = { bytes: Uint8Array; type: string; name: string };

type Task = { file_id: string; id: string };

const EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/avif": "avif",
};

/** Ids only ever come from nanoid / Supabase uuids; anything else could escape the folder. */
const SAFE_SEGMENT = /^[\w-]+$/;

/** `images/assets/<userId>/<id>.<ext>` */
function assetPath(userId: string, id: string, type: string): string {
  if (!SAFE_SEGMENT.test(userId) || !SAFE_SEGMENT.test(id) || !EXTENSIONS[type]) {
    throw new HttpError(400, "Invalid image id.");
  }
  return join(ASSETS_DIR, userId, `${id}.${EXTENSIONS[type]}`);
}

/** Write via a temp file and rename, so a reader never sees half an image. */
async function writeAsset(path: string, bytes: Uint8Array): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temp = `${path}.${nanoid(8)}.tmp`;
  try {
    await writeFile(temp, bytes);
    await rename(temp, path);
  } catch (e) {
    await rm(temp, { force: true });
    throw e;
  }
}

/** Throw for a failed Supabase call: bad values are the caller's fault. */
function check(error: { code?: string; message: string } | null): void {
  if (!error) {
    return;
  }
  if (error.code === "23503" || error.code?.startsWith("22")) {
    throw new HttpError(400, error.message);
  }
  throw new Error(error.message);
}

/**
 * The image type, read from the file's first bytes: the declared type is not
 * trusted. SVG is refused, since it can carry script.
 */
function sniffImageType(bytes: Uint8Array): string | null {
  const at = (offset: number, sig: number[]) => sig.every((b, i) => bytes[offset + i] === b);
  if (at(0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png";
  }
  if (at(0, [0xff, 0xd8, 0xff])) {
    return "image/jpeg";
  }
  if (at(0, [0x47, 0x49, 0x46, 0x38])) {
    return "image/gif";
  }
  if (at(0, [0x52, 0x49, 0x46, 0x46]) && at(8, [0x57, 0x45, 0x42, 0x50])) {
    return "image/webp";
  }
  // ISO-BMFF "ftyp" box with an "avif" / "avis" brand.
  if (
    at(4, [0x66, 0x74, 0x79, 0x70]) &&
    (at(8, [0x61, 0x76, 0x69, 0x66]) || at(8, [0x61, 0x76, 0x69, 0x73]))
  ) {
    return "image/avif";
  }
  return null;
}

function cleanName(name: string): string {
  const base = name.split(/[\\/]/).pop()?.trim() ?? "";
  return base.slice(0, MAX_NAME) || "image";
}

/**
 * Read an upload: a multipart `file` field (`curl -F file=@shot.png`), or the
 * raw image as the body. `?name=` names it (default: the file's own name).
 */
export async function readImageUpload(request: Request, maxBytes: number): Promise<ImageUpload> {
  const tooBig = `Images are limited to ${Math.round(maxBytes / 1024 / 1024)} MB.`;
  let name = new URL(request.url).searchParams.get("name") ?? "";
  let blob: Blob;
  if ((request.headers.get("content-type") ?? "").startsWith("multipart/form-data")) {
    const form = await request.formData().catch(() => {
      throw new HttpError(400, "Malformed multipart body.");
    });
    const file = form.get("file");
    if (!(file instanceof File)) {
      throw new HttpError(400, "Send the image as a `file` field.");
    }
    blob = file;
    name ||= file.name;
  } else {
    blob = await request.blob();
  }
  if (blob.size === 0) {
    throw new HttpError(400, "The image is empty.");
  }
  if (blob.size > maxBytes) {
    throw new HttpError(413, tooBig);
  }
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const type = sniffImageType(bytes);
  if (!type) {
    throw new HttpError(415, "Only PNG, JPEG, GIF, WebP and AVIF images are accepted.");
  }
  return { bytes, type, name: cleanName(name) };
}

/** Alt text for an embed: the name without its extension or bracket chars. */
const altText = (name: string) =>
  name.replace(/\.[a-z0-9]+$/i, "").replace(/[[\]]/g, "") || "image";

/**
 * An image as the API returns it. `url` is its file on this server
 * (`origin` = how the caller reached it); `markdown` embeds that url — the
 * app loads it with the token from Settings → Image server.
 */
export function imageJson(row: ImageRow, origin: string) {
  const url = `${origin}/images/${encodeURIComponent(row.id)}/file`;
  return {
    id: row.id,
    name: row.name,
    type: row.content_type,
    size: row.size,
    fileId: row.file_id,
    todoId: row.todo_id,
    url,
    markdown: `![${altText(row.name)}](${url})`,
    createdAt: Date.parse(row.created_at),
    updatedAt: Date.parse(row.updated_at),
  };
}

/**
 * The caller's task, to link an upload to. Task ids are only unique per
 * file, so `fileId` picks one when the id repeats (409 otherwise).
 */
export async function findTask(c: Caller, todoId: string, fileId: string | null): Promise<Task> {
  let query = c.db
    .from("planner_todos")
    .select("file_id, id")
    .eq("user_id", c.userId)
    .eq("id", todoId);
  if (fileId) {
    query = query.eq("file_id", fileId);
  }
  const { data, error } = await query.limit(2);
  check(error);
  if (!data || data.length === 0) {
    throw new HttpError(404, "Task not found.");
  }
  if (data.length > 1) {
    throw new HttpError(409, "Task id exists in more than one file; add `?fileId=<file id>`.");
  }
  return data[0] as Task;
}

/** The caller's images, newest first; `todoId` (+ `fileId`) keeps one task's. */
export async function listImages(
  c: Caller,
  filter: { todoId?: string | null; fileId?: string | null } = {},
): Promise<ImageRow[]> {
  let query = c.db.from("planner_images").select(IMAGE_COLUMNS).eq("user_id", c.userId);
  if (filter.todoId) {
    query = query.eq("todo_id", filter.todoId);
  }
  if (filter.fileId) {
    query = query.eq("file_id", filter.fileId);
  }
  const { data, error } = await query.order("created_at", { ascending: false });
  check(error);
  return (data ?? []) as ImageRow[];
}

export async function findImage(c: Caller, id: string): Promise<ImageRow> {
  const { data, error } = await c.db
    .from("planner_images")
    .select(IMAGE_COLUMNS)
    .eq("user_id", c.userId)
    .eq("id", id)
    .maybeSingle();
  check(error);
  if (!data) {
    throw new HttpError(404, "Image not found.");
  }
  return data as ImageRow;
}

/** Store a new image, linked to `task` when given. */
export async function createImage(
  c: Caller,
  upload: ImageUpload,
  task: Task | null,
): Promise<ImageRow> {
  const id = nanoid();
  const path = assetPath(c.userId, id, upload.type);
  await writeAsset(path, upload.bytes);
  const { data, error } = await c.db
    .from("planner_images")
    .insert({
      user_id: c.userId,
      id,
      name: upload.name,
      content_type: upload.type,
      size: upload.bytes.byteLength,
      file_id: task?.file_id ?? null,
      todo_id: task?.id ?? null,
    })
    .select(IMAGE_COLUMNS)
    .single();
  if (error) {
    await rm(path, { force: true });
  }
  check(error);
  return data as ImageRow;
}

/** Swap an image's bytes, keeping its id (and so every embed of it). */
export async function replaceImage(c: Caller, id: string, upload: ImageUpload): Promise<ImageRow> {
  const old = await findImage(c, id);
  const oldPath = assetPath(c.userId, id, old.content_type);
  const path = assetPath(c.userId, id, upload.type);
  await writeAsset(path, upload.bytes);
  if (oldPath !== path) {
    // A new type means a new extension: drop the old file.
    await rm(oldPath, { force: true });
  }
  const { data, error } = await c.db
    .from("planner_images")
    .update({ content_type: upload.type, size: upload.bytes.byteLength })
    .eq("user_id", c.userId)
    .eq("id", id)
    .select(IMAGE_COLUMNS)
    .single();
  check(error);
  return data as ImageRow;
}

/** Validate a PATCH body (`{ "name": … }`) and rename the image. */
export async function renameImage(
  c: Caller,
  id: string,
  body: Record<string, unknown>,
): Promise<ImageRow> {
  const unknown = Object.keys(body).filter((k) => k !== "name");
  if (unknown.length > 0) {
    throw new HttpError(400, `Unknown field(s): ${unknown.join(", ")}.`);
  }
  if (typeof body.name !== "string" || !body.name.trim()) {
    throw new HttpError(400, "`name` must be a non-empty string.");
  }
  const { data, error } = await c.db
    .from("planner_images")
    .update({ name: cleanName(body.name) })
    .eq("user_id", c.userId)
    .eq("id", id)
    .select(IMAGE_COLUMNS)
    .maybeSingle();
  check(error);
  if (!data) {
    throw new HttpError(404, "Image not found.");
  }
  return data as ImageRow;
}

/** Remove the image's row and file. Embeds of it stop loading. */
export async function deleteImage(c: Caller, id: string): Promise<void> {
  const { data, error } = await c.db
    .from("planner_images")
    .delete()
    .eq("user_id", c.userId)
    .eq("id", id)
    .select("content_type");
  check(error);
  if (!data || data.length === 0) {
    throw new HttpError(404, "Image not found.");
  }
  await rm(assetPath(c.userId, id, (data[0] as Pick<ImageRow, "content_type">).content_type), {
    force: true,
  });
}

/** The image's file; 404 when it is gone from disk. */
export async function imageFile(c: Caller, row: ImageRow) {
  const file = Bun.file(assetPath(c.userId, row.id, row.content_type), {
    type: row.content_type,
  });
  if (!(await file.exists())) {
    throw new HttpError(404, "Image file is missing.");
  }
  return file;
}
