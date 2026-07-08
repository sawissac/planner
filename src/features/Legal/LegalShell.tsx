import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { ThemeToggle } from "@/components/customs/ThemeToggle";

/**
 * Shared chrome for the standalone public pages (`/about`, `/privacy`,
 * `/terms`). Renders a sticky header (brand → home, theme toggle, back-to-app)
 * above the page content, and a footer that cross-links all three. Pure
 * presentational wrapper — page-specific content is passed in as
 * {@link children}. Reachable while signed out, so it carries its own
 * navigation rather than relying on the in-app `AppShell`/`Sidebar`.
 *
 * @param props.title - Page title shown as the H1.
 * @param props.meta - Optional line under the title (e.g. an effective date
 *   or a short tagline).
 * @param props.children - The page body content.
 */
export function LegalShell({
  title,
  meta,
  children,
}: {
  title: string;
  meta?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-card/80 backdrop-blur-md supports-backdrop-filter:bg-card/70">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-3 px-6 py-3.5">
          <Link href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="" className="size-6" />
            <span className="font-display text-base font-bold">Planner</span>
          </Link>
          <nav className="ml-auto flex items-center gap-1.5">
            <ThemeToggle />
            <Link
              href="/app"
              className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-sm font-medium transition-colors hover:bg-muted"
            >
              <ArrowLeft size={14} />
              App
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12 text-sm leading-relaxed">
        <h1 className="font-display text-3xl font-semibold">{title}</h1>
        {meta && <p className="mt-2 text-muted-foreground">{meta}</p>}
        {children}
      </main>

      <LegalFooter />
    </div>
  );
}

/** Footer shared by the standalone pages — brand + cross-links. */
function LegalFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center justify-between gap-4 px-6 py-8 text-xs sm:flex-row">
        <p className="text-muted-foreground">Planner — local-first task planner.</p>
        <nav className="flex items-center gap-4 text-muted-foreground">
          <Link href="/about" className="hover:text-foreground">
            About
          </Link>
          <Link href="/privacy" className="hover:text-foreground">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-foreground">
            Terms
          </Link>
        </nav>
      </div>
    </footer>
  );
}
