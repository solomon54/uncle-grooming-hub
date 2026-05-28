/**
 * GET /api/sync/pull — Cloud events for local ingest.
 *
 * Returns cloud-authority events (PAYMENT_SETTLED, APPOINTMENT_RESERVED, etc.)
 * that occurred after the given HLC cursor on other terminals.
 *
 * Phase 8: query Supabase for events after cursor where terminal_id != local.
 * Currently returns empty — no cloud-authority events are emitted yet.
 */

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  // Use NextRequest.nextUrl which is always a fully-resolved URL object
  const afterHlc   = request.nextUrl.searchParams.get("after_hlc")   ?? "0";
  const terminalId = request.nextUrl.searchParams.get("terminal_id") ?? "";

  return NextResponse.json({
    events:          [] as unknown[],
    after_hlc:       afterHlc,
    terminal_id:     terminalId,
    server_time_hlc: `${Date.now()}:0000:cloud`,
  });
}
