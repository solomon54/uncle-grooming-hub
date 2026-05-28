/**
 * @file operator.cloud.ts
 * @module core/cloud
 *
 * Cloud Operator Service — all operator mutations go through server-side
 * API routes that use the service role key (bypasses RLS).
 *
 * Specification: SOS v1.0 — Staff Account Lifecycle
 *                MODULE_PRIORITY.md P8.1
 *
 * ARCHITECTURE NOTE:
 * The anon key cannot read or write the operators table — RLS blocks it by
 * design (PIN hashes must never be exposed to the browser). All auth and
 * operator management operations use server-side API routes:
 *
 *   POST /api/auth/login           — verify email + PIN
 *   POST /api/auth/change-pin      — update PIN hash
 *   POST /api/auth/create-operator — create new operator (Admin/Owner)
 *   POST /api/auth/deactivate-operator — deactivate operator (Admin/Owner)
 */

import type { Operator } from "@/core/session/session.types";

// ─── Storage ──────────────────────────────────────────────────────────────────

const CLOUD_ROSTER_KEY = "ugh:cloud_roster_v1";

// ─── Cloud operator shape ─────────────────────────────────────────────────────

export interface CloudOperator {
  actor_id:       string;
  email:          string;
  name:           string;
  role:           "SYSTEM_OWNER" | "ADMIN" | "CASHIER" | "BARBER";
  pin_hash:       string;
  barber_id:      string | null;
  is_active:      boolean;
  is_first_login: boolean;
}

// ─── Verify credentials via server-side API ───────────────────────────────────

/**
 * Verifies email + PIN via POST /api/auth/login.
 * The server uses the service role key to read operators and verify the PIN.
 * Returns null on wrong credentials OR network error (caller distinguishes).
 */
export async function verifyCloudCredentials(
  email: string,
  pin:   string
): Promise<CloudOperator | null> {
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
      role:           CloudOperator["role"];
      barber_id:      string | null;
      is_first_login: boolean;
    };

    return {
      actor_id:       data.actor_id,
      email:          data.email,
      name:           data.name,
      role:           data.role,
      pin_hash:       "", // never returned by the API — server-side only
      barber_id:      data.barber_id,
      is_active:      true,
      is_first_login: data.is_first_login,
    };
  } catch {
    // Network error — caller falls through to local seed fallback
    return null;
  }
}

// ─── Change PIN via server-side API ──────────────────────────────────────────

export async function changeCloudPin(
  actorId: string,
  newPin:  string
): Promise<{ success: boolean; error?: string }> {
  try {
    const resp = await fetch("/api/auth/change-pin", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ actor_id: actorId, new_pin: newPin }),
    });

    if (!resp.ok) {
      const body = (await resp.json().catch(() => ({}))) as { error?: string };
      return { success: false, error: body.error ?? "Failed to update PIN" };
    }

    if (typeof window !== "undefined") {
      localStorage.removeItem(CLOUD_ROSTER_KEY);
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Network error" };
  }
}

// ─── Create operator via server-side API (Admin/Owner only) ──────────────────

export async function createCloudOperator(params: {
  actorId:    string;
  email:      string;
  name:       string;
  role:       CloudOperator["role"];
  initialPin: string;
  barberId?:  string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const resp = await fetch("/api/auth/create-operator", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        actor_id:    params.actorId,
        email:       params.email,
        name:        params.name,
        role:        params.role,
        initial_pin: params.initialPin,
        barber_id:   params.barberId ?? null,
      }),
    });

    if (!resp.ok) {
      const body = (await resp.json().catch(() => ({}))) as { error?: string };
      return { success: false, error: body.error ?? "Failed to create operator" };
    }

    if (typeof window !== "undefined") {
      localStorage.removeItem(CLOUD_ROSTER_KEY);
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Network error" };
  }
}

// ─── Deactivate operator via server-side API ──────────────────────────────────

export async function deactivateCloudOperator(
  actorId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const resp = await fetch("/api/auth/deactivate-operator", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ actor_id: actorId }),
    });

    if (!resp.ok) {
      const body = (await resp.json().catch(() => ({}))) as { error?: string };
      return { success: false, error: body.error ?? "Failed to deactivate operator" };
    }

    if (typeof window !== "undefined") {
      localStorage.removeItem(CLOUD_ROSTER_KEY);
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Network error" };
  }
}

// ─── Convert CloudOperator to local Operator type ────────────────────────────

export function cloudToLocalOperator(op: CloudOperator): Operator {
  return {
    actor_id:       op.actor_id,
    email:          op.email,
    name:           op.name,
    role:           op.role,
    pin:            "", // never stored locally in plain text
    is_first_login: op.is_first_login,
    barber_id:      op.barber_id ?? undefined,
  };
}

// ─── getCloudRoster — kept for backward compat (returns empty, not used) ─────

/**
 * @deprecated Cloud roster is no longer fetched client-side.
 * Auth is server-side only. This function is kept to avoid breaking
 * any callers but always returns an empty array.
 */
export async function getCloudRoster(): Promise<CloudOperator[]> {
  return [];
}
