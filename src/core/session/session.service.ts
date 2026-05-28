/**
 * @file session.service.ts
 * @module core/session
 *
 * Session Service — production-grade operator authentication.
 *
 * Specification: TAS v1.0 §9 — Security Architecture (RBAC)
 *                ECS v1.3 EVENT 13 — OPERATOR_SESSION_OPENED
 *                ECS v1.3 EVENT 14 — OPERATOR_SESSION_CLOSED
 *                SOS v1.0 §2 — Two-factor: email + PIN
 *
 * Authentication flow:
 *   1. Try cloud roster (Supabase) with HMAC-SHA256 PIN verification
 *   2. Fall back to local seed if cloud unavailable (offline mode)
 *
 * PINs are NEVER stored in plain text in production.
 * Local seed PINs are plain text only for development/offline fallback.
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

const ROSTER_KEY  = "ugh:operator_roster_v2";
const SESSION_KEY = "ugh:active_session";

// ─── Session Service ──────────────────────────────────────────────────────────

export class SessionService {

  // ── Roster ──────────────────────────────────────────────────────────────────

  getRoster(): Operator[] {
    if (typeof window === "undefined") return [];

    const stored = localStorage.getItem(ROSTER_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Operator[];
        if (parsed.length > 0 && parsed[0].email) {
          return parsed;
        }
      } catch {
        // Corrupted — re-seed
      }
    }

    localStorage.setItem(ROSTER_KEY, JSON.stringify(OPERATOR_SEED));
    return OPERATOR_SEED;
  }

  // ── Login ────────────────────────────────────────────────────────────────────

  /**
   * Authenticate with email + PIN.
   *
   * Production: verifies via /api/auth/login (server-side, service role key).
   * Offline fallback: verifies against local seed with plain-text PIN.
   */
  async login(email: string, pin: string): Promise<ActiveSession | null> {
    // ── Try server-side cloud authentication first ──────────────────────────
    try {
      const { verifyCloudCredentials } = await import("@/core/cloud/operator.cloud");
      const cloudOp = await verifyCloudCredentials(email, pin);

      if (cloudOp) {
        return this.createSession({
          actor_id:       cloudOp.actor_id,
          email:          cloudOp.email,
          name:           cloudOp.name,
          role:           cloudOp.role,
          is_first_login: cloudOp.is_first_login,
          barber_id:      cloudOp.barber_id ?? undefined,
        });
      }

      // verifyCloudCredentials returns null for both wrong credentials AND
      // network errors. Probe the API to distinguish the two cases.
      const probe = await fetch("/api/auth/login", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: "__probe__", pin: "000000" }),
      }).catch(() => null);

      if (probe !== null) {
        // API is reachable — null from verifyCloudCredentials = wrong credentials
        return null;
      }
      // API unreachable — fall through to local fallback
    } catch {
      // Network error — fall through to local fallback
      console.warn("[SessionService] Cloud auth unavailable — using local fallback");
    }

    // ── Offline fallback: local seed with plain-text PIN ────────────────────
    const localRoster = this.getRoster();
    const operator = localRoster.find(
      op => op.email?.toLowerCase() === email.toLowerCase().trim() && op.pin === pin
    );

    if (!operator) return null;

    return this.createSession({
      actor_id:       operator.actor_id,
      email:          operator.email,
      name:           operator.name,
      role:           operator.role,
      is_first_login: operator.is_first_login,
      barber_id:      operator.barber_id,
    });
  }

  // ── Create session ───────────────────────────────────────────────────────────

  private async createSession(op: {
    actor_id:       string;
    email:       string;
    name:           string;
    role:           OperatorRole;
    is_first_login: boolean;
    barber_id?:     string;
  }): Promise<ActiveSession> {
    const session: ActiveSession = {
      session_id:     crypto.randomUUID(),
      actor_id:       op.actor_id,
      role:           op.role,
      actor_name:     op.name,
      email:       op.email,
      terminal_id:    terminalIdentity.terminalId,
      opened_at:      clockService.tick(),
      is_first_login: op.is_first_login,
      barber_id:      op.barber_id,
    };

    // Persist session
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));

    // Emit EVENT 13 — best-effort (runtime may not be ready yet)
    try {
      const event: OperatorSessionOpenedEvent = {
        event_id:          crypto.randomUUID(),
        event_type:        "OPERATOR_SESSION_OPENED",
        aggregate_id:      session.session_id,
        aggregate_version: 1,
        payload: {
          actor_id:    session.actor_id,
          role:        session.role as "BARBER" | "CASHIER" | "ADMIN",
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
    } catch {
      console.warn("[SessionService] EVENT 13 deferred — runtime not ready");
    }

    return session;
  }

  // ── Logout ───────────────────────────────────────────────────────────────────

  async logout(): Promise<void> {
    const session = this.getActiveSession();
    if (!session) return;

    try {
      const event: OperatorSessionClosedEvent = {
        event_id:          crypto.randomUUID(),
        event_type:        "OPERATOR_SESSION_CLOSED",
        aggregate_id:      session.session_id,
        aggregate_version: 2,
        payload:           { reason: "manual" },
        metadata: {
          session_id:    session.session_id,
          hlc_timestamp: clockService.tick(),
          terminal_id:   session.terminal_id,
        },
      };
      await runtime.emit(event);
    } catch {
      // Best-effort
    }

    sessionStorage.removeItem(SESSION_KEY);
  }

  // ── Session reads ────────────────────────────────────────────────────────────

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

  hasRole(...roles: OperatorRole[]): boolean {
    const session = this.getActiveSession();
    if (!session) return false;
    return roles.includes(session.role);
  }

  isAuthenticated(): boolean {
    return this.getActiveSession() !== null;
  }
}

export const sessionService = new SessionService();
