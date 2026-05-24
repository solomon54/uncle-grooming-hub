/**
 * @file operator.seed.ts
 * @module core/session
 *
 * Operator Roster Seed — Phase 1 placeholder.
 *
 * Specification: PRD §2.1 — Actor Definitions
 *                SOS v1.0 §2 — Two-factor: username + PIN
 *
 * Login: username (unique) + 6-digit PIN.
 * Username uniqueness prevents PIN collision between operators.
 *
 * @security PINs are plain strings in Phase 1 (local-only, no network).
 * @todo Phase 2 — Replace with HMAC-SHA256 hashed PINs (SOS v1.0 §6 EVENT 28)
 * @todo Phase 2 — Admin UI to add/remove/update operators
 */

import type { Operator } from "./session.types";

export const OPERATOR_SEED: Operator[] = [
  {
    actor_id:       "actor_owner_001",
    username:       "owner@unclegrooming.com",
    name:           "System Owner",
    role:           "SYSTEM_OWNER",
    pin:            "000000",
    is_first_login: false,
  },
  {
    actor_id:       "actor_admin_001",
    username:       "admin@unclegrooming.com",
    name:           "Shop Admin",
    role:           "ADMIN",
    pin:            "111111",
    is_first_login: false,
  },
  {
    actor_id:       "actor_cashier_001",
    username:       "cashier@unclegrooming.com",
    name:           "Cashier",
    role:           "CASHIER",
    pin:            "222222",
    is_first_login: false,
  },
  {
    actor_id:       "actor_barber_001",
    username:       "barber1@unclegrooming.com",
    name:           "Barber 1",
    role:           "BARBER",
    pin:            "333333",
    is_first_login: false,
    barber_id:      "lane_001",
  },
  {
    actor_id:       "actor_barber_002",
    username:       "barber2@unclegrooming.com",
    name:           "Barber 2",
    role:           "BARBER",
    pin:            "444444",
    is_first_login: false,
    barber_id:      "lane_002",
  },
  {
    actor_id:       "actor_barber_003",
    username:       "barber3@unclegrooming.com",
    name:           "Barber 3",
    role:           "BARBER",
    pin:            "555555",
    is_first_login: false,
    barber_id:      "lane_003",
  },
];
