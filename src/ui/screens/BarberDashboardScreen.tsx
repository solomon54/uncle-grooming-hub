/**
 * @file BarberDashboardScreen.tsx
 * @module ui/screens
 *
 * Barber Lane Cockpit — Lane Cockpit module.
 *
 * Specification: AMS v1.3 — Lane Cockpit capabilities
 *                IMS v1.1 — Barber Dashboard screen
 *                ui-standards.md §7.3 — Barber Dashboard layout
 *                PRD §13.3 — Barber Interface (interruption avoidance)
 *                AGENT.md §6 — UI Rules
 *
 * READS FROM: useBarberLane(), useQueueBoard(), useTransaction(), useSession()
 * EMITS VIA:  barber.actions (Events 02, 04, 05, 23)
 *
 * INVARIANTS enforced in UI:
 *   - "Start Service" only available when status is CALLED
 *   - "Complete Service" only available when status is IN_SERVICE
 *   - Service list is READ ONLY after EVENT 04 (is_intent_locked)
 *   - No financial data shown (barber sees tips only, in aggregate)
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

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type Tab = "lane" | "schedule";

// ─── AVAILABLE State ──────────────────────────────────────────────────────────

interface AvailableStateProps {
  lane:         BarberLaneView;
  nextUp?:      QueueEntryView;
  onSetAvailable: () => void;
  onBreak:      () => void;
  loading:      string | null;
}

function AvailableState({ lane, nextUp, onSetAvailable, onBreak, loading }: AvailableStateProps) {
  const isOffline = lane.status === "OFFLINE" || lane.status === "ON_BREAK";

  return (
    <motion.div
      key="available"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "28px", padding: "40px 24px" }}
    >
      {/* Status indicator */}
      <div style={{ textAlign: "center" }}>
        <div style={{ position: "relative", display: "inline-flex", marginBottom: "20px" }}>
          <div style={{
            width: "80px", height: "80px", borderRadius: "50%",
            background: isOffline ? "rgba(107,114,128,0.12)" : "rgba(16,185,129,0.12)",
            border: `2px solid ${isOffline ? "rgba(107,114,128,0.3)" : "rgba(16,185,129,0.3)"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <div style={{
              width: "20px", height: "20px", borderRadius: "50%",
              background: isOffline ? "#6b7280" : "#10b981",
            }} />
          </div>
          {!isOffline && (
            <div style={{
              position: "absolute", inset: "-4px", borderRadius: "50%",
              border: "2px solid rgba(16,185,129,0.15)",
              animation: "ping 2s cubic-bezier(0,0,0.2,1) infinite",
            }} />
          )}
        </div>
        <h2 style={{ fontSize: "clamp(20px, 3vw, 26px)", fontWeight: 900, color: "#f5f5f5", marginBottom: "8px" }}>
          {isOffline
            ? lane.status === "ON_BREAK" ? "On Break" : "Offline"
            : "Ready for Next Client"}
        </h2>
        <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.4)" }}>
          {lane.barber_name}
          {lane.status === "ON_BREAK" && " · Taking a break"}
          {lane.status === "OFFLINE" && " · Not available"}
          {lane.status === "AVAILABLE" && " · Lane open"}
        </p>
      </div>

      {/* Set Available — PRIMARY when offline/on break */}
      {isOffline && (
        <button
          onClick={onSetAvailable}
          disabled={loading === "available"}
          style={{
            padding: "14px 36px", borderRadius: "9999px",
            background: loading === "available" ? "rgba(226,214,9,0.4)" : "#e2d609",
            color: "#0f1317", fontSize: "15px", fontWeight: 900,
            border: "none", cursor: loading === "available" ? "not-allowed" : "pointer",
            boxShadow: "0 0 28px rgba(226,214,9,0.25)",
            transition: "all 0.2s ease",
          }}
        >
          {loading === "available" ? "Setting available…" : "Set Available →"}
        </button>
      )}

      {/* Next up card — only when available */}
      {!isOffline && nextUp && (
        <div style={{
          width: "100%", maxWidth: "360px",
          padding: "20px", borderRadius: "14px",
          background: "#1e262d", border: "1px solid #2d3840",
        }}>
          <div style={{ fontSize: "10px", fontWeight: 700, color: "#e2d609", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "12px" }}>
            Next in Queue
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "18px", fontWeight: 900, color: "#e2d609" }}>{nextUp.queue_token}</span>
            <div>
              <div style={{ fontSize: "15px", fontWeight: 700, color: "#f5f5f5" }}>{nextUp.customer_display}</div>
              <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>
                {nextUp.intents.length > 0 ? `${nextUp.intents.length} service(s)` : "No services selected"}
              </div>
            </div>
            <div style={{ marginLeft: "auto" }}>
              <Badge variant="waiting" label="WAITING" size="sm" />
            </div>
          </div>
        </div>
      )}

      {/* Go on Break — only when available */}
      {!isOffline && (
        <button
          onClick={onBreak}
          disabled={loading === "break"}
          style={{
            padding: "12px 28px", borderRadius: "9999px",
            background: "transparent", color: "rgba(255,255,255,0.5)",
            fontSize: "14px", fontWeight: 600,
            border: "1px solid rgba(255,255,255,0.15)", cursor: "pointer",
            transition: "all 0.2s ease",
          }}
        >
          {loading === "break" ? "…" : "Go on Break"}
        </button>
      )}

      <style>{`
        @keyframes ping {
          75%, 100% { transform: scale(1.4); opacity: 0; }
        }
      `}</style>
    </motion.div>
  );
}

// ─── CALLED State ─────────────────────────────────────────────────────────────

interface CalledStateProps {
  lane:      BarberLaneView;
  customer:  QueueEntryView;
  sessionId: string;
  onStart:   () => void;
  onNoShow:  () => void;
}

function CalledState({ lane, customer, sessionId, onStart, onNoShow }: CalledStateProps) {
  const [elapsed, setElapsed] = useState(() => elapsedMinutes(customer.checkin_hlc));

  useEffect(() => {
    const id = setInterval(() => setElapsed(elapsedMinutes(customer.checkin_hlc)), 30_000);
    return () => clearInterval(id);
  }, [customer.checkin_hlc]);

  return (
    <motion.div
      key="called"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      style={{ display: "flex", flexDirection: "column", gap: "24px", padding: "32px 24px" }}
    >
      {/* Header */}
      <div style={{ textAlign: "center" }}>
        <Badge variant="called" label="CALLED TO CHAIR" />
        <div style={{ marginTop: "16px", fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>
          Called {elapsed} min ago
        </div>
      </div>

      {/* Customer card */}
      <div style={{
        padding: "24px", borderRadius: "14px",
        background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "16px" }}>
          <span style={{ fontSize: "28px", fontWeight: 900, color: "#f59e0b" }}>{customer.queue_token}</span>
          <div>
            <div style={{ fontSize: "20px", fontWeight: 800, color: "#f5f5f5" }}>{customer.customer_display}</div>
            <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)" }}>
              {customer.preferred_barber_name ?? lane.barber_name}
            </div>
          </div>
        </div>

        {/* Services — still editable before EVENT 04 */}
        {customer.intents.length > 0 && (
          <div>
            <div style={{ fontSize: "10px", fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "8px" }}>
              Services
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {customer.intents.map(id => (
                <span key={id} style={{
                  padding: "4px 12px", borderRadius: "9999px",
                  background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)",
                  fontSize: "12px", color: "#f59e0b", fontWeight: 600,
                }}>
                  {id}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Start Service — PRIMARY action */}
      <button
        onClick={onStart}
        style={{
          width: "100%", padding: "16px 28px", borderRadius: "9999px",
          background: "#e2d609", color: "#0f1317",
          fontSize: "16px", fontWeight: 900,
          border: "none", cursor: "pointer",
          boxShadow: "0 0 32px rgba(226,214,9,0.3)",
          transition: "all 0.2s ease",
        }}
      >
        Start Service →
      </button>

      {/* No-show */}
      <button
        onClick={onNoShow}
        style={{
          width: "100%", padding: "12px 28px", borderRadius: "9999px",
          background: "transparent", color: "rgba(239,68,68,0.7)",
          fontSize: "14px", fontWeight: 600,
          border: "1px solid rgba(239,68,68,0.25)", cursor: "pointer",
          transition: "all 0.2s ease",
        }}
      >
        Customer Didn't Show
      </button>
    </motion.div>
  );
}

// ─── IN_SERVICE State ─────────────────────────────────────────────────────────

interface InServiceStateProps {
  customer:   QueueEntryView;
  sessionId:  string;
  onComplete: () => void;
}

function InServiceState({ customer, onComplete }: InServiceStateProps) {
  const [elapsed, setElapsed] = useState(() => elapsedMinutes(customer.checkin_hlc));

  useEffect(() => {
    const id = setInterval(() => setElapsed(elapsedMinutes(customer.checkin_hlc)), 30_000);
    return () => clearInterval(id);
  }, [customer.checkin_hlc]);

  return (
    <motion.div
      key="in-service"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      style={{ display: "flex", flexDirection: "column", gap: "24px", padding: "32px 24px" }}
    >
      {/* Header */}
      <div style={{ textAlign: "center" }}>
        <Badge variant="in-service" label="IN SERVICE" />
        <div style={{ marginTop: "16px", fontSize: "13px", color: "rgba(255,255,255,0.4)" }}>
          Service started {elapsed} min ago
        </div>
      </div>

      {/* Customer card — READ ONLY after EVENT 04 */}
      <div style={{
        padding: "24px", borderRadius: "14px",
        background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "16px" }}>
          <span style={{ fontSize: "28px", fontWeight: 900, color: "#10b981" }}>{customer.queue_token}</span>
          <div>
            <div style={{ fontSize: "20px", fontWeight: 800, color: "#f5f5f5" }}>{customer.customer_display}</div>
          </div>
        </div>

        {/* Services — LOCKED (is_intent_locked = true after EVENT 04) */}
        {customer.intents.length > 0 && (
          <div>
            <div style={{ fontSize: "10px", fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "8px" }}>
              Services (locked)
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {customer.intents.map(id => (
                <span key={id} style={{
                  padding: "4px 12px", borderRadius: "9999px",
                  background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)",
                  fontSize: "12px", color: "#10b981", fontWeight: 600,
                }}>
                  {id}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Complete Service — PRIMARY action, only action available (PRD §13.3) */}
      <button
        onClick={onComplete}
        style={{
          width: "100%", padding: "16px 28px", borderRadius: "9999px",
          background: "#e2d609", color: "#0f1317",
          fontSize: "16px", fontWeight: 900,
          border: "none", cursor: "pointer",
          boxShadow: "0 0 32px rgba(226,214,9,0.3)",
          transition: "all 0.2s ease",
        }}
      >
        Complete Service ✓
      </button>

      <p style={{ textAlign: "center", fontSize: "12px", color: "rgba(255,255,255,0.25)" }}>
        Service in progress — no other actions available
      </p>
    </motion.div>
  );
}

// ─── Schedule Tab ─────────────────────────────────────────────────────────────

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface ScheduleTabProps {
  rules:      ScheduleRule[];
  barberId:   string;
  session:    import("@/core/session/session.types").ActiveSession;
  aggVersion: number;
}

function ScheduleTab({ rules, barberId, session, aggVersion }: ScheduleTabProps) {
  const [saving, setSaving] = useState(false);
  const [localRules, setLocalRules] = useState<ScheduleRule[]>(() =>
    DAYS.map((_, i) => {
      const existing = rules.find(r => r.day_of_week === i);
      return existing ?? { day_of_week: i, start_time: "09:00", end_time: "18:00", is_active: i >= 1 && i <= 6 };
    })
  );

  const toggle = (idx: number) => {
    setLocalRules(prev => prev.map((r, i) => i === idx ? { ...r, is_active: !r.is_active } : r));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { journalService } = await import("@/core/journal/journal.service");
      for (const rule of localRules) {
        const nextVersion = await journalService.getNextAggregateVersion(barberId);
        await updateSchedule({
          barberId,
          aggregateVersion: nextVersion,
          dayOfWeek:        rule.day_of_week,
          startTime:        rule.start_time,
          endTime:          rule.end_time,
          isActive:         rule.is_active,
        }, session);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
      <div>
        <span style={{ fontSize: "11px", fontWeight: 700, color: "#e2d609", textTransform: "uppercase", letterSpacing: "0.15em" }}>
          Recurring Schedule
        </span>
        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", marginTop: "4px" }}>
          Shop hours override these settings.
        </p>
      </div>

      {localRules.map((rule, i) => (
        <div key={i} style={{
          display: "flex", alignItems: "center", gap: "12px",
          padding: "12px 16px", borderRadius: "10px",
          background: rule.is_active ? "#1e262d" : "rgba(255,255,255,0.03)",
          border: `1px solid ${rule.is_active ? "#2d3840" : "rgba(255,255,255,0.06)"}`,
        }}>
          <button
            onClick={() => toggle(i)}
            style={{
              width: "36px", height: "20px", borderRadius: "9999px",
              background: rule.is_active ? "#e2d609" : "#2d3840",
              border: "none", cursor: "pointer",
              position: "relative", transition: "background 0.2s",
              flexShrink: 0,
            }}
            aria-label={`Toggle ${DAYS[i]}`}
          >
            <div style={{
              position: "absolute", top: "2px",
              left: rule.is_active ? "18px" : "2px",
              width: "16px", height: "16px", borderRadius: "50%",
              background: rule.is_active ? "#0f1317" : "#6b7280",
              transition: "left 0.2s",
            }} />
          </button>

          <span style={{ fontSize: "13px", fontWeight: 700, color: rule.is_active ? "#f5f5f5" : "rgba(255,255,255,0.3)", width: "32px" }}>
            {DAYS[i]}
          </span>

          {rule.is_active && (
            <>
              <input
                type="time"
                value={rule.start_time}
                onChange={e => setLocalRules(prev => prev.map((r, j) => j === i ? { ...r, start_time: e.target.value } : r))}
                style={{ background: "#252f38", border: "1px solid #2d3840", borderRadius: "6px", color: "#f5f5f5", padding: "4px 8px", fontSize: "13px", outline: "none" }}
                aria-label={`${DAYS[i]} start time`}
              />
              <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "12px" }}>to</span>
              <input
                type="time"
                value={rule.end_time}
                onChange={e => setLocalRules(prev => prev.map((r, j) => j === i ? { ...r, end_time: e.target.value } : r))}
                style={{ background: "#252f38", border: "1px solid #2d3840", borderRadius: "6px", color: "#f5f5f5", padding: "4px 8px", fontSize: "13px", outline: "none" }}
                aria-label={`${DAYS[i]} end time`}
              />
            </>
          )}
        </div>
      ))}

      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          padding: "13px 28px", borderRadius: "9999px",
          background: saving ? "rgba(226,214,9,0.4)" : "#e2d609",
          color: "#0f1317", fontSize: "14px", fontWeight: 800,
          border: "none", cursor: saving ? "not-allowed" : "pointer",
          boxShadow: "0 0 24px rgba(226,214,9,0.2)",
          transition: "all 0.2s ease",
        }}
      >
        {saving ? "Saving…" : "Save Schedule"}
      </button>
    </div>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

interface BarberDashboardScreenProps {
  laneId: string;
}

export default function BarberDashboardScreen({ laneId }: BarberDashboardScreenProps) {
  const { view: lanes }       = useBarberLane();
  const { view: queue }       = useQueueBoard();
  const { view: transactions } = useTransaction();
  const { session }           = useSession();
  const [tab, setTab]         = useState<Tab>("lane");
  const [loading, setLoading] = useState<string | null>(null);

  if (!session) return null;

  const lane = lanes?.lanes.find(l => l.barber_id === laneId);

  // Next customer waiting for this barber
  const nextUp = queue?.entries.find(
    e => e.preferred_barber_id === laneId && e.status === "WAITING"
  );

  // Current called customer
  const calledCustomer =
    queue?.called.find(e => e.preferred_barber_id === laneId) ??
    lane?.current_customer;

  // In-service customer
  const inServiceCustomer = queue?.in_service.find(
    e => e.preferred_barber_id === laneId
  ) ?? lane?.current_customer;

  // Today's tips for this barber
  const todayTips = transactions?.settled_today
    .filter(t => t.barber_id === laneId)
    .reduce((sum, t) => sum + t.barber_tip_etb, 0) ?? 0;

  const aggVersion = (lanes?.lanes.length ?? 0) + 1;

  const handleStartService = async () => {
    if (!calledCustomer || loading) return;
    setLoading("start");
    try {
      const { journalService } = await import("@/core/journal/journal.service");
      const nextVersion = await journalService.getNextAggregateVersion(calledCustomer.queue_entry_id);
      await startService({
        queueEntryId:     calledCustomer.queue_entry_id,
        aggregateVersion: nextVersion,
        priceSnapshotId:  crypto.randomUUID(),
        barberId:         laneId,
        customerUuid:     calledCustomer.customer_uuid,
        queueToken:       calledCustomer.queue_token,
      }, session);
    } finally { setLoading(null); }
  };

  const handleCompleteService = async () => {
    if (!inServiceCustomer || loading) return;
    setLoading("complete");
    try {
      const { journalService } = await import("@/core/journal/journal.service");
      const nextVersion = await journalService.getNextAggregateVersion(inServiceCustomer.queue_entry_id);
      await completeService({
        queueEntryId:     inServiceCustomer.queue_entry_id,
        aggregateVersion: nextVersion,
      }, session);
    } finally { setLoading(null); }
  };

  const handleSetAvailable = async () => {
    if (loading) return;
    setLoading("available");
    try {
      const { journalService } = await import("@/core/journal/journal.service");
      const nextVersion = await journalService.getNextAggregateVersion(laneId);
      await setAvailable({ barberId: laneId, aggregateVersion: nextVersion }, session);
    } finally { setLoading(null); }
  };

  const handleGoOnBreak = async () => {
    if (loading) return;
    setLoading("break");
    try {
      const { journalService } = await import("@/core/journal/journal.service");
      const nextVersion = await journalService.getNextAggregateVersion(laneId);
      await setAvailable({ barberId: laneId, aggregateVersion: nextVersion, status: "ON_BREAK" }, session);
    } finally { setLoading(null); }
  };

  const laneStatus = lane?.status ?? "OFFLINE";

  return (
    <div style={{ minHeight: "100dvh", background: "#0f1317", display: "flex", flexDirection: "column" }}>
      <TopBar session={session} />

      {/* Tab bar */}
      <div style={{
        display: "flex", borderBottom: "1px solid #2d3840",
        background: "#171d22",
      }}>
        {(["lane", "schedule"] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1, padding: "14px 16px",
              background: "transparent",
              border: "none", borderBottom: `2px solid ${tab === t ? "#e2d609" : "transparent"}`,
              color: tab === t ? "#e2d609" : "rgba(255,255,255,0.4)",
              fontSize: "13px", fontWeight: tab === t ? 700 : 500,
              cursor: "pointer", transition: "all 0.2s",
              textTransform: "capitalize",
            }}
          >
            {t === "lane" ? "My Lane" : "Schedule"}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", maxWidth: "480px", width: "100%", margin: "0 auto" }}>
        <AnimatePresence mode="wait">
          {tab === "lane" ? (
            <motion.div
              key="lane-tab"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {/* Lane state */}
              <AnimatePresence mode="wait">
                {laneStatus === "IN_SERVICE" && inServiceCustomer ? (
                  <InServiceState
                    key="in-service"
                    customer={inServiceCustomer}
                    sessionId={session.session_id}
                    onComplete={handleCompleteService}
                  />
                ) : laneStatus === "CALLED" && calledCustomer ? (
                  <CalledState
                    key="called"
                    lane={lane!}
                    customer={calledCustomer}
                    sessionId={session.session_id}
                    onStart={handleStartService}
                    onNoShow={() => {}}
                  />
                ) : (
                  <AvailableState
                    key="available"
                    lane={lane ?? { barber_id: laneId, barber_name: session.actor_name, status: "OFFLINE", schedule_rules: [] }}
                    nextUp={nextUp}
                    onSetAvailable={handleSetAvailable}
                    onBreak={handleGoOnBreak}
                    loading={loading}
                  />
                )}
              </AnimatePresence>

              {/* Tips card */}
              <div style={{
                margin: "0 24px 24px",
                padding: "16px 20px", borderRadius: "12px",
                background: "#1e262d", border: "1px solid #2d3840",
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>
                  Today's Tips
                </span>
                <span style={{ fontSize: "20px", fontWeight: 900, color: "#e2d609" }}>
                  {todayTips.toLocaleString()} ETB
                </span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="schedule-tab"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <ScheduleTab
                rules={lane?.schedule_rules ?? []}
                barberId={laneId}
                session={session}
                aggVersion={aggVersion}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
