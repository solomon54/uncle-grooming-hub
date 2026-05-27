/**
 * @file route.ts
 * @module app/api/sync/push
 *
 * POST /api/sync/push — Cloud sync ingest + Pusher real-time trigger.
 *
 * Specification: MODULE_PRIORITY.md P8.2, P4.4
 *                TAS §5 — idempotent ACK by event_id
 *
 * Phase 1: ACKs all events, triggers Pusher for real-time client updates.
 * Phase 8: Will validate signatures and insert into Supabase before ACK.
 */

import { NextResponse }          from "next/server";
import { dedupeEventIds }        from "@/core/sync/idempotency.guard";
import { triggerQueueEvent }     from "@/core/realtime/pusher.server";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SyncEvent {
  event_id?:    string;
  event_type?:  string;
  aggregate_id?: string;
  payload?:     Record<string, unknown>;
}

interface PushBody {
  terminal_id?: string;
  events?:      SyncEvent[];
}

// ─── Handler ──────────────────────────────────────────────────────────────────

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

  // ── Trigger Pusher for each event (best-effort, non-blocking) ────────────
  // This is what makes the customer tracking page update in real-time.
  const pusherPromises = events
    .filter(e => e.event_type && e.payload)
    .map(e =>
      triggerQueueEvent(e.event_type!, {
        ...e.payload,
        event_type:   e.event_type,
        aggregate_id: e.aggregate_id,
      }).catch(err => {
        // Non-fatal — sync still succeeds even if Pusher fails
        console.warn("[sync/push] Pusher trigger failed:", err);
      })
    );

  // Fire Pusher triggers in parallel, don't await (non-blocking)
  void Promise.all(pusherPromises);

  // Phase 8: validate signatures, insert into Supabase here.
  return NextResponse.json({
    batch_id:       crypto.randomUUID(),
    ack_event_ids,
    terminal_id:    body.terminal_id ?? "unknown",
    received_count: events.length,
  });
}
