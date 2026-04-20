//src/local-jornal-cloud-lader.ts

/**
 * UNCLE GROOMING HUB - EVENT PERSISTENCE SPECIFICATION v1.3
 *
 * Local Journal: RxDB (Offline-First Authority)
 * Cloud Ledger: Canonical Financial Source of Truth
 *
 * This file defines the schemas for both Local Journal and Cloud Ledger
 * in accordance with ECS v1.3 (remote reservations, mutable intents,
 * deterministic expiry, and recurring schedules).
 *
 * IMPORTANT INVARIANTS PRESERVED FROM TAS:
 * - APPEND_ONLY_INVARIANT
 * - OPTIMISTIC_CONCURRENCY_CONTROL via aggregate_version
 * - IDEMPOTENCY_GUARD via event_id
 * - Local Operational Authority for active sessions
 * - Pure HLC-based deterministic convergence
 */

import { EventType } from "@/domain/events/event.types";

// ===================================================================
// 1. TYPE DEFINITIONS - CONSTRAINTS
// ===================================================================

// Local Journal Constraints (TAS §2 & §3)
export type LocalConstraint =
  | "APPEND_ONLY_INVARIANT" // No mutation or deletion allowed
  | "OPTIMISTIC_CONCURRENCY_CONTROL" // aggregate_version check
  | "IDEMPOTENCY_GUARD" // event_id uniqueness
  | "LOCAL_OPERATIONAL_AUTHORITY"; // Local owns active sessions

// Cloud Ledger Constraints (TAS §6 Financial Reconciliation)
export type CloudConstraint =
  | "APPEND_ONLY_INVARIANT"
  | "STRICT_HLC_ORDERING" // Monotonic HLC enforcement
  | "CLOUD_FINANCIAL_FINALITY" // Only Cloud can settle payments
  | "TRANSACTION_ITEMIZATION_INTEGRITY"
  | "IDEMPOTENCY_ENFORCEMENT";

// ===================================================================
// 2. CORE TYPES
// ===================================================================

export type AggregateType =
  | "CustomerProfile"
  | "QueueEntry"
  | "BarberLane"
  | "Transaction"
  | "TerminalSession"
  | "SystemProcess";

// Constant for event type enum (used in schemas) - from ECS v1.3 full names
const EVENT_TYPE_ENUM: readonly EventType[] = [
  "CUSTOMER_CHECKED_IN",
  "BARBER_AVAILABLE",
  "CUSTOMER_CALLED_TO_CHAIR",
  "SERVICE_ENGAGED",
  "SERVICE_COMPLETED",
  "PAYMENT_INTENT_CREATED",
  "PAYMENT_PROCESSING",
  "PAYMENT_SETTLED",
  "ADJUSTMENT_EVENT",
  "ACCOUNT_VERIFIED",
  "QUEUE_TRANSFER_CONSENTED",
  "APPOINTMENT_RESERVED",
  "RESERVATION_CANCELLED",
  "SERVICE_INTENT_ADDED",
  "SERVICE_INTENT_REMOVED",
  "BARBER_SCHEDULE_UPDATED",
  "SHOP_HOURS_CHANGED",
  "OPERATOR_SESSION_OPENED",
  "OPERATOR_SESSION_CLOSED",
  "SYNC_BATCH_ACKNOWLEDGED",
  "RECONCILIATION_ANOMALY_DETECTED",
  "LOCAL_SNAPSHOT_COMMITTED",
  "TERMINAL_RECOVERY_COMPLETED",
  "RESERVATION_EXPIRED",
];

// ===================================================================
// 3. LOCAL JOURNAL SCHEMAS (RxDB - Offline-First Authority)
// ===================================================================

export interface LocalJournalSchemas {
  [aggregate: string]: {
    schema: {
      title: string;
      version: number;
      primaryKey: "event_id";
      type: "object";
      properties: {
        event_id: { type: "string" }; // UUID v7 - Time-ordered
        aggregate_id: { type: "string" };
        aggregate_version: { type: "number"; minimum: 1 };
        event_type: {
          type: "string";
          enum: readonly EventType[]; // From ECS v1.3 full names
        };
        payload: { type: "object" };
        metadata: {
          type: "object";
          properties: {
            session_id: { type: "string" };
            hlc_timestamp: { type: "string" }; // TAS §4 Total Ordering
          };
          required: ["session_id", "hlc_timestamp"];
        };
      };
      required: [
        "event_id",
        "aggregate_id",
        "aggregate_version",
        "event_type",
        "payload",
        "metadata"
      ];
      indexes: ["aggregate_id", "aggregate_version", "metadata.hlc_timestamp"];
    };
    constraints: LocalConstraint[]; // Flexible array
    replication: {
      push: true;
      pull: true;
    };
  };
}

// ===================================================================
// 4. CLOUD LEDGER SCHEMAS (Canonical Financial Truth)
// ===================================================================

export interface CloudLedgerSchemas {
  [aggregate: string]: {
    table: {
      event_id: { type: "uuid"; primary: true };
      aggregate_id: { type: "uuid"; index: true };
      aggregate_version: { type: "integer" };
      event_type: { type: "varchar" };
      payload: { type: "jsonb" };
      metadata: {
        session_id: { type: "uuid" };
        hlc_timestamp: { type: "varchar" };
      };
      cloud_received_timestamp: { type: "timestamp_tz"; default: "now()" };
      verified_by_gateway: { type: "boolean"; default: false };
      cloud_authority_only: { type: "boolean" };
    };
    constraints: CloudConstraint[];
  };
}

// ===================================================================
// 5. AGGREGATE DEFINITIONS (Local Journal)
// ===================================================================

const EventSchemas: LocalJournalSchemas = {
  CustomerProfile: {
    schema: {
      title: "CustomerProfile Journal",
      version: 1,
      primaryKey: "event_id",
      type: "object",
      properties: {
        event_id: { type: "string" },
        aggregate_id: { type: "string" },
        aggregate_version: { type: "number", minimum: 1 },
        event_type: { type: "string", enum: EVENT_TYPE_ENUM },
        payload: { type: "object" },
        metadata: {
          type: "object",
          properties: {
            session_id: { type: "string" },
            hlc_timestamp: { type: "string" },
          },
          required: ["session_id", "hlc_timestamp"],
        },
      },
      required: [
        "event_id",
        "aggregate_id",
        "aggregate_version",
        "event_type",
        "payload",
        "metadata",
      ],
      indexes: ["aggregate_id", "aggregate_version", "metadata.hlc_timestamp"],
    },
    constraints: [
      "APPEND_ONLY_INVARIANT",
      "OPTIMISTIC_CONCURRENCY_CONTROL",
      "IDEMPOTENCY_GUARD",
      "LOCAL_OPERATIONAL_AUTHORITY",
    ],
    replication: { push: true, pull: true },
  },

  QueueEntry: {
    schema: {
      title:
        "QueueEntry Journal - Logistics Layer (RESERVED, WAITING, expiry, etc.)",
      version: 1,
      primaryKey: "event_id",
      type: "object",
      properties: {
        event_id: { type: "string" },
        aggregate_id: { type: "string" },
        aggregate_version: { type: "number", minimum: 1 },
        event_type: { type: "string", enum: EVENT_TYPE_ENUM },
        payload: { type: "object" },
        metadata: {
          type: "object",
          properties: {
            session_id: { type: "string" },
            hlc_timestamp: { type: "string" },
          },
          required: ["session_id", "hlc_timestamp"],
        },
      },
      required: [
        "event_id",
        "aggregate_id",
        "aggregate_version",
        "event_type",
        "payload",
        "metadata",
      ],
      indexes: ["aggregate_id", "aggregate_version", "metadata.hlc_timestamp"],
    },
    constraints: [
      "APPEND_ONLY_INVARIANT",
      "OPTIMISTIC_CONCURRENCY_CONTROL",
      "IDEMPOTENCY_GUARD",
      "LOCAL_OPERATIONAL_AUTHORITY",
    ],
    replication: { push: true, pull: true },
  },

  BarberLane: {
    schema: {
      title:
        "BarberLane Journal - Includes recurring schedule rules (EVENT 23)",
      version: 1,
      primaryKey: "event_id",
      type: "object",
      properties: {
        event_id: { type: "string" },
        aggregate_id: { type: "string" },
        aggregate_version: { type: "number", minimum: 1 },
        event_type: { type: "string", enum: EVENT_TYPE_ENUM },
        payload: { type: "object" },
        metadata: {
          type: "object",
          properties: {
            session_id: { type: "string" },
            hlc_timestamp: { type: "string" },
          },
          required: ["session_id", "hlc_timestamp"],
        },
      },
      required: [
        "event_id",
        "aggregate_id",
        "aggregate_version",
        "event_type",
        "payload",
        "metadata",
      ],
      indexes: ["aggregate_id", "aggregate_version", "metadata.hlc_timestamp"],
    },
    constraints: [
      "APPEND_ONLY_INVARIANT",
      "OPTIMISTIC_CONCURRENCY_CONTROL",
      "IDEMPOTENCY_GUARD",
      "LOCAL_OPERATIONAL_AUTHORITY",
    ],
    replication: { push: true, pull: true },
  },

  Transaction: {
    schema: {
      title:
        "Transaction Journal - Commerce Layer (intents snapshotted at EVENT 04)",
      version: 1,
      primaryKey: "event_id",
      type: "object",
      properties: {
        event_id: { type: "string" },
        aggregate_id: { type: "string" },
        aggregate_version: { type: "number", minimum: 1 },
        event_type: { type: "string", enum: EVENT_TYPE_ENUM },
        payload: { type: "object" },
        metadata: {
          type: "object",
          properties: {
            session_id: { type: "string" },
            hlc_timestamp: { type: "string" },
          },
          required: ["session_id", "hlc_timestamp"],
        },
      },
      required: [
        "event_id",
        "aggregate_id",
        "aggregate_version",
        "event_type",
        "payload",
        "metadata",
      ],
      indexes: ["aggregate_id", "aggregate_version", "metadata.hlc_timestamp"],
    },
    constraints: [
      "APPEND_ONLY_INVARIANT",
      "OPTIMISTIC_CONCURRENCY_CONTROL",
      "IDEMPOTENCY_GUARD",
      "LOCAL_OPERATIONAL_AUTHORITY",
    ],
    replication: { push: true, pull: true },
  },

  TerminalSession: {
    schema: {
      title: "TerminalSession Journal",
      version: 1,
      primaryKey: "event_id",
      type: "object",
      properties: {
        event_id: { type: "string" },
        aggregate_id: { type: "string" },
        aggregate_version: { type: "number", minimum: 1 },
        event_type: { type: "string", enum: EVENT_TYPE_ENUM },
        payload: { type: "object" },
        metadata: {
          type: "object",
          properties: {
            session_id: { type: "string" },
            hlc_timestamp: { type: "string" },
          },
          required: ["session_id", "hlc_timestamp"],
        },
      },
      required: [
        "event_id",
        "aggregate_id",
        "aggregate_version",
        "event_type",
        "payload",
        "metadata",
      ],
      indexes: ["aggregate_id", "aggregate_version", "metadata.hlc_timestamp"],
    },
    constraints: [
      "APPEND_ONLY_INVARIANT",
      "OPTIMISTIC_CONCURRENCY_CONTROL",
      "IDEMPOTENCY_GUARD",
      "LOCAL_OPERATIONAL_AUTHORITY",
    ],
    replication: { push: true, pull: true },
  },

  SystemProcess: {
    schema: {
      title: "SystemProcess Journal - Shop hours, grace window, global config",
      version: 1,
      primaryKey: "event_id",
      type: "object",
      properties: {
        event_id: { type: "string" },
        aggregate_id: { type: "string" },
        aggregate_version: { type: "number", minimum: 1 },
        event_type: { type: "string", enum: EVENT_TYPE_ENUM },
        payload: { type: "object" },
        metadata: {
          type: "object",
          properties: {
            session_id: { type: "string" },
            hlc_timestamp: { type: "string" },
          },
          required: ["session_id", "hlc_timestamp"],
        },
      },
      required: [
        "event_id",
        "aggregate_id",
        "aggregate_version",
        "event_type",
        "payload",
        "metadata",
      ],
      indexes: ["aggregate_id", "aggregate_version", "metadata.hlc_timestamp"],
    },
    constraints: [
      "APPEND_ONLY_INVARIANT",
      "OPTIMISTIC_CONCURRENCY_CONTROL",
      "IDEMPOTENCY_GUARD",
      "LOCAL_OPERATIONAL_AUTHORITY",
    ],
    replication: { push: true, pull: true },
  },
};

// ===================================================================
// 6. CLOUD LEDGER SCHEMAS
// ===================================================================

const CloudSchemas: CloudLedgerSchemas = {
  CustomerProfile: {
    table: {
      event_id: { type: "uuid", primary: true },
      aggregate_id: { type: "uuid", index: true },
      aggregate_version: { type: "integer" },
      event_type: { type: "varchar" },
      payload: { type: "jsonb" },
      metadata: {
        session_id: { type: "uuid" },
        hlc_timestamp: { type: "varchar" },
      },
      cloud_received_timestamp: { type: "timestamp_tz", default: "now()" },
      verified_by_gateway: { type: "boolean", default: false },
      cloud_authority_only: { type: "boolean" },
    },
    constraints: [
      "APPEND_ONLY_INVARIANT",
      "STRICT_HLC_ORDERING",
      "IDEMPOTENCY_ENFORCEMENT",
    ],
  },
  QueueEntry: {
    table: {
      event_id: { type: "uuid", primary: true },
      aggregate_id: { type: "uuid", index: true },
      aggregate_version: { type: "integer" },
      event_type: { type: "varchar" },
      payload: { type: "jsonb" },
      metadata: {
        session_id: { type: "uuid" },
        hlc_timestamp: { type: "varchar" },
      },
      cloud_received_timestamp: { type: "timestamp_tz", default: "now()" },
      verified_by_gateway: { type: "boolean", default: false },
      cloud_authority_only: { type: "boolean" },
    },
    constraints: [
      "APPEND_ONLY_INVARIANT",
      "STRICT_HLC_ORDERING",
      "IDEMPOTENCY_ENFORCEMENT",
    ],
  },
  BarberLane: {
    table: {
      event_id: { type: "uuid", primary: true },
      aggregate_id: { type: "uuid", index: true },
      aggregate_version: { type: "integer" },
      event_type: { type: "varchar" },
      payload: { type: "jsonb" },
      metadata: {
        session_id: { type: "uuid" },
        hlc_timestamp: { type: "varchar" },
      },
      cloud_received_timestamp: { type: "timestamp_tz", default: "now()" },
      verified_by_gateway: { type: "boolean", default: false },
      cloud_authority_only: { type: "boolean" },
    },
    constraints: [
      "APPEND_ONLY_INVARIANT",
      "STRICT_HLC_ORDERING",
      "IDEMPOTENCY_ENFORCEMENT",
    ],
  },
  Transaction: {
    table: {
      event_id: { type: "uuid", primary: true },
      aggregate_id: { type: "uuid", index: true },
      aggregate_version: { type: "integer" },
      event_type: { type: "varchar" },
      payload: { type: "jsonb" },
      metadata: {
        session_id: { type: "uuid" },
        hlc_timestamp: { type: "varchar" },
      },
      cloud_received_timestamp: { type: "timestamp_tz", default: "now()" },
      verified_by_gateway: { type: "boolean", default: false },
      cloud_authority_only: { type: "boolean" },
    },
    constraints: [
      "APPEND_ONLY_INVARIANT",
      "STRICT_HLC_ORDERING",
      "CLOUD_FINANCIAL_FINALITY",
      "TRANSACTION_ITEMIZATION_INTEGRITY",
      "IDEMPOTENCY_ENFORCEMENT",
    ],
  },
  TerminalSession: {
    table: {
      event_id: { type: "uuid", primary: true },
      aggregate_id: { type: "uuid", index: true },
      aggregate_version: { type: "integer" },
      event_type: { type: "varchar" },
      payload: { type: "jsonb" },
      metadata: {
        session_id: { type: "uuid" },
        hlc_timestamp: { type: "varchar" },
      },
      cloud_received_timestamp: { type: "timestamp_tz", default: "now()" },
      verified_by_gateway: { type: "boolean", default: false },
      cloud_authority_only: { type: "boolean" },
    },
    constraints: [
      "APPEND_ONLY_INVARIANT",
      "STRICT_HLC_ORDERING",
      "IDEMPOTENCY_ENFORCEMENT",
    ],
  },
  SystemProcess: {
    table: {
      event_id: { type: "uuid", primary: true },
      aggregate_id: { type: "uuid", index: true },
      aggregate_version: { type: "integer" },
      event_type: { type: "varchar" },
      payload: { type: "jsonb" },
      metadata: {
        session_id: { type: "uuid" },
        hlc_timestamp: { type: "varchar" },
      },
      cloud_received_timestamp: { type: "timestamp_tz", default: "now()" },
      verified_by_gateway: { type: "boolean", default: false },
      cloud_authority_only: { type: "boolean" },
    },
    constraints: [
      "APPEND_ONLY_INVARIANT",
      "STRICT_HLC_ORDERING",
      "IDEMPOTENCY_ENFORCEMENT",
    ],
  },
};

export { EventSchemas, CloudSchemas };
