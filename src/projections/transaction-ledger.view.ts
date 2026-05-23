/**
 * @file transaction-ledger.view.ts
 * @module projections
 *
 * TransactionLedgerView — materialized view for financial state.
 *
 * Specification: MODULE_PRIORITY.md P2.4
 *                ECS v1.3 §1 — Transaction aggregate (Commerce Layer)
 *                CXS v1.1 §5.4 — 3-wallet model (base + barber_tip + cashier_tip)
 *                PRD §6 — Payment & Financial Architecture
 *
 * CRITICAL: service_snapshot is locked at EVENT 04. Never modified after.
 * CRITICAL: total_etb = base_price_etb + barber_tip_etb + cashier_tip_etb (always)
 */

// ─── Service Intent ───────────────────────────────────────────────────────────

export interface ServiceIntent {
  service_id:   string;
  service_name: string;
  price_etb:    number;
}

// ─── Transaction View ─────────────────────────────────────────────────────────

export interface TransactionView {
  transaction_id:  string;
  queue_entry_id:  string;
  queue_token:     string;

  /**
   * PRD §6.5 — Transaction Lifecycle States.
   * INITIALIZED: created at EVENT 04, no financial impact yet.
   * PAYMENT_PENDING: service complete (EVENT 05), total calculated.
   * PROCESSING: gateway redirect or cash initiated (EVENT 07).
   * SETTLED: cloud-verified (EVENT 08 — Cloud Authority Only).
   * FAILED: gateway rejection or timeout.
   */
  status: "INITIALIZED" | "PAYMENT_PENDING" | "PROCESSING" | "SETTLED" | "FAILED";

  barber_id:        string;
  customer_uuid:    string;
  customer_display: string;

  /**
   * Service snapshot — locked at EVENT 04 (SERVICE_ENGAGED).
   * ECS v1.3 §2.6 — Service Intent Lifecycle.
   * Post-engagement changes route through EVENT 09 (ADJUSTMENT_EVENT).
   */
  service_snapshot: ServiceIntent[];

  /** Base service price in ETB */
  base_price_etb:   number;

  /** Barber tip in ETB — CXS v1.1 §5.4 */
  barber_tip_etb:   number;

  /** Cashier/desk tip in ETB — CXS v1.1 §5.4 (new wallet) */
  cashier_tip_etb:  number;

  /** total_etb = base_price_etb + barber_tip_etb + cashier_tip_etb */
  total_etb:        number;

  payment_method?: "CASH" | "TELEBIRR" | "CHAPA" | "CBE_BIRR" | "MPESA";

  is_settled:       boolean;
  started_hlc:      string;
  completed_hlc?:   string;
  settled_hlc?:     string;
}

// ─── Transaction Ledger View ──────────────────────────────────────────────────

export interface TransactionLedgerView {
  /** Active transactions: INITIALIZED, PAYMENT_PENDING, PROCESSING */
  active:        TransactionView[];

  /** Settled today: SETTLED */
  settled_today: TransactionView[];

  last_updated_hlc: string;
}

// ─── Initial State ────────────────────────────────────────────────────────────

export const initialTransactionLedgerView = (): TransactionLedgerView => ({
  active:           [],
  settled_today:    [],
  last_updated_hlc: "0",
});
