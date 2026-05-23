/**
 * @file queue.actions.ts
 * @module core/actions
 *
 * Queue Action Creators
 *
 * Specification: ECS v1.3 §3 — Canonical Event Catalog (Events 01–05, 12, 19–22)
 *
 * Each action is a pure factory that constructs a fully-formed, typed event
 * and emits it through the Runtime. Actions enforce:
 *   - Correct event_type per ECS v1.3
 *   - Real HLC timestamps via ClockService (TAS §4)
 *   - Terminal attribution via TerminalIdentityService (TAS §1.2)
 *   - Idempotent event_id via crypto.randomUUID()
 *
 * Actions do NOT enforce business preconditions (e.g. "barber must be AVAILABLE").
 * Precondition enforcement is the responsibility of the calling UI layer,
 * which derives state from projections before invoking actions.
 */

import { runtime }          from "@/core/runtime/runtime";
import { clockService }     from "@/core/clock/clock.service";
import { terminalIdentity } from "@/core/terminal/terminal.identity";

import type {
  CustomerCheckedInEvent,
  AppointmentReservedEvent,
  CustomerCalledToChairEvent,
  ServiceEngagedEvent,
  ServiceCompletedEvent,
  QueueTransferConsentedEvent,
  ReservationCancelledEvent,
  ServiceIntentAddedEvent,
  ServiceIntentRemovedEvent,
} from "@/domain/events/event.definitions";

// ─── Metadata Factory ─────────────────────────────────────────────────────────

/**
 * Constructs the standard event metadata block.
 * session_id is provided by the caller (from active TerminalSession).
 */
function buildMetadata(sessionId: string) {
  return {
    session_id:    sessionId,
    hlc_timestamp: clockService.tick(),
    terminal_id:   terminalIdentity.terminalId,
  };
}

// ─── EVENT 01 — CUSTOMER_CHECKED_IN ──────────────────────────────────────────

export interface CheckInCustomerParams {
  aggregateId:        string;
  aggregateVersion:   number;
  sessionId:          string;
  customerUuid:       string;
  preferredBarberId:  string | null;
  checkinMethod?:     "walk-in" | "remote";
  reservationId?:     string;
  /** Customer first name — stored for display (initials derived by projection) */
  customerName?:      string;
  /** Queue token e.g. "A-07" — CXS v1.1 §3.3 */
  queueToken?:        string;
}

export async function checkInCustomer(params: CheckInCustomerParams) {
  const event: CustomerCheckedInEvent = {
    event_id:          crypto.randomUUID(),
    event_type:        "CUSTOMER_CHECKED_IN",
    aggregate_id:      params.aggregateId,
    aggregate_version: params.aggregateVersion,
    payload: {
      customer_uuid:       params.customerUuid,
      preferred_barber_id: params.preferredBarberId ?? "",
      checkin_method:      params.checkinMethod ?? "walk-in",
      reservation_id:      params.reservationId,
      customer_name:       params.customerName,
      queue_token:         params.queueToken,
    } as CustomerCheckedInEvent["payload"] & Record<string, unknown>,
    metadata: buildMetadata(params.sessionId),
  };

  return runtime.emit(event);
}

// ─── EVENT 03 — CUSTOMER_CALLED_TO_CHAIR ─────────────────────────────────────

export interface CallCustomerParams {
  aggregateId:      string;
  aggregateVersion: number;
  sessionId:        string;
  barberId:         string;
}

export async function callCustomer(params: CallCustomerParams) {
  const event: CustomerCalledToChairEvent = {
    event_id:          crypto.randomUUID(),
    event_type:        "CUSTOMER_CALLED_TO_CHAIR",
    aggregate_id:      params.aggregateId,
    aggregate_version: params.aggregateVersion,
    payload: {
      queue_entry_id: params.aggregateId,
      barber_id:      params.barberId,
    },
    metadata: buildMetadata(params.sessionId),
  };

  return runtime.emit(event);
}

// ─── EVENT 04 — SERVICE_ENGAGED ───────────────────────────────────────────────

export interface StartServiceParams {
  aggregateId:      string;
  aggregateVersion: number;
  sessionId:        string;
  priceSnapshotId:  string;
}

export async function startService(params: StartServiceParams) {
  const event: ServiceEngagedEvent = {
    event_id:          crypto.randomUUID(),
    event_type:        "SERVICE_ENGAGED",
    aggregate_id:      params.aggregateId,
    aggregate_version: params.aggregateVersion,
    payload: {
      price_snapshot_id: params.priceSnapshotId,
    },
    metadata: buildMetadata(params.sessionId),
  };

  return runtime.emit(event);
}

// ─── EVENT 05 — SERVICE_COMPLETED ────────────────────────────────────────────

export interface CompleteServiceParams {
  aggregateId:      string;
  aggregateVersion: number;
  sessionId:        string;
}

export async function completeService(params: CompleteServiceParams) {
  const event: ServiceCompletedEvent = {
    event_id:          crypto.randomUUID(),
    event_type:        "SERVICE_COMPLETED",
    aggregate_id:      params.aggregateId,
    aggregate_version: params.aggregateVersion,
    payload:           {},
    metadata:          buildMetadata(params.sessionId),
  };

  return runtime.emit(event);
}

// ─── EVENT 12 — QUEUE_TRANSFER_CONSENTED ─────────────────────────────────────

export interface TransferQueueParams {
  aggregateId:           string;
  aggregateVersion:      number;
  sessionId:             string;
  originatingBarberId:   string;
  receivingBarberId:     string;
  customerConsentConfirmed: boolean;
}

export async function transferQueue(params: TransferQueueParams) {
  const event: QueueTransferConsentedEvent = {
    event_id:          crypto.randomUUID(),
    event_type:        "QUEUE_TRANSFER_CONSENTED",
    aggregate_id:      params.aggregateId,
    aggregate_version: params.aggregateVersion,
    payload: {
      originating_barber_id:      params.originatingBarberId,
      receiving_barber_id:        params.receivingBarberId,
      customer_consent_confirmed: params.customerConsentConfirmed,
    },
    metadata: buildMetadata(params.sessionId),
  };

  return runtime.emit(event);
}

// ─── EVENT 19 — APPOINTMENT_RESERVED (Cloud Authority) ───────────────────────
// NOTE: This event is Cloud Authority Only (ECS §2.4).
// The local terminal receives it via sync — it does NOT emit it.
// This action exists only for testing and cloud-side emission.

export interface ReserveAppointmentParams {
  aggregateId:       string;
  aggregateVersion:  number;
  sessionId:         string;
  customerUuid:      string;
  preferredBarberId: string | null;
  requestedStartHlc: string;
}

export async function reserveAppointment(params: ReserveAppointmentParams) {
  const event: AppointmentReservedEvent = {
    event_id:          crypto.randomUUID(),
    event_type:        "APPOINTMENT_RESERVED",
    aggregate_id:      params.aggregateId,
    aggregate_version: params.aggregateVersion,
    payload: {
      customer_uuid:       params.customerUuid,
      preferred_barber_id: params.preferredBarberId ?? "",
      requested_start_hlc: params.requestedStartHlc,
    },
    metadata: buildMetadata(params.sessionId),
  };

  return runtime.emit(event);
}

// ─── EVENT 20 — RESERVATION_CANCELLED ────────────────────────────────────────

export interface CancelReservationParams {
  aggregateId:      string;
  aggregateVersion: number;
  sessionId:        string;
  reasonCode:       string;
}

export async function cancelReservation(params: CancelReservationParams) {
  const event: ReservationCancelledEvent = {
    event_id:          crypto.randomUUID(),
    event_type:        "RESERVATION_CANCELLED",
    aggregate_id:      params.aggregateId,
    aggregate_version: params.aggregateVersion,
    payload: {
      reason_code: params.reasonCode,
    },
    metadata: buildMetadata(params.sessionId),
  };

  return runtime.emit(event);
}

// ─── EVENT 21 — SERVICE_INTENT_ADDED ─────────────────────────────────────────

export interface AddServiceIntentParams {
  aggregateId:      string;
  aggregateVersion: number;
  sessionId:        string;
  serviceId:        string;
}

export async function addServiceIntent(params: AddServiceIntentParams) {
  const event: ServiceIntentAddedEvent = {
    event_id:          crypto.randomUUID(),
    event_type:        "SERVICE_INTENT_ADDED",
    aggregate_id:      params.aggregateId,
    aggregate_version: params.aggregateVersion,
    payload: {
      service_id: params.serviceId,
    },
    metadata: buildMetadata(params.sessionId),
  };

  return runtime.emit(event);
}

// ─── EVENT 22 — SERVICE_INTENT_REMOVED ───────────────────────────────────────

export interface RemoveServiceIntentParams {
  aggregateId:      string;
  aggregateVersion: number;
  sessionId:        string;
  serviceId:        string;
}

export async function removeServiceIntent(params: RemoveServiceIntentParams) {
  const event: ServiceIntentRemovedEvent = {
    event_id:          crypto.randomUUID(),
    event_type:        "SERVICE_INTENT_REMOVED",
    aggregate_id:      params.aggregateId,
    aggregate_version: params.aggregateVersion,
    payload: {
      service_id: params.serviceId,
    },
    metadata: buildMetadata(params.sessionId),
  };

  return runtime.emit(event);
}
