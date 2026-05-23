/**
 * @file queue-board.view.ts
 * @module projections
 *
 * QueueBoardView — materialized view for the queue board.
 *
 * Specification: MODULE_PRIORITY.md P2.2
 *                CXS v1.1 §3.3 — Queue Token system
 *                PRD §13.1 — Anonymized identification (initials only)
 *                TAS §13 — Customer Preference Sovereignty
 *
 * This is a TYPE-ONLY file. No logic, no imports from core/.
 * Consumed by: useQueueBoard hook, CashierScreen, StatusBoardScreen.
 */

// ─── Queue Entry View ─────────────────────────────────────────────────────────

export interface QueueEntryView {
  /** Aggregate ID of the QueueEntry */
  queue_entry_id: string;

  /** Short human-readable token — e.g. "A-07" (CXS v1.1 §3.3) */
  queue_token: string;

  /** Customer UUID */
  customer_uuid: string;

  /** Initials only — privacy rule PRD §13.1. Never full name on public board. */
  customer_display: string;

  /** Preferred barber lane ID — null means "Any Available" */
  preferred_barber_id: string | null;

  /** Preferred barber display name — null means "Any Available" */
  preferred_barber_name: string | null;

  /** Current lifecycle state */
  status: "RESERVED" | "WAITING" | "CALLED" | "IN_SERVICE" | "EXPIRED" | "CANCELLED";

  /** HLC timestamp of check-in (EVENT 01) — used for FIFO ordering */
  checkin_hlc: string;

  /** 1-indexed position in the queue for this barber lane */
  position: number;

  /**
   * Estimated wait in minutes — computed by projection from mean service durations.
   * NEVER stored in the journal. PRS §5.5.
   */
  estimated_wait_minutes: number;

  /** Service IDs from EVENT 21/22 — logistical intents before EVENT 04 */
  intents: string[];

  /**
   * True after EVENT 04 (SERVICE_ENGAGED) — intents are locked into Transaction.
   * EVENT 21/22 rejected by journal.service.ts after this point.
   */
  is_intent_locked: boolean;

  /** HLC of reservation expiry — only for RESERVED entries */
  reservation_expiry_hlc?: string;
}

// ─── Queue Board View ─────────────────────────────────────────────────────────

export interface QueueBoardView {
  /** WAITING entries — HLC-ordered, preference preserved */
  entries: QueueEntryView[];

  /** RESERVED entries — remote reservations not yet checked in */
  reservations: QueueEntryView[];

  /** CALLED entries — called to chair, awaiting service start */
  called: QueueEntryView[];

  /** IN_SERVICE entries — service in progress */
  in_service: QueueEntryView[];

  /** Total count of WAITING + RESERVED */
  total_waiting: number;

  /** HLC of last projection update */
  last_updated_hlc: string;
}

// ─── Initial State ────────────────────────────────────────────────────────────

export const initialQueueBoardView = (): QueueBoardView => ({
  entries:       [],
  reservations:  [],
  called:        [],
  in_service:    [],
  total_waiting: 0,
  last_updated_hlc: "0",
});
