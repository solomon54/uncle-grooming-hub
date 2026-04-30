/**
 * @file event.types.ts
 * @module core/journal
 *
 * Canonical base event shape enforced across all domain events.
 *
 * Specification: TAS v1.0 §2 — Event Model Specification
 *
 * Every event in the system MUST conform to BaseEvent.
 * The metadata block provides full audit attribution per TAS §2:
 *   - session_id:    Links to active TerminalSession (ECS EVENT 13)
 *   - hlc_timestamp: Hybrid Logical Clock for deterministic ordering (TAS §4)
 *   - terminal_id:   Hardware-bound terminal attribution (TAS §1.2)
 */

import { EventType } from "@/domain/events/event.types";

// ─── Base Event ───────────────────────────────────────────────────────────────

export interface BaseEvent {
  /** UUID v4 — globally unique, idempotency key (TAS §5) */
  event_id: string;

  /** UUID of the aggregate this event belongs to */
  aggregate_id: string;

  /** Monotonically increasing per aggregate — optimistic concurrency (TAS §2) */
  aggregate_version: number;

  /** Canonical event type string (ECS v1.3) */
  event_type: EventType;

  /** Event-specific data — shape defined per event type */
  payload: Record<string, unknown>;

  /** Audit attribution block — required on every event */
  metadata: {
    /** Active TerminalSession ID — links event to authenticated operator */
    session_id: string;

    /** Hybrid Logical Clock timestamp — format: "<physicalMs>:<counter>:<terminalId>" */
    hlc_timestamp: string;

    /** Hardware-bound terminal identifier (TAS §1.2) */
    terminal_id?: string;
  };
}

// ─── Typed Event ─────────────────────────────────────────────────────────────

/**
 * Utility type for events with a known, strongly-typed payload shape.
 * All domain event interfaces extend this.
 */
export interface TypedEvent<TPayload = Record<string, unknown>>
  extends Omit<BaseEvent, "payload"> {
  payload: TPayload;
}
