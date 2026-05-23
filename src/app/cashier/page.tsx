/**
 * @file page.tsx
 * @module app/cashier
 *
 * Cashier Concierge route — /cashier
 * Specification: AGENT.md §2 — page.tsx contains NOTHING except a default export
 */

"use client";

import { RouteGuard }    from "@/ui/components/auth/RouteGuard";
import CashierScreen     from "@/ui/screens/CashierScreen";

export default function CashierPage() {
  return (
    <RouteGuard roles={["CASHIER", "ADMIN", "SYSTEM_OWNER"]}>
      <CashierScreen />
    </RouteGuard>
  );
}
