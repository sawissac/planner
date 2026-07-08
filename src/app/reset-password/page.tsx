import type { Metadata } from "next";

import { AuthResetPassword } from "@/features/AuthResetPassword";

export const metadata: Metadata = {
  title: "Set new password — Planner",
  description: "Set a new password for your Planner account.",
};

export default function ResetPasswordPage() {
  return <AuthResetPassword />;
}
