/**
 * GET /api/sync/pull — Cloud events for local ingest (Phase 4 stub).
 * Phase 8: query Supabase for events after cursor where terminal_id != local.
 */

import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const afterHlc   = searchParams.get("after_hlc")   ?? "0";
  const terminalId = searchParams.get("terminal_id") ?? "";

  // Phase 8: return PAYMENT_SETTLED, APPOINTMENT_RESERVED, etc.
  return NextResponse.json({
    events:          [] as unknown[],
    after_hlc:       afterHlc,
    terminal_id:     terminalId,
    server_time_hlc: `${Date.now()}:0000:cloud`,
  });
}
