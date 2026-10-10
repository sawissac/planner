"use client";

import { type FirebaseApp, getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, signInWithCustomToken, signOut } from "firebase/auth";
import { type Database, getDatabase } from "firebase/database";

import { createClient } from "@/lib/supabase/client";

/**
 * Firebase web config, from the `NEXT_PUBLIC_FIREBASE_*` vars in `.env` at
 * the project root. Each var is read by its full name: Next only inlines
 * `process.env.NEXT_PUBLIC_*` into the browser bundle when accessed directly.
 *
 * Firebase only carries live agent progress (`agentRuns/<uid>/…` in the
 * Realtime Database, see `src/lib/agent-runs.ts`). Supabase stays the
 * account: Firebase signs in with a custom token minted for the Supabase
 * user (`/api/firebase/token`), so `database.rules.json` can keep each
 * user's runs private.
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

export function app(): FirebaseApp {
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

export function db(): Database {
  return getDatabase(app());
}

const supabase = createClient();
let signingIn: Promise<string> | null = null;
let warned = false;

async function signIn(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session) {
    throw new Error("Sign in to see live agent progress.");
  }
  const auth = getAuth(app());
  if (auth.currentUser?.uid === session.user.id) {
    return session.user.id;
  }
  if (auth.currentUser) {
    await signOut(auth);
  }
  const res = await fetch("/api/firebase/token", {
    method: "POST",
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (res.status === 501) {
    // No service account on the server: only works while the database
    // rules are still open (test mode).
    if (!warned) {
      warned = true;
      console.warn("[firebase] FIREBASE_SERVICE_ACCOUNT is not set; reading unsigned.");
    }
    return session.user.id;
  }
  const body = (await res.json().catch(() => ({}))) as { token?: string; error?: string };
  if (!res.ok || !body.token) {
    throw new Error(body.error ?? `Firebase sign-in failed (HTTP ${res.status}).`);
  }
  await signInWithCustomToken(auth, body.token);
  return session.user.id;
}

/** Sign Firebase in as the current Supabase user; resolves that user's id. */
export function firebaseUser(): Promise<string> {
  signingIn ??= signIn().finally(() => {
    signingIn = null;
  });
  return signingIn;
}
