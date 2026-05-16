import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Planner — local-first task & todo planner",
  description:
    "A fast, local-first planner with timelines, analytics, and optional Google Drive backup.",
}

export default function Home() {
  return (
    <main className="relative isolate h-dvh w-full flex-1 overflow-x-hidden overflow-y-auto bg-background text-foreground">
      <style>{landingCss}</style>

      <BackgroundLayer />

      <section className="relative mx-auto flex max-w-5xl flex-col items-center px-6 pt-20 pb-16 text-center sm:pt-28 lg:pt-32 lg:pb-24">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur lp-fade-up">
          <span className="lp-dot" /> Local-first · No account required
        </span>

        <h1 className="mt-6 text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
          <span className="lp-fade-up lp-d1 block">Plan your day.</span>
          <span className="lp-fade-up lp-d2 block bg-gradient-to-r from-[var(--chart-3)] via-[var(--primary)] to-[var(--chart-4)] bg-clip-text text-transparent">
            Own your data.
          </span>
        </h1>

        <p className="lp-fade-up lp-d3 mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
          A fast, local-first planner with timelines, analytics, and
          optional Google Drive backup. Built for the browser. Yours alone.
        </p>

        <div className="lp-fade-up lp-d4 mt-10 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row">
          <Link
            href="/app"
            className="group relative inline-flex h-14 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-primary px-8 text-base font-medium text-primary-foreground shadow-md transition hover:shadow-xl sm:w-auto sm:min-w-[180px]"
          >
            <span className="lp-shimmer absolute inset-0" aria-hidden />
            <span className="relative">Open the app</span>
            <svg className="relative h-5 w-5 transition group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" />
              <path d="m13 6 6 6-6 6" />
            </svg>
          </Link>
          <Link
            href="/about"
            className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card/60 px-8 text-base font-medium backdrop-blur transition hover:bg-card sm:w-auto sm:min-w-[160px]"
          >
            Learn more
          </Link>
        </div>

        <ul className="lp-fade-up lp-d5 mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
          <li className="inline-flex items-center gap-1.5"><Check /> No account</li>
          <li className="inline-flex items-center gap-1.5"><Check /> Works offline</li>
          <li className="inline-flex items-center gap-1.5"><Check /> Open source feel</li>
        </ul>

        <div className="relative mt-16 w-full">
          <HeroIllustration />
        </div>
      </section>

      <section className="relative mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            title="Timelines"
            desc="Drag, drop, resize. See your week at a glance."
            icon={<TimelineIcon />}
            delay="lp-d1"
          />
          <FeatureCard
            title="Analytics"
            desc="Heatmaps and breakdowns of completed work."
            icon={<ChartIcon />}
            delay="lp-d2"
          />
          <FeatureCard
            title="Drive backup"
            desc="Optional sync to a hidden folder in your own Drive."
            icon={<CloudIcon />}
            delay="lp-d3"
          />
        </div>
      </section>

      <footer className="relative border-t border-border/60 bg-background/60 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-6 text-xs text-muted-foreground sm:flex-row">
          <p>Planner — local-first task planner.</p>
          <nav className="flex items-center gap-4">
            <Link href="/about" className="hover:text-foreground">About</Link>
            <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground">Terms</Link>
          </nav>
        </div>
      </footer>
    </main>
  )
}

function BackgroundLayer() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.18] dark:opacity-[0.10]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="lp-grid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M 48 0 L 0 0 0 48" fill="none" stroke="currentColor" strokeWidth="0.6" />
          </pattern>
          <radialGradient id="lp-grid-fade" cx="50%" cy="0%" r="80%">
            <stop offset="0%" stopColor="white" stopOpacity="1" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
          <mask id="lp-grid-mask">
            <rect width="100%" height="100%" fill="url(#lp-grid-fade)" />
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="url(#lp-grid)" mask="url(#lp-grid-mask)" />
      </svg>

      <div className="lp-orb lp-orb-1" />
      <div className="lp-orb lp-orb-2" />
      <div className="lp-orb lp-orb-3" />

      <svg
        className="absolute -top-20 right-[-10%] h-[560px] w-[560px] opacity-60"
        viewBox="0 0 200 200"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="lp-ring" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="var(--chart-4)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g className="lp-spin-slow" style={{ transformOrigin: "100px 100px" }}>
          <circle cx="100" cy="100" r="80" fill="none" stroke="url(#lp-ring)" strokeWidth="0.8" strokeDasharray="2 6" />
          <circle cx="100" cy="100" r="60" fill="none" stroke="url(#lp-ring)" strokeWidth="0.6" strokeDasharray="1 5" />
        </g>
        <g className="lp-spin-rev" style={{ transformOrigin: "100px 100px" }}>
          <circle cx="100" cy="100" r="40" fill="none" stroke="url(#lp-ring)" strokeWidth="0.6" strokeDasharray="1 4" />
        </g>
      </svg>
    </div>
  )
}

function HeroIllustration() {
  return (
    <div className="lp-fade-up lp-d3 relative mx-auto aspect-[5/4] w-full max-w-[520px]">
      <div className="lp-float absolute inset-0">
        <svg viewBox="0 0 520 420" xmlns="http://www.w3.org/2000/svg" className="h-full w-full drop-shadow-[0_30px_60px_rgba(0,0,0,0.18)]">
          <defs>
            <linearGradient id="card-bg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--card)" />
              <stop offset="100%" stopColor="var(--background)" />
            </linearGradient>
            <linearGradient id="bar-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--primary)" />
              <stop offset="100%" stopColor="var(--chart-4)" />
            </linearGradient>
            <linearGradient id="head-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--chart-3)" />
              <stop offset="100%" stopColor="var(--primary)" />
            </linearGradient>
          </defs>

          <g>
            <rect x="20" y="40" width="480" height="360" rx="20" fill="url(#card-bg)" stroke="var(--border)" />
            <rect x="20" y="40" width="480" height="48" rx="20" fill="url(#head-grad)" opacity="0.95" />
            <rect x="20" y="76" width="480" height="12" fill="url(#head-grad)" opacity="0.95" />
            <circle cx="44" cy="64" r="5" fill="white" opacity="0.85" />
            <circle cx="62" cy="64" r="5" fill="white" opacity="0.55" />
            <circle cx="80" cy="64" r="5" fill="white" opacity="0.35" />
            <rect x="110" y="58" width="120" height="12" rx="6" fill="white" opacity="0.85" />

            <g className="lp-row" style={{ animationDelay: "0.2s" }}>
              <rect x="44" y="116" width="20" height="20" rx="5" fill="var(--accent)" stroke="var(--primary)" />
              <path className="lp-check" d="M48 126 l4 4 l8 -8" fill="none" stroke="var(--primary)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              <rect x="76" y="120" width="220" height="12" rx="4" fill="var(--muted-foreground)" opacity="0.35" />
              <rect x="320" y="120" width="120" height="12" rx="4" fill="url(#bar-grad)" opacity="0.7" />
            </g>

            <g className="lp-row" style={{ animationDelay: "0.6s" }}>
              <rect x="44" y="156" width="20" height="20" rx="5" fill="var(--accent)" stroke="var(--primary)" />
              <path className="lp-check" style={{ animationDelay: "0.9s" }} d="M48 166 l4 4 l8 -8" fill="none" stroke="var(--primary)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              <rect x="76" y="160" width="180" height="12" rx="4" fill="var(--muted-foreground)" opacity="0.35" />
              <rect x="320" y="160" width="80" height="12" rx="4" fill="url(#bar-grad)" opacity="0.55" />
            </g>

            <g className="lp-row" style={{ animationDelay: "1.0s" }}>
              <rect x="44" y="196" width="20" height="20" rx="5" fill="var(--card)" stroke="var(--border)" />
              <rect x="76" y="200" width="240" height="12" rx="4" fill="var(--muted-foreground)" opacity="0.25" />
              <rect x="340" y="200" width="100" height="12" rx="4" fill="var(--muted-foreground)" opacity="0.2" />
            </g>

            <g className="lp-row" style={{ animationDelay: "1.3s" }}>
              <rect x="44" y="236" width="20" height="20" rx="5" fill="var(--card)" stroke="var(--border)" />
              <rect x="76" y="240" width="200" height="12" rx="4" fill="var(--muted-foreground)" opacity="0.25" />
              <rect x="300" y="240" width="60" height="12" rx="4" fill="var(--muted-foreground)" opacity="0.2" />
            </g>

            <g transform="translate(44 282)">
              <rect x="0" y="0" width="432" height="98" rx="10" fill="var(--muted)" opacity="0.4" />
              {Array.from({ length: 7 }).map((_, c) => (
                <g key={c}>
                  {Array.from({ length: 4 }).map((_, r) => {
                    const intensity = (c * r + c) % 5
                    const opacity = 0.15 + intensity * 0.18
                    const delay = (c * 4 + r) * 0.05
                    return (
                      <rect
                        key={r}
                        x={14 + c * 58}
                        y={14 + r * 18}
                        width={44}
                        height={12}
                        rx={3}
                        fill="var(--primary)"
                        opacity={opacity}
                        className="lp-cell"
                        style={{ animationDelay: `${delay}s` }}
                      />
                    )
                  })}
                </g>
              ))}
            </g>
          </g>

          <g className="lp-bubble" style={{ animationDelay: "0.4s" }}>
            <circle cx="478" cy="80" r="22" fill="var(--chart-4)" />
            <path d="M469 80 l6 6 l12 -12" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </g>
          <g className="lp-bubble" style={{ animationDelay: "1.0s" }}>
            <circle cx="40" cy="370" r="16" fill="var(--chart-3)" opacity="0.95" />
            <path d="M33 370 l5 5 l9 -10" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        </svg>
      </div>
    </div>
  )
}

function FeatureCard({
  title,
  desc,
  icon,
  delay,
}: {
  title: string
  desc: string
  icon: React.ReactNode
  delay: string
}) {
  return (
    <div className={`lp-fade-up ${delay} group relative overflow-hidden rounded-2xl border border-border bg-card/60 p-6 backdrop-blur transition hover:border-primary/40 hover:shadow-lg`}>
      <div className="lp-card-glow absolute inset-0" aria-hidden />
      <div className="relative">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
          {icon}
        </div>
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="mt-1.5 text-sm text-muted-foreground">{desc}</p>
      </div>
    </div>
  )
}

function Check() {
  return (
    <svg className="h-3.5 w-3.5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12l5 5L20 7" />
    </svg>
  )
}

function TimelineIcon() {
  return (
    <svg viewBox="0 0 32 32" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="7" width="14" height="4" rx="1.5" className="lp-tl-bar" />
      <rect x="8" y="14" width="18" height="4" rx="1.5" className="lp-tl-bar" style={{ animationDelay: "0.15s" }} />
      <rect x="6" y="21" width="12" height="4" rx="1.5" className="lp-tl-bar" style={{ animationDelay: "0.3s" }} />
    </svg>
  )
}

function ChartIcon() {
  return (
    <svg viewBox="0 0 32 32" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="6" y1="26" x2="26" y2="26" />
      <rect x="8" y="16" width="3" height="10" rx="1" className="lp-bar" style={{ transformOrigin: "9.5px 26px" }} />
      <rect x="14" y="10" width="3" height="16" rx="1" className="lp-bar" style={{ transformOrigin: "15.5px 26px", animationDelay: "0.15s" }} />
      <rect x="20" y="18" width="3" height="8" rx="1" className="lp-bar" style={{ transformOrigin: "21.5px 26px", animationDelay: "0.3s" }} />
    </svg>
  )
}

function CloudIcon() {
  return (
    <svg viewBox="0 0 32 32" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 22h13a5 5 0 0 0 .8-9.94A7 7 0 0 0 9 13a5 5 0 0 0 0 9z" />
      <path className="lp-arrow" d="M16 18v-6" />
      <path className="lp-arrow" style={{ animationDelay: "0.2s" }} d="m13 15 3-3 3 3" />
    </svg>
  )
}

const landingCss = `
@keyframes lp-fade-up {
  from { opacity: 0; transform: translate3d(0, 14px, 0); }
  to   { opacity: 1; transform: translate3d(0, 0, 0); }
}
@keyframes lp-float {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-8px); }
}
@keyframes lp-row-in {
  from { opacity: 0; transform: translateX(-12px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes lp-check {
  from { stroke-dasharray: 0 24; }
  to   { stroke-dasharray: 24 0; }
}
@keyframes lp-cell {
  from { opacity: 0; transform: scale(0.6); }
  to   { transform: scale(1); }
}
@keyframes lp-bubble {
  from { opacity: 0; transform: scale(0.4); }
  to   { opacity: 1; transform: scale(1); }
}
@keyframes lp-spin {
  to { transform: rotate(360deg); }
}
@keyframes lp-orb {
  0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
  50%      { transform: translate3d(20px, -30px, 0) scale(1.08); }
}
@keyframes lp-shimmer {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
@keyframes lp-dot {
  0%, 100% { opacity: 0.4; }
  50%      { opacity: 1; }
}
@keyframes lp-bar-rise {
  from { transform: scaleY(0); }
  to   { transform: scaleY(1); }
}
@keyframes lp-tl-bar {
  from { transform: scaleX(0); }
  to   { transform: scaleX(1); }
}
@keyframes lp-arrow {
  0%   { opacity: 0; transform: translateY(4px); }
  60%  { opacity: 1; transform: translateY(0); }
  100% { opacity: 1; transform: translateY(-2px); }
}

.lp-fade-up { opacity: 0; animation: lp-fade-up 0.8s cubic-bezier(0.2, 0.7, 0.2, 1) forwards; }
.lp-d1 { animation-delay: 0.05s; }
.lp-d2 { animation-delay: 0.18s; }
.lp-d3 { animation-delay: 0.32s; }
.lp-d4 { animation-delay: 0.46s; }
.lp-d5 { animation-delay: 0.6s; }

.lp-float { animation: lp-float 6s ease-in-out infinite; }

.lp-row { opacity: 0; animation: lp-row-in 0.6s cubic-bezier(0.2, 0.7, 0.2, 1) forwards; }
.lp-check { stroke-dasharray: 0 24; animation: lp-check 0.5s ease-out forwards; animation-delay: 0.7s; }
.lp-cell { transform-origin: center; transform-box: fill-box; opacity: 0; animation: lp-cell 0.6s ease-out forwards; }
.lp-bubble { opacity: 0; transform-origin: center; transform-box: fill-box; animation: lp-bubble 0.6s cubic-bezier(0.2, 1.6, 0.4, 1) forwards; }

.lp-spin-slow { animation: lp-spin 60s linear infinite; }
.lp-spin-rev { animation: lp-spin 40s linear infinite reverse; }

.lp-orb {
  position: absolute;
  border-radius: 9999px;
  filter: blur(60px);
  opacity: 0.55;
  animation: lp-orb 14s ease-in-out infinite;
}
.lp-orb-1 { width: 420px; height: 420px; left: -120px; top: -120px; background: var(--primary); opacity: 0.28; }
.lp-orb-2 { width: 360px; height: 360px; right: -100px; top: 40%; background: var(--chart-4); opacity: 0.22; animation-delay: -4s; }
.lp-orb-3 { width: 300px; height: 300px; left: 30%; bottom: -120px; background: var(--chart-3); opacity: 0.20; animation-delay: -8s; }

.lp-shimmer {
  background: linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.35) 50%, transparent 70%);
  animation: lp-shimmer 2.6s ease-in-out infinite;
}

.lp-dot {
  width: 6px; height: 6px; border-radius: 9999px;
  background: var(--primary);
  animation: lp-dot 1.8s ease-in-out infinite;
}

.lp-card-glow {
  background: radial-gradient(600px 200px at 50% 0%, color-mix(in oklab, var(--primary) 14%, transparent), transparent 70%);
  opacity: 0;
  transition: opacity 0.4s ease;
}
.group:hover .lp-card-glow { opacity: 1; }

.lp-bar { transform: scaleY(0); transform-box: fill-box; animation: lp-bar-rise 0.7s cubic-bezier(0.2, 0.7, 0.2, 1) forwards; animation-delay: 0.2s; }
.lp-tl-bar { transform: scaleX(0); transform-box: fill-box; transform-origin: left center; animation: lp-tl-bar 0.6s cubic-bezier(0.2, 0.7, 0.2, 1) forwards; animation-delay: 0.2s; }
.lp-arrow { animation: lp-arrow 1.6s ease-in-out infinite; }

@media (prefers-reduced-motion: reduce) {
  .lp-fade-up, .lp-float, .lp-row, .lp-check, .lp-cell, .lp-bubble,
  .lp-spin-slow, .lp-spin-rev, .lp-orb, .lp-shimmer, .lp-dot,
  .lp-bar, .lp-tl-bar, .lp-arrow {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
  }
}
`
