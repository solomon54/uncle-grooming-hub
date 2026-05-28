/**
 * @file page.tsx
 * @module app/change-pin
 *
 * PIN Change route — /change-pin
 * Shown automatically on first login (is_first_login = true).
 * Specification: SOS v1.0 §4.2
 */

"use client";

import { RouteGuard }     from "@/ui/components/auth/RouteGuard";
import ChangePinScreen    from "@/ui/screens/ChangePinScreen";

export default function ChangePinPage() {
  return (
    <RouteGuard roles={["BARBER", "CASHIER", "ADMIN", "SYSTEM_OWNER"]}>
      <ChangePinScreen />
    </RouteGuard>
  );
}
