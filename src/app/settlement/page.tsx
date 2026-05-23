/**
 * @file page.tsx
 * @module app/settlement
 *
 * Settlement Desk route — /settlement
 * Specification: AGENT.md §2 — page.tsx contains NOTHING except a default export
 */

"use client";

import { RouteGuard }      from "@/ui/components/auth/RouteGuard";
import SettlementScreen    from "@/ui/screens/SettlementScreen";

export default function SettlementPage() {
  return (
    <RouteGuard roles={["CASHIER", "ADMIN", "SYSTEM_OWNER"]}>
      <SettlementScreen />
    </RouteGuard>
  );
}
