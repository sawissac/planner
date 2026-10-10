"use client";

import { Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updatePassword } from "@/features/AuthLogin/actions";
import { cn } from "@/lib/cn";

/**
 * Set-a-new-password page. Reached only via `/auth/callback`, which establishes
 * the recovery session. Submits to `updatePassword`, which redirects to `/`
 * on success. Local UI state only (visibility, loading, error).
 */
export function AuthResetPassword() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const data = new FormData(e.currentTarget);
    const password = data.get("password") as string;
    const confirm = data.get("confirm") as string;

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const result = await updatePassword(password);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    // Success. Hard-navigate so the browser's Supabase client re-initializes
    // and picks up the session cookie the server action just wrote — see the
    // matching comment on `signIn` in AuthLogin. Loading stays true until nav.
    window.location.assign("/");
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-app-bg px-4">
      <div
        className={cn(
          "w-full max-w-sm space-y-8",
          "animate-[compacto-fade-up_var(--motion-duration-base)_var(--motion-ease-standard)]",
          "duration-[--motion-duration-slow] ease-[--motion-ease-standard]",
        )}
      >
        {/* Wordmark */}
        <div className="space-y-1 text-center">
          <Link
            href="/"
            aria-label="Planner — back to app"
            className="inline-flex items-center justify-center gap-2 rounded-md transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/50"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="" className="size-8" />
            <span className="font-display text-lg font-semibold">Planner</span>
          </Link>
          <p className="text-sm text-app-dim">Set a new password</p>
        </div>

        <form onSubmit={handleSubmit} className="nb-surface space-y-4 rounded-md bg-app-panel p-6">
          {/* New password */}
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium text-app-bright">
              New password
            </label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="new-password"
                autoFocus
                placeholder="••••••••"
                minLength={6}
                disabled={loading}
                className="h-9 pr-10"
              />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((v) => !v)}
                className={cn(
                  "absolute right-3 top-1/2 grid size-6 -translate-y-1/2 place-items-center text-app-dim",
                  "hover:text-app-bright",
                  "transition-colors duration-[--motion-duration-fast]",
                  "rounded-md outline-none focus-visible:ring-2 focus-visible:ring-app-accent/50",
                )}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {/* Confirm password */}
          <div className="space-y-1.5">
            <label htmlFor="confirm" className="text-sm font-medium text-app-bright">
              Confirm password
            </label>
            <Input
              id="confirm"
              name="confirm"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="new-password"
              placeholder="••••••••"
              minLength={6}
              disabled={loading}
              className="h-9 pr-10"
            />
          </div>

          {error && (
            <p
              role="alert"
              aria-live="polite"
              className={cn(
                "rounded-md border-2 border-app-error bg-app-error/10 px-3 py-2 text-sm font-medium text-app-error",
                "animate-[compacto-fade-up_var(--motion-duration-base)_var(--motion-ease-standard)]",
              )}
            >
              {error}
            </p>
          )}

          <Button
            type="submit"
            className={cn(
              "w-full transition-transform duration-[--motion-duration-instant]",
              "active:scale-[0.98]",
            )}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" />
                Updating password…
              </>
            ) : (
              "Update password"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
