import type { Metadata } from "next";

import { LegalShell } from "@/features/Legal";

export const metadata: Metadata = {
  title: "Terms of Service — Planner",
  description: "Terms of Service for Planner.",
};

const EFFECTIVE = "2026-07-01";

export default function TermsPage() {
  return (
    <LegalShell title="Terms of Service" meta={`Effective ${EFFECTIVE}`}>
      <section className="mt-8 space-y-4">
        <h2 className="text-xl font-semibold">1. Acceptance</h2>
        <p>
          By using Planner (the &quot;Service&quot;), you agree to these Terms. If you do not agree,
          do not use the Service.
        </p>

        <h2 className="text-xl font-semibold mt-8">2. Description</h2>
        <p>
          Planner is a personal task management web application. Data is stored locally in your
          browser. An optional account (backed by Supabase) stores a backup of your planner data so
          it can sync across devices. An optional in-app AI planning assistant can call third-party
          large-language-model APIs using an API key you supply.
        </p>

        <h2 className="text-xl font-semibold mt-8">3. Your account and data</h2>
        <p>
          You are responsible for the contents of your planner data and for keeping your account
          password secure. You may delete your account and its backup at any time.
        </p>

        <h2 className="text-xl font-semibold mt-8">4. Acceptable use</h2>
        <p>
          You agree not to use the Service to violate any law, infringe rights of others, or attempt
          to disrupt or reverse-engineer the Service.
        </p>

        <h2 className="text-xl font-semibold mt-8">5. No warranty</h2>
        <p>
          The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranty of
          any kind, express or implied, including but not limited to merchantability, fitness for a
          particular purpose, or non-infringement. Your data could be lost due to browser issues,
          sync-provider outages, or bugs. Keep your own backups.
        </p>

        <h2 className="text-xl font-semibold mt-8">6. Limitation of liability</h2>
        <p>
          To the maximum extent permitted by law, the operator of Planner is not liable for any
          indirect, incidental, special, consequential, or punitive damages, or any loss of data,
          profits, or goodwill, arising from your use of the Service.
        </p>

        <h2 className="text-xl font-semibold mt-8">7. Third-party services</h2>
        <p>
          Account creation and cloud sync depend on Supabase, governed by Supabase&apos;s own terms
          and privacy policies. Planner is not affiliated with or endorsed by Supabase.
        </p>
        <p>
          The AI planning assistant depends on a third-party LLM provider you choose (Google Gemini,
          OpenRouter, or Groq). Your use of those APIs is governed by that provider&apos;s terms and
          privacy policies. You are responsible for the API key, any usage costs or quotas, and the
          content of prompts you send. Planner is not affiliated with or endorsed by these
          providers. AI output may be inaccurate; verify before acting on it.
        </p>

        <h2 className="text-xl font-semibold mt-8">8. Termination</h2>
        <p>
          You may stop using the Service at any time. We may modify, suspend, or discontinue the
          Service at any time without notice.
        </p>

        <h2 className="text-xl font-semibold mt-8">9. Changes to terms</h2>
        <p>
          We may update these Terms. Continued use after changes constitutes acceptance. Material
          changes will update the effective date above.
        </p>

        <h2 className="text-xl font-semibold mt-8">10. Contact</h2>
        <p>
          Questions:{" "}
          <a className="underline" href="mailto:sawissacwaux@gmail.com">
            sawissacwaux@gmail.com
          </a>
        </p>
      </section>
    </LegalShell>
  );
}
