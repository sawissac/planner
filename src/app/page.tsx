import {
  ArrowRight,
  BarChart3,
  CalendarRange,
  Check,
  CheckCheck,
  CloudUpload,
  Sparkles,
  User,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Planner — local-first task & todo planner with AI",
  description:
    "A fast, local-first planner with timelines, analytics, an AI planning assistant, and optional cloud sync.",
};

export default function Home() {
  return (
    <main className="relative isolate h-dvh w-full flex-1 overflow-x-hidden overflow-y-auto bg-background text-foreground">
      <style>{landingCss}</style>

      <BackgroundLayer />

      <section className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 pt-20 pb-16 sm:pt-28 lg:grid-cols-2 lg:gap-16 lg:pt-32 lg:pb-24">
        <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur lp-fade-up">
            <span className="lp-dot" /> Local-first · No account required
          </span>

          <h1 className="mt-6 text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
            <span className="lp-fade-up lp-d1 block">Plan your day.</span>
            <span className="lp-fade-up lp-d2 block bg-gradient-to-r from-[var(--chart-3)] via-[var(--primary)] to-[var(--chart-4)] bg-clip-text text-transparent">
              Own your data.
            </span>
          </h1>

          <p className="lp-fade-up lp-d3 mt-6 max-w-xl text-base text-muted-foreground sm:text-lg">
            A fast, local-first planner with timelines, analytics, an AI planning assistant, and
            optional cloud sync. Built for the browser. Yours alone.
          </p>

          <div className="lp-fade-up lp-d4 mt-10 flex w-full flex-col items-stretch justify-center gap-3 sm:w-auto sm:flex-row lg:justify-start">
            <Link
              href="/app"
              className="group relative inline-flex h-14 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-primary px-8 text-base font-medium text-primary-foreground shadow-md transition hover:shadow-xl sm:w-auto sm:min-w-[180px]"
            >
              <span className="lp-shimmer absolute inset-0" aria-hidden />
              <span className="relative">Open the app</span>
              <ArrowRight className="relative h-5 w-5 transition group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/about"
              className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card/60 px-8 text-base font-medium backdrop-blur transition hover:bg-card sm:w-auto sm:min-w-[160px]"
            >
              Learn more
            </Link>
          </div>

          <ul className="lp-fade-up lp-d5 mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground lg:justify-start">
            <li className="inline-flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-primary" strokeWidth={3} /> No account
            </li>
            <li className="inline-flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-primary" strokeWidth={3} /> Works offline
            </li>
            <li className="inline-flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-primary" strokeWidth={3} /> Open source feel
            </li>
          </ul>
        </div>

        <div className="relative w-full">
          <HeroIllustration />
        </div>
      </section>

      <section className="relative mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <FeatureCard
            title="AI assistant"
            desc="Describe a goal. Get a grouped, scheduled plan."
            icon={<Sparkles className="h-5 w-5" />}
            delay="lp-d1"
          />
          <FeatureCard
            title="Timelines"
            desc="Drag, drop, resize. See your week at a glance."
            icon={<CalendarRange className="h-5 w-5" />}
            delay="lp-d2"
          />
          <FeatureCard
            title="Analytics"
            desc="Heatmaps and breakdowns of completed work."
            icon={<BarChart3 className="h-5 w-5" />}
            delay="lp-d3"
          />
          <FeatureCard
            title="Cloud sync"
            desc="Optional account-backed backup, off by default."
            icon={<CloudUpload className="h-5 w-5" />}
            delay="lp-d4"
          />
        </div>
      </section>

      <footer className="relative border-t border-border/60 bg-background/60 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-6 text-xs text-muted-foreground sm:flex-row">
          <p>Planner — local-first task planner.</p>
          <nav className="flex items-center gap-4">
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
    </main>
  );
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
          <circle
            cx="100"
            cy="100"
            r="80"
            fill="none"
            stroke="url(#lp-ring)"
            strokeWidth="0.8"
            strokeDasharray="2 6"
          />
          <circle
            cx="100"
            cy="100"
            r="60"
            fill="none"
            stroke="url(#lp-ring)"
            strokeWidth="0.6"
            strokeDasharray="1 5"
          />
        </g>
        <g className="lp-spin-rev" style={{ transformOrigin: "100px 100px" }}>
          <circle
            cx="100"
            cy="100"
            r="40"
            fill="none"
            stroke="url(#lp-ring)"
            strokeWidth="0.6"
            strokeDasharray="1 4"
          />
        </g>
      </svg>
    </div>
  );
}

function HeroIllustration() {
  return (
    <div className="lp-fade-up lp-d3 relative mx-auto aspect-[5/4] w-full max-w-[560px]">
      <div className="lp-float absolute inset-0">
        <svg
          viewBox="0 0 560 448"
          xmlns="http://www.w3.org/2000/svg"
          className="h-full w-full drop-shadow-[0_40px_80px_rgba(0,0,0,0.18)]"
        >
          <defs>
            <linearGradient id="hero-card" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="var(--card)" />
              <stop offset="100%" stopColor="var(--background)" />
            </linearGradient>
            <linearGradient id="hero-accent" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--primary)" />
              <stop offset="100%" stopColor="var(--chart-4)" />
            </linearGradient>
            <linearGradient id="hero-soft" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.18" />
              <stop offset="100%" stopColor="var(--chart-4)" stopOpacity="0.08" />
            </linearGradient>
            <filter id="hero-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="8" />
            </filter>
          </defs>

          {/* back card (timeline preview) */}
          <g transform="translate(36 24) rotate(-3 240 180)" opacity="0.9">
            <rect width="380" height="220" rx="20" fill="var(--card)" stroke="var(--border)" />
            <rect
              x="20"
              y="20"
              width="80"
              height="10"
              rx="5"
              fill="var(--muted-foreground)"
              opacity="0.35"
            />
            <rect
              x="20"
              y="38"
              width="48"
              height="6"
              rx="3"
              fill="var(--muted-foreground)"
              opacity="0.22"
            />
            {/* timeline bars */}
            {[
              { y: 70, x: 20, w: 180, c: "var(--primary)" },
              { y: 100, x: 80, w: 160, c: "var(--chart-4)" },
              { y: 130, x: 40, w: 220, c: "var(--chart-3)" },
              { y: 160, x: 140, w: 120, c: "var(--primary)" },
              { y: 190, x: 60, w: 200, c: "var(--chart-4)" },
            ].map((b, i) => (
              <rect
                key={i}
                x={b.x}
                y={b.y}
                width={b.w}
                height={14}
                rx={7}
                fill={b.c}
                opacity={0.5}
                className="lp-tl-bar"
                style={{
                  animationDelay: `${0.2 + i * 0.12}s`,
                  transformOrigin: `${b.x}px ${b.y}px`,
                }}
              />
            ))}
          </g>

          {/* main card (tasks) */}
          <g transform="translate(96 96)">
            <rect
              width="400"
              height="300"
              rx="22"
              fill="url(#hero-card)"
              stroke="var(--border)"
              strokeWidth="1"
            />

            {/* header */}
            <g>
              <rect width="400" height="56" rx="22" fill="url(#hero-accent)" />
              <rect y="34" width="400" height="22" fill="url(#hero-accent)" />
              <circle cx="22" cy="28" r="4" fill="white" opacity="0.9" />
              <circle cx="38" cy="28" r="4" fill="white" opacity="0.6" />
              <circle cx="54" cy="28" r="4" fill="white" opacity="0.35" />
              <rect x="80" y="22" width="120" height="12" rx="6" fill="white" opacity="0.85" />
              <rect x="340" y="20" width="44" height="16" rx="8" fill="white" opacity="0.25" />
            </g>

            {/* task rows */}
            {[
              { y: 82, w: 220, badge: 88, done: true, delay: 0.2 },
              { y: 120, w: 200, badge: 60, done: true, delay: 0.4 },
              { y: 158, w: 240, badge: 100, done: false, delay: 0.6 },
              { y: 196, w: 180, badge: 48, done: false, delay: 0.8 },
            ].map((r, i) => (
              <g key={i} className="lp-row" style={{ animationDelay: `${r.delay}s` }}>
                <rect
                  x={20}
                  y={r.y}
                  width={22}
                  height={22}
                  rx={6}
                  fill={r.done ? "var(--primary)" : "var(--card)"}
                  stroke={r.done ? "var(--primary)" : "var(--border)"}
                  strokeWidth="1.5"
                />
                {r.done && (
                  <path
                    className="lp-check"
                    style={{ animationDelay: `${r.delay + 0.3}s` }}
                    d={`M${24} ${r.y + 11} l4 4 l10 -10`}
                    fill="none"
                    stroke="white"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
                <rect
                  x={56}
                  y={r.y + 5}
                  width={r.w}
                  height={12}
                  rx={6}
                  fill="var(--muted-foreground)"
                  opacity={r.done ? 0.35 : 0.55}
                />
                <rect
                  x={400 - r.badge - 20}
                  y={r.y + 5}
                  width={r.badge}
                  height={12}
                  rx={6}
                  fill="url(#hero-accent)"
                  opacity={r.done ? 0.65 : 0.85}
                />
              </g>
            ))}

            {/* analytics strip */}
            <g transform="translate(20 238)">
              <rect width="360" height="48" rx="12" fill="url(#hero-soft)" />
              {[14, 28, 18, 36, 24, 40, 22, 32, 16, 30, 20, 38].map((h, i) => (
                <rect
                  key={i}
                  x={12 + i * 28}
                  y={48 - 8 - h}
                  width={16}
                  height={h}
                  rx={3}
                  fill="var(--primary)"
                  opacity={0.55 + (i % 3) * 0.12}
                  className="lp-bar"
                  style={{
                    transformOrigin: `${12 + i * 28}px ${40}px`,
                    animationDelay: `${0.5 + i * 0.04}s`,
                  }}
                />
              ))}
            </g>
          </g>

          {/* AI sparkle bubble */}
          <g className="lp-bubble" style={{ animationDelay: "0.5s" }}>
            <circle cx="486" cy="92" r="28" fill="url(#hero-accent)" />
            <circle
              cx="486"
              cy="92"
              r="36"
              fill="var(--primary)"
              opacity="0.18"
              filter="url(#hero-glow)"
            />
            <foreignObject x="470" y="76" width="32" height="32">
              <Sparkles className="h-8 w-8 text-white" strokeWidth={2} />
            </foreignObject>
          </g>

          {/* user avatar bubble */}
          <g className="lp-bubble" style={{ animationDelay: "0.9s" }}>
            <circle cx="76" cy="402" r="22" fill="var(--chart-3)" />
            <foreignObject x="63" y="389" width="26" height="26">
              <User className="h-6.5 w-6.5 text-white" strokeWidth={2.2} />
            </foreignObject>
          </g>

          {/* check bubble */}
          <g className="lp-bubble" style={{ animationDelay: "1.2s" }}>
            <circle cx="500" cy="380" r="20" fill="var(--chart-4)" />
            <foreignObject x="488" y="368" width="24" height="24">
              <CheckCheck className="h-6 w-6 text-white" strokeWidth={2.6} />
            </foreignObject>
          </g>
        </svg>
      </div>
    </div>
  );
}

function FeatureCard({
  title,
  desc,
  icon,
  delay,
}: {
  title: string;
  desc: string;
  icon: React.ReactNode;
  delay: string;
}) {
  return (
    <div
      className={`lp-fade-up ${delay} group relative overflow-hidden rounded-2xl border border-border bg-card/60 p-6 backdrop-blur transition hover:border-primary/40 hover:shadow-lg`}
    >
      <div className="lp-card-glow absolute inset-0" aria-hidden />
      <div className="relative">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
          {icon}
        </div>
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="mt-1.5 text-sm text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
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

.lp-fade-up { opacity: 0; animation: lp-fade-up 0.8s cubic-bezier(0.2, 0.7, 0.2, 1) forwards; }
.lp-d1 { animation-delay: 0.05s; }
.lp-d2 { animation-delay: 0.18s; }
.lp-d3 { animation-delay: 0.32s; }
.lp-d4 { animation-delay: 0.46s; }
.lp-d5 { animation-delay: 0.6s; }
.lp-d6 { animation-delay: 0.74s; }

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

@media (prefers-reduced-motion: reduce) {
  .lp-fade-up, .lp-float, .lp-row, .lp-check, .lp-cell, .lp-bubble,
  .lp-spin-slow, .lp-spin-rev, .lp-orb, .lp-shimmer, .lp-dot,
  .lp-bar, .lp-tl-bar {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
  }
}
`;
