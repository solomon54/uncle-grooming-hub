/**
 * @file barber-lane.view.ts
 * @module projections
 *
 * BarberLaneView — materialized view for barber availability and lane state.
 *
 * Specification: MODULE_PRIORITY.md P2.3
 *                ECS v1.3 §1 — BarberLane aggregate
 *                PRD §3.2 — Barber Availability Rules (4 states)
 */

import type { QueueEntryView } from "./queue-board.view";

// ─── Schedule Rule ────────────────────────────────────────────────────────────

export interface ScheduleRule {
  /** 0 = Sunday, 6 = Saturday */
  day_of_week: number;
  /** "HH:mm" format */
  start_time:  string;
  /** "HH:mm" format */
  end_time:    string;
  is_active:   boolean;
}

// ─── Barber Lane View ─────────────────────────────────────────────────────────

export interface BarberLaneView {
  barber_id:   string;
  barber_name: string;

  /**
   * PRD §3.2 — 4 distinct states.
   * AVAILABLE: ready for next customer.
   * CALLED: customer called, awaiting service start.
   * IN_SERVICE: service in progress.
   * ON_BREAK: barber on break.
   * OFFLINE: barber not present.
   */
  status: "AVAILABLE" | "CALLED" | "IN_SERVICE" | "ON_BREAK" | "OFFLINE";

  /** Current customer — present when CALLED or IN_SERVICE */
  current_customer?: QueueEntryView;

  /** Recurring schedule rules from EVENT 23 */
  schedule_rules: ScheduleRule[];

  /**
   * Estimated completion HLC — computed from mean service duration.
   * NEVER stored in journal. PRS §5.5.
   */
  estimated_completion_hlc?: string;
}

// ─── Barber Lane State ────────────────────────────────────────────────────────

export interface BarberLaneState {
  lanes:            BarberLaneView[];
  last_updated_hlc: string;
}

// ─── Initial State ────────────────────────────────────────────────────────────

export const initialBarberLaneState = (): BarberLaneState => ({
  lanes:            [],
  last_updated_hlc: "0",
});
