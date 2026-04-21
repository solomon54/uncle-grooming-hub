//src/ui/hooks/useQueueBoard.ts

import { useEffect, useState } from "react";
import { projectionEngine } from "@/core/projection/projection.engine";
import { QueueBoardState } from "@/core/projection/queue-board.projection";

/**
 * useQueueBoard
 * ----------------------------------------
 * React hook that subscribes to Queue Board projection state.
 *
 * Acts as the bridge between:
 * ProjectionEngine → React UI
 */
export function useQueueBoard() {
  const [state, setState] = useState<QueueBoardState | undefined>(() =>
    projectionEngine.getState<QueueBoardState>("QUEUE_BOARD_VIEW")
  );

  useEffect(() => {
    // TEMP: polling fallback (Phase 1)
    const interval = setInterval(() => {
      const newState =
        projectionEngine.getState<QueueBoardState>("QUEUE_BOARD_VIEW");

      setState(newState);
    }, 100); // 100ms is fine for now

    return () => clearInterval(interval);
  }, []);

  return state;
}
