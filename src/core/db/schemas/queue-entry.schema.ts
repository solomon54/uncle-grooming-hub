/**
 * @file queue-entry.schema.ts
 * @module core/db/schemas
 *
 * RxDB schema for the QueueEntry aggregate.
 *
 * Specification: ECS v1.3 §1 — QueueEntry (Logistics Layer)
 *                TAS v1.0 §3 — Local Event Journal Design
 *                MODULE_PRIORITY.md P1.1
 *
 * QueueEntry manages: arrival sequence, waiting state, reservation lifecycle.
 * States: RESERVED → WAITING → CALLED → IN_SERVICE → COMPLETED | EXPIRED | CANCELLED
 */

import type { RxJsonSchema } from "rxdb";

export const queueEntrySchema: RxJsonSchema<Record<string, unknown>> = {
  title:      "queue_entry_journal",
  version:    0,
  primaryKey: "event_id",
  type:       "object",
  properties: {
    event_id:          { type: "string", maxLength: 100 },
    aggregate_id:      { type: "string", maxLength: 100 },
    aggregate_version: { type: "number", minimum: 1 },
    event_type:        { type: "string", maxLength: 64 },
    payload:           { type: "object" },
    metadata: {
      type: "object",
      properties: {
        session_id:    { type: "string", maxLength: 100 },
        hlc_timestamp: { type: "string", maxLength: 128 },
        terminal_id:   { type: "string", maxLength: 64 },
        actor_id:      { type: "string", maxLength: 100 },
      },
      required: ["session_id", "hlc_timestamp"],
    },
    hlc:    { type: "string", maxLength: 128 },
    synced: { type: "boolean" },
  },
  required: ["event_id", "aggregate_id", "aggregate_version", "event_type", "payload", "metadata", "hlc", "synced"],
  indexes:  ["hlc", "aggregate_id", "synced"],
};
