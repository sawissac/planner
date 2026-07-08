import type { Metadata } from "next";
import Link from "next/link";

import { LegalShell } from "@/features/Legal";

export const metadata: Metadata = {
  title: "About Planner",
  description:
    "Planner is a local-first task management web app with an optional AI planning assistant and cloud sync.",
};

export default function AboutPage() {
  return (
    <LegalShell title="Planner" meta="A local-first task and todo planner for the web.">
      <section className="mt-10 space-y-4">
        <h2 className="text-xl font-semibold">What Planner does</h2>
        <p>
          Planner helps you organize todos across multiple files, track progress, assign people,
          view timelines, and analyze completion patterns. All data is stored locally in your
          browser by default — no accounts, no servers.
        </p>

        <h2 className="text-xl font-semibold mt-8">Features</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>Multiple todo files with groups, priorities, and assignees</li>
          <li>Timeline and calendar views</li>
          <li>Analytics: heatmaps, breakdowns, completion charts</li>
          <li>AI planning assistant — describe a goal, get a grouped, scheduled task list</li>
          <li>Dark mode, font customization, focus mode</li>
          <li>
            Import / export <code className="rounded bg-muted px-1">.plan</code> JSON files
          </li>
          <li>Installable as a PWA for offline use</li>
        </ul>

        <h2 className="text-xl font-semibold mt-8">AI planning assistant (optional)</h2>
        <p>
          Planner includes an in-app chat that can create, edit, and delete files, groups, tasks,
          and people in your active workspace. You bring your own API key for one of the supported
          free-tier providers:{" "}
          <a
            className="underline"
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noreferrer"
          >
            Google Gemini
          </a>
          ,{" "}
          <a
            className="underline"
            href="https://openrouter.ai/keys"
            target="_blank"
            rel="noreferrer"
          >
            OpenRouter
          </a>
          , or{" "}
          <a
            className="underline"
            href="https://console.groq.com/keys"
            target="_blank"
            rel="noreferrer"
          >
            Groq
          </a>
          . Keys are stored only in your browser&apos;s localStorage and sent directly to the chosen
          provider. Planner has no server-side AI component.
        </p>

        <h2 className="text-xl font-semibold mt-8">Cloud sync (optional)</h2>
        <p>
          Planner can optionally back up your planner data by creating a free account (email +
          password). The backup is a single row in a database table, readable only by your account
          (enforced by row-level security). Nothing else about your device or activity is collected.
        </p>
        <p>
          Cloud sync is entirely optional — the app works fully offline, with no account, by
          default.
        </p>

        <h2 className="text-xl font-semibold mt-8">Privacy</h2>
        <p>
          No analytics, no tracking cookies, no third-party data sharing. See the full{" "}
          <Link href="/privacy" className="underline">
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link href="/terms" className="underline">
            Terms of Service
          </Link>
          .
        </p>

        <h2 className="text-xl font-semibold mt-8">Try it</h2>
        <p>
          <Link href="/app" className="underline">
            Open the app →
          </Link>
        </p>

        <h2 className="text-xl font-semibold mt-8">Contact</h2>
        <p>
          <a className="underline" href="mailto:sawissacwaux@gmail.com">
            sawissacwaux@gmail.com
          </a>
        </p>
      </section>
    </LegalShell>
  );
}
