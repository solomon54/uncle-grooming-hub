/**
 * @file schedule.actions.ts
 * @module core/actions
 *
 * Schedule Action Creators — Admin Governance + Lane Cockpit.
 *
 * Specification: MODULE_PRIORITY.md P3.5
 *                ECS v1.3 — Events 23, 24
 *                AGENT.md §4 — Authority Boundaries
 *
 * EVENT 23 (BARBER_SCHEDULE_UPDATED): BARBER or ADMIN role.
 * EVENT 24 (SHOP_HOURS_CHANGED): ADMIN or SYSTEM_OWNER only.
 */

import { runtime }          from "@/core/runtime/runtime";
import { clockService }     from "@/core/clock/clock.service";
import { terminalIdentity } from "@/core/terminal/terminal.identity";
import type { ActiveSession } from "@/core/session/session.types";
import type {
  BarberScheduleUpdatedEvent,
  ShopHoursChangedEvent,
} from "@/domain/events/event.definitions";

// ─── Metadata factory ─────────────────────────────────────────────────────────

function meta(session: ActiveSession) {
  return {
    session_id:    session.session_id,
    hlc_timestamp: clockService.tick(),
    terminal_id:   terminalIdentity.terminalId,
  };
}

// ─── EVENT 23 — BARBER_SCHEDULE_UPDATED ──────────────────────────────────────

export interface UpdateBarberScheduleParams {
  barberId:         string;
  aggregateVersion: number;
  dayOfWeek:        number;   // 0=Sunday, 6=Saturday
  startTime:        string;   // "HH:mm"
  endTime:          string;   // "HH:mm"
  isActive:         boolean;
}

export async function updateBarberSchedule(
  params: UpdateBarberScheduleParams,
  session: ActiveSession
) {
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

// ─── EVENT 24 — SHOP_HOURS_CHANGED (Admin/SYSTEM_OWNER only) ─────────────────

export interface OverrideShopHoursParams {
  systemProcessId:  string;
  aggregateVersion: number;
  dateScope:        string;   // ISO date "YYYY-MM-DD" or "DEFAULT"
  openTime?:        string;   // "HH:mm"
  closeTime?:       string;   // "HH:mm"
  isClosed:         boolean;
}

export async function overrideShopHours(
  params: OverrideShopHoursParams,
  session: ActiveSession
) {
  if (session.role !== "ADMIN" && session.role !== "SYSTEM_OWNER") {
    throw new Error("[schedule.actions] SHOP_HOURS_CHANGED requires ADMIN or SYSTEM_OWNER role.");
  }

  const event: ShopHoursChangedEvent = {
    event_id:          crypto.randomUUID(),
    event_type:        "SHOP_HOURS_CHANGED",
    aggregate_id:      params.systemProcessId,
    aggregate_version: params.aggregateVersion,
    payload: {
      date_scope:  params.dateScope,
      open_time:   params.openTime,
      close_time:  params.closeTime,
      is_closed:   params.isClosed,
    },
    metadata: meta(session),
  };
  return runtime.emit(event);
}
