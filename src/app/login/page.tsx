/**
 * @file page.tsx
 * @module app/login
 *
 * Operator Login route — /login
 *
 * Terminal Operations boundary module (AMS v1.3).
 * Emits EVENT 13 — OPERATOR_SESSION_OPENED on success.
 */

import LoginScreen from "@/ui/screens/LoginScreen";

export default function LoginPage() {
  return <LoginScreen />;
}
