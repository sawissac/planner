"use client";

import { Check, ExternalLink, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { useConfirm } from "@/components/customs/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarGroup, SidebarSeparator } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { addKey, keyName, listKeys, maskKey, removeKey } from "@/lib/ai/key-store";
import { PROVIDER_KEY_URL, PROVIDER_LABEL } from "@/lib/ai/providers";
import { cn } from "@/lib/cn";
import * as ui from "@/lib/ui-styles";
import { useAppDispatch, useAppSelector, useAppStore } from "@/stores/hooks";
import {
  type ProviderId,
  resolveKey,
  selectKey,
  setDefaultProvider,
  setKeys,
} from "@/stores/slices/aiSlice";

export const AI_PROVIDERS: ProviderId[] = ["gemini", "openrouter"];

const EMPTY_DRAFTS: Record<ProviderId, { label: string; key: string }> = {
  gemini: { label: "", key: "" },
  openrouter: { label: "", key: "" },
};

/**
 * Combined-control wrapper (compacto's OptionList / ButtonGroup shape): one
 * outer hairline, children split by `divide-*` instead of their own borders.
 */
const GROUP = "overflow-hidden rounded-lg border border-app-border-mid";

/**
 * One cell of a {@link GROUP}. Active is an inset ring, not a border, so the
 * selected cell never shifts its neighbours' edges.
 */
const SEGMENT =
  "relative flex items-center gap-1.5 bg-app-hover font-title text-[12px] font-semibold text-app-text " +
  "transition-colors duration-200 hover:bg-app-selected hover:text-app-bright " +
  "data-active:bg-app-accent-faint data-active:text-app-accent data-active:shadow-[inset_0_0_0_1.5px_var(--app-accent)] " +
  "focus-visible:outline-none focus-visible:shadow-[inset_0_0_0_2px_var(--app-accent)] " +
  "has-focus-visible:shadow-[inset_0_0_0_2px_var(--app-accent)]";

/** A text field laid flush inside a {@link GROUP}: the group's hairlines are its edges. */
const FLUSH_INPUT = "rounded-none border-0 bg-app-bg py-2 focus:ring-inset";

/**
 * AI provider settings, shown in the sidebar pane: the default provider a
 * chat starts on, and each provider's API keys — add several, pick the one in
 * use, delete. Keys live in the account when signed in, else in the browser
 * (`src/lib/ai/key-store.ts`); the chat header can switch keys too.
 */
export function AiProviderSettings() {
  const keys = useAppSelector((s) => s.ai.keys);
  const selectedKeyIds = useAppSelector((s) => s.ai.selectedKeyIds);
  const defaultProvider = useAppSelector((s) => s.ai.defaultProvider);
  const dispatch = useAppDispatch();
  const confirm = useConfirm();
  const store = useAppStore();
  const { user } = useAuth();
  const [drafts, setDrafts] = useState(EMPTY_DRAFTS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    void run(async () => {
      dispatch(setKeys(await listKeys()));
    });
  }, [dispatch, user?.id]);

  const add = (p: ProviderId) =>
    run(async () => {
      const d = drafts[p];
      if (!d.key.trim()) {
        return;
      }
      const created = await addKey(p, d.label, d.key);
      dispatch(setKeys([...store.getState().ai.keys, created]));
      dispatch(selectKey({ provider: p, id: created.id }));
      setDrafts((s) => ({ ...s, [p]: { label: "", key: "" } }));
    });

  const remove = (id: string) =>
    run(async () => {
      await removeKey(id);
      dispatch(setKeys(store.getState().ai.keys.filter((k) => k.id !== id)));
    });

  return (
    <>
      <SidebarGroup className="flex flex-col gap-2">
        <span className={ui.label}>Default provider</span>
        <div
          role="radiogroup"
          aria-label="Default AI provider"
          className={cn(GROUP, "grid grid-cols-2 divide-x divide-app-border-mid")}
          data-testid="ai-default-provider"
        >
          {AI_PROVIDERS.map((p) => {
            const active = p === defaultProvider;
            return (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={active}
                data-active={active || undefined}
                onClick={() => dispatch(setDefaultProvider(p))}
                className={cn(
                  SEGMENT,
                  "justify-center px-2 py-2 first:rounded-l-[calc(var(--radius-lg)-1px)] last:rounded-r-[calc(var(--radius-lg)-1px)]",
                )}
                data-testid={`ai-default-provider-${p}`}
              >
                {active && <Check className="size-3.5 shrink-0" />}
                {PROVIDER_LABEL[p]}
              </button>
            );
          })}
        </div>
        <p className={ui.help}>New chats start on this provider&apos;s model.</p>
      </SidebarGroup>

      <SidebarSeparator />

      {AI_PROVIDERS.map((p) => {
        const own = keys.filter((k) => k.provider === p);
        const active = resolveKey({ keys, selectedKeyIds }, p);
        return (
          <SidebarGroup key={p} className="flex flex-col gap-2" data-testid={`ai-keys-${p}`}>
            <div className="flex items-center justify-between">
              <span className={ui.label}>
                {PROVIDER_LABEL[p]} keys{own.length > 0 && ` (${own.length})`}
              </span>
              <a
                href={PROVIDER_KEY_URL[p]}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-app-accent hover:underline"
              >
                Get key
                <ExternalLink className="size-3" />
              </a>
            </div>
            {/* One bordered block: the key rows, then the add form, split by
                hairlines — compacto's OptionList shape. */}
            <div className={cn(GROUP, "flex flex-col divide-y divide-app-border-mid")}>
              {own.length === 0 ? (
                <p className={cn(ui.help, "bg-app-hover px-2.5 py-2")}>No keys yet.</p>
              ) : (
                <ul
                  role="radiogroup"
                  aria-label={`${PROVIDER_LABEL[p]} key in use`}
                  className="flex flex-col divide-y divide-app-border-mid"
                >
                  {own.map((k) => {
                    const inUse = k.id === active?.id;
                    return (
                      <li
                        key={k.id}
                        data-active={inUse || undefined}
                        className={cn(
                          SEGMENT,
                          "group gap-0 pr-1 first:rounded-t-[calc(var(--radius-lg)-1px)]",
                        )}
                      >
                        <button
                          type="button"
                          role="radio"
                          aria-checked={inUse}
                          onClick={() => dispatch(selectKey({ provider: p, id: k.id }))}
                          title={inUse ? "In use" : "Use this key"}
                          className="flex min-w-0 flex-1 items-center gap-2 py-2 pl-2.5 text-left outline-none"
                          data-testid={`ai-key-use-${k.id}`}
                        >
                          <Check
                            className={cn(
                              "size-3 shrink-0 text-app-accent",
                              inUse ? "opacity-100" : "opacity-0",
                            )}
                          />
                          <span className="min-w-0 flex-1 truncate text-app-bright">
                            {keyName(k, keys)}
                          </span>
                          <span className={ui.meta}>{maskKey(k.key)}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            confirm({
                              title: "Delete API key?",
                              description: `"${keyName(k, keys)}" will be permanently removed from this account.`,
                              confirmLabel: "Delete",
                              destructive: true,
                              onConfirm: () => void remove(k.id),
                            })
                          }
                          disabled={busy}
                          aria-label={`Delete ${keyName(k, keys)}`}
                          title="Delete key"
                          className={cn(ui.iconBtnDanger, ui.dim, "size-6")}
                          data-testid={`ai-key-delete-${k.id}`}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              {/* Key, label and Add as flush rows of the same block — no
                  field boxes of their own; focus is an inset ring. */}
              <form
                className="flex flex-col divide-y divide-app-border-mid"
                onSubmit={(e) => {
                  e.preventDefault();
                  void add(p);
                }}
              >
                <Input
                  aria-label={`${PROVIDER_LABEL[p]} API key`}
                  type="password"
                  autoComplete="off"
                  value={drafts[p].key}
                  onChange={(e) =>
                    setDrafts((s) => ({ ...s, [p]: { ...s[p], key: e.target.value } }))
                  }
                  placeholder="Paste API key"
                  className={FLUSH_INPUT}
                  data-testid={`ai-key-input-${p}`}
                />
                <div className="flex items-stretch divide-x divide-app-border-mid">
                  <Input
                    aria-label={`${PROVIDER_LABEL[p]} key label`}
                    value={drafts[p].label}
                    onChange={(e) =>
                      setDrafts((s) => ({ ...s, [p]: { ...s[p], label: e.target.value } }))
                    }
                    placeholder="Label (optional)"
                    className={FLUSH_INPUT}
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={busy || !drafts[p].key.trim()}
                    className="h-auto rounded-none px-3 font-title text-[11px] font-semibold tracking-[0.07em] uppercase focus-visible:ring-inset"
                    data-testid={`ai-key-add-${p}`}
                  >
                    <Plus className="size-3.5" />
                    Add
                  </Button>
                </div>
              </form>
            </div>
          </SidebarGroup>
        );
      })}

      {error && (
        <SidebarGroup>
          <p className="rounded-md bg-app-error/10 p-2 text-xs text-app-error" role="alert">
            {error}
          </p>
        </SidebarGroup>
      )}

      <SidebarGroup>
        <p className={ui.help}>
          {user
            ? "Keys are saved to your account."
            : "Keys are saved in this browser. Sign in to keep them in your account."}
        </p>
      </SidebarGroup>
    </>
  );
}
