/**
 * GET /api/reserve/list — List reservation requests for cashier view.
 *
 * Returns ALL PENDING requests (any date) + handled requests from last 7 days.
 * Does NOT select the `services` column — parses services from the `notes` field
 * where they are encoded as SERVICES:[...json...] by the reserve API.
 * Once migration 005 adds the services column, this can be updated.
 */

import { NextResponse }      from "next/server";
import { getSupabaseServer } from "@/core/cloud/supabase.server";
import { DB_SCHEMA }         from "@/core/cloud/supabase.client";

interface ServiceItem { id: string; name: string; price_etb: number }

/** Parse services JSON encoded in the notes field */
function parseServicesFromNotes(notes: string | null): ServiceItem[] {
  if (!notes) return [];
  const match = notes.match(/^SERVICES:(\[.*?\])/m);
  if (!match) return [];
  try { return JSON.parse(match[1]) as ServiceItem[]; } catch { return []; }
}

/** Extract the human-readable customer note (strips encoded metadata) */
function parseCustomerNote(notes: string | null): string | null {
  if (!notes) return null;
  if (!notes.startsWith("SERVICES:")) return notes; // plain note, no encoding
  const noteMatch = notes.match(/^NOTE:(.+)$/m);
  return noteMatch ? noteMatch[1].trim() : null;
}

export async function GET() {
  const supabase     = getSupabaseServer();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  // Select only columns that definitely exist — no `services` column yet
  const { data, error } = await supabase
    .schema(DB_SCHEMA)
    .from("reservation_requests")
    .select("id, customer_name, phone, preferred_barber_id, requested_date, requested_time, notes, status, created_at")
    .or(`status.eq.PENDING,requested_date.gte.${sevenDaysAgo}`)
    .order("requested_date", { ascending: true })
    .order("requested_time", { ascending: true })
    .limit(200);

  if (error) {
    console.error("[reserve/list] Supabase error:", error.message);
    return NextResponse.json({ requests: [] });
  }

  const requests = (data ?? []).map(row => ({
    ...row,
    services:     parseServicesFromNotes(row.notes as string | null),
    notes:        parseCustomerNote(row.notes as string | null),
    requested_time: (row.requested_time as string).slice(0, 5), // "HH:MM:SS" → "HH:MM"
  }));

  return NextResponse.json({ requests });
}
