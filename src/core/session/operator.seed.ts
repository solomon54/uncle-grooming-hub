/**
 * @file operator.seed.ts
 * @module core/session
 *
 * Operator Roster Seed — Phase 1 placeholder.
 *
 * Specification: PRD §2.1 — Actor Definitions
 *                TAS v1.0 §9 — Security Architecture
 *
 * This seed is loaded into localStorage on first boot if no roster exists.
 * Replace with Admin-managed roster in Phase 2.
 *
 * @security PINs are plain strings in Phase 1 (local-only, no network).
 *           Phase 2: replace with bcrypt hashes in encrypted local DB.
 *
 * @todo Phase 2 — Admin UI to add/remove/update operators with hashed PINs.
 */

import type { Operator } from "./session.types";

// ─── Seed Data ────────────────────────────────────────────────────────────────

/**
 * Default operator roster.
 * Edit these values directly for Phase 1 setup.
 * actor_id values are stable UUIDs — do NOT change them after first use,
 * as they are embedded in the immutable event journal.
 */
export const OPERATOR_SEED: Operator[] = [
  // ── System Owner ───────────────────────────────────────────────────────────
  {
    actor_id:       "actor_owner_001",
    name:           "System Owner",
    role:           "SYSTEM_OWNER",
    pin:            "000000",
    is_first_login: false,
  },

  // ── Admin ──────────────────────────────────────────────────────────────────
  {
    actor_id:       "actor_admin_001",
    name:           "Shop Owner",
    role:           "ADMIN",
    pin:            "111111",
    is_first_login: false,
  },

  // ── Cashier ────────────────────────────────────────────────────────────────
  {
    actor_id:       "actor_cashier_001",
    name:           "Cashier",
    role:           "CASHIER",
    pin:            "222222",
    is_first_login: false,
  },

  // ── Barbers ────────────────────────────────────────────────────────────────
  {
    actor_id:       "actor_barber_001",
    name:           "Barber 1",
    role:           "BARBER",
    pin:            "333333",
    is_first_login: false,
    barber_id:      "lane_001",
  },
  {
    actor_id:       "actor_barber_002",
    name:           "Barber 2",
    role:           "BARBER",
    pin:            "444444",
    is_first_login: false,
    barber_id:      "lane_002",
  },
  {
    actor_id:       "actor_barber_003",
    name:           "Barber 3",
    role:           "BARBER",
    pin:            "555555",
    is_first_login: false,
    barber_id:      "lane_003",
  },
];
