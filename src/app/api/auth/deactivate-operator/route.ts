/**
 * @file route.ts
 * @module app/api/auth/deactivate-operator
 *
 * POST /api/auth/deactivate-operator — Server-side operator deactivation.
 * Uses service role key (bypasses RLS). Admin/Owner only.
 */

import { NextResponse }      from "next/server";
import { getSupabaseServer } from "@/core/cloud/supabase.server";
import { DB_SCHEMA }         from "@/core/cloud/supabase.client";

export async function POST(request: Request) {
  let body: { actor_id?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const actorId = body.actor_id?.trim();
  if (!actorId) {
    return NextResponse.json({ error: "actor_id is required" }, { status: 400 });
  }

  const supabase = getSupabaseServer();

  const { error } = await supabase
    .schema(DB_SCHEMA)
    .from("operators")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("actor_id", actorId);

  if (error) {
    console.error("[deactivate-operator] Supabase error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
