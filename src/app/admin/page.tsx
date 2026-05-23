/**
 * @file page.tsx
 * @module app/admin
 *
 * Admin Governance Panel route — /admin
 * Specification: AGENT.md §2 — page.tsx contains NOTHING except a default export
 */

"use client";

import { RouteGuard } from "@/ui/components/auth/RouteGuard";
import AdminScreen    from "@/ui/screens/AdminScreen";

export default function AdminPage() {
  return (
    <RouteGuard roles={["ADMIN", "SYSTEM_OWNER"]}>
      <AdminScreen />
    </RouteGuard>
  );
}
