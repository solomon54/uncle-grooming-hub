/**
 * @file session.service.ts
 * @module core/session
 *
 * Session Service — cloud-only operator authentication.
 *
 * Specification: TAS v1.0 §9 — Security Architecture (RBAC)
 *                ECS v1.3 EVENT 13 — OPERATOR_SESSION_OPENED
 *                ECS v1.3 EVENT 14 — OPERATOR_SESSION_CLOSED
 *                SOS v1.0 §2 — Two-factor: email + PIN
 *
 * Authentication flow:
 *   POST /api/auth/login → server verifies PIN hash against Supabase
 *   → returns operator profile → session stored in sessionStorage
 *
 * No local seed. No plain-text PINs. No offline fallback.
 * All operators are managed in Supabase via the Admin → Staff UI.
 */

import type { ActiveSession, OperatorRole } from "./session.types";
import { clockService }     from "@/core/clock/clock.service";
import { terminalIdentity } from "@/core/terminal/terminal.identity";
import { runtime }          from "@/core/runtime/runtime";
import type {
  OperatorSessionOpenedEvent,
  OperatorSessionClosedEvent,
} from "@/domain/events/event.definitions";

// ─── Storage Keys ─────────────────────────────────────────────────────────────

const SESSION_KEY = "ugh:active_session";

// ─── Session Service ──────────────────────────────────────────────────────────

export class SessionService {

  // ── Login ────────────────────────────────────────────────────────────────────

  /**
   * Authenticate with email + PIN via server-side API.
   * Returns ActiveSession on success, null on wrong credentials or network error.
   */
  async login(email: string, pin: string): Promise<ActiveSession | null> {
    try {
      const resp = await fetch("/api/auth/login", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: email.trim().toLowerCase(), pin }),
      });

      if (!resp.ok) return null;

      const data = (await resp.json()) as {
        actor_id:       string;
        email:          string;
        name:           string;
        role:           OperatorRole;
        barber_id:      string | null;
        is_first_login: boolean;
      };

      return this.createSession({
        actor_id:       data.actor_id,
        email:          data.email,
        name:           data.name,
        role:           data.role,
        is_first_login: data.is_first_login,
        barber_id:      data.barber_id ?? undefined,
      });
    } catch {
      // Network error — cannot authenticate without cloud
      console.error("[SessionService] Login failed — cloud unreachable");
      return null;
    }
  }

  // ── Create session ───────────────────────────────────────────────────────────

  private async createSession(op: {
    actor_id:       string;
    email:          string;
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
      email:          op.email,
      terminal_id:    terminalIdentity.terminalId,
      opened_at:      clockService.tick(),
      is_first_login: op.is_first_login,
      barber_id:      op.barber_id,
    };

    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));

    // Emit EVENT 13 — best-effort (runtime may not be ready at login time)
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
      // Runtime not ready yet — EVENT 13 deferred, session still valid
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
