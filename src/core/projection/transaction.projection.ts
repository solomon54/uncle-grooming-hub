/**
 * @file transaction.projection.ts
 * @module core/projection
 *
 * Transaction Projection — materializes financial state.
 *
 * Specification: MODULE_PRIORITY.md P2.4
 *                PRS v1.1 §4.4 — TransactionLedgerView
 *                ECS v1.3 — Events 04, 05, 06, 07, 08, 09
 *                CXS v1.1 §5.4 — 3-wallet model
 *                AGENT.md §5 — Projection Rules (pure functions)
 *
 * PURE FUNCTION — no side effects, no async, no DB writes.
 * Registered in projection engine as "TRANSACTION_LEDGER_VIEW".
 *
 * CRITICAL: service_snapshot is locked at EVENT 04. Never modified after.
 * CRITICAL: EVENT 08 (PAYMENT_SETTLED) is Cloud Authority Only — arrives via sync.
 */

import type { Projection }                from "./projection.engine";
import type { AllEvents }                 from "@/domain/events/event.definitions";
import type {
  TransactionLedgerView,
  TransactionView,
  ServiceIntent,
} from "@/projections/transaction-ledger.view";
import { initialTransactionLedgerView }   from "@/projections/transaction-ledger.view";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function upsertActive(
  active: TransactionView[],
  updated: TransactionView
): TransactionView[] {
  const idx = active.findIndex(t => t.transaction_id === updated.transaction_id);
  if (idx === -1) return [...active, updated];
  const next = [...active];
  next[idx] = updated;
  return next;
}

function getTransaction(
  state: TransactionLedgerView,
  id: string
): TransactionView | undefined {
  return (
    state.active.find(t => t.transaction_id === id) ??
    state.settled_today.find(t => t.transaction_id === id)
  );
}

// ─── Projection ───────────────────────────────────────────────────────────────

export const transactionProjection: Projection<TransactionLedgerView> = {
  name:         "TRANSACTION_LEDGER_VIEW",
  initialState: initialTransactionLedgerView(),

  handlers: {

    // EVENT 04 — SERVICE_ENGAGED
    // Initializes the Transaction aggregate. Locks service_snapshot.
    SERVICE_ENGAGED: (state, event): TransactionLedgerView => {
      const p = event.payload as {
        price_snapshot_id?: string;
        barber_id?:         string;
        customer_uuid?:     string;
        queue_token?:       string;
        services?:          ServiceIntent[];
      };

      const tx: TransactionView = {
        transaction_id:   event.aggregate_id,
        queue_entry_id:   event.aggregate_id,
        queue_token:      p.queue_token ?? "",
        status:           "INITIALIZED",
        barber_id:        p.barber_id ?? "",
        customer_uuid:    p.customer_uuid ?? "",
        customer_display: "",
        service_snapshot: p.services ?? [], // locked here — never modified after
        base_price_etb:   0,
        barber_tip_etb:   0,
        cashier_tip_etb:  0,
        total_etb:        0,
        is_settled:       false,
        started_hlc:      event.metadata.hlc_timestamp,
      };

      return {
        ...state,
        active:           upsertActive(state.active, tx),
        last_updated_hlc: event.metadata.hlc_timestamp,
      };
    },

    // EVENT 05 — SERVICE_COMPLETED
    SERVICE_COMPLETED: (state, event): TransactionLedgerView => {
      const tx = getTransaction(state, event.aggregate_id);
      if (!tx) return state;

      const updated: TransactionView = {
        ...tx,
        status:        "PAYMENT_PENDING",
        completed_hlc: event.metadata.hlc_timestamp,
      };

      return {
        ...state,
        active:           upsertActive(
          state.active.filter(t => t.transaction_id !== event.aggregate_id),
          updated
        ),
        last_updated_hlc: event.metadata.hlc_timestamp,
      };
    },

    // EVENT 06 — PAYMENT_INTENT_CREATED
    // Locks base price, tips, total. CXS v1.1 §5.4 — 3-wallet model.
    PAYMENT_INTENT_CREATED: (state, event): TransactionLedgerView => {
      const p = event.payload as {
        base_price:       number;
        tip_amount?:      number;   // legacy field
        barber_tip_etb?:  number;
        cashier_tip_etb?: number;
        payment_method:   TransactionView["payment_method"];
      };

      const tx = getTransaction(state, event.aggregate_id);
      if (!tx) return state;

      const barberTip   = p.barber_tip_etb  ?? p.tip_amount ?? 0;
      const cashierTip  = p.cashier_tip_etb ?? 0;
      const total       = p.base_price + barberTip + cashierTip;

      const updated: TransactionView = {
        ...tx,
        status:          "PAYMENT_PENDING",
        base_price_etb:  p.base_price,
        barber_tip_etb:  barberTip,
        cashier_tip_etb: cashierTip,
        total_etb:       total,
        payment_method:  p.payment_method,
      };

      return {
        ...state,
        active:           upsertActive(
          state.active.filter(t => t.transaction_id !== event.aggregate_id),
          updated
        ),
        last_updated_hlc: event.metadata.hlc_timestamp,
      };
    },

    // EVENT 07 — PAYMENT_PROCESSING
    PAYMENT_PROCESSING: (state, event): TransactionLedgerView => {
      const tx = getTransaction(state, event.aggregate_id);
      if (!tx) return state;

      const updated: TransactionView = { ...tx, status: "PROCESSING" };

      return {
        ...state,
        active:           upsertActive(
          state.active.filter(t => t.transaction_id !== event.aggregate_id),
          updated
        ),
        last_updated_hlc: event.metadata.hlc_timestamp,
      };
    },

    // EVENT 08 — PAYMENT_SETTLED (Cloud Authority Only — arrives via sync)
    PAYMENT_SETTLED: (state, event): TransactionLedgerView => {
      const tx = getTransaction(state, event.aggregate_id);
      if (!tx) return state;

      const settled: TransactionView = {
        ...tx,
        status:      "SETTLED",
        is_settled:  true,
        settled_hlc: event.metadata.hlc_timestamp,
      };

      return {
        ...state,
        active:           state.active.filter(t => t.transaction_id !== event.aggregate_id),
        settled_today:    [...state.settled_today, settled],
        last_updated_hlc: event.metadata.hlc_timestamp,
      };
    },

    // EVENT 09 — ADJUSTMENT_EVENT
    // Non-destructive correction — appends compensating entry, does not modify original.
    ADJUSTMENT_EVENT: (state, event): TransactionLedgerView => {
      const p = event.payload as {
        original_transaction_uuid: string;
        reason_code:               string;
        adjustment_data:           Record<string, unknown>;
      };

      const original = getTransaction(state, p.original_transaction_uuid);
      if (!original) return state;

      // Create a compensating view entry linked to original
      const adjustment: TransactionView = {
        ...original,
        transaction_id: event.aggregate_id, // new UUID for the adjustment
        status:         "SETTLED",
        is_settled:     true,
        settled_hlc:    event.metadata.hlc_timestamp,
      };

      return {
        ...state,
        settled_today:    [...state.settled_today, adjustment],
        last_updated_hlc: event.metadata.hlc_timestamp,
      };
    },
  },
};
