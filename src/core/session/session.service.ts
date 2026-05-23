/**
 * @file session.service.ts
 * @module core/session
 *
 * Session Service — operator authentication and session lifecycle.
 *
 * Specification: TAS v1.0 §9 — Security Architecture (RBAC)
 *                ECS v1.3 EVENT 13 — OPERATOR_SESSION_OPENED
 *                ECS v1.3 EVENT 14 — OPERATOR_SESSION_CLOSED
 *                UI Standards §10 — Session State
 *
 * Responsibilities:
 *   - Seed and manage the local operator roster
 *   - Validate 6-digit PIN against the roster
 *   - Persist active session to sessionStorage
 *   - Emit EVENT 13 on login, EVENT 14 on logout
 *   - Provide reactive session reads for UI components
 */

import { OPERATOR_SEED }    from "./operator.seed";
import type { Operator, ActiveSession, OperatorRole } from "./session.types";
import { clockService }     from "@/core/clock/clock.service";
import { terminalIdentity } from "@/core/terminal/terminal.identity";
import { runtime }          from "@/core/runtime/runtime";
import type {
  OperatorSessionOpenedEvent,
  OperatorSessionClosedEvent,
} from "@/domain/events/event.definitions";

// ─── Storage Keys ─────────────────────────────────────────────────────────────

const ROSTER_KEY  = "ugh:operator_roster";
const SESSION_KEY = "ugh:active_session";

// ─── Session Service ──────────────────────────────────────────────────────────

export class SessionService {

  // ── Roster Management ──────────────────────────────────────────────────────

  /**
   * Load the operator roster from localStorage.
   * Seeds from OPERATOR_SEED if no roster exists yet.
   */
  getRoster(): Operator[] {
    if (typeof window === "undefined") return [];

    const stored = localStorage.getItem(ROSTER_KEY);
    if (stored) {
      try {
        return JSON.parse(stored) as Operator[];
      } catch {
        // Corrupted — re-seed
      }
    }

    // First boot — seed the roster
    this.seedRoster();
    return OPERATOR_SEED;
  }

  private seedRoster(): void {
    localStorage.setItem(ROSTER_KEY, JSON.stringify(OPERATOR_SEED));
  }

  /**
   * Find an operator by PIN.
   * Returns null if no match — never reveals which field was wrong.
   */
  findByPin(pin: string): Operator | null {
    const roster = this.getRoster();
    return roster.find(op => op.pin === pin) ?? null;
  }

  // ── Session Lifecycle ──────────────────────────────────────────────────────

  /**
   * Attempt login with a 6-digit PIN.
   * On success: persists session, emits EVENT 13, returns the session.
   * On failure: returns null.
   */
  async login(pin: string): Promise<ActiveSession | null> {
    const operator = this.findByPin(pin);
    if (!operator) return null;

    const session: ActiveSession = {
      session_id:     crypto.randomUUID(),
      actor_id:       operator.actor_id,
      role:           operator.role,
      actor_name:     operator.name,
      terminal_id:    terminalIdentity.terminalId,
      opened_at:      clockService.tick(),
      is_first_login: operator.is_first_login,
      barber_id:      operator.barber_id,
    };

    // Persist to sessionStorage (cleared on tab close — TAS §9)
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));

    // Emit EVENT 13 — OPERATOR_SESSION_OPENED (ECS v1.3)
    const event: OperatorSessionOpenedEvent = {
      event_id:          crypto.randomUUID(),
      event_type:        "OPERATOR_SESSION_OPENED",
      aggregate_id:      session.session_id,
      aggregate_version: 1,
      payload: {
        actor_id:    session.actor_id,
        role:        session.role,
        terminal_id: session.terminal_id,
        auth_method: "PIN",
      },
      metadata: {
        session_id:    session.session_id,
        hlc_timestamp: session.opened_at,
        terminal_id:   session.terminal_id,
      },
    };

    await runtime.emit(event);

    return session;
  }

  /**
   * Log out the current operator.
   * Clears sessionStorage, emits EVENT 14.
   */
  async logout(): Promise<void> {
    const session = this.getActiveSession();
    if (!session) return;

    // Emit EVENT 14 — OPERATOR_SESSION_CLOSED (ECS v1.3)
    const event: OperatorSessionClosedEvent = {
      event_id:          crypto.randomUUID(),
      event_type:        "OPERATOR_SESSION_CLOSED",
      aggregate_id:      session.session_id,
      aggregate_version: 2,
      payload: {
        reason: "manual",
      },
      metadata: {
        session_id:    session.session_id,
        hlc_timestamp: clockService.tick(),
        terminal_id:   session.terminal_id,
      },
    };

    await runtime.emit(event);

    sessionStorage.removeItem(SESSION_KEY);
  }

  // ── Session Reads ──────────────────────────────────────────────────────────

  /**
   * Returns the active session or null.
   * Safe to call on every render — reads from sessionStorage.
   */
  getActiveSession(): ActiveSession | null {
    if (typeof window === "undefined") return null;

    const stored = sessionStorage.getItem(SESSION_KEY);
    if (!stored) return null;

    try {
      return JSON.parse(stored) as ActiveSession;
    } catch {
      return null;
    }
  }

  /**
   * Returns true if there is an active session with the required role(s).
   */
  hasRole(...roles: OperatorRole[]): boolean {
    const session = this.getActiveSession();
    if (!session) return false;
    return roles.includes(session.role);
  }

  /**
   * Returns true if any session is active.
   */
  isAuthenticated(): boolean {
    return this.getActiveSession() !== null;
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

export const sessionService = new SessionService();
