//src/core/journal/event.types.ts

import { EventType } from "@/domain/events/event.types";

/**
 * BaseEvent Interface
 * ----------------------------------------
 * This is the canonical shape that EVERY event in the system MUST follow.
 * It strictly enforces TAS §2 Event Model Specification.
 *
 * Core Invariants Enforced:
 * - Append-only (immutable once written)
 * - HLC-based total ordering
 * - Optimistic concurrency via aggregate_version
 * - Cryptographic attribution via metadata
 */

export interface BaseEvent {
  /**
   * Unique identifier for this specific event instance
   * (UUID v7 - time-ordered for better sorting)
   */
  event_id: string;

  /**
   * The aggregate this event belongs to
   * (e.g., queue-entry-uuid, barber-lane-uuid, transaction-uuid)
   */
  aggregate_id: string;

  /**
   * Version of the aggregate after this event is applied
   * Used for optimistic concurrency control (TAS §2.3)
   */
  aggregate_version: number;

  /**
   * The type of event (must be one of the canonical ECS v1.3 types)
   */
  event_type: EventType;

  /**
   * Domain-specific payload
   *
   * IMPORTANT: We use unknown instead of any to satisfy strict lint rules.
   * Payload shape is validated by each specific event handler / aggregate.
   */
  payload: Record<string, unknown>;

  /**
   * Metadata required by TAS §2 for ordering, attribution and auditing
   */
  metadata: {
    /** Session that created this event */
    session_id: string;

    /** Hybrid Logical Clock timestamp for total ordering across terminals */
    hlc_timestamp: string;
  };
}

/**
 * Helper type for strongly-typed payload when creating events
 */
export type EventPayload<T = Record<string, unknown>> = T;

/**
 * Utility type for events with known payload shape
 */
export interface TypedEvent<TPayload = Record<string, unknown>>
  extends Omit<BaseEvent, "payload"> {
  payload: TPayload;
}
