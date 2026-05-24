/**
 * @file CashierScreen.tsx
 * @module ui/screens
 *
 * Cashier Concierge — Concierge & Check-in module.
 *
 * Specification: AMS v1.3 — Concierge & Check-in capabilities
 *                IMS v1.1 — Client Intake + Queue Manager screens
 *                ui-standards.md §7.2 — Cashier Screen layout
 *                AGENT.md §6 — UI Rules
 *                TAS §13 — Customer Preference Sovereignty
 *                CXS v1.1 §3.3 — Queue Token system
 *
 * READS FROM: useQueueBoard(), useBarberLane(), useSession()
 * EMITS VIA:  queue.actions (Events 01, 03, 12, 20, 21, 22)
 *
 * INVARIANTS enforced in UI:
 *   - "Call to Chair" disabled if preferred barber not AVAILABLE
 *   - Intent add/remove disabled after is_intent_locked (EVENT 04)
 *   - No automatic queue reordering
 */

"use client";

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence }       from "framer-motion";
import { useQueueBoard }                 from "@/ui/hooks/useQueueBoard";
import { useBarberLane }                 from "@/ui/hooks/useBarberLane";
import { useSession }                    from "@/ui/hooks/useSession";
import { TopBar }                        from "@/ui/components/shell/TopBar";
import { Badge }                         from "@/ui/components/primitives/Badge";
import { SyncIndicator }                 from "@/ui/components/primitives/SyncIndicator";
import { useSyncStatus }                 from "@/ui/hooks/useSyncStatus";
import { issueQueueToken }               from "@/core/queue/queue-token";
import {
  checkInCustomer,
  callCustomer,
  cancelReservation,
  addServiceIntent,
  removeServiceIntent,
} from "@/core/actions/queue.actions";
import type { QueueEntryView }  from "@/projections/queue-board.view";
import type { BarberLaneView }  from "@/projections/barber-lane.view";

// ─── Status badge variant map ─────────────────────────────────────────────────

function statusVariant(status: QueueEntryView["status"]) {
  const map: Record<string, "waiting" | "reserved" | "called" | "in-service"> = {
    WAITING:    "waiting",
    RESERVED:   "reserved",
    CALLED:     "called",
    IN_SERVICE: "in-service",
  };
  return map[status] ?? "neutral" as "waiting";
}

// ─── Queue Entry Row ──────────────────────────────────────────────────────────

interface QueueRowProps {
  entry:      QueueEntryView;
  isSelected: boolean;
  onSelect:   () => void;
}

function QueueRow({ entry, isSelected, onSelect }: QueueRowProps) {
  return (
    <button
      onClick={onSelect}
      style={{
        width: "100%", textAlign: "left",
        padding: "14px 16px",
        background: isSelected ? "#252f38" : "transparent",
        border: "none",
        borderBottom: "1px solid #1e262d",
        cursor: "pointer",
        transition: "background 0.15s ease",
        display: "flex", alignItems: "center", gap: "12px",
      }}
    >
      {/* Position */}
      <span style={{
        width: "28px", height: "28px", borderRadius: "50%",
        background: isSelected ? "#e2d609" : "#2d3840",
        color: isSelected ? "#0f1317" : "rgba(255,255,255,0.5)",
        fontSize: "11px", fontWeight: 700,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        {entry.position}
      </span>

      {/* Token + name */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "13px", fontWeight: 700, color: "#e2d609" }}>
            {entry.queue_token || "—"}
          </span>
          <span style={{ fontSize: "14px", fontWeight: 600, color: "#f5f5f5" }}>
            {entry.customer_display}
          </span>
        </div>
        <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", marginTop: "2px" }}>
          {entry.preferred_barber_name ?? entry.preferred_barber_id ?? "Any barber"}
          {entry.intents.length > 0 && (
            <span style={{ marginLeft: "8px", color: "rgba(255,255,255,0.3)" }}>
              · {entry.intents.length} service{entry.intents.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* Status + wait */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px", flexShrink: 0 }}>
        <Badge variant={statusVariant(entry.status)} label={entry.status} size="sm" />
        <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>
          ~{entry.estimated_wait_minutes}m
        </span>
      </div>
    </button>
  );
}

// ─── Check-In Form ────────────────────────────────────────────────────────────

interface CheckInFormProps {
  barbers:       BarberLaneView[];
  totalInQueue:  number;
  sessionId:     string;
  onSuccess:     () => void;
}

function CheckInForm({ barbers, totalInQueue, sessionId, onSuccess }: CheckInFormProps) {
  const [name,      setName]      = useState("");
  const [barberId,  setBarberId]  = useState("");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const [lastToken, setLastToken] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError("Customer name is required"); return; }

    setLoading(true);
    setError("");

    try {
      const token = issueQueueToken();
      const result = await checkInCustomer({
        aggregateId:       crypto.randomUUID(),
        sessionId,
        customerUuid:      crypto.randomUUID(),
        preferredBarberId: barberId || null,
        checkinMethod:     "walk-in",
        customerName:      name.trim(),
        queueToken:        token,
      });

      if (result && "success" in result && !result.success) {
        setError(`Check-in rejected: ${result.reason}`);
        return;
      }

      setLastToken(token);
      setName("");
      setBarberId("");
      onSuccess();
    } catch (err) {
      setError("Check-in failed. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div>
        <label style={{ fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "6px" }}>
          Customer Name
        </label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="First name"
          autoFocus
          style={{
            width: "100%", padding: "11px 14px",
            background: "#252f38", border: `1px solid ${error ? "#ef4444" : "#2d3840"}`,
            borderRadius: "10px", color: "#f5f5f5",
            fontSize: "15px", outline: "none",
          }}
        />
      </div>

      <div>
        <label style={{ fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "6px" }}>
          Preferred Barber
        </label>
        <select
          value={barberId}
          onChange={e => setBarberId(e.target.value)}
          aria-label="Select preferred barber"
          style={{
            width: "100%", padding: "11px 14px",
            background: "#252f38", border: "1px solid #2d3840",
            borderRadius: "10px", color: "#f5f5f5",
            fontSize: "15px", outline: "none",
          }}
        >
          <option value="">Any Available</option>
          {barbers.map(b => (
            <option key={b.barber_id} value={b.barber_id} disabled={b.status === "OFFLINE"}>
              {b.barber_name} — {b.status}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p style={{ fontSize: "13px", color: "#ef4444", margin: 0 }}>{error}</p>
      )}

      {lastToken && (
        <div style={{
          padding: "14px 16px", borderRadius: "12px",
          background: "rgba(226,214,9,0.1)", border: "1px solid rgba(226,214,9,0.35)",
          textAlign: "center",
        }}>
          <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", marginBottom: "4px" }}>
            Queue token — tell the customer
          </div>
          <div style={{ fontSize: "28px", fontWeight: 900, color: "#e2d609", letterSpacing: "0.05em" }}>
            {lastToken}
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        style={{
          padding: "13px 28px", borderRadius: "9999px",
          background: loading ? "rgba(226,214,9,0.4)" : "#e2d609",
          color: "#0f1317", fontSize: "14px", fontWeight: 800,
          border: "none", cursor: loading ? "not-allowed" : "pointer",
          boxShadow: "0 0 24px rgba(226,214,9,0.25)",
          transition: "all 0.2s ease",
        }}
      >
        {loading ? "Checking in…" : "Check In Customer →"}
      </button>
    </form>
  );
}

// ─── Selected Customer Panel ──────────────────────────────────────────────────

interface SelectedPanelProps {
  entry:    QueueEntryView;
  barbers:  BarberLaneView[];
  sessionId: string;
  onClose:  () => void;
}

function SelectedPanel({ entry, barbers, sessionId, onClose }: SelectedPanelProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const preferredBarber = barbers.find(b => b.barber_id === entry.preferred_barber_id);
  const canCall = !entry.preferred_barber_id || preferredBarber?.status === "AVAILABLE";

  const handleCall = async () => {
    if (!canCall || loading) return;
    setLoading("call");
    try {
      const result = await callCustomer({
        aggregateId: entry.queue_entry_id,
        sessionId,
        barberId:    entry.preferred_barber_id ?? "",
      });
      if (result && "success" in result && !result.success) {
        console.warn("Call rejected:", result.reason);
        return;
      }
      onClose();
    } finally { setLoading(null); }
  };

  const handleCancel = async () => {
    if (loading) return;
    setLoading("cancel");
    try {
      await cancelReservation({
        aggregateId: entry.queue_entry_id,
        sessionId,
        reasonCode:  "CUSTOMER_REQUEST",
      });
      onClose();
    } finally { setLoading(null); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Customer info */}
      <div style={{ padding: "16px", background: "#1e262d", borderRadius: "12px", border: "1px solid #2d3840" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
          <span style={{ fontSize: "20px", fontWeight: 900, color: "#e2d609" }}>
            {entry.queue_token || "—"}
          </span>
          <div>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "#f5f5f5" }}>
              {entry.customer_display}
            </div>
            <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>
              {entry.preferred_barber_name ?? entry.preferred_barber_id ?? "Any barber"}
            </div>
          </div>
          <div style={{ marginLeft: "auto" }}>
            <Badge variant={statusVariant(entry.status)} label={entry.status} size="sm" />
          </div>
        </div>

        {/* Intents */}
        {entry.intents.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {entry.intents.map(id => (
              <span key={id} style={{
                padding: "3px 10px", borderRadius: "9999px",
                background: "rgba(226,214,9,0.1)", border: "1px solid rgba(226,214,9,0.2)",
                fontSize: "11px", color: "#e2d609", fontWeight: 600,
              }}>
                {id}
                {!entry.is_intent_locked && (
                  <button
                    onClick={() => removeServiceIntent({ aggregateId: entry.queue_entry_id, aggregateVersion: 2, sessionId, serviceId: id })}
                    style={{ marginLeft: "6px", background: "none", border: "none", color: "rgba(226,214,9,0.6)", cursor: "pointer", fontSize: "11px" }}
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Call to Chair */}
      <div>
        <button
          onClick={handleCall}
          disabled={!canCall || loading === "call"}
          style={{
            width: "100%", padding: "13px 28px", borderRadius: "9999px",
            background: canCall ? "#e2d609" : "rgba(226,214,9,0.2)",
            color: canCall ? "#0f1317" : "rgba(255,255,255,0.3)",
            fontSize: "14px", fontWeight: 800,
            border: "none", cursor: canCall ? "pointer" : "not-allowed",
            boxShadow: canCall ? "0 0 24px rgba(226,214,9,0.25)" : "none",
            transition: "all 0.2s ease",
          }}
        >
          {loading === "call" ? "Calling…" : "Call to Chair →"}
        </button>
        {!canCall && preferredBarber && (
          <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", textAlign: "center", marginTop: "8px" }}>
            {preferredBarber.barber_name} is {preferredBarber.status.toLowerCase()} — cannot call yet
          </p>
        )}
      </div>

      {/* Cancel */}
      <button
        onClick={handleCancel}
        disabled={loading === "cancel"}
        style={{
          width: "100%", padding: "12px 28px", borderRadius: "9999px",
          background: "transparent", color: "#ef4444",
          fontSize: "14px", fontWeight: 700,
          border: "2px solid rgba(239,68,68,0.4)", cursor: "pointer",
          transition: "all 0.2s ease",
        }}
      >
        {loading === "cancel" ? "Cancelling…" : "Cancel & Remove"}
      </button>
    </div>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CashierScreen() {
  const { view: queue }   = useQueueBoard();
  const { view: lanes }   = useBarberLane();
  const { session }       = useSession();
  const sync              = useSyncStatus();
  const [selected, setSelected] = useState<QueueEntryView | null>(null);

  const allEntries = [
    ...(queue?.reservations ?? []),
    ...(queue?.entries ?? []),
    ...(queue?.called ?? []),
  ];

  const barbers = lanes?.lanes ?? [];

  if (!session) return null;

  return (
    <div style={{ minHeight: "100dvh", background: "#0f1317", display: "flex", flexDirection: "column" }}>
      <TopBar session={session} />

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* ── Left: Queue List ─────────────────────────────────────────────── */}
        <div style={{
          width: "60%", minWidth: "300px",
          borderRight: "1px solid #2d3840",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{
            padding: "16px 20px",
            borderBottom: "1px solid #2d3840",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#e2d609", textTransform: "uppercase", letterSpacing: "0.15em" }}>
                Waiting Queue
              </span>
              <span style={{
                marginLeft: "10px", padding: "2px 8px", borderRadius: "9999px",
                background: "rgba(59,130,246,0.15)", color: "#3b82f6",
                fontSize: "11px", fontWeight: 700,
              }}>
                {queue?.total_waiting ?? 0}
              </span>
            </div>
            <SyncIndicator state={sync.state} compact />
          </div>

          {/* Reservations section */}
          {(queue?.reservations?.length ?? 0) > 0 && (
            <div>
              <div style={{ padding: "8px 20px", background: "rgba(139,92,246,0.08)", borderBottom: "1px solid #2d3840" }}>
                <span style={{ fontSize: "10px", fontWeight: 700, color: "#8b5cf6", textTransform: "uppercase", letterSpacing: "0.12em" }}>
                  Reserved ({queue!.reservations.length})
                </span>
              </div>
              {queue!.reservations.map(entry => (
                <QueueRow
                  key={entry.queue_entry_id}
                  entry={entry}
                  isSelected={selected?.queue_entry_id === entry.queue_entry_id}
                  onSelect={() => setSelected(entry)}
                />
              ))}
            </div>
          )}

          {/* Waiting + Called entries */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {allEntries.filter(e => e.status !== "RESERVED").length === 0 ? (
              <div style={{ padding: "48px 20px", textAlign: "center" }}>
                <div style={{ fontSize: "32px", marginBottom: "12px" }}>🪑</div>
                <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.3)" }}>
                  No customers waiting
                </p>
              </div>
            ) : (
              allEntries
                .filter(e => e.status !== "RESERVED")
                .map(entry => (
                  <QueueRow
                    key={entry.queue_entry_id}
                    entry={entry}
                    isSelected={selected?.queue_entry_id === entry.queue_entry_id}
                    onSelect={() => setSelected(entry)}
                  />
                ))
            )}
          </div>

          {/* In-service strip */}
          {(queue?.in_service?.length ?? 0) > 0 && (
            <div style={{ borderTop: "1px solid #2d3840", padding: "8px 20px", background: "rgba(16,185,129,0.06)" }}>
              <span style={{ fontSize: "10px", fontWeight: 700, color: "#10b981", textTransform: "uppercase", letterSpacing: "0.12em" }}>
                In Service ({queue!.in_service.length})
              </span>
              <div style={{ display: "flex", gap: "8px", marginTop: "6px", flexWrap: "wrap" }}>
                {queue!.in_service.map(e => (
                  <span key={e.queue_entry_id} style={{
                    padding: "3px 10px", borderRadius: "9999px",
                    background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.2)",
                    fontSize: "12px", color: "#10b981", fontWeight: 700,
                  }}>
                    {e.queue_token}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Right: Action Panel ───────────────────────────────────────────── */}
        <div style={{
          flex: 1,
          overflowY: "auto",
          padding: "24px",
          display: "flex", flexDirection: "column", gap: "24px",
        }}>
          <AnimatePresence mode="wait">
            {selected ? (
              <motion.div
                key={selected.queue_entry_id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#e2d609", textTransform: "uppercase", letterSpacing: "0.15em" }}>
                    Customer Actions
                  </span>
                  <button
                    onClick={() => setSelected(null)}
                    style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: "18px" }}
                    aria-label="Close panel"
                  >
                    ×
                  </button>
                </div>
                <SelectedPanel
                  entry={selected}
                  barbers={barbers}
                  sessionId={session.session_id}
                  onClose={() => setSelected(null)}
                />
              </motion.div>
            ) : (
              <motion.div
                key="checkin"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                <div style={{ marginBottom: "20px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#e2d609", textTransform: "uppercase", letterSpacing: "0.15em" }}>
                    Check In New Customer
                  </span>
                </div>
                <CheckInForm
                  barbers={barbers}
                  totalInQueue={queue?.total_waiting ?? 0}
                  sessionId={session.session_id}
                  onSuccess={() => {}}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Barber lane status strip */}
          {barbers.length > 0 && (
            <div style={{ marginTop: "auto", paddingTop: "20px", borderTop: "1px solid #2d3840" }}>
              <span style={{ fontSize: "10px", fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.12em", display: "block", marginBottom: "10px" }}>
                Barber Lanes
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {barbers.map(b => (
                  <div key={b.barber_id} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "8px 12px", borderRadius: "8px", background: "#1e262d",
                  }}>
                    <span style={{ fontSize: "13px", color: "#f5f5f5", fontWeight: 600 }}>{b.barber_name}</span>
                    <Badge
                      variant={
                        b.status === "AVAILABLE"   ? "waiting"    :
                        b.status === "IN_SERVICE"  ? "in-service" :
                        b.status === "CALLED"      ? "called"     :
                        "neutral"
                      }
                      label={b.status}
                      size="sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
