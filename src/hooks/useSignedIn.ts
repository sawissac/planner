"use client";

import { useEffect, useState } from "react";

import { isSignedIn, onAuthChange } from "@/lib/cloud-sync-backend";

/**
 * Whether a user is signed in, from cloud sync's shared auth state. Cheaper
 * than `useAuth` for components rendered many times (one per comment): no
 * network call per instance.
 */
export function useSignedIn(): boolean {
  const [signed, setSigned] = useState(false);

  useEffect(() => {
    setSigned(isSignedIn());
    return onAuthChange(setSigned);
  }, []);

  return signed;
}
