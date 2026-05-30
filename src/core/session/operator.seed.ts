/**
 * @file operator.seed.ts
 * @module core/session
 *
 * Operator Roster — production cloud-only.
 *
 * All operators are managed exclusively in Supabase (uncle_grooming.operators).
 * Authentication goes through /api/auth/login (server-side, service role key).
 *
 * This file is kept for TypeScript import compatibility only.
 * The OPERATOR_SEED array is intentionally empty — no local fallback in production.
 *
 * To add operators: use the Admin → Staff → Register Staff UI.
 */

import type { Operator } from "./session.types";

/**
 * Empty in production. All operators live in Supabase.
 * The session.service.ts offline fallback has been removed.
 */
export const OPERATOR_SEED: Operator[] = [];
