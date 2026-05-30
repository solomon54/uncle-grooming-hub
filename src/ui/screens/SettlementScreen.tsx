/**
 * @file SettlementScreen.tsx
 * @module ui/screens
 *
 * Settlement Desk — Settlement Desk module.
 *
 * Specification: AMS v1.3 — Settlement Desk capabilities
 *                IMS v1.1 — Payment Terminal screen
 *                ui-standards.md §7.4 — Settlement Screen layout
 *                CXS v1.1 §5 — Payment flow (3-wallet model)
 *                AGENT.md §6 — UI Rules
 *
 * READS FROM: useTransaction(), useSession()
 * EMITS VIA:  transaction.actions (Events 06, 07)
 *             requestSettlement() → Cloud emits EVENT 08
 *
 * CRITICAL: EVENT 08 (PAYMENT_SETTLED) is NEVER emitted locally.
 *           "Confirm Cash" triggers a Cloud API request only.
 * CRITICAL: Service itemization is READ ONLY (locked at EVENT 04).
 */

"use client";

import React, { useState }         from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTransaction }          from "@/ui/hooks/useTransaction";
import { useSession }              from "@/ui/hooks/useSession";
import { TopBar }                  from "@/ui/components/shell/TopBar";
import { Badge }                   from "@/ui/components/primitives/Badge";
import { SyncIndicator }           from "@/ui/components/primitives/SyncIndicator";
import {
  initializeBilling,
  requestSettlement,
} from "@/core/actions/transaction.actions";
import type { TransactionView } from "@/projections/transaction-ledger.view";

// ─── Transaction Row ──────────────────────────────────────────────────────────

interface TxRowProps {
  tx:         TransactionView;
  isSelected: boolean;
  onSelect:   () => void;
}

function TxRow({ tx, isSelected, onSelect }: TxRowProps) {
  const elapsed = tx.completed_hlc
    ? Math.floor((Date.now() - parseInt(tx.completed_hlc.split(":")[0], 10)) / 60_000)
    : 0;

  const statusVariant = {
    INITIALIZED:     "neutral"    as const,
    PAYMENT_PENDING: "called"     as const,
    PROCESSING:      "reserved"   as const,
    SETTLED:         "in-service" as const,
    FAILED:          "expired"    as const,
  }[tx.status] ?? "neutral" as const;

  return (
    <button
      onClick={onSelect}
      style={{
        width: "100%", textAlign: "left",
        padding: "16px 20px",
        background: isSelected ? "#252f38" : "transparent",
        border: "none", borderBottom: "1px solid #1e262d",
        cursor: "pointer", transition: "background 0.15s ease",
        display: "flex", alignItems: "center", gap: "14px",
      }}
    >
      {/* Token */}
      <span style={{
        fontSize: "15px", fontWeight: 900, color: "#e2d609",
        minWidth: "48px",
      }}>
        {tx.queue_token || "—"}
      </span>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "14px", fontWeight: 700, color: "#f5f5f5" }}>
          {tx.customer_display || "Guest"}
        </div>
        <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", marginTop: "2px" }}>
          {tx.service_snapshot.length > 0
            ? tx.service_snapshot.map(s => s.service_name || s.service_id).join(", ")
            : "No services recorded"}
        </div>
      </div>

      {/* Right */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px", flexShrink: 0 }}>
        <span style={{ fontSize: "15px", fontWeight: 800, color: "#f5f5f5" }}>
          {tx.total_etb > 0 ? `${tx.total_etb.toLocaleString()} ETB` : "—"}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Badge variant={statusVariant} label={tx.status.replace("_", " ")} size="sm" />
          {tx.status === "PAYMENT_PENDING" && elapsed > 0 && (
            <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)" }}>{elapsed}m</span>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── Payment Panel ────────────────────────────────────────────────────────────

interface PaymentPanelProps {
  tx:        TransactionView;
  sessionId: string;
  onClose:   () => void;
}

function PaymentPanel({ tx, sessionId, onClose }: PaymentPanelProps) {
  const [barberTip,   setBarberTip]   = useState(tx.barber_tip_etb);
  const [cashierTip,  setCashierTip]  = useState(tx.cashier_tip_etb);
  const [method,      setMethod]      = useState<"CASH" | "TELEBIRR" | "CHAPA">("CASH");
  const [loading,     setLoading]     = useState<string | null>(null);
  const [settled,     setSettled]     = useState(false);

  const total = tx.base_price_etb + barberTip + cashierTip;

  const BARBER_TIP_PRESETS  = [0, 25, 50, 100, 150];
  const CASHIER_TIP_PRESETS = [0, 20, 50];

  const handleInitialize = async () => {
    if (loading) return;
    setLoading("init");
    try {
      await initializeBilling({
        transactionId:    tx.transaction_id,
        aggregateVersion: 2,
        basePriceEtb:     tx.base_price_etb,
        barberTipEtb:     barberTip,
        cashierTipEtb:    cashierTip,
        paymentMethod:    method,
      }, { session_id: sessionId, actor_id: "", role: "CASHIER", actor_name: "", email: "", terminal_id: "", opened_at: "", is_first_login: false });
    } finally { setLoading(null); }
  };

  const handleConfirmCash = async () => {
    if (loading) return;
    setLoading("settle");
    try {
      await requestSettlement({
        transactionId: tx.transaction_id,
        totalEtb:      total,
      }, { session_id: sessionId, actor_id: "", role: "CASHIER", actor_name: "", email: "", terminal_id: "", opened_at: "", is_first_login: false });
      setSettled(true);
      setTimeout(onClose, 1500);
    } finally { setLoading(null); }
  };

  if (settled) {
    return (
      <div style={{ padding: "48px 24px", textAlign: "center" }}>
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>✓</div>
        <h3 style={{ fontSize: "20px", fontWeight: 800, color: "#10b981", marginBottom: "8px" }}>
          Settlement Requested
        </h3>
        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)" }}>
          Awaiting cloud confirmation…
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "#e2d609", textTransform: "uppercase", letterSpacing: "0.15em" }}>
            Settlement
          </span>
          <div style={{ fontSize: "20px", fontWeight: 900, color: "#e2d609", marginTop: "2px" }}>
            {tx.queue_token}
          </div>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: "20px" }} aria-label="Close">×</button>
      </div>

      {/* Service itemization — READ ONLY (locked at EVENT 04) */}
      <div style={{ padding: "16px", background: "#1e262d", borderRadius: "12px", border: "1px solid #2d3840" }}>
        <div style={{ fontSize: "10px", fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "12px" }}>
          Services (locked at service start)
        </div>
        {tx.service_snapshot.length > 0 ? (
          tx.service_snapshot.map((s, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: i < tx.service_snapshot.length - 1 ? "1px solid #2d3840" : "none" }}>
              <span style={{ fontSize: "14px", color: "#f5f5f5" }}>{s.service_name || s.service_id}</span>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "#f5f5f5" }}>{s.price_etb.toLocaleString()} ETB</span>
            </div>
          ))
        ) : (
          <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.3)" }}>No services recorded</div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "12px", marginTop: "8px", borderTop: "1px solid #2d3840" }}>
          <span style={{ fontSize: "14px", fontWeight: 700, color: "rgba(255,255,255,0.6)" }}>Subtotal</span>
          <span style={{ fontSize: "16px", fontWeight: 800, color: "#f5f5f5" }}>{tx.base_price_etb.toLocaleString()} ETB</span>
        </div>
      </div>

      {/* Barber tip */}
      <div>
        <div style={{ fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>
          Tip for Barber (optional)
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {BARBER_TIP_PRESETS.map(amt => (
            <button
              key={amt}
              onClick={() => setBarberTip(amt)}
              style={{
                padding: "8px 14px", borderRadius: "9999px",
                background: barberTip === amt ? "#e2d609" : "transparent",
                color: barberTip === amt ? "#0f1317" : "rgba(255,255,255,0.5)",
                border: `1px solid ${barberTip === amt ? "#e2d609" : "#2d3840"}`,
                fontSize: "13px", fontWeight: 700, cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {amt === 0 ? "None" : `${amt} ETB`}
            </button>
          ))}
        </div>
      </div>

      {/* Cashier tip */}
      <div>
        <div style={{ fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>
          Tip for Front Desk (optional)
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {CASHIER_TIP_PRESETS.map(amt => (
            <button
              key={amt}
              onClick={() => setCashierTip(amt)}
              style={{
                padding: "8px 14px", borderRadius: "9999px",
                background: cashierTip === amt ? "#e2d609" : "transparent",
                color: cashierTip === amt ? "#0f1317" : "rgba(255,255,255,0.5)",
                border: `1px solid ${cashierTip === amt ? "#e2d609" : "#2d3840"}`,
                fontSize: "13px", fontWeight: 700, cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {amt === 0 ? "None" : `${amt} ETB`}
            </button>
          ))}
        </div>
      </div>

      {/* Total */}
      <div style={{ padding: "16px 20px", background: "rgba(226,214,9,0.06)", borderRadius: "12px", border: "1px solid rgba(226,214,9,0.2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "14px", fontWeight: 700, color: "rgba(255,255,255,0.6)" }}>Total</span>
        <span style={{ fontSize: "28px", fontWeight: 900, color: "#e2d609" }}>{total.toLocaleString()} ETB</span>
      </div>

      {/* Payment method */}
      <div>
        <div style={{ fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>
          Payment Method
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          {(["CASH", "TELEBIRR", "CHAPA"] as const).map(m => (
            <button
              key={m}
              onClick={() => setMethod(m)}
              style={{
                flex: 1, padding: "10px 8px", borderRadius: "10px",
                background: method === m ? "rgba(226,214,9,0.1)" : "transparent",
                color: method === m ? "#e2d609" : "rgba(255,255,255,0.4)",
                border: `1px solid ${method === m ? "rgba(226,214,9,0.4)" : "#2d3840"}`,
                fontSize: "12px", fontWeight: 700, cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      {tx.status === "PAYMENT_PENDING" && (
        <button
          onClick={handleInitialize}
          disabled={!!loading}
          style={{
            width: "100%", padding: "13px 28px", borderRadius: "9999px",
            background: "transparent", color: "#e2d609",
            fontSize: "14px", fontWeight: 700,
            border: "2px solid #e2d609", cursor: loading ? "not-allowed" : "pointer",
            transition: "all 0.2s ease",
          }}
        >
          {loading === "init" ? "Locking…" : "Lock Payment Intent"}
        </button>
      )}

      {method === "CASH" ? (
        <button
          onClick={handleConfirmCash}
          disabled={!!loading}
          style={{
            width: "100%", padding: "16px 28px", borderRadius: "9999px",
            background: loading ? "rgba(226,214,9,0.4)" : "#e2d609",
            color: "#0f1317", fontSize: "15px", fontWeight: 900,
            border: "none", cursor: loading ? "not-allowed" : "pointer",
            boxShadow: "0 0 32px rgba(226,214,9,0.25)",
            transition: "all 0.2s ease",
          }}
        >
          {loading === "settle" ? "Confirming…" : `Confirm Cash — ${total.toLocaleString()} ETB`}
        </button>
      ) : (
        <div style={{ padding: "20px", background: "#1e262d", borderRadius: "12px", border: "1px solid #2d3840", textAlign: "center" }}>
          <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", marginBottom: "8px" }}>
            Digital payment QR
          </div>
          <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>
            QR generation requires cloud connection — Phase 8
          </div>
        </div>
      )}

      {/* Sync status */}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <SyncIndicator state="verified" />
      </div>
    </div>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function SettlementScreen() {
  const { view: ledger }  = useTransaction();
  const { session }       = useSession();
  const [selected, setSelected] = useState<TransactionView | null>(null);

  if (!session) return null;

  const active    = ledger?.active ?? [];
  const settled   = ledger?.settled_today ?? [];

  return (
    <div style={{ minHeight: "100dvh", background: "#0f1317", display: "flex", flexDirection: "column" }}>
      <TopBar session={session} />

      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>

        {/* ── Transaction List ──────────────────────────────────────────────── */}
        <div style={{
          width: "100%",
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #2d3840", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#e2d609", textTransform: "uppercase", letterSpacing: "0.15em" }}>
                Settlement Desk
              </span>
              <span style={{ marginLeft: "10px", padding: "2px 8px", borderRadius: "9999px", background: "rgba(245,158,11,0.15)", color: "#f59e0b", fontSize: "11px", fontWeight: 700 }}>
                {active.length} pending
              </span>
            </div>
            <SyncIndicator state="verified" compact />
          </div>

          {/* Active transactions */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {active.length === 0 ? (
              <div style={{ padding: "48px 20px", textAlign: "center" }}>
                <div style={{ fontSize: "32px", marginBottom: "12px" }}>💳</div>
                <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.3)" }}>No pending payments</p>
              </div>
            ) : (
              active.map(tx => (
                <TxRow
                  key={tx.transaction_id}
                  tx={tx}
                  isSelected={selected?.transaction_id === tx.transaction_id}
                  onSelect={() => setSelected(tx)}
                />
              ))
            )}

            {/* Settled today */}
            {settled.length > 0 && (
              <div>
                <div style={{ padding: "8px 20px", background: "rgba(16,185,129,0.06)", borderTop: "1px solid #2d3840", borderBottom: "1px solid #2d3840" }}>
                  <span style={{ fontSize: "10px", fontWeight: 700, color: "#10b981", textTransform: "uppercase", letterSpacing: "0.12em" }}>
                    Settled Today ({settled.length})
                  </span>
                </div>
                {settled.map(tx => (
                  <TxRow key={tx.transaction_id} tx={tx} isSelected={false} onSelect={() => {}} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Payment Panel — full-screen overlay on mobile, side panel on desktop ── */}
        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              style={{
                position: "absolute", inset: 0,
                background: "#0f1317",
                overflowY: "auto",
                padding: "20px 16px",
                zIndex: 10,
              }}
              className="settlement-panel"
            >
              <PaymentPanel
                tx={selected}
                sessionId={session.session_id}
                onClose={() => setSelected(null)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Desktop: side-by-side layout */}
      <style>{`
        @media (min-width: 768px) {
          .settlement-panel {
            position: relative !important;
            inset: auto !important;
            flex: 1 !important;
            border-left: 1px solid #2d3840 !important;
            padding: 24px !important;
          }
          .settlement-panel + * { display: none; }
        }
      `}</style>
    </div>
  );
}
