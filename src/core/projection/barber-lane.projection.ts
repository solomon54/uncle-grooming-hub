/**
 * @file barber-lane.projection.ts
 * @module core/projection
 *
 * BarberLane Projection — materializes barber availability state.
 *
 * Specification: MODULE_PRIORITY.md P2.3
 *                PRS v1.1 §4.2 — BarberLaneState
 *                ECS v1.3 — Events 02, 03, 04, 05, 23
 *                AGENT.md §5 — Projection Rules (pure functions, no side effects)
 *
 * PURE FUNCTION — no side effects, no async, no DB writes, no UI imports.
 * Registered in projection engine as "BARBER_LANE_STATE".
 */

import type { Projection }    from "./projection.engine";
import type { AllEvents }     from "@/domain/events/event.definitions";
import type { BarberLaneState, BarberLaneView, ScheduleRule } from "@/projections/barber-lane.view";
import { initialBarberLaneState }                             from "@/projections/barber-lane.view";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function upsertLane(lanes: BarberLaneView[], updated: BarberLaneView): BarberLaneView[] {
  const idx = lanes.findIndex(l => l.barber_id === updated.barber_id);
  if (idx === -1) return [...lanes, updated];
  const next = [...lanes];
  next[idx] = updated;
  return next;
}

function getLane(lanes: BarberLaneView[], barberId: string): BarberLaneView {
  return lanes.find(l => l.barber_id === barberId) ?? {
    barber_id:    barberId,
    barber_name:  barberId, // display name resolved later from roster
    status:       "OFFLINE",
    schedule_rules: [],
  };
}

// ─── Projection ───────────────────────────────────────────────────────────────

export const barberLaneProjection: Projection<BarberLaneState> = {
  name:         "BARBER_LANE_STATE",
  initialState: initialBarberLaneState(),

  handlers: {

    // EVENT 02 — BARBER_AVAILABLE
    // Payload may include a status field (AVAILABLE, ON_BREAK, OFFLINE)
    BARBER_AVAILABLE: (state, event): BarberLaneState => {
      const p = event.payload as { barber_id: string; status?: string };
      const lane = getLane(state.lanes, p.barber_id);
      const newStatus = (p.status as BarberLaneView["status"]) ?? "AVAILABLE";
      return {
        ...state,
        lanes: upsertLane(state.lanes, {
          ...lane,
          status:           newStatus,
          current_customer: newStatus === "AVAILABLE" ? undefined : lane.current_customer,
        }),
        last_updated_hlc: event.metadata.hlc_timestamp,
      };
    },

    // EVENT 03 — CUSTOMER_CALLED_TO_CHAIR
    CUSTOMER_CALLED_TO_CHAIR: (state, event): BarberLaneState => {
      const p = event.payload as { barber_id: string; queue_entry_id: string };
      const lane = getLane(state.lanes, p.barber_id);
      return {
        ...state,
        lanes: upsertLane(state.lanes, {
          ...lane,
          status: "CALLED",
          // current_customer populated by QueueBoard projection cross-reference
          // The hook layer joins these two views
        }),
        last_updated_hlc: event.metadata.hlc_timestamp,
      };
    },

    // EVENT 04 — SERVICE_ENGAGED
    SERVICE_ENGAGED: (state, event): BarberLaneState => {
      // Find the lane that has this queue_entry as current_customer
      // aggregate_id on SERVICE_ENGAGED is the queue_entry_id
      const updatedLanes = state.lanes.map(lane => {
        if (lane.current_customer?.queue_entry_id === event.aggregate_id) {
          return { ...lane, status: "IN_SERVICE" as const };
        }
        // Also match by barber_id if available in payload
        const p = event.payload as { barber_id?: string };
        if (p.barber_id && lane.barber_id === p.barber_id) {
          return { ...lane, status: "IN_SERVICE" as const };
        }
        return lane;
      });
      return {
        ...state,
        lanes:            updatedLanes,
        last_updated_hlc: event.metadata.hlc_timestamp,
      };
    },

    // EVENT 05 — SERVICE_COMPLETED
    SERVICE_COMPLETED: (state, event): BarberLaneState => {
      const updatedLanes = state.lanes.map(lane => {
        if (lane.status === "IN_SERVICE" &&
            lane.current_customer?.queue_entry_id === event.aggregate_id) {
          return {
            ...lane,
            status:           "AVAILABLE" as const,
            current_customer: undefined,
          };
        }
        return lane;
      });
      return {
        ...state,
        lanes:            updatedLanes,
        last_updated_hlc: event.metadata.hlc_timestamp,
      };
    },

    // EVENT 23 — BARBER_SCHEDULE_UPDATED
    BARBER_SCHEDULE_UPDATED: (state, event): BarberLaneState => {
      const p = event.payload as {
        day_of_week: number;
        start_time:  string;
        end_time:    string;
        is_active:   boolean;
      };
      // aggregate_id on EVENT 23 is the barber_id
      const lane = getLane(state.lanes, event.aggregate_id);
      const existingRules = lane.schedule_rules.filter(r => r.day_of_week !== p.day_of_week);
      const newRule: ScheduleRule = {
        day_of_week: p.day_of_week,
        start_time:  p.start_time,
        end_time:    p.end_time,
        is_active:   p.is_active,
      };
      return {
        ...state,
        lanes: upsertLane(state.lanes, {
          ...lane,
          schedule_rules: [...existingRules, newRule],
        }),
        last_updated_hlc: event.metadata.hlc_timestamp,
      };
    },
  },
};
