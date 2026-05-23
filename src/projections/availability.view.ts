/**
 * @file availability.view.ts
 * @module projections
 *
 * AvailabilityView — reservation slot projection.
 *
 * Specification: MODULE_PRIORITY.md P2.5
 *                PRS v1.1 §4.3 — AvailabilityCalendar
 *                ECS v1.3 §5.5 — Duration & Wait-Time Projection Rules
 *
 * Owner: Cloud Authority (primary), Local Terminal (read-only cache).
 * Duration = arithmetic mean of (EVENT 05 HLC − EVENT 04 HLC) for last 50 transactions.
 * Duration values are COMPUTED here, NEVER stored in the journal.
 */

// ─── Time Slot ────────────────────────────────────────────────────────────────

export interface TimeSlot {
  barber_id:                   string;
  start_hlc:                   string;
  end_hlc:                     string;
  is_available:                boolean;
  /** Computed from mean of last 50 transactions — never stored in journal */
  estimated_duration_minutes:  number;
}

// ─── Availability View ────────────────────────────────────────────────────────

export interface AvailabilityView {
  slots:            TimeSlot[];
  last_updated_hlc: string;
}

// ─── Initial State ────────────────────────────────────────────────────────────

export const initialAvailabilityView = (): AvailabilityView => ({
  slots:            [],
  last_updated_hlc: "0",
});
