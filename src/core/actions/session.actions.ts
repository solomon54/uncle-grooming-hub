/**
 * @file session.actions.ts
 * @module core/actions
 *
 * Session Action Creators — Terminal Operations boundary module.
 *
 * Specification: MODULE_PRIORITY.md P3.1
 *                ECS v1.3 — Events 13, 14
 *                AMS v1.3 — Terminal Operations module
 *                AGENT.md §7 — Session Contract
 *                SOS v1.0 §4.2 — First login PIN change flow
 *
 * openSession(): validates PIN → commits EVENT 13 → writes ActiveSession to sessionStorage
 * closeSession(): commits EVENT 14 → clears sessionStorage
 */

import { sessionService }   from "@/core/session/session.service";
import type { ActiveSession } from "@/core/session/session.types";

// ─── Open Session ─────────────────────────────────────────────────────────────

/**
 * Validates PIN against local roster, commits EVENT 13, persists session.
 * Returns ActiveSession on success, null on invalid PIN.
 *
 * SOS v1.0 §4.2: if is_first_login is true, caller must redirect to PIN change screen.
 */
export async function openSession(pin: string): Promise<ActiveSession | null> {
  // Pass null, an empty configuration object {}, or a device identifier if requested by your session contract
  return sessionService.login(pin, {}); 
}

// ─── Close Session ────────────────────────────────────────────────────────────

/**
 * Commits EVENT 14, clears sessionStorage.
 */
export async function closeSession(session: ActiveSession): Promise<void> {
  return sessionService.logout();
}

// ─── Get Active Session ───────────────────────────────────────────────────────

/**
 * Reads active session from sessionStorage.
 * Returns null if no session or session expired.
 */
export function getActiveSession(): ActiveSession | null {
  return sessionService.getActiveSession();
}

// ─── Has Role ─────────────────────────────────────────────────────────────────

export function hasRole(...roles: ActiveSession["role"][]): boolean {
  return sessionService.hasRole(...roles);
}
