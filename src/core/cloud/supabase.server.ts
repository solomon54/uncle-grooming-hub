/**
 * @file supabase.server.ts
 * @module core/cloud
 *
 * Supabase server client — API routes only (service role key).
 *
 * NEVER import this in browser/client components.
 * Service role key bypasses Row Level Security — server-side only.
 *
 * Environment variables required in .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   SUPABASE_SCHEMA (default: uncle_grooming)
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { DB_SCHEMA } from "./supabase.client";

export function getSupabaseServer(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("[Supabase] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  // Do NOT cache — Next.js dev hot-reload can cause stale singleton issues.
  // createClient is cheap; a new instance per request is safe.
  return createClient(url, key, {
    db:   { schema: DB_SCHEMA },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
