/**
 * @file route.ts
 * @module app/api/auth/reset-pin
 *
 * POST /api/auth/reset-pin — Admin resets another operator's PIN.
 * Sets is_first_login = true so the operator must change PIN on next login.
 * Uses service role key (bypasses RLS). Admin/Owner only.
 *
 * Body: { actor_id: string; new_pin: string }
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
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const actorId = body.actor_id?.trim();
  const newPin  = body.new_pin?.trim();

  if (!actorId || !newPin) {
    return NextResponse.json({ error: "actor_id and new_pin are required" }, { status: 400 });
  }

  if (!/^\d{6}$/.test(newPin)) {
    return NextResponse.json({ error: "PIN must be exactly 6 digits" }, { status: 400 });
  }

  // Hash: SHA-256(pin + actorId) — salted
  const pinHash = await sha256hex(newPin + actorId);

  const supabase = getSupabaseServer();

  const { error } = await supabase
    .schema(DB_SCHEMA)
    .from("operators")
    .update({
      pin_hash:       pinHash,
      is_first_login: true, // force PIN change on next login
      updated_at:     new Date().toISOString(),
    })
    .eq("actor_id", actorId);

  if (error) {
    console.error("[reset-pin] Supabase error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
