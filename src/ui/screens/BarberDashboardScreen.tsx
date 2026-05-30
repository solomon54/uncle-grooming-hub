/**
 * @file BarberDashboardScreen.tsx
 * @module ui/screens
 *
 * Barber Lane Cockpit — Lane Cockpit module.
 * Specification: AMS v1.3, IMS v1.1, PRD §13.3, AGENT.md §6
 */

"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence }     from "framer-motion";
import { useBarberLane }               from "@/ui/hooks/useBarberLane";
import { useQueueBoard }               from "@/ui/hooks/useQueueBoard";
import { useTransaction }              from "@/ui/hooks/useTransaction";
import { useSession }                  from "@/ui/hooks/useSession";
import { TopBar }                      from "@/ui/components/shell/TopBar";
import { Badge }                       from "@/ui/components/primitives/Badge";
import { HybridLogicalClock }          from "@/core/clock/hlc";
import {
  setAvailable,
  startService,
  completeService,
  updateSchedule,
} from "@/core/actions/barber.actions";
import type { BarberLaneView, ScheduleRule } from "@/projections/barber-lane.view";
import type { QueueEntryView }               from "@/projections/queue-board.view";

// ─── HLC → elapsed minutes ────────────────────────────────────────────────────

function elapsedMinutes(hlc: string): number {
  try {
    const date = HybridLogicalClock.toDate(hlc);
    return Math.floor((Date.now() - date.getTime()) / 60_000);
  } catch {
    return 0;
  }
}

type Tab = "lane" | "schedule";

// ─── AVAILABLE / OFFLINE / ON_BREAK State ────────────────────────────────────

function AvailableState({ lane, nextUp, onSetAvailable, onBreak, loading }: {
  lane:           BarberLaneView;
  nextUp?:        QueueEntryView;
  onSetAvailable: () => void;
  onBreak:        () => void;
  loading:        string | null;
}) {
  const isOffline = lane.status === "OFFLINE" || lane.status === "ON_BREAK";

  return (
    <motion.div
      key="available"
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "28px", padding: "40px 24px" }}
    >
      {/* Status ring */}
      <div style={{ textAlign: "center" }}>
        <div style={{ position: "relative", display: "inline-flex", marginBottom: "20px" }}>
          <div style={{
            width: "80px", height: "80px", borderRadius: "50%",
            background: isOffline ? "rgba(107,114,128,0.12)" : "rgba(16,185,129,0.12)",
            border: `2px solid ${isOffline ? "rgba(107,114,128,0.3)" : "rgba(16,185,129,0.3)"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: isOffline ? "#6b7280" : "#10b981" }} />
          </div>
          {!isOffline && (
            <div style={{ position: "absolute", inset: "-4px", borderRadius: "50%", border: "2px solid rgba(16,185,129,0.15)", animation: "ping 2s cubic-bezier(0,0,0.2,1) infinite" }} />
          )}
        </div>
        <h2 style={{ fontSize: "clamp(20px,3vw,26px)", fontWeight: 900, color: "#f5f5f5", marginBottom: "8px" }}>
          {lane.status === "ON_BREAK" ? "On Break" : isOffline ? "Offline" : "Ready for Next Client"}
        </h2>
        <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.4)" }}>
          {lane.barber_name}
          {lane.status === "ON_BREAK" && " · Taking a break"}
          {lane.status === "OFFLINE" && " · Not available"}
          {lane.status === "AVAILABLE" && " · Lane open"}
        </p>
      </div>

      {/* Set Available — primary when offline */}
      {isOffline && (
        <button type="button" onClick={onSetAvailable} disabled={loading === "available"}
          style={{ padding: "14px 36px", borderRadius: "9999px", background: loading === "available" ? "rgba(226,214,9,0.4)" : "#e2d609", color: "#0f1317", fontSize: "15px", fontWeight: 900, border: "none", cursor: loading === "available" ? "not-allowed" : "pointer", boxShadow: "0 0 28px rgba(226,214,9,0.25)", transition: "all 0.2s ease" }}>
          {loading === "available" ? "Setting available…" : "Set Available →"}
        </button>
      )}

      {/* Next up card */}
      {!isOffline && nextUp && (
        <div style={{ width: "100%", maxWidth: "360px", padding: "20px", borderRadius: "14px", background: "#1e262d", border: "1px solid #2d3840" }}>
          <div style={{ fontSize: "10px", fontWeight: 700, color: "#e2d609", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "12px" }}>Next in Queue</div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "18px", fontWeight: 900, color: "#e2d609" }}>{nextUp.queue_token}</span>
            <div>
              <div style={{ fontSize: "15px", fontWeight: 700, color: "#f5f5f5" }}>{nextUp.customer_display}</div>
              <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>{nextUp.intents.length > 0 ? `${nextUp.intents.length} service(s)` : "No services selected"}</div>
            </div>
            <div style={{ marginLeft: "auto" }}><Badge variant="waiting" label="WAITING" size="sm" /></div>
          </div>
        </div>
      )}

      {/* Go on Break */}
      {!isOffline && (
        <button type="button" onClick={onBreak} disabled={loading === "break"}
          style={{ padding: "12px 28px", borderRadius: "9999px", background: "transparent", color: "rgba(255,255,255,0.5)", fontSize: "14px", fontWeight: 600, border: "1px solid rgba(255,255,255,0.15)", cursor: "pointer", transition: "all 0.2s ease" }}>
          {loading === "break" ? "…" : "Go on Break"}
        </button>
      )}

      <style>{`@keyframes ping { 75%,100% { transform:scale(1.4); opacity:0; } }`}</style>
    </motion.div>
  );
}

// ─── CALLED State ─────────────────────────────────────────────────────────────

function CalledState({ lane, customer, onStart, onNoShow, loading }: {
  lane:      BarberLaneView;
  customer:  QueueEntryView;
  sessionId: string;
  onStart:   () => void;
  onNoShow:  () => void;
  loading:   string | null;
}) {
  const [elapsed, setElapsed] = useState(() => elapsedMinutes(customer.checkin_hlc));
  const [confirmNoShow, setConfirmNoShow] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setElapsed(elapsedMinutes(customer.checkin_hlc)), 30_000);
    return () => clearInterval(id);
  }, [customer.checkin_hlc]);

  return (
    <motion.div key="called" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      style={{ display: "flex", flexDirection: "column", gap: "20px", padding: "28px 24px" }}>

      <div style={{ textAlign: "center" }}>
        <Badge variant="called" label="CALLED TO CHAIR" />
        <div style={{ marginTop: "12px", fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>
          Waiting {elapsed} min
        </div>
      </div>

      <div style={{ padding: "20px", borderRadius: "14px", background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: customer.intents.length > 0 ? "14px" : 0 }}>
          <span style={{ fontSize: "28px", fontWeight: 900, color: "#f59e0b" }}>{customer.queue_token}</span>
          <div>
            <div style={{ fontSize: "20px", fontWeight: 800, color: "#f5f5f5" }}>{customer.customer_display}</div>
            <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)" }}>{customer.preferred_barber_name ?? lane.barber_name}</div>
          </div>
        </div>
        {customer.intents.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {customer.intents.map(id => (
              <span key={id} style={{ padding: "4px 12px", borderRadius: "9999px", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", fontSize: "12px", color: "#f59e0b", fontWeight: 600 }}>{id}</span>
            ))}
          </div>
        )}
      </div>

      <button type="button" onClick={onStart} disabled={loading === "start"}
        style={{ width: "100%", padding: "16px 28px", borderRadius: "9999px", background: loading === "start" ? "rgba(226,214,9,0.4)" : "#e2d609", color: "#0f1317", fontSize: "16px", fontWeight: 900, border: "none", cursor: loading === "start" ? "not-allowed" : "pointer", boxShadow: "0 0 32px rgba(226,214,9,0.3)", transition: "all 0.2s ease" }}>
        {loading === "start" ? "Starting…" : "Start Service →"}
      </button>

      {/* No-show with confirmation */}
      {!confirmNoShow ? (
        <button type="button" onClick={() => setConfirmNoShow(true)}
          style={{ width: "100%", padding: "12px 28px", borderRadius: "9999px", background: "transparent", color: "rgba(239,68,68,0.7)", fontSize: "14px", fontWeight: 600, border: "1px solid rgba(239,68,68,0.25)", cursor: "pointer", transition: "all 0.2s ease" }}>
          Customer Didn't Show
        </button>
      ) : (
        <div style={{ padding: "14px 16px", borderRadius: "12px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.3)" }}>
          <p style={{ fontSize: "13px", fontWeight: 700, color: "#f87171", marginBottom: "6px" }}>⚠️ Mark as No-Show?</p>
          <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", marginBottom: "12px", lineHeight: 1.5 }}>
            Customer was called but didn't appear. This cannot be undone.
          </p>
          <div style={{ display: "flex", gap: "8px" }}>
            <button type="button" onClick={() => setConfirmNoShow(false)}
              style={{ flex: 1, padding: "10px", borderRadius: "9999px", background: "transparent", border: "1px solid #2d3840", color: "rgba(255,255,255,0.5)", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
              Cancel
            </button>
            <button type="button" onClick={onNoShow} disabled={loading === "noshow"}
              style={{ flex: 1, padding: "10px", borderRadius: "9999px", background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)", color: "#f87171", fontSize: "13px", fontWeight: 700, cursor: loading === "noshow" ? "not-allowed" : "pointer" }}>
              {loading === "noshow" ? "…" : "Yes, No-Show"}
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ─── IN_SERVICE State ─────────────────────────────────────────────────────────

function InServiceState({ customer, onComplete, onEmergencyCancel, loading }: {
  customer:        QueueEntryView;
  sessionId:       string;
  onComplete:      () => void;
  onEmergencyCancel: () => void;
  loading:         string | null;
}) {
  const [elapsed, setElapsed] = useState(0);
  const [showEmergency, setShowEmergency] = useState(false);

  // Timer starts from NOW (service start), not check-in time
  useEffect(() => {
    setElapsed(0);
    const id = setInterval(() => setElapsed(e => e + 1), 60_000);
    return () => clearInterval(id);
  }, [customer.queue_entry_id]);

  return (
    <motion.div key="in-service" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      style={{ display: "flex", flexDirection: "column", gap: "20px", padding: "28px 24px" }}>

      {/* Header */}
      <div style={{ textAlign: "center" }}>
        <Badge variant="in-service" label="IN SERVICE" />
        <div style={{ marginTop: "12px", fontSize: "13px", color: "rgba(255,255,255,0.4)" }}>
          {elapsed === 0 ? "Service just started" : `${elapsed} min into service`}
        </div>
      </div>

      {/* Customer card */}
      <div style={{ padding: "20px", borderRadius: "14px", background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: customer.intents.length > 0 ? "16px" : 0 }}>
          <span style={{ fontSize: "28px", fontWeight: 900, color: "#10b981" }}>{customer.queue_token}</span>
          <div>
            <div style={{ fontSize: "20px", fontWeight: 800, color: "#f5f5f5" }}>{customer.customer_display}</div>
            <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", marginTop: "2px" }}>
              {customer.intents.length} service{customer.intents.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>
        {customer.intents.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {customer.intents.map(id => (
              <span key={id} style={{ padding: "4px 12px", borderRadius: "9999px", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", fontSize: "12px", color: "#10b981", fontWeight: 600 }}>{id}</span>
            ))}
          </div>
        )}
      </div>

      {/* Complete — primary action */}
      <button type="button" onClick={onComplete} disabled={loading === "complete"}
        style={{ width: "100%", padding: "16px 28px", borderRadius: "9999px", background: loading === "complete" ? "rgba(226,214,9,0.4)" : "#e2d609", color: "#0f1317", fontSize: "16px", fontWeight: 900, border: "none", cursor: loading === "complete" ? "not-allowed" : "pointer", boxShadow: "0 0 32px rgba(226,214,9,0.3)", transition: "all 0.2s ease" }}>
        {loading === "complete" ? "Completing…" : "Complete Service ✓"}
      </button>

      {/* Emergency section */}
      {!showEmergency ? (
        <button type="button" onClick={() => setShowEmergency(true)}
          style={{ background: "none", border: "none", color: "rgba(239,68,68,0.5)", cursor: "pointer", fontSize: "12px", textAlign: "center", padding: "4px", textDecoration: "underline" }}>
          Emergency — need to stop service
        </button>
      ) : (
        <div style={{ padding: "16px", borderRadius: "12px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.3)" }}>
          <p style={{ fontSize: "13px", fontWeight: 700, color: "#f87171", marginBottom: "6px" }}>⚠️ Emergency Stop</p>
          <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", marginBottom: "14px", lineHeight: 1.5 }}>
            This will mark the service as complete and remove the customer from the active queue. Use only if something went wrong. The cashier will need to handle payment manually.
          </p>
          <div style={{ display: "flex", gap: "8px" }}>
            <button type="button" onClick={() => setShowEmergency(false)}
              style={{ flex: 1, padding: "10px", borderRadius: "9999px", background: "transparent", border: "1px solid #2d3840", color: "rgba(255,255,255,0.5)", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
              Cancel
            </button>
            <button type="button" onClick={onEmergencyCancel} disabled={loading === "emergency"}
              style={{ flex: 1, padding: "10px", borderRadius: "9999px", background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)", color: "#f87171", fontSize: "13px", fontWeight: 700, cursor: loading === "emergency" ? "not-allowed" : "pointer" }}>
              {loading === "emergency" ? "Stopping…" : "Stop Service"}
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ─── Schedule Tab ─────────────────────────────────────────────────────────────

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function ScheduleTab({ rules, barberId, session }: {
  rules:      ScheduleRule[];
  barberId:   string;
  session:    import("@/core/session/session.types").ActiveSession;
  aggVersion: number;
}) {
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [localRules, setLocalRules] = useState<ScheduleRule[]>(() =>
    DAYS.map((_, i) => rules.find(r => r.day_of_week === i) ?? { day_of_week: i, start_time: "09:00", end_time: "00:00", is_active: i >= 1 && i <= 6 })
  );

  const toggle = (idx: number) =>
    setLocalRules(prev => prev.map((r, i) => i === idx ? { ...r, is_active: !r.is_active } : r));

  const handleSave = async () => {
    setSaving(true);
    try {
      const { journalService } = await import("@/core/journal/journal.service");
      for (const rule of localRules) {
        const v = await journalService.getNextAggregateVersion(barberId);
        await updateSchedule({ barberId, aggregateVersion: v, dayOfWeek: rule.day_of_week, startTime: rule.start_time, endTime: rule.end_time, isActive: rule.is_active }, session);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally { setSaving(false); }
  };

  return (
    <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
      <div>
        <span style={{ fontSize: "11px", fontWeight: 700, color: "#e2d609", textTransform: "uppercase", letterSpacing: "0.15em" }}>Recurring Schedule</span>
        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", marginTop: "4px" }}>Shop hours override these settings.</p>
      </div>
      {saved && <div style={{ padding: "10px 14px", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: "8px" }}><span style={{ fontSize: "13px", color: "#10b981", fontWeight: 600 }}>✓ Schedule saved</span></div>}
      {localRules.map((rule, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", borderRadius: "10px", background: rule.is_active ? "#1e262d" : "rgba(255,255,255,0.03)", border: `1px solid ${rule.is_active ? "#2d3840" : "rgba(255,255,255,0.06)"}` }}>
          <button type="button" onClick={() => toggle(i)}
            style={{ width: "36px", height: "20px", borderRadius: "9999px", background: rule.is_active ? "#e2d609" : "#2d3840", border: "none", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}
            aria-label={`Toggle ${DAYS[i]}`}>
            <div style={{ position: "absolute", top: "2px", left: rule.is_active ? "18px" : "2px", width: "16px", height: "16px", borderRadius: "50%", background: rule.is_active ? "#0f1317" : "#6b7280", transition: "left 0.2s" }} />
          </button>
          <span style={{ fontSize: "13px", fontWeight: 700, color: rule.is_active ? "#f5f5f5" : "rgba(255,255,255,0.3)", width: "32px" }}>{DAYS[i]}</span>
          {rule.is_active && (
            <>
              <input type="time" value={rule.start_time} onChange={e => setLocalRules(prev => prev.map((r, j) => j === i ? { ...r, start_time: e.target.value } : r))}
                style={{ background: "#252f38", border: "1px solid #2d3840", borderRadius: "6px", color: "#f5f5f5", padding: "4px 8px", fontSize: "13px", outline: "none" }} aria-label={`${DAYS[i]} start`} />
              <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "12px" }}>to</span>
              <input type="time" value={rule.end_time} onChange={e => setLocalRules(prev => prev.map((r, j) => j === i ? { ...r, end_time: e.target.value } : r))}
                style={{ background: "#252f38", border: "1px solid #2d3840", borderRadius: "6px", color: "#f5f5f5", padding: "4px 8px", fontSize: "13px", outline: "none" }} aria-label={`${DAYS[i]} end`} />
            </>
          )}
        </div>
      ))}
      <button type="button" onClick={handleSave} disabled={saving}
        style={{ padding: "13px 28px", borderRadius: "9999px", background: saving ? "rgba(226,214,9,0.4)" : "#e2d609", color: "#0f1317", fontSize: "14px", fontWeight: 800, border: "none", cursor: saving ? "not-allowed" : "pointer", boxShadow: "0 0 24px rgba(226,214,9,0.2)", transition: "all 0.2s ease" }}>
        {saving ? "Saving…" : "Save Schedule"}
      </button>
    </div>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function BarberDashboardScreen({ laneId }: { laneId: string }) {
  const { view: lanes }        = useBarberLane();
  const { view: queue }        = useQueueBoard();
  const { view: transactions } = useTransaction();
  const { session }            = useSession();
  const [tab, setTab]          = useState<Tab>("lane");
  const [loading, setLoading]  = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Auto-register lane in projection on first load if it doesn't exist yet
  useEffect(() => {
    if (!session || initialized) return;
    if (lanes === null) return; // still loading
    const laneExists = lanes.lanes.some(l => l.barber_id === laneId);
    setInitialized(true);
    if (!laneExists) {
      void (async () => {
        try {
          const { journalService } = await import("@/core/journal/journal.service");
          const v = await journalService.getNextAggregateVersion(laneId);
          await setAvailable({ barberId: laneId, aggregateVersion: v, status: "OFFLINE" }, session);
        } catch (e) {
          console.warn("[BarberDashboard] Auto-init lane failed:", e);
        }
      })();
    }
  }, [lanes, laneId, session, initialized]);

  if (!session) return null;

  const lane = lanes?.lanes.find(l => l.barber_id === laneId) ?? {
    barber_id: laneId, barber_name: session.actor_name,
    status: "OFFLINE" as const, schedule_rules: [],
  };

  // Find customers for this lane — check both preferred_barber_id AND any-barber entries
  // that were called to this specific lane (via the called/in_service lists)
  const nextUp = queue?.entries.find(
    e => (e.preferred_barber_id === laneId || e.preferred_barber_id === null) && e.status === "WAITING"
  );

  // For called/in-service: match by preferred_barber_id OR fall back to first entry
  // (cashier assigns barber at call time, so preferred_barber_id is set then)
  const calledCustomer = queue?.called.find(
    e => e.preferred_barber_id === laneId
  ) ?? (lane.status === "CALLED" ? queue?.called[0] : undefined);

  const inServiceCustomer = queue?.in_service.find(
    e => e.preferred_barber_id === laneId
  ) ?? (lane.status === "IN_SERVICE" ? queue?.in_service[0] : undefined);

  const todayTips = transactions?.settled_today
    .filter(t => t.barber_id === laneId)
    .reduce((sum, t) => sum + t.barber_tip_etb, 0) ?? 0;

  const handleStartService = async () => {
    if (!calledCustomer || loading) return;
    setLoading("start");
    try {
      const { journalService } = await import("@/core/journal/journal.service");
      const v = await journalService.getNextAggregateVersion(calledCustomer.queue_entry_id);
      await startService({ queueEntryId: calledCustomer.queue_entry_id, aggregateVersion: v, priceSnapshotId: crypto.randomUUID(), barberId: laneId, customerUuid: calledCustomer.customer_uuid, queueToken: calledCustomer.queue_token }, session);
    } finally { setLoading(null); }
  };

  const handleCompleteService = async () => {
    if (!inServiceCustomer || loading) return;
    setLoading("complete");
    try {
      const { journalService } = await import("@/core/journal/journal.service");
      const v = await journalService.getNextAggregateVersion(inServiceCustomer.queue_entry_id);
      await completeService({ queueEntryId: inServiceCustomer.queue_entry_id, aggregateVersion: v }, session);
    } finally { setLoading(null); }
  };

  // Emergency stop — completes service immediately (barber-initiated abort)
  const handleEmergencyCancel = async () => {
    if (!inServiceCustomer || loading) return;
    setLoading("emergency");
    try {
      const { journalService } = await import("@/core/journal/journal.service");
      const v = await journalService.getNextAggregateVersion(inServiceCustomer.queue_entry_id);
      // Complete service — cashier handles payment/adjustment separately
      await completeService({ queueEntryId: inServiceCustomer.queue_entry_id, aggregateVersion: v }, session);
    } finally { setLoading(null); }
  };

  // No-show — cancel the called customer
  const handleNoShow = async () => {
    if (!calledCustomer || loading) return;
    setLoading("noshow");
    try {
      const { journalService } = await import("@/core/journal/journal.service");
      const { cancelReservation } = await import("@/core/actions/queue.actions");
      const v = await journalService.getNextAggregateVersion(calledCustomer.queue_entry_id);
      await cancelReservation({ aggregateId: calledCustomer.queue_entry_id, aggregateVersion: v, sessionId: session.session_id, reasonCode: "NO_SHOW" });
    } finally { setLoading(null); }
  };

  const handleSetAvailable = async () => {
    if (loading) return;
    setLoading("available");
    try {
      const { journalService } = await import("@/core/journal/journal.service");
      const v = await journalService.getNextAggregateVersion(laneId);
      await setAvailable({ barberId: laneId, aggregateVersion: v, status: "AVAILABLE" }, session);
    } finally { setLoading(null); }
  };

  const handleGoOnBreak = async () => {
    if (loading) return;
    setLoading("break");
    try {
      const { journalService } = await import("@/core/journal/journal.service");
      const v = await journalService.getNextAggregateVersion(laneId);
      await setAvailable({ barberId: laneId, aggregateVersion: v, status: "ON_BREAK" }, session);
    } finally { setLoading(null); }
  };

  const laneStatus = lane.status;
  const aggVersion = (lanes?.lanes.length ?? 0) + 1;

  return (
    <div style={{ minHeight: "100dvh", background: "#0f1317", display: "flex", flexDirection: "column" }}>
      <TopBar session={session} />

      {/* Tab bar */}
      <div style={{ display: "flex", borderBottom: "1px solid #2d3840", background: "#171d22" }}>
        {(["lane", "schedule"] as Tab[]).map(t => (
          <button key={t} type="button" onClick={() => setTab(t)}
            style={{ flex: 1, padding: "14px 16px", background: "transparent", border: "none", borderBottom: `2px solid ${tab === t ? "#e2d609" : "transparent"}`, color: tab === t ? "#e2d609" : "rgba(255,255,255,0.4)", fontSize: "13px", fontWeight: tab === t ? 700 : 500, cursor: "pointer", transition: "all 0.2s", textTransform: "capitalize" }}>
            {t === "lane" ? "My Lane" : "Schedule"}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", maxWidth: "480px", width: "100%", margin: "0 auto" }}>
        <AnimatePresence mode="wait">
          {tab === "lane" ? (
            <motion.div key="lane-tab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <AnimatePresence mode="wait">
                {laneStatus === "IN_SERVICE" && inServiceCustomer ? (
                  <InServiceState key="in-service" customer={inServiceCustomer} sessionId={session.session_id} onComplete={handleCompleteService} onEmergencyCancel={handleEmergencyCancel} loading={loading} />
                ) : laneStatus === "CALLED" && calledCustomer ? (
                  <CalledState key="called" lane={lane} customer={calledCustomer} sessionId={session.session_id} onStart={handleStartService} onNoShow={handleNoShow} loading={loading} />
                ) : (
                  <AvailableState key="available" lane={lane} nextUp={nextUp} onSetAvailable={handleSetAvailable} onBreak={handleGoOnBreak} loading={loading} />
                )}
              </AnimatePresence>

              {/* Tips card */}
              <div style={{ margin: "0 24px 24px", padding: "16px 20px", borderRadius: "12px", background: "#1e262d", border: "1px solid #2d3840", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>Today's Tips</span>
                <span style={{ fontSize: "20px", fontWeight: 900, color: "#e2d609" }}>{todayTips.toLocaleString()} ETB</span>
              </div>
            </motion.div>
          ) : (
            <motion.div key="schedule-tab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <ScheduleTab rules={lane.schedule_rules} barberId={laneId} session={session} aggVersion={aggVersion} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
