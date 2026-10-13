import { handleLocal, pickFolder, requireLocalUser } from "@/lib/local-os";

/**
 * Local-only — show the native folder picker on this machine.
 *
 * `POST` → `{ "path": "<absolute path>" }`, or `{ "path": null }` when the
 * user cancels. Saving the path is the caller's job (`project_paths`).
 * 401 without a session, 403 off localhost (`requireLocalUser`).
 */
export async function POST(request: Request) {
  return handleLocal(async () => {
    await requireLocalUser(request);
    return Response.json({ path: await pickFolder() });
  });
}
