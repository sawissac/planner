/**
 * Shared plumbing for the local-only routes (`src/app/api/local/**`): they
 * drive the OS of the machine running Next — a native folder picker and the
 * file manager — so they only make sense when that machine is the user's
 * own computer (`pnpm dev` / `pnpm start` on localhost).
 *
 * Every route requires the cookie session (the browser client's), so a
 * cross-site request without it gets 401, and refuses non-loopback hosts so
 * a deployed copy never pops dialogs on a server.
 */
import { execFile, spawn } from "node:child_process";
import { stat } from "node:fs/promises";

import { createClient } from "@/lib/supabase/server";

export class LocalError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const LOOPBACK = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

/**
 * Check the request is local and signed in; returns the request-scoped
 * Supabase client (RLS applies as the user).
 */
export async function requireLocalUser(request: Request) {
  // The Host header, not request.url: Next may rebuild the URL from its own
  // bind address, while a proxy or deployment forwards the public host here.
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  if (!LOOPBACK.has(new URL(`http://${host}`).hostname)) {
    throw new LocalError(403, "Only available when Planner runs on your computer (localhost).");
  }
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    throw new LocalError(401, "Sign in to use project paths.");
  }
  return supabase;
}

/** Run a handler, turning thrown errors into JSON `{ error }` responses. */
export async function handleLocal(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof LocalError) {
      return Response.json({ error: e.message }, { status: e.status });
    }
    console.error("[local]", e);
    return Response.json({ error: (e as Error).message || "Internal error." }, { status: 500 });
  }
}

/** Five minutes to choose a folder before the picker is given up on. */
const PICK_TIMEOUT_MS = 5 * 60 * 1000;

function run(file: string, args: string[]): Promise<{ code: number; stdout: string }> {
  return new Promise((resolve, reject) => {
    execFile(file, args, { timeout: PICK_TIMEOUT_MS }, (error, stdout) => {
      if (error && typeof error.code !== "number") {
        // Not an exit status: the program is missing or timed out.
        reject(error);
        return;
      }
      resolve({ code: error ? (error.code as number) : 0, stdout: stdout.trim() });
    });
  });
}

const PROMPT = "Choose a project folder";

/** Picker command per platform; a non-zero exit means "cancelled". */
function pickerCommand(): [string, string[]] {
  switch (process.platform) {
    case "darwin":
      return ["osascript", ["-e", `POSIX path of (choose folder with prompt "${PROMPT}")`]];
    case "win32":
      return [
        "powershell.exe",
        [
          "-NoProfile",
          "-STA",
          "-Command",
          "Add-Type -AssemblyName System.Windows.Forms;" +
            "$d = New-Object System.Windows.Forms.FolderBrowserDialog;" +
            `$d.Description = '${PROMPT}';` +
            "if ($d.ShowDialog() -eq 'OK') { $d.SelectedPath } else { exit 1 }",
        ],
      ];
    default:
      return ["zenity", ["--file-selection", "--directory", `--title=${PROMPT}`]];
  }
}

/** Show the native folder picker; `null` when the user cancels. */
export async function pickFolder(): Promise<string | null> {
  const [file, args] = pickerCommand();
  let result;
  try {
    result = await run(file, args);
  } catch (e) {
    const err = e as NodeJS.ErrnoException & { killed?: boolean };
    if (err.killed) {
      return null;
    }
    throw new LocalError(501, `No folder picker available (${file} ${err.code ?? "failed"}).`);
  }
  if (result.code !== 0 || !result.stdout) {
    return null;
  }
  // macOS returns a trailing slash; keep "/" itself.
  return result.stdout.length > 1 ? result.stdout.replace(/[\\/]+$/, "") : result.stdout;
}

/** Open a directory in the OS file manager (Finder / Explorer / xdg-open). */
export async function openFolder(path: string): Promise<void> {
  const info = await stat(path).catch(() => null);
  if (!info?.isDirectory()) {
    throw new LocalError(404, `Folder not found: ${path}`);
  }
  let file: string;
  let args: string[];
  switch (process.platform) {
    case "darwin":
      // A bundle (Foo.app) is a directory `open` would launch: reveal it instead.
      [file, args] = ["open", /\.app$/i.test(path) ? ["-R", path] : [path]];
      break;
    case "win32":
      [file, args] = ["explorer.exe", [path]];
      break;
    default:
      [file, args] = ["xdg-open", [path]];
  }
  await new Promise<void>((resolve, reject) => {
    const child = spawn(file, args, { detached: true, stdio: "ignore" });
    child.once("error", reject);
    child.once("spawn", () => {
      child.unref();
      resolve();
    });
  });
}
