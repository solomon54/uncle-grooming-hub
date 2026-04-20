// src/domain/events/event.definitions.ts

import { TypedEvent } from "@/core/journal/event.types";

/**
 * UNCLE GROOMING HUB - CANONICAL EVENT DEFINITIONS v1.3
 *
 * Strongly typed definitions for all events defined in ECS v1.3.
 * Every event uses TypedEvent<TPayload> to enforce payload shape
 * while maintaining full compatibility with BaseEvent.
 */

// ==========================================
// 1. Operational / Logistics Events
// ==========================================

/** ECS EVENT 01 — CUSTOMER_CHECKED_IN */
export interface CustomerCheckedInEvent
  extends TypedEvent<{
    customer_uuid: string;
    preferred_barber_id: string;
    checkin_method: "walk-in" | "remote";
    reservation_id?: string;
  }> {
  event_type: "CUSTOMER_CHECKED_IN";
}

/** ECS EVENT 02 — BARBER_AVAILABLE */
export interface BarberAvailableEvent
  extends TypedEvent<{
    barber_id: string;
  }> {
  event_type: "BARBER_AVAILABLE";
}

/** ECS EVENT 03 — CUSTOMER_CALLED_TO_CHAIR */
export interface CustomerCalledToChairEvent
  extends TypedEvent<{
    queue_entry_id: string;
    barber_id: string;
  }> {
  event_type: "CUSTOMER_CALLED_TO_CHAIR";
}

/** ECS EVENT 04 — SERVICE_ENGAGED */
export interface ServiceEngagedEvent
  extends TypedEvent<{
    price_snapshot_id: string;
  }> {
  event_type: "SERVICE_ENGAGED";
}

/** ECS EVENT 05 — SERVICE_COMPLETED */
export interface ServiceCompletedEvent
  extends TypedEvent<Record<string, never>> {
  event_type: "SERVICE_COMPLETED";
}

/** ECS EVENT 10 — ACCOUNT_VERIFIED */
export interface AccountVerifiedEvent
  extends TypedEvent<{
    otp_token_ref: string;
  }> {
  event_type: "ACCOUNT_VERIFIED";
}

/** ECS EVENT 12 — QUEUE_TRANSFER_CONSENTED */
export interface QueueTransferConsentedEvent
  extends TypedEvent<{
    originating_barber_id: string;
    receiving_barber_id: string;
    customer_consent_confirmed: boolean;
  }> {
  event_type: "QUEUE_TRANSFER_CONSENTED";
}

/** ECS EVENT 19 — APPOINTMENT_RESERVED (Cloud ONLY) */
export interface AppointmentReservedEvent
  extends TypedEvent<{
    customer_uuid: string;
    preferred_barber_id: string;
    requested_start_hlc: string;
  }> {
  event_type: "APPOINTMENT_RESERVED";
}

/** ECS EVENT 20 — RESERVATION_CANCELLED */
export interface ReservationCancelledEvent
  extends TypedEvent<{
    reason_code: string;
  }> {
  event_type: "RESERVATION_CANCELLED";
}

/** ECS EVENT 21 — SERVICE_INTENT_ADDED */
export interface ServiceIntentAddedEvent
  extends TypedEvent<{
    service_id: string;
  }> {
  event_type: "SERVICE_INTENT_ADDED";
}

/** ECS EVENT 22 — SERVICE_INTENT_REMOVED */
export interface ServiceIntentRemovedEvent
  extends TypedEvent<{
    service_id: string;
  }> {
  event_type: "SERVICE_INTENT_REMOVED";
}

// ==========================================
// 2. Financial / Commerce Events
// ==========================================

/** ECS EVENT 06 — PAYMENT_INTENT_CREATED */
export interface PaymentIntentCreatedEvent
  extends TypedEvent<{
    base_price: number;
    tip_amount: number;
    payment_method: "cash" | "telebirr" | "chapa" | "cbe_birr" | "m-pesa";
  }> {
  event_type: "PAYMENT_INTENT_CREATED";
}

/** ECS EVENT 07 — PAYMENT_PROCESSING */
export interface PaymentProcessingEvent
  extends TypedEvent<{
    gateway_reference?: string;
  }> {
  event_type: "PAYMENT_PROCESSING";
}

/** ECS EVENT 08 — PAYMENT_SETTLED (Cloud ONLY) */
export interface PaymentSettledEvent
  extends TypedEvent<{
    transaction_id: string;
    total_settled: number;
    verification_source: "webhook" | "admin_override";
  }> {
  event_type: "PAYMENT_SETTLED";
}

/** ECS EVENT 09 — ADJUSTMENT_EVENT */
export interface AdjustmentEvent
  extends TypedEvent<{
    original_transaction_uuid: string;
    reason_code: string;
    adjustment_data: Record<string, unknown>;
  }> {
  event_type: "ADJUSTMENT_EVENT";
}

// ==========================================
// 3. Schedule & Configuration Events
// ==========================================

/** ECS EVENT 23 — BARBER_SCHEDULE_UPDATED */
export interface BarberScheduleUpdatedEvent
  extends TypedEvent<{
    day_of_week: number; // 0-6
    start_time: string; // "HH:mm"
    end_time: string; // "HH:mm"
    is_active: boolean;
  }> {
  event_type: "BARBER_SCHEDULE_UPDATED";
}

/** ECS EVENT 24 — SHOP_HOURS_CHANGED */
export interface ShopHoursChangedEvent
  extends TypedEvent<{
    date_scope: string; // ISO Date or "DEFAULT"
    open_time?: string;
    close_time?: string;
    is_closed: boolean;
  }> {
  event_type: "SHOP_HOURS_CHANGED";
}

// ==========================================
// 4. Infrastructure & System Events
// ==========================================

/** ECS EVENT 13 — OPERATOR_SESSION_OPENED */
export interface OperatorSessionOpenedEvent
  extends TypedEvent<{
    actor_id: string;
    role: "BARBER" | "CASHIER" | "ADMIN";
    terminal_id: string;
    auth_method: "PIN" | "NFC" | "BIOMETRIC";
  }> {
  event_type: "OPERATOR_SESSION_OPENED";
}

/** ECS EVENT 14 — OPERATOR_SESSION_CLOSED */
export interface OperatorSessionClosedEvent
  extends TypedEvent<{
    reason: "manual" | "timeout" | "force-closed";
  }> {
  event_type: "OPERATOR_SESSION_CLOSED";
}

/** ECS EVENT 15 — SYNC_BATCH_ACKNOWLEDGED */
export interface SyncBatchAcknowledgedEvent
  extends TypedEvent<{
    batch_id: string;
    last_synced_hlc: string;
  }> {
  event_type: "SYNC_BATCH_ACKNOWLEDGED";
}

/** ECS EVENT 16 — RECONCILIATION_ANOMALY_DETECTED */
export interface ReconciliationAnomalyDetectedEvent
  extends TypedEvent<{
    anomaly_type: string;
    details: Record<string, unknown>;
  }> {
  event_type: "RECONCILIATION_ANOMALY_DETECTED";
}

/** ECS EVENT 17 — LOCAL_SNAPSHOT_COMMITTED */
export interface LocalSnapshotCommittedEvent
  extends TypedEvent<{
    snapshot_hlc: string;
    snapshot_checksum: string;
  }> {
  event_type: "LOCAL_SNAPSHOT_COMMITTED";
}

/** ECS EVENT 18 — TERMINAL_RECOVERY_COMPLETED */
export interface TerminalRecoveryCompletedEvent
  extends TypedEvent<{
    recovery_duration_ms: number;
    replayed_event_count: number;
  }> {
  event_type: "TERMINAL_RECOVERY_COMPLETED";
}

/** ECS EVENT 25 — RESERVATION_EXPIRED */
export interface ReservationExpiredEvent
  extends TypedEvent<{
    requested_start_hlc: string;
    grace_window_minutes: number;
  }> {
  event_type: "RESERVATION_EXPIRED";
}

// ==========================================
// 5. Union Type for All Events
// ==========================================

export type AllEvents =
  | CustomerCheckedInEvent
  | BarberAvailableEvent
  | CustomerCalledToChairEvent
  | ServiceEngagedEvent
  | ServiceCompletedEvent
  | PaymentIntentCreatedEvent
  | PaymentProcessingEvent
  | PaymentSettledEvent
  | AdjustmentEvent
  | AccountVerifiedEvent
  | QueueTransferConsentedEvent
  | AppointmentReservedEvent
  | ReservationCancelledEvent
  | ServiceIntentAddedEvent
  | ServiceIntentRemovedEvent
  | BarberScheduleUpdatedEvent
  | ShopHoursChangedEvent
  | OperatorSessionOpenedEvent
  | OperatorSessionClosedEvent
  | SyncBatchAcknowledgedEvent
  | ReconciliationAnomalyDetectedEvent
  | LocalSnapshotCommittedEvent
  | TerminalRecoveryCompletedEvent
  | ReservationExpiredEvent;
