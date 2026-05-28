/**
 * @file route.ts
 * @module app/api/auth/list-operators
 *
 * GET /api/auth/list-operators — Server-side operator roster fetch.
 * Returns all operators (active + inactive) for admin management.
 * Uses service role key (bypasses RLS). Admin/Owner only.
 * NEVER returns pin_hash.
 */

import { NextResponse }      from "next/server";
import { getSupabaseServer } from "@/core/cloud/supabase.server";
import { DB_SCHEMA }         from "@/core/cloud/supabase.client";

export async function GET() {
  const supabase = getSupabaseServer();

  const { data, error } = await supabase
    .schema(DB_SCHEMA)
    .from("operators")
    .select("actor_id, email, name, role, barber_id, is_active, is_first_login, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[list-operators] Supabase error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ operators: data ?? [] });
}
