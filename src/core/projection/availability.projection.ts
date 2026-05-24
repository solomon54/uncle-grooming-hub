/**
 * @file availability.projection.ts
 * @module core/projection
 *
 * AvailabilityCalendar — slot occupancy from schedule + reservations.
 *
 * Specification: MODULE_PRIORITY.md P2.5, PRS v1.1 §4.3
 * Phase 1: structural handlers; duration averages refined when transaction history exists.
 */

import type { Projection }    from "./projection.engine";
import type { AllEvents }     from "@/domain/events/event.definitions";
import type { AvailabilityView, TimeSlot } from "@/projections/availability.view";
import { initialAvailabilityView }         from "@/projections/availability.view";

function upsertSlot(slots: TimeSlot[], slot: TimeSlot): TimeSlot[] {
  const rest = slots.filter(
    s => !(s.barber_id === slot.barber_id && s.start_hlc === slot.start_hlc)
  );
  return [...rest, slot];
}

export const availabilityProjection: Projection<AvailabilityView> = {
  name:         "AVAILABILITY_VIEW",
  initialState: initialAvailabilityView(),

  handlers: {
    APPOINTMENT_RESERVED: (state, event): AvailabilityView => {
      const p = event.payload as {
        preferred_barber_id: string;
        requested_start_hlc: string;
      };

      const slot: TimeSlot = {
        barber_id:                  p.preferred_barber_id,
        start_hlc:                  p.requested_start_hlc,
        end_hlc:                    p.requested_start_hlc,
        is_available:               false,
        estimated_duration_minutes: 30,
      };

      return {
        slots:            upsertSlot(state.slots, slot),
        last_updated_hlc: event.metadata.hlc_timestamp,
      };
    },

    RESERVATION_CANCELLED: (state, event): AvailabilityView => ({
      slots: state.slots.filter(
        s => !(s.barber_id === event.aggregate_id || s.start_hlc === event.aggregate_id)
      ),
      last_updated_hlc: event.metadata.hlc_timestamp,
    }),

    RESERVATION_EXPIRED: (state, event): AvailabilityView => ({
      slots: state.slots.filter(s => s.start_hlc !== event.aggregate_id),
      last_updated_hlc: event.metadata.hlc_timestamp,
    }),

    BARBER_SCHEDULE_UPDATED: (state, event): AvailabilityView => ({
      ...state,
      last_updated_hlc: event.metadata.hlc_timestamp,
    }),

    SHOP_HOURS_CHANGED: (state, event): AvailabilityView => ({
      ...state,
      last_updated_hlc: event.metadata.hlc_timestamp,
    }),

    SERVICE_COMPLETED: (state, event): AvailabilityView => ({
      ...state,
      last_updated_hlc: event.metadata.hlc_timestamp,
    }),
  },
};
