/**
 * @file layout.tsx
 * @module app/barber/[id]
 *
 * Barber Lane Cockpit route layout.
 * Dynamic route — [id] is the barber's lane_id.
 * Requires RuntimeProvider + BARBER session.
 *
 * Specification: AGENT.md §2 — File System Contract
 *                AMS v1.3 — Lane Cockpit module
 */

import { RuntimeProvider } from "@/ui/providers/RuntimeProviders";

export default function BarberLayout({ children }: { children: React.ReactNode }) {
  return <RuntimeProvider>{children}</RuntimeProvider>;
}
