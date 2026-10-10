"use client";

import { MailCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requestPasswordReset } from "@/features/AuthLogin/actions";
import { cn } from "@/lib/cn";

type ViewState = "form" | "sent";

/**
 * Request-a-password-reset page. Submits an email to `requestPasswordReset`,
 * which sends a Supabase recovery link, then shows a confirmation state.
 * Local UI state only (view, loading, error).
 */
export function AuthForgotPassword() {
  const [view, setView] = useState<ViewState>("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const data = new FormData(e.currentTarget);
    const email = data.get("email") as string;

    const result = await requestPasswordReset(email);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setView("sent");
    setLoading(false);
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
          <p className="text-sm text-app-dim">
            {view === "sent" ? "Check your email" : "Reset your password"}
          </p>
        </div>

        {view === "sent" ? (
          <div
            className={cn(
              "nb-surface space-y-4 rounded-md bg-app-panel p-6 text-center",
              "animate-[compacto-fade-up_var(--motion-duration-base)_var(--motion-ease-standard)]",
            )}
          >
            <div className="mx-auto grid size-12 place-items-center rounded-md border-2 border-app-border bg-app-accent">
              <MailCheck className="size-5 text-app-on-solid" />
            </div>
            <div className="space-y-1">
              <p className="font-medium text-app-bright">Reset link sent</p>
              <p className="text-sm text-app-dim">
                If an account exists for that email, we sent a link to reset your password. Check
                your inbox.
              </p>
            </div>
            <Button asChild variant="outline" className="w-full">
              <Link href="/login">Back to sign in</Link>
            </Button>
          </div>
        ) : (
          <>
            <form
              onSubmit={handleSubmit}
              className="nb-surface space-y-4 rounded-md bg-app-panel p-6"
            >
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-sm font-medium text-app-bright">
                  Email
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  autoFocus
                  placeholder="you@example.com"
                  disabled={loading}
                  className="h-9"
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
                {loading ? "Sending link…" : "Send reset link"}
              </Button>
            </form>

            <p className="text-center text-sm text-app-dim">
              Remember it?{" "}
              <Link
                href="/login"
                className={cn(
                  "font-medium text-app-bright underline-offset-4",
                  "hover:underline",
                  "transition-colors duration-[--motion-duration-fast]",
                  "rounded-md outline-none focus-visible:ring-2 focus-visible:ring-app-accent/50",
                )}
              >
                Sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
