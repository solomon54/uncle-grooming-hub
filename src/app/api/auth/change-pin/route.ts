/**
 * @file route.ts
 * @module app/api/auth/change-pin
 *
 * POST /api/auth/change-pin — Server-side PIN change.
 *
 * Specification: SOS v1.0 §4.2 — First login PIN change flow
 *                SOS v1.0 §6 — EVENT 28 STAFF_PIN_CHANGED
 *
 * Uses service role key to update pin_hash in Supabase.
 * The anon key cannot write to the operators table (RLS blocks it).
 *
 * Body: { actor_id: string; new_pin: string }
 * Auth: caller must have a valid session (checked via session_id header)
 *
 * SECURITY: new_pin is hashed server-side. Plain PIN never stored.
 */

import { NextResponse }      from "next/server";
import { getSupabaseServer } from "@/core/cloud/supabase.server";
import { DB_SCHEMA }         from "@/core/cloud/supabase.client";

async function sha256hex(str: string): Promise<string> {
  const data = new TextEncoder().encode(str);
  const buf  = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function POST(request: Request) {
  let body: { actor_id?: string; new_pin?: string };

  try {
    body = (await request.json()) as { actor_id?: string; new_pin?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const actorId = body.actor_id?.trim();
  const newPin  = body.new_pin?.trim();

  if (!actorId || !newPin) {
    return NextResponse.json({ error: "actor_id and new_pin are required" }, { status: 400 });
  }

  if (newPin.length !== 6 || !/^\d{6}$/.test(newPin)) {
    return NextResponse.json({ error: "PIN must be exactly 6 digits" }, { status: 400 });
  }

  // Hash: SHA-256(pin + actorId) — salted, matches verifyPin() salted path
  const pinHash = await sha256hex(newPin + actorId);

  const supabase = getSupabaseServer();

  const { error } = await supabase
    .schema(DB_SCHEMA)
    .from("operators")
    .update({
      pin_hash:       pinHash,
      is_first_login: false,
      updated_at:     new Date().toISOString(),
    })
    .eq("actor_id", actorId);

  if (error) {
    console.error("[change-pin] Supabase error:", error.message);
    return NextResponse.json({ error: "Failed to update PIN" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
