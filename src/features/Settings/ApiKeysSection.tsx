"use client";

import { Check, KeyRound, MessageSquareText, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { useConfirm } from "@/components/customs/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { copyText } from "@/lib/clipboard";
import { cn } from "@/lib/cn";
import {
  type ApiKeyInfo,
  getOrCreateApiKey,
  listApiKeys,
  revokeApiKey,
} from "@/lib/plan-api-token";
import { API_KEY_PREFIX } from "@/lib/plan-api-url";
import * as ui from "@/lib/ui-styles";

// Section type: Poppins bold for titles, names and buttons; Open Sans for
// every description, including inline code and the key's meta line.
const desc = "font-description";
const code = "rounded bg-app-bg px-1 py-0.5 font-description font-semibold text-app-accent";
// A row like SettingsDialog's SettingRow: title and help on the left, the
// action on the right, rows split by a hairline.
const row =
  "flex items-center justify-between gap-4 border-b border-app-border py-3 last:border-b-0";
const rowTitle = "truncate font-title text-[12px] font-bold text-app-bright";
const btnText = "font-title text-[11px] font-bold uppercase tracking-[0.06em]";

function fmt(ts: string): string {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Settings → API keys: "Copy key for CLI" (this browser's Plan API key, made
 * on first use, for `planner.sh login --clipboard`), then every key with when
 * it was made and last used, and a Revoke action (asks first). The list only shows each
 * key's last four characters.
 *
 * The key goes clipboard → `planner.sh` so it never passes through a chat
 * with an AI agent; the "Copy context" links are
 * answered with it from the saved file.
 */
export function ApiKeysSection() {
  const { user, loading } = useAuth();
  const confirm = useConfirm();
  const [keys, setKeys] = useState<ApiKeyInfo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  // Stays up after the button's "Copied" fades: the next step happens in another app.
  const [showLoginHint, setShowLoginHint] = useState(false);

  const load = useCallback(async () => {
    try {
      setKeys(await listApiKeys());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    if (user) {
      void load();
    }
  }, [user, load]);

  useEffect(() => {
    if (!copied) {
      return;
    }
    const t = window.setTimeout(() => setCopied(false), 4000);
    return () => window.clearTimeout(t);
  }, [copied]);

  const copyKey = async () => {
    try {
      const key = await getOrCreateApiKey();
      if (!key) {
        return;
      }
      await copyText(key);
      setCopied(true);
      setShowLoginHint(true);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const revoke = async (id: string) => {
    setBusyId(id);
    try {
      await revokeApiKey(id);
      setKeys((ks) => ks?.filter((k) => k.id !== id) ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex flex-col gap-2" data-testid="settings-api-keys">
      <h3 className={cn(ui.label, "mb-1 font-bold")}>API keys</h3>
      <p className={ui.help}>
        A <code className={code}>{API_KEY_PREFIX}…</code> key reaches only the Plan API (your
        tasks&apos; thoughts and comments) and works until you revoke it here. Copy it, then type{" "}
        <code className={code}>login planner</code> in your AI chat once. The agent saves it from
        the clipboard without seeing it, and uses it for every &quot;Copy context&quot; link you
        paste.
      </p>
      {user && (
        <div className={row}>
          <div className="flex min-w-0 flex-col gap-1">
            <span className={rowTitle}>Agent access</span>
            <p className={ui.help}>
              This browser&apos;s key, made on first copy. Paste it with{" "}
              <code className={code}>login planner</code>.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void copyKey()}
            className={cn(btnText, copied && "text-app-accent")}
            data-testid="settings-api-keys-copy"
          >
            {copied ? <Check className="size-3.5" /> : <KeyRound className="size-3.5" />}
            {copied ? "Copied" : "Copy key for CLI"}
          </Button>
        </div>
      )}
      {showLoginHint && (
        <div
          className={cn(
            "flex items-start gap-2.5 rounded-md border border-app-border-accent bg-app-accent-faint px-3 py-2.5 text-xs text-app-text",
            desc,
          )}
          role="status"
          data-testid="settings-api-keys-login-hint"
        >
          <MessageSquareText className="mt-px size-4 shrink-0 text-app-accent" />
          <p className="flex-1 leading-snug">
            Key copied. Now type <code className={code}>login planner</code> in your AI chat. The
            agent saves it from your clipboard without seeing it, then clears the clipboard.
          </p>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setShowLoginHint(false)}
            className={cn(ui.iconBtn, "size-5 [&_svg]:size-3.5")}
            data-testid="settings-api-keys-login-hint-dismiss"
          >
            <X />
          </button>
        </div>
      )}
      {loading ? null : !user ? (
        <p className={ui.help}>Sign in to create and manage API keys.</p>
      ) : error ? (
        <p
          className={cn("rounded-md bg-app-error/10 p-2 text-xs text-app-error", desc)}
          role="alert"
        >
          {error}
        </p>
      ) : keys === null ? (
        <p className={ui.help}>Loading…</p>
      ) : keys.length === 0 ? (
        <p className={ui.help}>No keys yet. &quot;Copy key for CLI&quot; creates one.</p>
      ) : (
        <ul className="flex flex-col">
          {keys.map((k) => (
            <li key={k.id} className={row} data-testid={`settings-api-key-${k.id}`}>
              <div className="flex min-w-0 flex-col gap-1">
                <span className={rowTitle}>
                  {k.label || "API key"}{" "}
                  <span className={cn(ui.meta, desc, "font-normal")}>
                    {API_KEY_PREFIX}…{k.hint}
                  </span>
                </span>
                <span className={cn(ui.meta, desc)}>
                  Created {fmt(k.createdAt)} ·{" "}
                  {k.lastUsedAt ? `last used ${fmt(k.lastUsedAt)}` : "never used"}
                </span>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() =>
                  confirm({
                    title: "Revoke API key?",
                    description: `${API_KEY_PREFIX}…${k.hint} stops working at once. Any agent still using it gets HTTP 401 until you copy a new key.`,
                    confirmLabel: "Revoke",
                    destructive: true,
                    onConfirm: () => void revoke(k.id),
                  })
                }
                disabled={busyId === k.id}
                className={btnText}
                data-testid={`settings-api-key-${k.id}-revoke`}
              >
                <Trash2 className="size-3.5" />
                Revoke
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
