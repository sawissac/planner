import { handleLocal, LocalError, openFolder, requireLocalUser } from "@/lib/local-os";

/**
 * Local-only — open one of the user's saved project paths in the OS file
 * manager.
 *
 * `POST { "id": "<project_paths.id>" }` → 204. Takes the row id, not a path,
 * so only folders the user saved can be opened. 404 when the row or the
 * folder is gone.
 */
export async function POST(request: Request) {
  return handleLocal(async () => {
    const supabase = await requireLocalUser(request);
    const body = (await request.json().catch(() => null)) as { id?: unknown } | null;
    if (typeof body?.id !== "string" || !body.id) {
      throw new LocalError(400, "`id` must be a non-empty string.");
    }
    const { data, error } = await supabase
      .from("project_paths")
      .select("path")
      .eq("id", body.id)
      .maybeSingle();
    if (error) {
      throw new Error(error.message);
    }
    if (!data) {
      throw new LocalError(404, "Project path not found.");
    }
    await openFolder(data.path as string);
    return new Response(null, { status: 204 });
  });
}
