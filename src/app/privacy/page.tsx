import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Privacy Policy — Planner",
  description: "How Planner handles your data.",
}

const EFFECTIVE = "2026-05-16"

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12 text-sm leading-relaxed">
      <Link href="/app" className="text-muted-foreground hover:text-foreground">
        ← Back to app
      </Link>
      <h1 className="mt-6 text-3xl font-semibold">Privacy Policy</h1>
      <p className="mt-2 text-muted-foreground">Effective {EFFECTIVE}</p>

      <section className="mt-8 space-y-4">
        <p>
          Planner is a personal task management web app. This policy explains
          what data the app stores, where it stores it, and what Google account
          permissions are used.
        </p>

        <h2 className="text-xl font-semibold mt-8">Data we store locally</h2>
        <p>
          All todos, files, settings, and user profiles you create are stored in
          your browser using IndexedDB on the device you use. This data is not
          transmitted to any Planner-operated server. There is no Planner
          backend collecting your data.
        </p>

        <h2 className="text-xl font-semibold mt-8">Google Drive sync (optional)</h2>
        <p>
          If you choose to connect your Google account, Planner uses the
          <code className="mx-1 rounded bg-muted px-1">drive.appdata</code>
          OAuth scope to store a single JSON backup of your planner data
          (todos, settings, user profiles) inside a hidden, app-specific folder
          in your own Google Drive.
        </p>
        <p>
          This folder is sandboxed: only Planner can read or write to it, and it
          is not visible in the normal Drive interface. You can view its
          storage usage or delete it via Drive Settings → Manage apps.
        </p>
        <p>
          Planner does not access any other files in your Drive. Planner does
          not read your email, calendar, contacts, or any other Google service.
        </p>

        <h2 className="text-xl font-semibold mt-8">What is transmitted</h2>
        <p>
          When sync is enabled, the contents of your planner state are sent
          directly from your browser to Google&apos;s Drive API over HTTPS. No
          intermediate Planner server processes or stores this data.
        </p>

        <h2 className="text-xl font-semibold mt-8">Authentication tokens</h2>
        <p>
          OAuth access tokens issued by Google are stored in your browser&apos;s
          localStorage so the app can continue syncing without re-prompting.
          Tokens expire and are refreshed by re-authorization. Signing out
          revokes the token and removes it from local storage.
        </p>

        <h2 className="text-xl font-semibold mt-8">Cookies and tracking</h2>
        <p>
          Planner does not set tracking cookies, use analytics, or share data
          with third parties.
        </p>

        <h2 className="text-xl font-semibold mt-8">Deleting your data</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>Local data: clear browser storage for this site, or use the in-app delete actions.</li>
          <li>Drive data: Drive Settings → Manage apps → Planner → Delete hidden app data.</li>
          <li>Revoke access: <a className="underline" href="https://myaccount.google.com/permissions" target="_blank" rel="noreferrer">myaccount.google.com/permissions</a>.</li>
        </ul>

        <h2 className="text-xl font-semibold mt-8">Contact</h2>
        <p>
          Questions: <a className="underline" href="mailto:issac.i@rotutia.com">issac.i@rotutia.com</a>
        </p>

        <h2 className="text-xl font-semibold mt-8">Changes</h2>
        <p>
          Material changes will update the effective date at the top of this
          page.
        </p>
      </section>
    </main>
  )
}
