/**
 * @file route.ts
 * @module app/api/auth/delete-operator
 *
 * POST /api/auth/delete-operator — Permanent operator deletion.
 * SYSTEM_OWNER only. Irreversible. Requires name confirmation.
 *
 * Body: { actor_id: string; confirm_name: string }
 * The confirm_name must exactly match the operator's name (case-insensitive).
 */

import { NextResponse }      from "next/server";
import { getSupabaseServer } from "@/core/cloud/supabase.server";
import { DB_SCHEMA }         from "@/core/cloud/supabase.client";

export async function POST(request: Request) {
  let body: { actor_id?: string; confirm_name?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const actorId     = body.actor_id?.trim();
  const confirmName = body.confirm_name?.trim();

  if (!actorId || !confirmName) {
    return NextResponse.json({ error: "actor_id and confirm_name are required" }, { status: 400 });
  }

  const supabase = getSupabaseServer();

  // Fetch the operator first to verify the name confirmation
  const { data: op, error: fetchErr } = await supabase
    .schema(DB_SCHEMA)
    .from("operators")
    .select("actor_id, name, role")
    .eq("actor_id", actorId)
    .single();

  if (fetchErr || !op) {
    return NextResponse.json({ error: "Operator not found" }, { status: 404 });
  }

  // SYSTEM_OWNER accounts cannot be deleted
  if (op.role === "SYSTEM_OWNER") {
    return NextResponse.json({ error: "System Owner accounts cannot be deleted" }, { status: 403 });
  }

  // Name confirmation must match (case-insensitive)
  if (op.name.toLowerCase() !== confirmName.toLowerCase()) {
    return NextResponse.json({ error: "Name confirmation does not match" }, { status: 400 });
  }

  // Permanent delete
  const { error: deleteErr } = await supabase
    .schema(DB_SCHEMA)
    .from("operators")
    .delete()
    .eq("actor_id", actorId);

  if (deleteErr) {
    console.error("[delete-operator] Supabase error:", deleteErr.message);
    return NextResponse.json({ error: deleteErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
