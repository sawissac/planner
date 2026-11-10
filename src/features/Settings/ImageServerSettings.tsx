"use client";

import { Check, PlugZap, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/cn";
import {
  checkImageServer,
  DEFAULT_IMAGE_SERVER_URL,
  getImageServer,
  removeImageServer,
  saveImageServer,
} from "@/lib/image-server";
import * as ui from "@/lib/ui-styles";

type Status = { kind: "ok" | "error"; text: string } | null;

/**
 * Settings → API keys → "Image server": the URL and token of the `images/`
 * Bun server that stores pictures embedded in thoughts and comments. Saved per
 * user in `planner_agent_servers` (provider `images`); the editor loads every
 * embedded image from this server with the token. "Test" (and Save) call its
 * `/health` with the token and this user's session, so it checks
 * reachability, CORS and the token, and pairs the server with this account.
 *
 * @example
 *   <ImageServerSettings />
 */
export function ImageServerSettings() {
  const { user, loading } = useAuth();
  const [url, setUrl] = useState(DEFAULT_IMAGE_SERVER_URL);
  const [token, setToken] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  useEffect(() => {
    if (!user) {
      return;
    }
    getImageServer()
      .then((s) => {
        if (s) {
          setUrl(s.url);
          setToken(s.token);
          setSaved(true);
        }
      })
      .catch((e: Error) => setStatus({ kind: "error", text: e.message }));
  }, [user]);

  const run = async (fn: () => Promise<Status>) => {
    setBusy(true);
    setStatus(null);
    try {
      setStatus(await fn());
    } catch (e) {
      setStatus({ kind: "error", text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  };

  const save = () =>
    run(async () => {
      const s = await saveImageServer({ url, token });
      setUrl(s.url);
      setSaved(true);
      await checkImageServer(s);
      return { kind: "ok", text: "Saved and paired. Reopen a task to load its images." };
    });

  const test = () =>
    run(async () => {
      await checkImageServer({ url, token });
      return { kind: "ok", text: "Connected and paired." };
    });

  const remove = () =>
    run(async () => {
      await removeImageServer();
      setUrl(DEFAULT_IMAGE_SERVER_URL);
      setToken("");
      setSaved(false);
      return { kind: "ok", text: "Removed." };
    });

  if (loading || !user) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2" data-testid="settings-image-server">
      <h3 className={cn(ui.label, "mb-1")}>Image server</h3>
      <p className={ui.help}>
        Images in thoughts and comments are stored on this server. Start it with{" "}
        <code className="font-mono">pnpm image-server</code>, then paste its URL and the token it
        saved in <code className="font-mono">images/config.json</code>. Save pairs the server with
        this account; agents find it from here.
      </p>
      <label className={ui.fieldLabel} htmlFor="image-server-url">
        Server URL
      </label>
      <Input
        id="image-server-url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder={DEFAULT_IMAGE_SERVER_URL}
        spellCheck={false}
        data-testid="settings-image-server-url"
      />
      <label className={ui.fieldLabel} htmlFor="image-server-token">
        Token
      </label>
      <Input
        id="image-server-token"
        type="password"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        placeholder="pim_…"
        autoComplete="off"
        spellCheck={false}
        data-testid="settings-image-server-token"
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void save()}
          disabled={busy || !url.trim() || !token.trim()}
          className={ui.ghostBtn}
          data-testid="settings-image-server-save"
        >
          <Save className="size-3.5" />
          Save
        </button>
        <button
          type="button"
          onClick={() => void test()}
          disabled={busy || !url.trim()}
          className={ui.ghostBtn}
          data-testid="settings-image-server-test"
        >
          <PlugZap className="size-3.5" />
          Test
        </button>
        {saved && (
          <button
            type="button"
            onClick={() => void remove()}
            disabled={busy}
            className={cn(ui.ghostBtn, "hover:border-app-error hover:text-app-error")}
            data-testid="settings-image-server-remove"
          >
            <Trash2 className="size-3.5" />
            Remove
          </button>
        )}
        {status && (
          <span
            role={status.kind === "error" ? "alert" : "status"}
            className={cn(
              "inline-flex items-center gap-1 text-xs",
              status.kind === "error" ? "text-app-error" : "text-app-accent",
            )}
            data-testid="settings-image-server-status"
          >
            {status.kind === "ok" && <Check className="size-3.5" />}
            {status.text}
          </span>
        )}
      </div>
    </div>
  );
}
