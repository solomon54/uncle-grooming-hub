/**
 * @file transaction.actions.ts
 * @module core/actions
 *
 * Transaction Action Creators — Settlement Desk module.
 *
 * Specification: MODULE_PRIORITY.md P3.4
 * ECS v1.3 — Events 06, 07, 09
 * CXS v1.1 §5.4 — 3-wallet model (base + barber_tip + cashier_tip)
 * AGENT.md §4 — Authority Boundaries
 *
 * CRITICAL: EVENT 08 (PAYMENT_SETTLED) is NEVER emitted here.
 * requestSettlement() makes a Cloud API request — Cloud emits EVENT 08.
 * CRITICAL: EVENT 09 (ADJUSTMENT_EVENT) requires ADMIN or SYSTEM_OWNER role.
 */

import { runtime }          from "@/core/runtime/runtime";
import { clockService }     from "@/core/clock/clock.service";
import { terminalIdentity } from "@/core/terminal/terminal.identity";
import type { ActiveSession } from "@/core/session/session.types";
import type {
  PaymentIntentCreatedEvent,
  PaymentProcessingEvent,
  AdjustmentEvent,
} from "@/domain/events/event.definitions";

// ─── Metadata factory ─────────────────────────────────────────────────────────

function meta(session: ActiveSession) {
  return {
    session_id:    session.session_id,
    hlc_timestamp: clockService.tick(),
    terminal_id:   terminalIdentity.terminalId,
  };
}

// ─── EVENT 06 — PAYMENT_INTENT_CREATED ───────────────────────────────────────

export interface InitializeBillingParams {
  transactionId:    string;
  aggregateVersion: number;
  basePriceEtb:     number;
  barberTipEtb:     number;   // default 0 — CXS v1.1 §5.4
  cashierTipEtb:    number;   // default 0 — CXS v1.1 §5.4 (new wallet)
  paymentMethod:    "CASH" | "TELEBIRR" | "CHAPA" | "CBE_BIRR" | "MPESA";
}

export async function initializeBilling(
  params: InitializeBillingParams,
  session: ActiveSession
) {
  const totalEtb = params.basePriceEtb + params.barberTipEtb + params.cashierTipEtb;

  // Map the upper-case UI strings to exact lower-case event definitions required by backend
  const mappedPaymentMethod = (
    params.paymentMethod === "MPESA" ? "m-pesa" : params.paymentMethod.toLowerCase()
  ) as "cash" | "telebirr" | "chapa" | "cbe_birr" | "m-pesa";

  const event: PaymentIntentCreatedEvent = {
    event_id:          crypto.randomUUID(),
    event_type:        "PAYMENT_INTENT_CREATED",
    aggregate_id:      params.transactionId,
    aggregate_version: params.aggregateVersion,
    payload: {
      base_price:      params.basePriceEtb,
      tip_amount:      params.barberTipEtb,
      payment_method:  mappedPaymentMethod,
      // Extended fields for 3-wallet model (CXS v1.1 §5.4)
      barber_tip_etb:  params.barberTipEtb,
      cashier_tip_etb: params.cashierTipEtb,
      total_etb:       totalEtb,
    } as unknown as PaymentIntentCreatedEvent["payload"],
    metadata: meta(session),
  };
  return runtime.emit(event);
}

// ─── EVENT 07 — PAYMENT_PROCESSING ───────────────────────────────────────────

export interface SetProcessingParams {
  transactionId:     string;
  aggregateVersion:  number;
  gatewayReference?: string;
}

export async function setProcessing(
  params: SetProcessingParams,
  session: ActiveSession
) {
  const event: PaymentProcessingEvent = {
    event_id:          crypto.randomUUID(),
    event_type:        "PAYMENT_PROCESSING",
    aggregate_id:      params.transactionId,
    aggregate_version: params.aggregateVersion,
    payload:           { gateway_reference: params.gatewayReference },
    metadata:          meta(session),
  };
  return runtime.emit(event);
}

// ─── REQUEST SETTLEMENT (does NOT emit EVENT 08) ──────────────────────────────

export interface RequestSettlementParams {
  transactionId: string;
  totalEtb:      number;
}

/**
 * Requests cloud settlement. Does NOT emit EVENT 08 locally.
 * Cloud emits EVENT 08 (PAYMENT_SETTLED) after webhook verification.
 * Returns a pending request object for UI optimistic feedback.
 */
export async function requestSettlement(
  params: RequestSettlementParams,
  _session: ActiveSession
): Promise<{ pending: true; transaction_id: string }> {
  // Phase 1: Cloud API call will be wired in Phase 8 (sync engine).
  // For now, return pending state — UI shows "Awaiting cloud confirmation".
  console.log(`[transaction.actions] Settlement requested for ${params.transactionId} — ${params.totalEtb} ETB`);
  return { pending: true, transaction_id: params.transactionId };
}

// ─── EVENT 09 — ADJUSTMENT_EVENT (Admin/SYSTEM_OWNER only) ───────────────────

export interface AppendAdjustmentParams {
  adjustmentId:            string;
  aggregateVersion:        number;
  originalTransactionUuid: string;
  reasonCode:              string;
  adjustmentData:          Record<string, unknown>;
}

export async function appendAdjustment(
  params: AppendAdjustmentParams,
  session: ActiveSession
) {
  // Role check — journal.service.ts also enforces this
  if (session.role !== "ADMIN" && session.role !== "SYSTEM_OWNER") {
    throw new Error("[transaction.actions] ADJUSTMENT_EVENT requires ADMIN or SYSTEM_OWNER role.");
  }

  const event: AdjustmentEvent = {
    event_id:          crypto.randomUUID(),
    event_type:        "ADJUSTMENT_EVENT",
    aggregate_id:      params.adjustmentId,
    aggregate_version: params.aggregateVersion,
    payload: {
      original_transaction_uuid: params.originalTransactionUuid,
      reason_code:               params.reasonCode,
      adjustment_data:           params.adjustmentData,
    },
    metadata: meta(session),
  };
  return runtime.emit(event);
}