/**
 * @file barber.actions.ts
 * @module core/actions
 *
 * Barber Action Creators — Lane Cockpit module.
 *
 * Specification: MODULE_PRIORITY.md P3.3
 *                ECS v1.3 — Events 02, 04, 05, 23
 *                AMS v1.3 — Lane Cockpit capabilities
 *                AGENT.md §4 — Authority Boundaries
 *
 * Authority: All events here are Local Authority, BARBER role.
 * EVENT 04 and 05 require BARBER role — enforced here and in journal.service.ts.
 */

import { runtime }          from "@/core/runtime/runtime";
import { clockService }     from "@/core/clock/clock.service";
import { terminalIdentity } from "@/core/terminal/terminal.identity";
import type { ActiveSession } from "@/core/session/session.types";
import type {
  BarberAvailableEvent,
  ServiceEngagedEvent,
  ServiceCompletedEvent,
  BarberScheduleUpdatedEvent,
} from "@/domain/events/event.definitions";

// ─── Metadata factory ─────────────────────────────────────────────────────────

function meta(session: ActiveSession) {
  return {
    session_id:    session.session_id,
    hlc_timestamp: clockService.tick(),
    terminal_id:   terminalIdentity.terminalId,
  };
}

// ─── EVENT 02 — BARBER_AVAILABLE ─────────────────────────────────────────────

export interface SetAvailableParams {
  barberId:         string;
  aggregateVersion: number;
  /** Status to set — defaults to AVAILABLE. Use ON_BREAK for break. */
  status?: "AVAILABLE" | "ON_BREAK" | "OFFLINE";
}

export async function setAvailable(params: SetAvailableParams, session: ActiveSession) {
  const event: BarberAvailableEvent = {
    event_id:          crypto.randomUUID(),
    event_type:        "BARBER_AVAILABLE",
    aggregate_id:      params.barberId,
    aggregate_version: params.aggregateVersion,
    payload:           {
      barber_id: params.barberId,
      status:    params.status ?? "AVAILABLE",
    } as BarberAvailableEvent["payload"] & Record<string, unknown>,
    metadata:          meta(session),
  };
  return runtime.emit(event);
}

// ─── EVENT 04 — SERVICE_ENGAGED ───────────────────────────────────────────────

export interface StartServiceParams {
  queueEntryId:     string;
  aggregateVersion: number;
  priceSnapshotId:  string;
  barberId:         string;
  customerUuid:     string;
  queueToken:       string;
}

export async function startService(params: StartServiceParams, session: ActiveSession) {
  const event: ServiceEngagedEvent = {
    event_id:          crypto.randomUUID(),
    event_type:        "SERVICE_ENGAGED",
    aggregate_id:      params.queueEntryId,
    aggregate_version: params.aggregateVersion,
    payload: {
      price_snapshot_id: params.priceSnapshotId,
      barber_id:         params.barberId,
      customer_uuid:     params.customerUuid,
      queue_token:       params.queueToken,
    } as ServiceEngagedEvent["payload"] & Record<string, unknown>,
    metadata: meta(session),
  };
  return runtime.emit(event);
}

// ─── EVENT 05 — SERVICE_COMPLETED ────────────────────────────────────────────

export interface CompleteServiceParams {
  queueEntryId:     string;
  aggregateVersion: number;
}

export async function completeService(params: CompleteServiceParams, session: ActiveSession) {
  const event: ServiceCompletedEvent = {
    event_id:          crypto.randomUUID(),
    event_type:        "SERVICE_COMPLETED",
    aggregate_id:      params.queueEntryId,
    aggregate_version: params.aggregateVersion,
    payload:           {},
    metadata:          meta(session),
  };
  return runtime.emit(event);
}

// ─── EVENT 23 — BARBER_SCHEDULE_UPDATED ──────────────────────────────────────

export interface UpdateScheduleParams {
  barberId:         string;
  aggregateVersion: number;
  dayOfWeek:        number;  // 0=Sunday, 6=Saturday
  startTime:        string;  // "HH:mm"
  endTime:          string;  // "HH:mm"
  isActive:         boolean;
}

export async function updateSchedule(params: UpdateScheduleParams, session: ActiveSession) {
  const event: BarberScheduleUpdatedEvent = {
    event_id:          crypto.randomUUID(),
    event_type:        "BARBER_SCHEDULE_UPDATED",
    aggregate_id:      params.barberId,
    aggregate_version: params.aggregateVersion,
    payload: {
      day_of_week: params.dayOfWeek,
      start_time:  params.startTime,
      end_time:    params.endTime,
      is_active:   params.isActive,
    },
    metadata: meta(session),
  };
  return runtime.emit(event);
}
