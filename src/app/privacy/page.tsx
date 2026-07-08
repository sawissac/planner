import type { Metadata } from "next";

import { LegalShell } from "@/features/Legal";

export const metadata: Metadata = {
  title: "Privacy Policy — Planner",
  description: "How Planner handles your data.",
};

const EFFECTIVE = "2026-07-01";

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" meta={`Effective ${EFFECTIVE}`}>
      <section className="mt-8 space-y-4">
        <p>
          Planner is a personal task management web app. This policy explains what data the app
          stores, where it stores it, and what happens if you create an account for cloud sync.
        </p>

        <h2 className="text-xl font-semibold mt-8">Data we store locally</h2>
        <p>
          All todos, files, settings, and user profiles you create are stored in your browser using
          IndexedDB on the device you use. This data is not transmitted anywhere unless you opt into
          cloud sync below.
        </p>

        <h2 className="text-xl font-semibold mt-8">Cloud sync (optional, Supabase-backed)</h2>
        <p>
          If you create an account (email + password), Planner stores your account with{" "}
          <a
            className="underline"
            href="https://supabase.com/privacy"
            target="_blank"
            rel="noreferrer"
          >
            Supabase
          </a>
          , the third-party backend that provides authentication and database storage for Planner.
          Once signed in, Planner keeps a single JSON backup of your planner data (todos, settings,
          user profiles) in a database row scoped to your account — no one else's account can read
          or write it (enforced by database row-level security).
        </p>
        <p>
          Planner does not use your email for anything besides authentication (sign-in, password
          reset) and does not access any other data in your Supabase account.
        </p>

        <h2 className="text-xl font-semibold mt-8">What is transmitted</h2>
        <p>
          When sync is enabled, the contents of your planner state are sent directly from your
          browser to Supabase&apos;s API over HTTPS. No separate Planner-operated server processes
          or stores this data — Supabase is the only backend involved.
        </p>

        <h2 className="text-xl font-semibold mt-8">AI assistant (optional)</h2>
        <p>
          If you enable the in-app AI planning assistant, you provide your own API key for one of
          the supported providers (Google Gemini, OpenRouter, or Groq). The key is stored only in
          your browser&apos;s localStorage. When you send a message, Planner posts the chat history
          and a context summary of your active file (file/group/task names, ids, priorities,
          assignees, dates, and the user list) directly from your browser to the provider&apos;s API
          over HTTPS. No intermediate Planner server processes or stores this data.
        </p>
        <p>
          The provider may log requests under its own privacy policy. Do not include information you
          would not want a third party to see. You can delete the key any time from the AI
          panel&apos;s key dialog or by clearing browser storage.
        </p>

        <h2 className="text-xl font-semibold mt-8">Authentication tokens</h2>
        <p>
          Supabase session tokens are stored in your browser&apos;s cookies so the app can continue
          syncing without re-prompting. Tokens expire and are refreshed automatically while you have
          an active session. Signing out clears the session.
        </p>

        <h2 className="text-xl font-semibold mt-8">Cookies and tracking</h2>
        <p>
          Planner does not set tracking cookies, use analytics, or share data with third parties.
        </p>

        <h2 className="text-xl font-semibold mt-8">Deleting your data</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            Local data: clear browser storage for this site, or use the in-app delete actions.
          </li>
          <li>
            Cloud backup and account: sign in, disconnect sync, then email us to request deletion of
            your account and its backup row.
          </li>
          <li>
            AI keys: open the AI panel → key dialog → clear the field and save, or clear browser
            localStorage.
          </li>
        </ul>

        <h2 className="text-xl font-semibold mt-8">Contact</h2>
        <p>
          Questions:{" "}
          <a className="underline" href="mailto:sawissacwaux@gmail.com">
            sawissacwaux@gmail.com
          </a>
        </p>

        <h2 className="text-xl font-semibold mt-8">Changes</h2>
        <p>Material changes will update the effective date at the top of this page.</p>
      </section>
    </LegalShell>
  );
}
