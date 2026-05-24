/**
 * POST /api/sync/push — Cloud sync ingest (Phase 4 stub, Phase 8 Supabase).
 *
 * Specification: MODULE_PRIORITY.md P8.2
 * TAS §5 — idempotent ACK by event_id
 */

import { NextResponse }     from "next/server";
import { dedupeEventIds }   from "@/core/sync/idempotency.guard";

interface PushBody {
  terminal_id?: string;
  events?:      Array<{ event_id?: string }>;
}

export async function POST(request: Request) {
  let body: PushBody;

  try {
    body = (await request.json()) as PushBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const events = body.events ?? [];

  if (events.length === 0) {
    return NextResponse.json({ error: "Empty batch" }, { status: 400 });
  }

  if (events.length > 100) {
    return NextResponse.json({ error: "Batch exceeds 100 events" }, { status: 400 });
  }

  const eventIds = events
    .map(e => e.event_id)
    .filter((id): id is string => typeof id === "string" && id.length > 0);

  const ack_event_ids = dedupeEventIds(eventIds);

  // Phase 8: validate signatures, insert into Supabase, trigger Pusher.
  return NextResponse.json({
    batch_id:       crypto.randomUUID(),
    ack_event_ids,
    terminal_id:    body.terminal_id ?? "unknown",
    received_count: events.length,
  });
}
