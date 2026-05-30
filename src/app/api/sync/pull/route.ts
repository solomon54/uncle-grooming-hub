/**
 * GET /api/sync/pull — Pull events from cloud for local ingest.
 *
 * Returns events committed by OTHER terminals after the given HLC cursor.
 * This is how cross-terminal real-time works:
 *   Terminal A emits → sync push → Supabase + Pusher
 *   Pusher fires → Terminal B calls sync pull → gets Terminal A's events
 *   Terminal B ingests events → projection updates → UI re-renders
 *
 * Query params:
 *   after_hlc:   HLC cursor — only return events after this timestamp
 *   terminal_id: caller's terminal ID — exclude their own events
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer }         from "@/core/cloud/supabase.server";
import { DB_SCHEMA }                 from "@/core/cloud/supabase.client";

export async function GET(request: NextRequest) {
  const afterHlc   = request.nextUrl.searchParams.get("after_hlc")   ?? "0";
  const terminalId = request.nextUrl.searchParams.get("terminal_id") ?? "";

  const supabase = getSupabaseServer();

  // Fetch events from other terminals after the cursor
  // Limit to 200 per pull to avoid large payloads
  const { data, error } = await supabase
    .schema(DB_SCHEMA)
    .from("events")
    .select("event_id, aggregate_id, aggregate_version, event_type, payload, metadata, hlc_timestamp, terminal_id")
    .gt("hlc_timestamp", afterHlc)
    .neq("terminal_id", terminalId)   // exclude own events — already in local journal
    .order("hlc_timestamp", { ascending: true })
    .limit(200);

  if (error) {
    // Table may not exist or query failed — return empty gracefully
    console.warn("[sync/pull] Supabase error:", error.message);
    return NextResponse.json({
      events:          [],
      after_hlc:       afterHlc,
      terminal_id:     terminalId,
      server_time_hlc: `${Date.now()}:0000:cloud`,
    });
  }

  // Shape into AllEvents format for local ingest
  const events = (data ?? []).map(row => ({
    event_id:          row.event_id,
    aggregate_id:      row.aggregate_id,
    aggregate_version: row.aggregate_version,
    event_type:        row.event_type,
    payload:           row.payload ?? {},
    metadata: {
      ...(row.metadata ?? {}),
      hlc_timestamp: row.hlc_timestamp,
      terminal_id:   row.terminal_id ?? "cloud",
    },
  }));

  return NextResponse.json({
    events,
    after_hlc:       afterHlc,
    terminal_id:     terminalId,
    server_time_hlc: `${Date.now()}:0000:cloud`,
    count:           events.length,
  });
}
