//src/projections/queue-board.projection.ts

import { Projection } from "@/core/projection/projection.engine";
import { BaseEvent } from "@/core/journal/event.types";
import { ECS_EVENTS } from "@/domain/events/event.types";

interface QueueState {
  waiting: string[];
  called: string[];
}

export const queueBoardProjection: Projection<QueueState> = {
  name: "QueueBoard",

  initialState: {
    waiting: [],
    called: [],
  },

  handlers: {
    [ECS_EVENTS.CUSTOMER_CHECKED_IN]: (state, event) => {
      return {
        ...state,
        waiting: [...state.waiting, event.aggregate_id],
      };
    },

    [ECS_EVENTS.CUSTOMER_CALLED_TO_CHAIR]: (state, event) => {
      return {
        waiting: state.waiting.filter((id) => id !== event.aggregate_id),
        called: [...state.called, event.aggregate_id],
      };
    },
  },
};
