/**
 * @file page.tsx
 * @module app/settings
 *
 * Staff Settings — /settings
 * Accessible to all authenticated roles.
 */

"use client";

import { RouteGuard }    from "@/ui/components/auth/RouteGuard";
import SettingsScreen    from "@/ui/screens/SettingsScreen";

export default function SettingsPage() {
  return (
    <RouteGuard roles={["BARBER", "CASHIER", "ADMIN", "SYSTEM_OWNER"]}>
      <SettingsScreen />
    </RouteGuard>
  );
}
