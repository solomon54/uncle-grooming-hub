/**
 * @file queue-board.projection.ts
 * @module core/projection
 *
 * QueueBoard Projection — materializes the operational waiting queue.
 *
 * Specification: MODULE_PRIORITY.md P2.2
 *                PRS v1.1 §4.1 — QueueBoardView
 *                ECS v1.3 — Events 01, 03, 12, 19, 20, 21, 22, 25
 *                TAS §13 — Customer Preference Sovereignty (never auto-reorder)
 *                CXS v1.1 §3.3 — Queue Token system
 *                AGENT.md §5 — Projection Rules (pure functions)
 *
 * PURE FUNCTION — no side effects, no async, no DB writes.
 * Registered in projection engine as "QUEUE_BOARD_VIEW".
 *
 * INVARIANT: Queue ordering preserves arrival HLC. Never reordered automatically.
 * INVARIANT: preferred_barber_id only changes via EVENT 12 (QUEUE_TRANSFER_CONSENTED).
 */

import type { Projection }    from "./projection.engine";
import type { AllEvents }     from "@/domain/events/event.definitions";
import type {
  QueueBoardView,
  QueueEntryView,
} from "@/projections/queue-board.view";
import { initialQueueBoardView } from "@/projections/queue-board.view";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Deterministic upsert — prevents duplicates on replay */
function upsert(list: QueueEntryView[], entry: QueueEntryView): QueueEntryView[] {
  const filtered = list.filter(e => e.queue_entry_id !== entry.queue_entry_id);
  return [...filtered, entry];
}

/** Build customer display initials from name — privacy rule PRD §13.1 */
function toInitials(name?: string): string {
  if (!name) return "—";
  return name
    .trim()
    .split(/\s+/)
    .map(p => p[0]?.toUpperCase() ?? "")
    .join(".")
    .slice(0, 4);
}

/** Recompute positions within a list (1-indexed, HLC-ordered) */
function reposition(list: QueueEntryView[]): QueueEntryView[] {
  return [...list]
    .sort((a, b) => a.checkin_hlc.localeCompare(b.checkin_hlc))
    .map((e, i) => ({ ...e, position: i + 1 }));
}

/** Rebuild total_waiting count */
function countWaiting(state: QueueBoardView): number {
  return state.entries.length + state.reservations.length;
}

// ─── Projection ───────────────────────────────────────────────────────────────

export const queueBoardProjection: Projection<QueueBoardView> = {
  name:         "QUEUE_BOARD_VIEW",
  initialState: initialQueueBoardView(),

  handlers: {

    // EVENT 01 — CUSTOMER_CHECKED_IN
    CUSTOMER_CHECKED_IN: (state, event): QueueBoardView => {
      const p = event.payload as {
        customer_uuid:       string;
        customer_name?:      string;
        preferred_barber_id: string;
        checkin_method:      string;
        reservation_id?:     string;
        queue_token?:        string;
        estimated_wait_minutes?: number;
      };

      const entry: QueueEntryView = {
        queue_entry_id:        event.aggregate_id,
        queue_token:           p.queue_token ?? "",
        customer_uuid:         p.customer_uuid,
        customer_display:      toInitials(p.customer_name),
        preferred_barber_id:   p.preferred_barber_id || null,
        preferred_barber_name: null, // resolved by hook layer from BarberLaneState
        status:                "WAITING",
        checkin_hlc:           event.metadata.hlc_timestamp,
        position:              0, // recalculated below
        estimated_wait_minutes: p.estimated_wait_minutes ?? 15,
        intents:               [],
        is_intent_locked:      false,
      };

      // If this was a reservation arrival, remove from reservations
      const reservations = p.reservation_id
        ? state.reservations.filter(r => r.queue_entry_id !== event.aggregate_id)
        : state.reservations;

      const newEntries = reposition(upsert(state.entries, entry));

      return {
        ...state,
        entries:          newEntries,
        reservations,
        total_waiting:    newEntries.length + reservations.length,
        last_updated_hlc: event.metadata.hlc_timestamp,
      };
    },

    // EVENT 19 — APPOINTMENT_RESERVED (arrives via sync from Cloud)
    APPOINTMENT_RESERVED: (state, event): QueueBoardView => {
      const p = event.payload as {
        customer_uuid:        string;
        preferred_barber_id:  string;
        requested_start_hlc:  string;
        queue_token?:         string;
      };

      const entry: QueueEntryView = {
        queue_entry_id:        event.aggregate_id,
        queue_token:           p.queue_token ?? "",
        customer_uuid:         p.customer_uuid,
        customer_display:      "—",
        preferred_barber_id:   p.preferred_barber_id || null,
        preferred_barber_name: null,
        status:                "RESERVED",
        checkin_hlc:           event.metadata.hlc_timestamp,
        position:              0,
        estimated_wait_minutes: 0,
        intents:               [],
        is_intent_locked:      false,
        reservation_expiry_hlc: p.requested_start_hlc,
      };

      const newReservations = upsert(state.reservations, entry);

      return {
        ...state,
        reservations:     newReservations,
        total_waiting:    state.entries.length + newReservations.length,
        last_updated_hlc: event.metadata.hlc_timestamp,
      };
    },

    // EVENT 03 — CUSTOMER_CALLED_TO_CHAIR
    CUSTOMER_CALLED_TO_CHAIR: (state, event): QueueBoardView => {
      const aggId = event.aggregate_id;
      const target =
        state.entries.find(e => e.queue_entry_id === aggId) ??
        state.reservations.find(e => e.queue_entry_id === aggId);

      if (!target) return state;

      const called = upsert(state.called, { ...target, status: "CALLED" });
      const entries = reposition(state.entries.filter(e => e.queue_entry_id !== aggId));
      const reservations = state.reservations.filter(e => e.queue_entry_id !== aggId);

      return {
        ...state,
        entries,
        reservations,
        called,
        total_waiting:    entries.length + reservations.length,
        last_updated_hlc: event.metadata.hlc_timestamp,
      };
    },

    // EVENT 04 — SERVICE_ENGAGED
    SERVICE_ENGAGED: (state, event): QueueBoardView => {
      const aggId = event.aggregate_id;
      const target = state.called.find(e => e.queue_entry_id === aggId);
      if (!target) return state;

      return {
        ...state,
        called:           state.called.filter(e => e.queue_entry_id !== aggId),
        in_service:       upsert(state.in_service, {
          ...target,
          status:          "IN_SERVICE",
          is_intent_locked: true, // INTENT_LOCK — ECS §2.6
        }),
        last_updated_hlc: event.metadata.hlc_timestamp,
      };
    },

    // EVENT 05 — SERVICE_COMPLETED
    SERVICE_COMPLETED: (state, event): QueueBoardView => ({
      ...state,
      in_service:       state.in_service.filter(e => e.queue_entry_id !== event.aggregate_id),
      last_updated_hlc: event.metadata.hlc_timestamp,
    }),

    // EVENT 12 — QUEUE_TRANSFER_CONSENTED
    // The ONLY way preferred_barber_id changes — TAS §13.3
    QUEUE_TRANSFER_CONSENTED: (state, event): QueueBoardView => {
      const p = event.payload as {
        receiving_barber_id: string;
      };

      const update = (list: QueueEntryView[]) =>
        list.map(e =>
          e.queue_entry_id === event.aggregate_id
            ? { ...e, preferred_barber_id: p.receiving_barber_id, preferred_barber_name: null }
            : e
        );

      return {
        ...state,
        entries:          update(state.entries),
        called:           update(state.called),
        last_updated_hlc: event.metadata.hlc_timestamp,
      };
    },

    // EVENT 20 — RESERVATION_CANCELLED
    RESERVATION_CANCELLED: (state, event): QueueBoardView => {
      const aggId = event.aggregate_id;
      const entries      = reposition(state.entries.filter(e => e.queue_entry_id !== aggId));
      const reservations = state.reservations.filter(e => e.queue_entry_id !== aggId);
      const called       = state.called.filter(e => e.queue_entry_id !== aggId);

      return {
        ...state,
        entries,
        reservations,
        called,
        total_waiting:    entries.length + reservations.length,
        last_updated_hlc: event.metadata.hlc_timestamp,
      };
    },

    // EVENT 21 — SERVICE_INTENT_ADDED
    // Only valid before EVENT 04 — journal.service.ts enforces INTENT_LOCK
    SERVICE_INTENT_ADDED: (state, event): QueueBoardView => {
      const p = event.payload as { service_id: string };

      const addIntent = (list: QueueEntryView[]) =>
        list.map(e =>
          e.queue_entry_id === event.aggregate_id && !e.is_intent_locked
            ? { ...e, intents: [...new Set([...e.intents, p.service_id])] }
            : e
        );

      return {
        ...state,
        entries:          addIntent(state.entries),
        reservations:     addIntent(state.reservations),
        called:           addIntent(state.called),
        last_updated_hlc: event.metadata.hlc_timestamp,
      };
    },

    // EVENT 22 — SERVICE_INTENT_REMOVED
    SERVICE_INTENT_REMOVED: (state, event): QueueBoardView => {
      const p = event.payload as { service_id: string };

      const removeIntent = (list: QueueEntryView[]) =>
        list.map(e =>
          e.queue_entry_id === event.aggregate_id && !e.is_intent_locked
            ? { ...e, intents: e.intents.filter(id => id !== p.service_id) }
            : e
        );

      return {
        ...state,
        entries:          removeIntent(state.entries),
        reservations:     removeIntent(state.reservations),
        called:           removeIntent(state.called),
        last_updated_hlc: event.metadata.hlc_timestamp,
      };
    },

    // EVENT 25 — RESERVATION_EXPIRED (deterministic system event)
    RESERVATION_EXPIRED: (state, event): QueueBoardView => {
      const reservations = state.reservations.filter(
        e => e.queue_entry_id !== event.aggregate_id
      );
      return {
        ...state,
        reservations,
        total_waiting:    state.entries.length + reservations.length,
        last_updated_hlc: event.metadata.hlc_timestamp,
      };
    },
  },
};
