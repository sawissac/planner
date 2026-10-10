"use client";

import { nanoid } from "@reduxjs/toolkit";

import { API_KEY_PREFIX } from "@/lib/plan-api-url";
import { createClient } from "@/lib/supabase/client";

/**
 * Plan API keys, browser side: the short `pln_…` bearer keys that
 * Settings → API keys copies for `planner.sh login --clipboard`. The
 * "Copy context" links never contain one. The database keeps only each key's
 * SHA-256 hash (`planner_api_tokens`), so the plaintext lives in this
 * browser's localStorage — one key per signed-in user per browser, reused
 * until it is revoked. See `supabase/migrations/20261009000000_plan_api_tokens.sql`.
 */

export type ApiKeyInfo = {
  id: string;
  label: string;
  hint: string;
  createdAt: string;
  lastUsedAt: string | null;
};

const STORAGE_PREFIX = "plan-api-key:";
const KEY_LENGTH = 32;
const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

const supabase = createClient();

type Stored = { id: string; key: string };

function readStored(userId: string): Stored | null {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_PREFIX + userId) ?? "null");
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof (parsed as Stored).id === "string" &&
      typeof (parsed as Stored).key === "string"
    ) {
      return parsed as Stored;
    }
  } catch {
    /* fall through */
  }
  return null;
}

function writeStored(userId: string, value: Stored | null): void {
  try {
    if (value) {
      localStorage.setItem(STORAGE_PREFIX + userId, JSON.stringify(value));
    } else {
      localStorage.removeItem(STORAGE_PREFIX + userId);
    }
  } catch {
    /* private mode / quota: the key just won't be reused */
  }
}

/** 32 base62 characters (~190 bits) from the CSPRNG, without modulo bias. */
function randomKey(): string {
  let out = API_KEY_PREFIX;
  while (out.length < API_KEY_PREFIX.length + KEY_LENGTH) {
    for (const b of crypto.getRandomValues(new Uint8Array(KEY_LENGTH))) {
      if (b < 248 && out.length < API_KEY_PREFIX.length + KEY_LENGTH) {
        out += ALPHABET[b % 62];
      }
    }
  }
  return out;
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * This browser's Plan API key for the signed-in user, creating (and
 * registering) one when there is none or the stored one was revoked.
 * `null` when signed out.
 */
export async function getOrCreateApiKey(): Promise<string | null> {
  const { data: auth } = await supabase.auth.getSession();
  const userId = auth.session?.user.id;
  if (!userId) {
    return null;
  }
  const stored = readStored(userId);
  if (stored) {
    const { data, error } = await supabase
      .from("planner_api_tokens")
      .select("id")
      .eq("id", stored.id)
      .maybeSingle();
    if (error) {
      throw new Error(error.message);
    }
    if (data) {
      return stored.key;
    }
  }
  const key = randomKey();
  const id = nanoid();
  const { error } = await supabase.from("planner_api_tokens").insert({
    id,
    token_hash: await sha256Hex(key),
    label: `CLI key · ${new Date().toLocaleDateString()}`,
    hint: key.slice(-4),
  });
  if (error) {
    throw new Error(error.message);
  }
  writeStored(userId, { id, key });
  return key;
}

/** The signed-in user's keys, newest first. Never includes the keys themselves. */
export async function listApiKeys(): Promise<ApiKeyInfo[]> {
  const { data, error } = await supabase
    .from("planner_api_tokens")
    .select("id, label, hint, created_at, last_used_at")
    .order("created_at", { ascending: false });
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []).map((r) => ({
    id: r.id as string,
    label: r.label as string,
    hint: r.hint as string,
    createdAt: r.created_at as string,
    lastUsedAt: (r.last_used_at as string | null) ?? null,
  }));
}

/** Revoke a key. Requests using it fail with 401 from then on. */
export async function revokeApiKey(id: string): Promise<void> {
  const { error } = await supabase.from("planner_api_tokens").delete().eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
  const { data: auth } = await supabase.auth.getSession();
  const userId = auth.session?.user.id;
  if (userId && readStored(userId)?.id === id) {
    writeStored(userId, null);
  }
}
