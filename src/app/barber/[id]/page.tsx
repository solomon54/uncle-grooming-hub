/**
 * @file page.tsx
 * @module app/barber/[id]
 *
 * Barber Lane Cockpit route — /barber/[id]
 * [id] = barber's lane_id (e.g., "lane_001")
 * Specification: AGENT.md §2 — page.tsx contains NOTHING except a default export
 */

"use client";

import { RouteGuard }          from "@/ui/components/auth/RouteGuard";
import BarberDashboardScreen   from "@/ui/screens/BarberDashboardScreen";

interface BarberPageProps {
  params: { id: string };
}

export default function BarberPage({ params }: BarberPageProps) {
  return (
    <RouteGuard roles={["BARBER"]}>
      <BarberDashboardScreen laneId={params.id} />
    </RouteGuard>
  );
}
