"use client";

import { nanoid } from "@reduxjs/toolkit";

import { createClient } from "@/lib/supabase/client";
import type { AiKey, ProviderId } from "@/stores/slices/aiSlice";

/**
 * Storage for AI provider API keys. A user may hold several keys per
 * provider and choose one in the chat panel.
 *
 * Signed in → the `planner_ai_keys` table (owner-only RLS, see
 * `supabase/migrations/20261008010000_ai_provider_keys.sql`).
 * Signed out → browser localStorage. Local keys are moved to the account on
 * the first load after signing in, then removed from the browser.
 */

const LOCAL_KEY = "ai-keys";
/** Pre-database format: one key per provider at `ai-key:<provider>`. */
const LEGACY_PREFIX = "ai-key:";
const PROVIDERS: ProviderId[] = ["gemini", "openrouter"];
const LEGACY_PROVIDERS = ["gemini", "openrouter", "huggingface", "ollama"];

const supabase = createClient();

type Row = { id: string; provider: ProviderId; label: string; api_key: string };

const fromRow = (r: Row): AiKey => ({
  id: r.id,
  provider: r.provider,
  label: r.label,
  key: r.api_key,
});

function isProvider(p: unknown): p is ProviderId {
  return PROVIDERS.includes(p as ProviderId);
}

function readLocal(): AiKey[] {
  if (typeof window === "undefined") {
    return [];
  }
  let keys: AiKey[] = [];
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(LOCAL_KEY) ?? "[]");
    if (Array.isArray(parsed)) {
      keys = parsed.filter(
        (k): k is AiKey =>
          !!k && typeof k.id === "string" && typeof k.key === "string" && isProvider(k.provider),
      );
    }
  } catch {
    keys = [];
  }
  // Fold in keys saved by the old one-key-per-provider form, once.
  let migrated = false;
  for (const p of LEGACY_PROVIDERS) {
    const legacy = localStorage.getItem(LEGACY_PREFIX + p);
    if (legacy === null) {
      continue;
    }
    localStorage.removeItem(LEGACY_PREFIX + p);
    migrated = true;
    if (isProvider(p) && legacy.trim() && !keys.some((k) => k.key === legacy.trim())) {
      keys.push({ id: nanoid(), provider: p, label: "", key: legacy.trim() });
    }
  }
  if (migrated) {
    writeLocal(keys);
  }
  return keys;
}

function writeLocal(keys: AiKey[]): void {
  try {
    if (keys.length > 0) {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(keys));
    } else {
      localStorage.removeItem(LOCAL_KEY);
    }
  } catch {
    /* ignore quota / private mode */
  }
}

async function signedIn(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  return !!data.session;
}

/** Every stored key, oldest first. */
export async function listKeys(): Promise<AiKey[]> {
  const local = readLocal();
  if (!(await signedIn())) {
    return local;
  }
  if (local.length > 0) {
    const { error } = await supabase.from("planner_ai_keys").upsert(
      local.map((k) => ({ id: k.id, provider: k.provider, label: k.label, api_key: k.key })),
      { onConflict: "user_id,id", ignoreDuplicates: true },
    );
    if (!error) {
      writeLocal([]);
    }
  }
  const { data, error } = await supabase
    .from("planner_ai_keys")
    .select("id, provider, label, api_key")
    .order("created_at");
  if (error) {
    throw new Error(error.message);
  }
  return (data as Row[]).filter((r) => isProvider(r.provider)).map(fromRow);
}

export async function addKey(provider: ProviderId, label: string, key: string): Promise<AiKey> {
  const entry: AiKey = { id: nanoid(), provider, label: label.trim(), key: key.trim() };
  if (await signedIn()) {
    const { error } = await supabase
      .from("planner_ai_keys")
      .insert({ id: entry.id, provider, label: entry.label, api_key: entry.key });
    if (error) {
      throw new Error(error.message);
    }
  } else {
    writeLocal([...readLocal(), entry]);
  }
  return entry;
}

export async function removeKey(id: string): Promise<void> {
  if (await signedIn()) {
    const { error } = await supabase.from("planner_ai_keys").delete().eq("id", id);
    if (error) {
      throw new Error(error.message);
    }
  } else {
    writeLocal(readLocal().filter((k) => k.id !== id));
  }
}

/** Display name for a key: its label, else its position within the provider. */
export function keyName(key: AiKey, keys: AiKey[]): string {
  if (key.label) {
    return key.label;
  }
  const own = keys.filter((k) => k.provider === key.provider);
  return `Key ${own.indexOf(key) + 1}`;
}

/** `sk-…wxyz` style hint so keys can be told apart without showing them. */
export function maskKey(key: string): string {
  return key.length <= 8 ? "••••" : `${key.slice(0, 3)}…${key.slice(-4)}`;
}
