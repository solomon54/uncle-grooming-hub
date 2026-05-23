/**
 * @file useQueueBoard.ts
 * @module ui/hooks
 *
 * useQueueBoard — reactive hook for the QueueBoardView projection.
 *
 * Specification: MODULE_PRIORITY.md P5.2
 *                AGENT.md §5 — Hooks subscribe to projections, never raw DB
 *
 * Subscribes to "QUEUE_BOARD_VIEW" projection via ProjectionEngine.
 * Re-renders only when projection state changes (event-driven, no polling).
 */

"use client";

import { useEffect, useState } from "react";
import { projectionEngine }    from "@/core/projection/projection.engine";
import type { QueueBoardView } from "@/projections/queue-board.view";

export function useQueueBoard(): { view: QueueBoardView | null; isLoading: boolean } {
  const [view, setView] = useState<QueueBoardView | null>(() =>
    projectionEngine.getState<QueueBoardView>("QUEUE_BOARD_VIEW") ?? null
  );

  useEffect(() => {
    // Sync immediately in case projection updated before mount
    const current = projectionEngine.getState<QueueBoardView>("QUEUE_BOARD_VIEW");
    if (current) setView(current);

    const unsubscribe = projectionEngine.subscribe(() => {
      const next = projectionEngine.getState<QueueBoardView>("QUEUE_BOARD_VIEW");
      if (next) setView(next);
    });

    return unsubscribe;
  }, []);

  return { view, isLoading: view === null };
}
