/**
 * @file barber-lane.schema.ts
 * @module core/db/schemas
 *
 * RxDB schema for the BarberLane aggregate.
 * Specification: ECS v1.3 §1 — BarberLane
 */

import type { RxJsonSchema } from "rxdb";

export const barberLaneSchema: RxJsonSchema<Record<string, unknown>> = {
  title:      "barber_lane_journal",
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
    is_synced: { type: "boolean" },
  },
  required: ["event_id", "aggregate_id", "aggregate_version", "event_type", "payload", "metadata", "hlc", "is_synced"],
  indexes:  ["hlc", "aggregate_id", "is_synced"],
};
