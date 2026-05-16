import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service — Planner",
  description: "Terms of Service for Planner.",
};

const EFFECTIVE = "2026-05-16";

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12 text-sm leading-relaxed">
      <Link href="/app" className="text-muted-foreground hover:text-foreground">
        ← Back to app
      </Link>
      <h1 className="mt-6 text-3xl font-semibold">Terms of Service</h1>
      <p className="mt-2 text-muted-foreground">Effective {EFFECTIVE}</p>

      <section className="mt-8 space-y-4">
        <h2 className="text-xl font-semibold">1. Acceptance</h2>
        <p>
          By using Planner (the &quot;Service&quot;), you agree to these Terms.
          If you do not agree, do not use the Service.
        </p>

        <h2 className="text-xl font-semibold mt-8">2. Description</h2>
        <p>
          Planner is a personal task management web application. Data is stored
          locally in your browser. Optional Google Drive sync stores a backup in
          your own Drive account, in a hidden app-specific folder.
        </p>

        <h2 className="text-xl font-semibold mt-8">3. Your account and data</h2>
        <p>
          You are responsible for the contents of your planner data and for
          maintaining the security of any Google account you connect. You may
          revoke access at any time via your Google account settings.
        </p>

        <h2 className="text-xl font-semibold mt-8">4. Acceptable use</h2>
        <p>
          You agree not to use the Service to violate any law, infringe rights
          of others, attempt to disrupt or reverse-engineer the Service, or
          abuse the Google APIs it integrates with.
        </p>

        <h2 className="text-xl font-semibold mt-8">5. No warranty</h2>
        <p>
          The Service is provided &quot;as is&quot; and &quot;as available&quot;
          without warranty of any kind, express or implied, including but not
          limited to merchantability, fitness for a particular purpose, or
          non-infringement. Your data could be lost due to browser issues, Drive
          outages, or bugs. Keep your own backups.
        </p>

        <h2 className="text-xl font-semibold mt-8">
          6. Limitation of liability
        </h2>
        <p>
          To the maximum extent permitted by law, the operator of Planner is not
          liable for any indirect, incidental, special, consequential, or
          punitive damages, or any loss of data, profits, or goodwill, arising
          from your use of the Service.
        </p>

        <h2 className="text-xl font-semibold mt-8">7. Third-party services</h2>
        <p>
          Drive sync depends on Google services governed by Google&apos;s own
          terms and privacy policies. Planner is not affiliated with or endorsed
          by Google.
        </p>

        <h2 className="text-xl font-semibold mt-8">8. Termination</h2>
        <p>
          You may stop using the Service at any time. We may modify, suspend, or
          discontinue the Service at any time without notice.
        </p>

        <h2 className="text-xl font-semibold mt-8">9. Changes to terms</h2>
        <p>
          We may update these Terms. Continued use after changes constitutes
          acceptance. Material changes will update the effective date above.
        </p>

        <h2 className="text-xl font-semibold mt-8">10. Contact</h2>
        <p>
          Questions:{" "}
          <a className="underline" href="mailto:sawissacwaux@gmail.com">
            sawissacwaux@gmail.com
          </a>
        </p>
      </section>
    </main>
  );
}
