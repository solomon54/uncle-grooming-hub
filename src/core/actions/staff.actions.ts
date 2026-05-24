/**
 * @file staff.actions.ts
 * @module core/actions
 *
 * Staff account actions — ECS v1.4 events 27–31 (SOS v1.0 §6)
 * Role enforcement: journal.service.ts (ADMIN / SYSTEM_OWNER only)
 */

import { runtime }          from "@/core/runtime/runtime";
import { journalService }   from "@/core/journal/journal.service";
import { clockService }     from "@/core/clock/clock.service";
import { terminalIdentity } from "@/core/terminal/terminal.identity";
import type { ActiveSession } from "@/core/session/session.types";
import type {
  StaffAccountCreatedEvent,
  StaffPinChangedEvent,
  StaffAccountDeactivatedEvent,
  StaffAccountReactivatedEvent,
  TerminalPinChangedEvent,
} from "@/domain/events/event.definitions";

function meta(session: ActiveSession) {
  return {
    session_id:    session.session_id,
    hlc_timestamp: clockService.tick(),
    terminal_id:   terminalIdentity.terminalId,
  };
}

// ─── EVENT 27 — STAFF_ACCOUNT_CREATED ────────────────────────────────────────

export interface CreateStaffAccountParams {
  aggregateId:  string;
  actorUuid:    string;
  role:         "BARBER" | "CASHIER" | "ADMIN";
  displayName:  string;
}

export async function createStaffAccount(
  params: CreateStaffAccountParams,
  session: ActiveSession
) {
  const event: StaffAccountCreatedEvent = {
    event_id:          crypto.randomUUID(),
    event_type:        "STAFF_ACCOUNT_CREATED",
    aggregate_id:      params.aggregateId,
    aggregate_version: await journalService.getNextAggregateVersion(params.aggregateId),
    payload: {
      actor_uuid:   params.actorUuid,
      role:         params.role,
      display_name: params.displayName,
    },
    metadata: meta(session),
  };
  return runtime.emit(event, session);
}

// ─── EVENT 28 — STAFF_PIN_CHANGED ────────────────────────────────────────────

export interface ChangeStaffPinParams {
  aggregateId: string;
  actorUuid:   string;
  pinHash:     string;
}

export async function changeStaffPin(
  params: ChangeStaffPinParams,
  session: ActiveSession
) {
  const event: StaffPinChangedEvent = {
    event_id:          crypto.randomUUID(),
    event_type:        "STAFF_PIN_CHANGED",
    aggregate_id:      params.aggregateId,
    aggregate_version: await journalService.getNextAggregateVersion(params.aggregateId),
    payload: {
      actor_uuid: params.actorUuid,
      pin_hash:   params.pinHash,
    },
    metadata: meta(session),
  };
  return runtime.emit(event, session);
}

// ─── EVENT 29 — STAFF_ACCOUNT_DEACTIVATED ────────────────────────────────────

export async function deactivateStaffAccount(
  targetActorId: string,
  reason: string,
  session: ActiveSession
) {
  const event: StaffAccountDeactivatedEvent = {
    event_id:          crypto.randomUUID(),
    event_type:        "STAFF_ACCOUNT_DEACTIVATED",
    aggregate_id:      targetActorId,
    aggregate_version: await journalService.getNextAggregateVersion(targetActorId),
    payload:           { target_actor_id: targetActorId, reason },
    metadata:          meta(session),
  };
  return runtime.emit(event, session);
}

// ─── EVENT 30 — STAFF_ACCOUNT_REACTIVATED ────────────────────────────────────

export async function reactivateStaffAccount(
  targetActorId: string,
  session: ActiveSession
) {
  const event: StaffAccountReactivatedEvent = {
    event_id:          crypto.randomUUID(),
    event_type:        "STAFF_ACCOUNT_REACTIVATED",
    aggregate_id:      targetActorId,
    aggregate_version: await journalService.getNextAggregateVersion(targetActorId),
    payload:           { target_actor_id: targetActorId },
    metadata:          meta(session),
  };
  return runtime.emit(event, session);
}

// ─── EVENT 31 — TERMINAL_PIN_CHANGED ─────────────────────────────────────────

export async function changeTerminalPin(
  terminalId: string,
  newPinHash: string,
  session: ActiveSession
) {
  const event: TerminalPinChangedEvent = {
    event_id:          crypto.randomUUID(),
    event_type:        "TERMINAL_PIN_CHANGED",
    aggregate_id:      terminalId,
    aggregate_version: await journalService.getNextAggregateVersion(terminalId),
    payload:           { terminal_id: terminalId, new_pin_hash: newPinHash },
    metadata:          meta(session),
  };
  return runtime.emit(event, session);
}
