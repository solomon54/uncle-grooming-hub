/**
 * @file page.tsx
 * @module app/barber/[id]
 *
 * Barber Lane Cockpit route — /barber/[id]
 * [id] = barber's lane_id (e.g., "lane_001")
 *
 * Next.js 16: params is a Promise — must be unwrapped with React.use()
 * Specification: AGENT.md §2 — page.tsx contains NOTHING except a default export
 */

"use client";

import React from "react";
import { use }                   from "react";
import { RouteGuard }            from "@/ui/components/auth/RouteGuard";
import BarberDashboardScreen     from "@/ui/screens/BarberDashboardScreen";

interface BarberPageProps {
  params: Promise<{ id: string }>;
}

export default function BarberPage({ params }: BarberPageProps) {
  // Next.js 16 App Router: params is a Promise, must unwrap with React.use()
  const { id } = use(params);

  return (
    <RouteGuard roles={["BARBER"]}>
      <BarberDashboardScreen laneId={id} />
    </RouteGuard>
  );
}
