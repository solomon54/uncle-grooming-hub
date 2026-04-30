// src/ui/hooks/useQueueBoard.ts

import { useEffect, useState } from "react";
import { projectionEngine } from "@/core/projection/projection.engine";
import type { QueueBoardState } from "@/core/projection/queue-board.projection";

/**
 * useQueueBoard
 *
 * Reactive hook that subscribes to Queue Board projection.
 * Event-driven (no polling).
 */
export function useQueueBoard(): QueueBoardState | null {
  const [state, setState] = useState<QueueBoardState | null>(() => {
    return (
      projectionEngine.getState<QueueBoardState>("QUEUE_BOARD_VIEW") ?? null
    );
  });

  useEffect(() => {
    const unsubscribe = projectionEngine.subscribe(() => {
      const next =
        projectionEngine.getState<QueueBoardState>("QUEUE_BOARD_VIEW");

      if (next) {
        setState(next);
      }
    });

    return unsubscribe;
  }, []);

  return state;
}
