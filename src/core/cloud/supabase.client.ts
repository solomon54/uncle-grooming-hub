/**
 * @file supabase.client.ts
 * @module core/cloud
 *
 * Supabase client — browser-side (anon key).
 *
 * Specification: MODULE_PRIORITY.md P8.1
 *                TAS v1.0 §6 — Financial Ledger Reconciliation
 *
 * Uses the `uncle_grooming` schema (shared Supabase project).
 * All queries are scoped to this schema via db_schema option.
 *
 * Environment variables required in .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   SUPABASE_SCHEMA (default: uncle_grooming)
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ─── Schema ───────────────────────────────────────────────────────────────────

export const DB_SCHEMA = process.env.SUPABASE_SCHEMA ?? "uncle_grooming";

// ─── Browser client (anon key — safe to expose) ───────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _browserClient: SupabaseClient<any, any, any> | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getSupabaseClient(): SupabaseClient<any, any, any> | null {
  if (typeof window === "undefined") return null;
  if (_browserClient) return _browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.warn("[Supabase] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _browserClient = createClient(url, key, {
    db:   { schema: DB_SCHEMA },
    auth: { persistSession: false },
  }) as SupabaseClient<any, any, any>;

  return _browserClient;
}
