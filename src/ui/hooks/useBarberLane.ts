/**
 * @file useBarberLane.ts
 * @module ui/hooks
 *
 * useBarberLane — reactive hook for the BarberLaneState projection.
 *
 * Specification: MODULE_PRIORITY.md P5.3
 *                AGENT.md §5 — Hooks subscribe to projections
 */

"use client";

import { useEffect, useState } from "react";
import { projectionEngine }    from "@/core/projection/projection.engine";
import type { BarberLaneState } from "@/projections/barber-lane.view";

export function useBarberLane(): { view: BarberLaneState | null; isLoading: boolean } {
  const [view, setView] = useState<BarberLaneState | null>(() =>
    projectionEngine.getState<BarberLaneState>("BARBER_LANE_STATE") ?? null
  );

  useEffect(() => {
    const current = projectionEngine.getState<BarberLaneState>("BARBER_LANE_STATE");
    if (current) setView(current);

    const unsubscribe = projectionEngine.subscribe(() => {
      const next = projectionEngine.getState<BarberLaneState>("BARBER_LANE_STATE");
      if (next) setView(next);
    });

    return unsubscribe;
  }, []);

  return { view, isLoading: view === null };
}
