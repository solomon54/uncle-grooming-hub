/**
 * @file route.ts
 * @module app/api/auth/login
 *
 * POST /api/auth/login — Server-side operator authentication.
 *
 * Specification: SOS v1.0 §2 — Two-factor: email + PIN
 *                TAS v1.0 §9 — Security Architecture (RBAC)
 *
 * PIN verification MUST happen server-side using the service role key.
 * The anon key cannot read the operators table (RLS blocks it by design).
 *
 * Flow:
 *   1. Receive { email, pin } from client
 *   2. Fetch operator from Supabase using service role key
 *   3. Verify PIN hash (salted SHA-256 or simple SHA-256 for initial seed)
 *   4. Return operator profile (never the pin_hash)
 *
 * SECURITY: pin_hash is NEVER returned to the client.
 */

import { NextResponse }      from "next/server";
import { getSupabaseServer } from "@/core/cloud/supabase.server";
import { DB_SCHEMA }         from "@/core/cloud/supabase.client";

// ─── PIN verification (mirrors src/core/security/pin.ts) ─────────────────────

async function sha256hex(str: string): Promise<string> {
  const data   = new TextEncoder().encode(str);
  const buf    = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

async function verifyPin(pin: string, actorId: string, storedHash: string): Promise<boolean> {
  // Try salted hash first (post-first-change): SHA-256(pin + actorId)
  const saltedHash = await sha256hex(pin + actorId);
  if (saltedHash === storedHash) return true;

  // Fall back to simple hash (initial seed from SQL): SHA-256(pin)
  const simpleHash = await sha256hex(pin);
  return simpleHash === storedHash;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  let body: { email?: string; pin?: string };

  try {
    body = (await request.json()) as { email?: string; pin?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const pin   = body.pin?.trim();

  if (!email || !pin) {
    return NextResponse.json({ error: "email and pin are required" }, { status: 400 });
  }

  if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // ── Fetch operator from Supabase (service role — bypasses RLS) ────────────

  const supabase = getSupabaseServer();

  console.log("[login] Attempting fetch — schema:", DB_SCHEMA, "| email:", email);

  const { data, error } = await supabase
    .schema(DB_SCHEMA)
    .from("operators")
    .select("actor_id, email, name, role, pin_hash, barber_id, is_active, is_first_login")
    .eq("email", email)
    .eq("is_active", true)
    .single();

  if (error || !data) {
    console.error("[login] Supabase error:", JSON.stringify(error), "| found data:", !!data);
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // ── Verify PIN ────────────────────────────────────────────────────────────

  const valid = await verifyPin(pin, data.actor_id, data.pin_hash);

  if (!valid) {
    console.error("[login] PIN mismatch for actor:", data.actor_id);
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // ── Return operator profile (NEVER the pin_hash) ──────────────────────────

  return NextResponse.json({
    actor_id:       data.actor_id,
    email:          data.email,
    name:           data.name,
    role:           data.role,
    barber_id:      data.barber_id ?? null,
    is_first_login: data.is_first_login,
  });
}
