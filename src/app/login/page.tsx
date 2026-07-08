import type { Metadata } from "next";

import { AuthLogin } from "@/features/AuthLogin";

export const metadata: Metadata = {
  title: "Sign in — Planner",
  description: "Sign in to sync your Planner data across devices.",
};

export default function LoginPage() {
  return <AuthLogin />;
}
