// src/core/projection/queue-board.projection.ts

import { Projection } from "./projection.engine";
import { AllEvents } from "@/domain/events/event.definitions";

/**
 * QueueEntry - Single customer record in the materialized view
 * Aligns with QueueEntry Aggregate (ECS v1.3) and IMS v1.1 Status Board
 */
export interface QueueEntry {
  aggregate_id: string;
  customer_uuid: string;
  customer_name?: string;
  preferred_barber_id: string | null;
  status: "reserved" | "waiting" | "called" | "in_service";
  joined_hlc: string;
  estimated_wait_minutes: number;
}

/**
 * QueueBoardState - Materialized view for Public Status Board & Concierge
 */
export interface QueueBoardState {
  waiting: QueueEntry[];
  reserved: QueueEntry[];
  called: QueueEntry[];
  in_service: QueueEntry[];
  last_updated_hlc: string;
}

/**
 * 🔧 Helper: deterministic upsert (prevents duplicates on replay)
 */
const upsert = (list: QueueEntry[], entry: QueueEntry): QueueEntry[] => {
  const filtered = list.filter((e) => e.aggregate_id !== entry.aggregate_id);
  return [...filtered, entry];
};

/**
 * Queue Board Projection
 * Pure materialized view reacting to ECS v1.3 events.
 */
export const queueBoardProjection: Projection<QueueBoardState> = {
  name: "QUEUE_BOARD_VIEW",

  initialState: {
    waiting: [],
    reserved: [],
    called: [],
    in_service: [],
    last_updated_hlc: "0",
  },

  handlers: {
    CUSTOMER_CHECKED_IN: (state, event): QueueBoardState => {
      const p = event.payload as {
        customer_uuid: string;
        customer_name?: string;
        preferred_barber_id?: string;
        estimated_wait_minutes?: number;
      };

      const entry: QueueEntry = {
        aggregate_id: event.aggregate_id,
        customer_uuid: p.customer_uuid,
        customer_name: p.customer_name,
        preferred_barber_id: p.preferred_barber_id || null,
        status: "waiting",
        joined_hlc: event.metadata.hlc_timestamp,
        estimated_wait_minutes: p.estimated_wait_minutes ?? 15,
      };

      return {
        ...state,
        waiting: upsert(state.waiting, entry),
        last_updated_hlc: event.metadata.hlc_timestamp,
      };
    },

    APPOINTMENT_RESERVED: (state, event): QueueBoardState => {
      const p = event.payload as {
        customer_uuid: string;
        customer_name?: string;
        preferred_barber_id?: string;
      };

      const entry: QueueEntry = {
        aggregate_id: event.aggregate_id,
        customer_uuid: p.customer_uuid,
        customer_name: p.customer_name,
        preferred_barber_id: p.preferred_barber_id || null,
        status: "reserved",
        joined_hlc: event.metadata.hlc_timestamp,
        estimated_wait_minutes: 0,
      };

      return {
        ...state,
        reserved: upsert(state.reserved, entry),
        last_updated_hlc: event.metadata.hlc_timestamp,
      };
    },

    CUSTOMER_CALLED_TO_CHAIR: (state, event): QueueBoardState => {
      const aggId = event.aggregate_id;
      const target = [...state.waiting, ...state.reserved].find(
        (e) => e.aggregate_id === aggId
      );
      if (!target) return state;

      return {
        ...state,
        waiting: state.waiting.filter((e) => e.aggregate_id !== aggId),
        reserved: state.reserved.filter((e) => e.aggregate_id !== aggId),
        called: upsert(state.called, { ...target, status: "called" }),
        last_updated_hlc: event.metadata.hlc_timestamp,
      };
    },

    SERVICE_ENGAGED: (state, event): QueueBoardState => {
      const aggId = event.aggregate_id;
      const target = state.called.find((e) => e.aggregate_id === aggId);
      if (!target) return state;

      return {
        ...state,
        called: state.called.filter((e) => e.aggregate_id !== aggId),
        in_service: upsert(state.in_service, {
          ...target,
          status: "in_service",
        }),
        last_updated_hlc: event.metadata.hlc_timestamp,
      };
    },

    SERVICE_COMPLETED: (state, event): QueueBoardState => {
      const aggId = event.aggregate_id;
      return {
        ...state,
        in_service: state.in_service.filter((e) => e.aggregate_id !== aggId),
        last_updated_hlc: event.metadata.hlc_timestamp,
      };
    },

    RESERVATION_EXPIRED: (state, event): QueueBoardState => {
      const aggId = event.aggregate_id;
      return {
        ...state,
        reserved: state.reserved.filter((e) => e.aggregate_id !== aggId),
        last_updated_hlc: event.metadata.hlc_timestamp,
      };
    },
  },
};
