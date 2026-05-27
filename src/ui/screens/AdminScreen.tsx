/**
 * @file AdminScreen.tsx
 * @module ui/screens
 *
 * Admin Governance Panel — Admin Governance module.
 *
 * Specification: AMS v1.3 — Admin Governance capabilities
 *                IMS v1.1 — Audit & Correction screen
 *                ui-standards.md §7.5 — Admin Screen layout
 *                PRD §13.5 — Admin Control Panel
 *
 * Four sections:
 *   1. Audit Log — HLC-ordered event stream, read-only
 *   2. Adjustment — EVENT 09 non-destructive correction
 *   3. Shop Config — Hours override (EVENT 24), price registry
 *   4. Staff — View/manage operators (Events 27-31)
 *
 * READS FROM: useQueueBoard, useBarberLane, useTransaction, useSession
 * EMITS VIA:  transaction.actions (EVENT 09), schedule.actions (EVENT 24)
 */

"use client";

import React, { useState, useEffect } from "react";
import { useQueueBoard }              from "@/ui/hooks/useQueueBoard";
import { useBarberLane }              from "@/ui/hooks/useBarberLane";
import { useTransaction }             from "@/ui/hooks/useTransaction";
import { useSession }                 from "@/ui/hooks/useSession";
import { useSyncStatus }              from "@/ui/hooks/useSyncStatus";
import { TopBar }                     from "@/ui/components/shell/TopBar";
import { Badge }                      from "@/ui/components/primitives/Badge";
import { SyncIndicator }              from "@/ui/components/primitives/SyncIndicator";
import { sessionService }             from "@/core/session/session.service";
import { appendAdjustment }           from "@/core/actions/transaction.actions";
import { overrideShopHours }          from "@/core/actions/schedule.actions";
import type { TransactionView }       from "@/projections/transaction-ledger.view";

// ─── Section types ────────────────────────────────────────────────────────────

type Section = "audit" | "adjustment" | "config" | "staff";

const SECTIONS: { id: Section; label: string; icon: string }[] = [
  { id: "audit",      label: "Audit Log",    icon: "📋" },
  { id: "adjustment", label: "Adjustment",   icon: "✏️" },
  { id: "config",     label: "Shop Config",  icon: "⚙️" },
  { id: "staff",      label: "Staff",        icon: "👥" },
];

// ─── Audit Log ────────────────────────────────────────────────────────────────

function AuditSection() {
  const { view: ledger } = useTransaction();
  const { view: queue }  = useQueueBoard();
  const [filter, setFilter] = useState<"all" | "active" | "settled">("all");

  const allTx = [
    ...(ledger?.active ?? []),
    ...(ledger?.settled_today ?? []),
  ];

  const filtered = filter === "active"
    ? ledger?.active ?? []
    : filter === "settled"
    ? ledger?.settled_today ?? []
    : allTx;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div>
        <span style={{ fontSize: "11px", fontWeight: 700, color: "#e2d609", textTransform: "uppercase", letterSpacing: "0.15em" }}>
          Transaction Audit Log
        </span>
        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", marginTop: "4px" }}>
          Append-only. Corrections via Adjustment Entry only.
        </p>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: "8px" }}>
        {(["all", "active", "settled"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "6px 14px", borderRadius: "9999px",
              background: filter === f ? "rgba(226,214,9,0.1)" : "transparent",
              border: `1px solid ${filter === f ? "rgba(226,214,9,0.3)" : "#2d3840"}`,
              color: filter === f ? "#e2d609" : "rgba(255,255,255,0.4)",
              fontSize: "12px", fontWeight: 600, cursor: "pointer",
              textTransform: "capitalize",
            }}
          >
            {f} {f === "all" ? `(${allTx.length})` : f === "active" ? `(${ledger?.active.length ?? 0})` : `(${ledger?.settled_today.length ?? 0})`}
          </button>
        ))}
      </div>

      {/* Queue summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
        {[
          { label: "Waiting",    value: queue?.total_waiting ?? 0,          color: "#3b82f6" },
          { label: "In Service", value: queue?.in_service.length ?? 0,      color: "#10b981" },
          { label: "Today",      value: allTx.length,                       color: "#e2d609" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ padding: "12px 14px", background: "#1e262d", borderRadius: "10px", border: "1px solid #2d3840" }}>
            <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>{label}</div>
            <div style={{ fontSize: "22px", fontWeight: 900, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Transaction list */}
      {filtered.length === 0 ? (
        <div style={{ padding: "32px", textAlign: "center", background: "#1e262d", borderRadius: "12px", border: "1px solid #2d3840" }}>
          <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.3)" }}>No transactions</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1px", borderRadius: "12px", overflow: "hidden", border: "1px solid #2d3840" }}>
          {filtered.map(tx => (
            <div key={tx.transaction_id} style={{
              padding: "14px 16px", background: "#1e262d",
              display: "flex", alignItems: "center", gap: "12px",
            }}>
              <span style={{ fontSize: "14px", fontWeight: 900, color: "#e2d609", minWidth: "52px" }}>
                {tx.queue_token || "—"}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "13px", color: "#f5f5f5", fontWeight: 600 }}>{tx.customer_display || "Guest"}</div>
                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {tx.transaction_id.slice(0, 12)}…
                  {tx.service_snapshot.length > 0 && ` · ${tx.service_snapshot.length} service(s)`}
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: "14px", fontWeight: 800, color: "#f5f5f5" }}>
                  {tx.total_etb > 0 ? `${tx.total_etb.toLocaleString()} ETB` : "—"}
                </div>
                <Badge
                  variant={tx.is_settled ? "in-service" : tx.status === "PAYMENT_PENDING" ? "called" : "waiting"}
                  label={tx.status.replace("_", " ")}
                  size="sm"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Adjustment Entry ─────────────────────────────────────────────────────────

function AdjustmentSection({ session }: { session: NonNullable<ReturnType<typeof useSession>["session"]> }) {
  const { view: ledger } = useTransaction();
  const [txId,       setTxId]       = useState("");
  const [reasonCode, setReasonCode] = useState("CORRECTION");
  const [notes,      setNotes]      = useState("");
  const [loading,    setLoading]    = useState(false);
  const [success,    setSuccess]    = useState(false);
  const [error,      setError]      = useState("");

  const allTx = [...(ledger?.active ?? []), ...(ledger?.settled_today ?? [])];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txId) { setError("Select a transaction"); return; }
    setLoading(true); setError("");
    try {
      const { journalService } = await import("@/core/journal/journal.service");
      const adjId = crypto.randomUUID();
      const nextVersion = await journalService.getNextAggregateVersion(adjId);
      await appendAdjustment({
        adjustmentId:            adjId,
        aggregateVersion:        nextVersion,
        originalTransactionUuid: txId,
        reasonCode,
        adjustmentData:          { notes, adjusted_by: session.actor_id },
      }, session);
      setSuccess(true);
      setTxId(""); setNotes("");
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError("Adjustment failed — check console");
      console.error(err);
    } finally { setLoading(false); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div>
        <span style={{ fontSize: "11px", fontWeight: 700, color: "#e2d609", textTransform: "uppercase", letterSpacing: "0.15em" }}>
          Adjustment Entry
        </span>
        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", marginTop: "4px" }}>
          Non-destructive correction. Original record is preserved. EVENT 09.
        </p>
      </div>

      {success && (
        <div style={{ padding: "12px 16px", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: "10px" }}>
          <span style={{ fontSize: "13px", color: "#10b981", fontWeight: 600 }}>✓ Adjustment recorded</span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <div>
          <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>
            Transaction
          </label>
          <select
            value={txId}
            onChange={e => setTxId(e.target.value)}
            aria-label="Select transaction to adjust"
            style={{ width: "100%", padding: "11px 14px", background: "#252f38", border: "1.5px solid #2d3840", borderRadius: "10px", color: "#f5f5f5", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
          >
            <option value="">Select transaction…</option>
            {allTx.map(tx => (
              <option key={tx.transaction_id} value={tx.transaction_id}>
                {tx.queue_token} — {tx.customer_display} — {tx.total_etb} ETB ({tx.status})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>
            Reason Code
          </label>
          <select
            value={reasonCode}
            onChange={e => setReasonCode(e.target.value)}
            aria-label="Reason code"
            style={{ width: "100%", padding: "11px 14px", background: "#252f38", border: "1.5px solid #2d3840", borderRadius: "10px", color: "#f5f5f5", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
          >
            <option value="CORRECTION">Correction</option>
            <option value="REFUND">Refund</option>
            <option value="DISPUTE">Dispute</option>
            <option value="SYSTEM_ERROR">System Error</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        <div>
          <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>
            Notes
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Describe the correction…"
            rows={3}
            style={{ width: "100%", padding: "11px 14px", background: "#252f38", border: "1.5px solid #2d3840", borderRadius: "10px", color: "#f5f5f5", fontSize: "14px", outline: "none", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }}
          />
        </div>

        {error && <p style={{ fontSize: "12px", color: "#f87171" }}>{error}</p>}

        <button
          type="submit"
          disabled={loading || !txId}
          style={{
            padding: "13px", borderRadius: "9999px",
            background: loading || !txId ? "rgba(226,214,9,0.3)" : "#e2d609",
            color: "#0f1317", fontSize: "14px", fontWeight: 800,
            border: "none", cursor: loading || !txId ? "not-allowed" : "pointer",
            transition: "all 0.2s",
          }}
        >
          {loading ? "Recording…" : "Record Adjustment (EVENT 09)"}
        </button>
      </form>
    </div>
  );
}

// ─── Shop Config ──────────────────────────────────────────────────────────────

function ConfigSection({ session }: { session: NonNullable<ReturnType<typeof useSession>["session"]> }) {
  const [openTime,  setOpenTime]  = useState("08:00");
  const [closeTime, setCloseTime] = useState("20:00");
  const [isClosed,  setIsClosed]  = useState(false);
  const [dateScope, setDateScope] = useState("DEFAULT");
  const [loading,   setLoading]   = useState(false);
  const [success,   setSuccess]   = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      const { journalService } = await import("@/core/journal/journal.service");
      const sysId = "system_process_001";
      const nextVersion = await journalService.getNextAggregateVersion(sysId);
      await overrideShopHours({
        systemProcessId:  sysId,
        aggregateVersion: nextVersion,
        dateScope,
        openTime:         isClosed ? undefined : openTime,
        closeTime:        isClosed ? undefined : closeTime,
        isClosed,
      }, session);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } finally { setLoading(false); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div>
        <span style={{ fontSize: "11px", fontWeight: 700, color: "#e2d609", textTransform: "uppercase", letterSpacing: "0.15em" }}>
          Shop Configuration
        </span>
        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", marginTop: "4px" }}>
          Changes apply prospectively. Active sessions are not affected.
        </p>
      </div>

      {success && (
        <div style={{ padding: "12px 16px", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: "10px" }}>
          <span style={{ fontSize: "13px", color: "#10b981", fontWeight: 600 }}>✓ Shop hours updated (EVENT 24)</span>
        </div>
      )}

      {/* Operating hours */}
      <div style={{ padding: "20px", background: "#1e262d", borderRadius: "12px", border: "1px solid #2d3840", display: "flex", flexDirection: "column", gap: "14px" }}>
        <div style={{ fontSize: "12px", fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Operating Hours Override
        </div>

        <div>
          <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "rgba(255,255,255,0.4)", marginBottom: "6px" }}>Date Scope</label>
          <input
            type="text"
            value={dateScope}
            onChange={e => setDateScope(e.target.value)}
            placeholder="DEFAULT or YYYY-MM-DD"
            style={{ width: "100%", padding: "10px 14px", background: "#252f38", border: "1px solid #2d3840", borderRadius: "8px", color: "#f5f5f5", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            onClick={() => setIsClosed(c => !c)}
            style={{
              width: "40px", height: "22px", borderRadius: "9999px",
              background: isClosed ? "#ef4444" : "#2d3840",
              border: "none", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0,
            }}
            aria-label="Toggle closed"
          >
            <div style={{ position: "absolute", top: "3px", left: isClosed ? "20px" : "3px", width: "16px", height: "16px", borderRadius: "50%", background: "#f5f5f5", transition: "left 0.2s" }} />
          </button>
          <span style={{ fontSize: "13px", color: isClosed ? "#ef4444" : "rgba(255,255,255,0.5)" }}>
            {isClosed ? "Shop Closed" : "Shop Open"}
          </span>
        </div>

        {!isClosed && (
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "rgba(255,255,255,0.4)", marginBottom: "5px" }}>Open</label>
              <input type="time" value={openTime} onChange={e => setOpenTime(e.target.value)}
                style={{ width: "100%", padding: "9px 12px", background: "#252f38", border: "1px solid #2d3840", borderRadius: "8px", color: "#f5f5f5", fontSize: "14px", outline: "none" }}
                aria-label="Opening time"
              />
            </div>
            <span style={{ color: "rgba(255,255,255,0.3)", marginTop: "18px" }}>→</span>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "rgba(255,255,255,0.4)", marginBottom: "5px" }}>Close</label>
              <input type="time" value={closeTime} onChange={e => setCloseTime(e.target.value)}
                style={{ width: "100%", padding: "9px 12px", background: "#252f38", border: "1px solid #2d3840", borderRadius: "8px", color: "#f5f5f5", fontSize: "14px", outline: "none" }}
                aria-label="Closing time"
              />
            </div>
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={loading}
          style={{
            padding: "12px", borderRadius: "9999px",
            background: loading ? "rgba(226,214,9,0.3)" : "#e2d609",
            color: "#0f1317", fontSize: "14px", fontWeight: 800,
            border: "none", cursor: loading ? "not-allowed" : "pointer",
            transition: "all 0.2s",
          }}
        >
          {loading ? "Saving…" : "Save Hours (EVENT 24)"}
        </button>
      </div>
    </div>
  );
}

// ─── Staff Section ────────────────────────────────────────────────────────────

function StaffSection() {
  const { view: lanes } = useBarberLane();
  const [roster, setRoster] = useState<ReturnType<typeof sessionService.getRoster>>([]);

  useEffect(() => {
    setRoster(sessionService.getRoster());
  }, []);

  const ROLE_COLOR: Record<string, string> = {
    SYSTEM_OWNER: "#fb923c",
    ADMIN:        "#e2d609",
    CASHIER:      "#38bdf8",
    BARBER:       "#2dd4bf",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div>
        <span style={{ fontSize: "11px", fontWeight: 700, color: "#e2d609", textTransform: "uppercase", letterSpacing: "0.15em" }}>
          Staff Roster
        </span>
        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", marginTop: "4px" }}>
          Full staff management (Events 27–31) — Phase 2
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {roster.map(op => {
          const lane = lanes?.lanes.find(l => l.barber_id === op.barber_id);
          return (
            <div key={op.actor_id} style={{
              padding: "14px 16px", background: "#1e262d",
              borderRadius: "12px", border: "1px solid #2d3840",
              display: "flex", alignItems: "center", gap: "12px",
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "14px", fontWeight: 700, color: "#f5f5f5" }}>{op.name}</span>
                  <span style={{
                    padding: "2px 8px", borderRadius: "9999px",
                    background: `${ROLE_COLOR[op.role] ?? "#6b7280"}20`,
                    color: ROLE_COLOR[op.role] ?? "#6b7280",
                    fontSize: "10px", fontWeight: 700, textTransform: "uppercase",
                  }}>
                    {op.role}
                  </span>
                </div>
                <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", marginTop: "2px" }}>
                  {op.username}
                  {op.barber_id && ` · ${op.barber_id}`}
                </div>
              </div>
              {lane && (
                <Badge
                  variant={lane.status === "AVAILABLE" ? "waiting" : lane.status === "IN_SERVICE" ? "in-service" : lane.status === "CALLED" ? "called" : "neutral"}
                  label={lane.status}
                  size="sm"
                />
              )}
            </div>
          );
        })}
      </div>

      <div style={{ padding: "12px 16px", background: "rgba(226,214,9,0.06)", borderRadius: "10px", border: "1px solid rgba(226,214,9,0.15)" }}>
        <span style={{ fontSize: "12px", color: "#e2d609" }}>
          Add/deactivate staff, reset PINs, manage terminals — Phase 2 (Events 27–31)
        </span>
      </div>
    </div>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AdminScreen() {
  const { session }         = useSession();
  const sync                = useSyncStatus();
  const [section, setSection] = useState<Section>("audit");

  if (!session) return null;

  return (
    <div style={{ minHeight: "100dvh", background: "#0f1317", display: "flex", flexDirection: "column" }}>
      <TopBar session={session} />

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* ── Sidebar ───────────────────────────────────────────────────────── */}
        <nav
          style={{
            width: "200px", flexShrink: 0,
            background: "#171d22", borderRight: "1px solid #2d3840",
            display: "flex", flexDirection: "column",
            padding: "16px 10px", gap: "4px",
          }}
          aria-label="Admin navigation"
        >
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              style={{
                display: "flex", alignItems: "center", gap: "10px",
                padding: "10px 12px", borderRadius: "10px",
                background: section === s.id ? "rgba(226,214,9,0.1)" : "transparent",
                border: `1px solid ${section === s.id ? "rgba(226,214,9,0.25)" : "transparent"}`,
                color: section === s.id ? "#e2d609" : "rgba(255,255,255,0.5)",
                fontSize: "13px", fontWeight: section === s.id ? 700 : 500,
                cursor: "pointer", textAlign: "left",
                transition: "all 0.15s ease",
              }}
            >
              <span>{s.icon}</span>
              <span>{s.label}</span>
            </button>
          ))}

          {/* Sync status at bottom */}
          <div style={{ marginTop: "auto", padding: "10px 12px" }}>
            <SyncIndicator state={sync.state} pendingCount={sync.pendingCount} />
          </div>
        </nav>

        {/* ── Content ───────────────────────────────────────────────────────── */}
        <main style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
          <div style={{ maxWidth: "720px" }}>
            {section === "audit"      && <AuditSection />}
            {section === "adjustment" && <AdjustmentSection session={session} />}
            {section === "config"     && <ConfigSection session={session} />}
            {section === "staff"      && <StaffSection />}
          </div>
        </main>
      </div>
    </div>
  );
}
