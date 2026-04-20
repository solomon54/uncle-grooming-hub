// src/core/journal/event.types.ts

import { EventType } from "@/domain/events/event.types";

/**
 * BaseEvent Interface
 * ----------------------------------------
 * This is the canonical shape that EVERY event in the system MUST follow.
 * It strictly enforces TAS §2 Event Model Specification.
 */

export interface BaseEvent {
  event_id: string;
  aggregate_id: string;
  aggregate_version: number;
  event_type: EventType;
  payload: Record<string, unknown>;
  metadata: {
    session_id: string;
    hlc_timestamp: string;
  };
}

/**
 * Utility type for events with known payload shape
 */
export interface TypedEvent<TPayload = Record<string, unknown>>
  extends Omit<BaseEvent, "payload"> {
  payload: TPayload;
}
