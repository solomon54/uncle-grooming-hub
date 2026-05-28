/**
 * @file route.ts
 * @module app/api/auth/create-operator
 *
 * POST /api/auth/create-operator — Server-side operator creation.
 * Requires Admin or System Owner session (enforced by journal.service.ts on EVENT 27).
 * Uses service role key to insert into Supabase (bypasses RLS).
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
  let body: {
    actor_id?:    string;
    email?:       string;
    name?:        string;
    role?:        string;
    initial_pin?: string;
    barber_id?:   string | null;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { actor_id, email, name, role, initial_pin, barber_id } = body;

  if (!actor_id || !email || !name || !role || !initial_pin) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!/^\d{6}$/.test(initial_pin)) {
    return NextResponse.json({ error: "PIN must be exactly 6 digits" }, { status: 400 });
  }

  const validRoles = ["SYSTEM_OWNER", "ADMIN", "CASHIER", "BARBER"];
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  // Hash: SHA-256(pin + actorId) — salted
  const pinHash = await sha256hex(initial_pin + actor_id);

  const supabase = getSupabaseServer();

  const { error } = await supabase
    .schema(DB_SCHEMA)
    .from("operators")
    .insert({
      actor_id,
      email,
      name,
      role,
      pin_hash:       pinHash,
      barber_id:      barber_id ?? null,
      is_active:      true,
      is_first_login: true,
    });

  if (error) {
    console.error("[create-operator] Supabase error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
