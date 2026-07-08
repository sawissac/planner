/**
 * Browser-side Supabase client (singleton-friendly factory).
 *
 * Use inside `"use client"` components / hooks. Reads the public publishable
 * key — row-level security on every table is what actually scopes data, so the
 * publishable key is safe to ship. The organization UUID is never sent from the
 * client: callers address an org by its public `slug` and RLS resolves the rest.
 */
import { createBrowserClient } from "@supabase/ssr";

/** Create a browser Supabase client bound to the public env vars. */
export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
