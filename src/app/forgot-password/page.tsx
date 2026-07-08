import type { Metadata } from "next";

import { AuthForgotPassword } from "@/features/AuthForgotPassword";

export const metadata: Metadata = {
  title: "Reset password — Planner",
  description: "Request a password reset link for your Planner account.",
};

export default function ForgotPasswordPage() {
  return <AuthForgotPassword />;
}
