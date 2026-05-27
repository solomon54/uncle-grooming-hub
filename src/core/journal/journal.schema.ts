/**
 * @file journal.schema.ts
 * @module core/journal
 *
 * RxDB schema for the local append-only Event Journal.
 *
 * Specification: TAS v1.0 §3 — Local Event Journal Design
 *
 * Rules:
 *   - All string fields used in indexes MUST declare maxLength (RxDB SC34)
 *   - primaryKey field (event_id) must also have maxLength
 *   - The `hlc` field is a denormalized copy of metadata.hlc_timestamp
 *     used for indexed sorting — RxDB cannot index nested object fields
 *     directly with the compound index syntax we need
 */

import { RxJsonSchema } from "rxdb";

// ─── HLC max length calculation ───────────────────────────────────────────────
// Format: "<physicalMs>:<counter>:<terminalId>"
// physicalMs:  13 digits (covers year 9999 in ms)
// counter:      4 digits
// terminalId:  ~20 chars (e.g. "term_a1b2c3d4e5f6")
// Separators:   2 chars
// Total:       ~39 chars → 128 is a safe ceiling
const HLC_MAX_LENGTH = 128;

// ─── Schema ───────────────────────────────────────────────────────────────────

export const journalSchema: RxJsonSchema<{
  event_id:          string;
  event_type:        string;
  aggregate_id:      string;
  aggregate_version: number;
  payload:           Record<string, unknown>;
  metadata:          Record<string, unknown>;
  hlc:               string;
  is_synced:         boolean;
}> = {
  title:      "journal",
  version:    1,  // bumped from 0 — renamed synced→is_synced (RxDB SC17)
  primaryKey: "event_id",
  type:       "object",

  properties: {
    // Primary key — UUID v4 (36 chars with hyphens)
    event_id: {
      type:      "string",
      maxLength: 100,
    },

    // ECS v1.3 event type string (e.g. "CUSTOMER_CHECKED_IN")
    event_type: {
      type:      "string",
      maxLength: 64,
    },

    // UUID of the aggregate this event belongs to
    aggregate_id: {
      type:      "string",
      maxLength: 100,
    },

    // Monotonically increasing per aggregate
    aggregate_version: {
      type:    "number",
      minimum: 1,
    },

    // Event-specific data — arbitrary JSON
    payload: {
      type: "object",
    },

    // Audit attribution block
    metadata: {
      type: "object",
      properties: {
        session_id:    { type: "string", maxLength: 100 },
        hlc_timestamp: { type: "string", maxLength: HLC_MAX_LENGTH },
        terminal_id:   { type: "string", maxLength: 64 },
      },
      required: ["session_id", "hlc_timestamp"],
    },

    // Denormalized HLC for indexed sorting (RxDB cannot index nested fields)
    hlc: {
      type:      "string",
      maxLength: HLC_MAX_LENGTH,
    },

    // Sync tracking — renamed from 'synced' (RxDB SC17 reserved word)
    is_synced: {
      type: "boolean",
    },
  },

  required: [
    "event_id",
    "event_type",
    "aggregate_id",
    "aggregate_version",
    "payload",
    "metadata",
    "hlc",
    "is_synced",
  ],

  indexes: ["hlc", "is_synced"],
};
