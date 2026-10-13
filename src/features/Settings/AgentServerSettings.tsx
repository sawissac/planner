"use client";

import { Check, PlugZap, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import {
  AGENT_PROVIDER_LABEL,
  type AgentProvider,
  checkServer,
  DEFAULT_SERVER_URL,
  getServer,
  removeServer,
  saveServer,
} from "@/lib/agent-servers";
import { cn } from "@/lib/cn";
import * as ui from "@/lib/ui-styles";

const PROVIDER: AgentProvider = "claude-code";

type Status = { kind: "ok" | "error"; text: string } | null;

/**
 * Settings → API keys → "Claude Code server": the URL and token of the local
 * `execute-cli/claude` bridge that "Run agent → Claude Code" posts to. Saved
 * per user in `planner_agent_servers`; "Test" calls the bridge's `/health`
 * with the token, so it checks reachability, CORS and the token in one go.
 */
export function AgentServerSettings() {
  const { user, loading } = useAuth();
  const [url, setUrl] = useState(DEFAULT_SERVER_URL[PROVIDER]);
  const [token, setToken] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  useEffect(() => {
    if (!user) {
      return;
    }
    getServer(PROVIDER)
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
      const s = await saveServer({ provider: PROVIDER, url, token });
      setUrl(s.url);
      setSaved(true);
      return { kind: "ok", text: "Saved." };
    });

  const test = () =>
    run(async () => {
      await checkServer({ provider: PROVIDER, url, token });
      return { kind: "ok", text: "Connected." };
    });

  const remove = () =>
    run(async () => {
      await removeServer(PROVIDER);
      setUrl(DEFAULT_SERVER_URL[PROVIDER]);
      setToken("");
      setSaved(false);
      return { kind: "ok", text: "Removed." };
    });

  if (loading || !user) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2" data-testid="settings-agent-server">
      <h3 className={cn(ui.label, "mb-1")}>{AGENT_PROVIDER_LABEL[PROVIDER]} server</h3>
      <p className={ui.help}>
        &quot;Run agent → Claude Code&quot; sends the task to this server, which runs{" "}
        <code className="font-mono">claude</code> in the project folder you pick. Start it with{" "}
        <code className="font-mono">cd execute-cli/claude && bun start</code>, then paste the URL
        and the token it saved in <code className="font-mono">config.json</code>.
      </p>
      <label className={ui.fieldLabel} htmlFor="agent-server-url">
        Server URL
      </label>
      <Input
        id="agent-server-url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder={DEFAULT_SERVER_URL[PROVIDER]}
        spellCheck={false}
        data-testid="settings-agent-server-url"
      />
      <label className={ui.fieldLabel} htmlFor="agent-server-token">
        Token
      </label>
      <Input
        id="agent-server-token"
        type="password"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        placeholder="pcc_…"
        autoComplete="off"
        spellCheck={false}
        data-testid="settings-agent-server-token"
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void save()}
          disabled={busy || !url.trim()}
          className={ui.ghostBtn}
          data-testid="settings-agent-server-save"
        >
          <Save className="size-3.5" />
          Save
        </button>
        <button
          type="button"
          onClick={() => void test()}
          disabled={busy || !url.trim()}
          className={ui.ghostBtn}
          data-testid="settings-agent-server-test"
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
            data-testid="settings-agent-server-remove"
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
            data-testid="settings-agent-server-status"
          >
            {status.kind === "ok" && <Check className="size-3.5" />}
            {status.text}
          </span>
        )}
      </div>
    </div>
  );
}
