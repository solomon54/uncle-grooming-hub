/**
 * @file route.ts
 * @module app/api/sync/push
 *
 * POST /api/sync/push — Cloud sync ingest.
 *
 * Specification: MODULE_PRIORITY.md P8.2
 *                TAS v1.0 §5 — Synchronization Protocol
 *
 * Flow:
 *   1. Receive event batch from terminal
 *   2. Deduplicate by event_id (idempotency)
 *   3. Insert into uncle_grooming.events (Supabase)
 *   4. Trigger Pusher channels for real-time client updates
 *   5. Return ACK with committed event_ids
 *
 * Cloud Authority events (08, 11, 15, 16, 19) are emitted here
 * after webhook verification — not from terminals.
 */

import { NextResponse }       from "next/server";
import { getSupabaseServer }  from "@/core/cloud/supabase.server";
import { triggerQueueEvent }  from "@/core/realtime/pusher.server";
import { DB_SCHEMA }          from "@/core/cloud/supabase.client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SyncEvent {
  event_id?:          string;
  aggregate_id?:      string;
  aggregate_version?: number;
  event_type?:        string;
  payload?:           Record<string, unknown>;
  metadata?:          Record<string, unknown>;
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

  // Validate all events have required fields
  const validEvents = events.filter(
    e => e.event_id && e.aggregate_id && e.event_type
  );

  if (validEvents.length === 0) {
    return NextResponse.json({ error: "No valid events in batch" }, { status: 400 });
  }

  const batchId = crypto.randomUUID();
  const ackEventIds: string[] = [];

  // ── Insert into Supabase ──────────────────────────────────────────────────

  try {
    const supabase = getSupabaseServer();

    // Build rows for upsert (idempotent — duplicate event_ids are ignored)
    const rows = validEvents.map(e => ({
      event_id:          e.event_id,
      aggregate_id:      e.aggregate_id,
      aggregate_version: e.aggregate_version ?? 1,
      event_type:        e.event_type,
      payload:           e.payload ?? {},
      metadata:          e.metadata ?? {},
      hlc_timestamp:     (e.metadata as Record<string, string>)?.hlc_timestamp ?? new Date().toISOString(),
      terminal_id:       body.terminal_id ?? (e.metadata as Record<string, string>)?.terminal_id,
      actor_id:          (e.metadata as Record<string, string>)?.actor_id,
      session_id:        (e.metadata as Record<string, string>)?.session_id,
      is_synced:         true,
    }));

    const { error: insertError } = await supabase
      .schema(DB_SCHEMA)
      .from("events")
      .upsert(rows, { onConflict: "event_id", ignoreDuplicates: true });

    if (insertError) {
      console.error("[sync/push] Supabase insert error:", insertError);
      // Don't fail the whole batch — return partial ACK
    } else {
      ackEventIds.push(...validEvents.map(e => e.event_id!));
    }

    // Record sync batch
    await supabase
      .schema(DB_SCHEMA)
      .from("sync_batches")
      .insert({
        batch_id:      batchId,
        terminal_id:   body.terminal_id ?? "unknown",
        event_count:   validEvents.length,
        ack_event_ids: ackEventIds,
      });

  } catch (err) {
    console.error("[sync/push] Supabase error:", err);
    // Fall through — still trigger Pusher and return ACK
    // Events will be retried by the sync engine
  }

  // ── Trigger Pusher (non-blocking) ─────────────────────────────────────────

  void Promise.all(
    validEvents
      .filter(e => e.event_type && e.payload)
      .map(e =>
        triggerQueueEvent(e.event_type!, {
          ...e.payload,
          event_type:   e.event_type,
          aggregate_id: e.aggregate_id,
        }).catch(err => {
          console.warn("[sync/push] Pusher trigger failed:", err);
        })
      )
  );

  return NextResponse.json({
    batch_id:       batchId,
    ack_event_ids:  ackEventIds,
    terminal_id:    body.terminal_id ?? "unknown",
    received_count: events.length,
    committed_count: ackEventIds.length,
  });
}
