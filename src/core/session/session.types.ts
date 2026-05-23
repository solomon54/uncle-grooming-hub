/**
 * @file session.types.ts
 * @module core/session
 *
 * Session type definitions.
 *
 * Specification: TAS v1.0 §9 — Security Architecture (RBAC)
 *                ECS v1.3 EVENT 13 — OPERATOR_SESSION_OPENED
 *                AGENT.md §13–14 — Updated RBAC and Session Contract
 *                SOS v1.0 §1 — Role Hierarchy
 *                UI Standards §11 — Session State Contract
 */

import type { ActorRole } from "@/domain/events/event.types";

// ─── Re-export for convenience ────────────────────────────────────────────────

export type { ActorRole };

/** Roles that can log into operational terminals */
export type OperatorRole = Extract<ActorRole, "BARBER" | "CASHIER" | "ADMIN" | "SYSTEM_OWNER">;

// ─── Operator (seeded roster entry) ──────────────────────────────────────────

export interface Operator {
  /** Stable UUID — used as actor_id in all events */
  actor_id:    string;
  /** Display name shown in UI */
  name:        string;
  /** Role determines which screens are accessible */
  role:        OperatorRole;
  /**
   * 6-digit PIN stored as plain string for Phase 1.
   * @todo Phase 2 — Replace with HMAC-SHA256 hash (SOS v1.0 §6 EVENT 28)
   */
  pin:         string;
  /** Whether this is the operator's first login — forces PIN change (AGENT.md §14) */
  is_first_login: boolean;
  /** Barber-specific: their lane identifier */
  barber_id?:  string;
}

// ─── Active Session ───────────────────────────────────────────────────────────

/**
 * Runtime session — stored in sessionStorage (cleared on tab close per TAS §9).
 * The session_id flows into every subsequent event's metadata.session_id.
 *
 * AGENT.md §14 — Updated Session Contract
 */
export interface ActiveSession {
  /** UUID — required in ALL event metadata.session_id */
  session_id:      string;
  /** Operator UUID — actor_id in all events */
  actor_id:        string;
  /** Role — determines screen access */
  role:            OperatorRole;
  /** Display name */
  actor_name:      string;
  /** Hardware-bound terminal identifier */
  terminal_id:     string;
  /** HLC timestamp of session open */
  opened_at:       string;
  /** Forces PIN change screen on first login (SOS v1.0 §4.2) */
  is_first_login:  boolean;
  /** Barber lane ID (BARBER role only) */
  barber_id?:      string;
}
