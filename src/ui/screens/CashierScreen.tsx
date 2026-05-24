/**
 * @file CashierScreen.tsx
 * @module ui/screens
 *
 * Cashier Concierge — Concierge & Check-in module.
 *
 * Specification: AMS v1.3 — Concierge & Check-in capabilities
 *                IMS v1.1 — Client Intake + Queue Manager screens
 *                CXS v1.1 §1 — Walk-in customer flow
 *                CXS v1.1 §4 — Service selection at check-in
 *                ui-standards.md §7.2 — Cashier Screen layout
 *
 * Two sub-screens (tab-switched):
 *   1. CHECK-IN — collect name, barber, contact, services → EVENT 01 + EVENT 21
 *   2. QUEUE    — live queue list, call to chair (EVENT 03), no-show (EVENT 20)
 *
 * Barber list: shows ALL roster barbers with live status from BarberLane projection.
 * Barbers appear OFFLINE until they log in and toggle available (EVENT 02).
 * Cashier can still assign a customer to an OFFLINE barber — they just can't be
 * called until the barber becomes AVAILABLE.
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
import { sessionService }                from "@/core/session/session.service";
import {
  checkInCustomer,
  callCustomer,
  cancelReservation,
  addServiceIntent,
  removeServiceIntent,
} from "@/core/actions/queue.actions";
import { generateQueueToken }            from "@/core/queue/queue-token";
import type { QueueEntryView }           from "@/projections/queue-board.view";
import type { BarberLaneView }           from "@/projections/barber-lane.view";

// ─── Service catalog (Phase 1 — hardcoded, Phase 2 from Admin price registry) ─

const SERVICES = [
  { id: "classic_cut",   name: "Classic Cut",       name_am: "ክላሲክ ቅጥ",    price: 350 },
  { id: "premium_cut",   name: "Premium Cut",        name_am: "ፕሪሚየም ቅጥ",   price: 500 },
  { id: "beard_groom",   name: "Beard Grooming",     name_am: "ጢም ማስተካከያ",  price: 250 },
  { id: "cut_beard",     name: "Cut & Beard Combo",  name_am: "ቅጥ እና ጢም",   price: 700 },
  { id: "head_shave",    name: "Head Shave",         name_am: "ራስ ምላጭ",     price: 300 },
  { id: "kids_cut",      name: "Kids Cut",           name_am: "የልጆች ቅጥ",    price: 200 },
] as const;

type ServiceId = typeof SERVICES[number]["id"];

// ─── Tab type ─────────────────────────────────────────────────────────────────

type Tab = "checkin" | "queue";

// ─── Barber status badge ──────────────────────────────────────────────────────

function BarberStatusDot({ status }: { status: BarberLaneView["status"] }) {
  const color = {
    AVAILABLE:  "#10b981",
    CALLED:     "#f59e0b",
    IN_SERVICE: "#10b981",
    ON_BREAK:   "#6b7280",
    OFFLINE:    "#374151",
  }[status] ?? "#374151";

  return (
    <span style={{
      display: "inline-block",
      width: "7px", height: "7px",
      borderRadius: "50%",
      background: color,
      flexShrink: 0,
    }} />
  );
}

// ─── Check-In Form ────────────────────────────────────────────────────────────

interface CheckInFormProps {
  barbers:    BarberLaneView[];
  rosterBarbers: { actor_id: string; name: string; barber_id?: string }[];
  totalToday: number;
  sessionId:  string;
  onSuccess:  (token: string) => void;
}

function CheckInForm({ barbers, rosterBarbers, totalToday, sessionId, onSuccess }: CheckInFormProps) {
  const [name,       setName]       = useState("");
  const [barberId,   setBarberId]   = useState("");
  const [contact,    setContact]    = useState("");
  const [intents,    setIntents]    = useState<ServiceId[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [lastToken,  setLastToken]  = useState<string | null>(null);

  const toggleService = (id: ServiceId) => {
    setIntents(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError("Customer name is required"); return; }
    setLoading(true);
    setError("");

    try {
      const aggregateId = crypto.randomUUID();
      const token       = generateQueueToken(totalToday);

      await checkInCustomer({
        aggregateId,
        aggregateVersion:  1,
        sessionId,
        customerUuid:      crypto.randomUUID(),
        preferredBarberId: barberId || null,
        checkinMethod:     "walk-in",
        customerName:      name.trim(),
        queueToken:        token,
        contactHandle:     contact.trim() || undefined,
      } as Parameters<typeof checkInCustomer>[0]);

      // Add service intents
      for (let i = 0; i < intents.length; i++) {
        await addServiceIntent({
          aggregateId,
          aggregateVersion: i + 2,
          sessionId,
          serviceId: intents[i],
        });
      }

      setLastToken(token);
      setName(""); setBarberId(""); setContact(""); setIntents([]);
      onSuccess(token);
    } catch (err) {
      setError("Check-in failed — please try again");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Merge roster barbers with live lane status
  const allBarbers = rosterBarbers.map(rb => {
    const lane = barbers.find(l => l.barber_id === rb.barber_id);
    return {
      id:     rb.barber_id ?? rb.actor_id,
      name:   rb.name,
      status: lane?.status ?? "OFFLINE" as BarberLaneView["status"],
    };
  });

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

      {/* Success flash */}
      <AnimatePresence>
        {lastToken && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              padding: "12px 16px", borderRadius: "10px",
              background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}
          >
            <span style={{ fontSize: "13px", color: "#10b981", fontWeight: 600 }}>
              ✓ Checked in — Token:
            </span>
            <span style={{ fontSize: "22px", fontWeight: 900, color: "#e2d609" }}>
              {lastToken}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Name */}
      <div>
        <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "7px" }}>
          Customer Name *
        </label>
        <input
          type="text"
          value={name}
          onChange={e => { setName(e.target.value); setError(""); setLastToken(null); }}
          placeholder="First name"
          autoComplete="off"
          style={{
            width: "100%", padding: "11px 14px",
            background: "#252f38", border: `1.5px solid ${error ? "#ef4444" : "#2d3840"}`,
            borderRadius: "10px", color: "#f5f5f5", fontSize: "15px", outline: "none",
            boxSizing: "border-box",
          }}
          onFocus={e => { e.target.style.borderColor = "#e2d609"; e.target.style.boxShadow = "0 0 0 3px rgba(226,214,9,0.1)"; }}
          onBlur={e => { e.target.style.borderColor = error ? "#ef4444" : "#2d3840"; e.target.style.boxShadow = "none"; }}
        />
        {error && <p style={{ fontSize: "12px", color: "#f87171", marginTop: "5px" }}>{error}</p>}
      </div>

      {/* Barber preference */}
      <div>
        <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "7px" }}>
          Preferred Barber
        </label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          <button
            type="button"
            onClick={() => setBarberId("")}
            style={{
              padding: "8px 14px", borderRadius: "9999px",
              background: barberId === "" ? "rgba(226,214,9,0.1)" : "transparent",
              border: `1.5px solid ${barberId === "" ? "#e2d609" : "#2d3840"}`,
              color: barberId === "" ? "#e2d609" : "rgba(255,255,255,0.5)",
              fontSize: "13px", fontWeight: 600, cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            Any Available
          </button>
          {allBarbers.map(b => (
            <button
              key={b.id}
              type="button"
              onClick={() => setBarberId(b.id)}
              style={{
                display: "flex", alignItems: "center", gap: "6px",
                padding: "8px 14px", borderRadius: "9999px",
                background: barberId === b.id ? "rgba(226,214,9,0.1)" : "transparent",
                border: `1.5px solid ${barberId === b.id ? "#e2d609" : "#2d3840"}`,
                color: barberId === b.id ? "#e2d609" : "rgba(255,255,255,0.5)",
                fontSize: "13px", fontWeight: 600, cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              <BarberStatusDot status={b.status} />
              {b.name}
            </button>
          ))}
        </div>
      </div>

      {/* Services */}
      <div>
        <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "7px" }}>
          Services
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          {SERVICES.map(s => {
            const selected = intents.includes(s.id);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => toggleService(s.id)}
                style={{
                  padding: "10px 12px", borderRadius: "10px", textAlign: "left",
                  background: selected ? "rgba(226,214,9,0.08)" : "#1e262d",
                  border: `1.5px solid ${selected ? "#e2d609" : "#2d3840"}`,
                  cursor: "pointer", transition: "all 0.15s",
                }}
              >
                <div style={{ fontSize: "13px", fontWeight: 600, color: selected ? "#e2d609" : "#f5f5f5" }}>
                  {s.name}
                </div>
                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)", marginTop: "2px" }}>
                  {s.price.toLocaleString()} ETB
                </div>
              </button>
            );
          })}
        </div>
        {intents.length > 0 && (
          <div style={{ marginTop: "8px", fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>
            Total: <span style={{ color: "#e2d609", fontWeight: 700 }}>
              {SERVICES.filter(s => intents.includes(s.id)).reduce((sum, s) => sum + s.price, 0).toLocaleString()} ETB
            </span>
          </div>
        )}
      </div>

      {/* Contact (optional) */}
      <div>
        <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "7px" }}>
          Phone / Contact <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional — for queue alerts)</span>
        </label>
        <input
          type="tel"
          value={contact}
          onChange={e => setContact(e.target.value)}
          placeholder="+251 9XX XXX XXX"
          style={{
            width: "100%", padding: "11px 14px",
            background: "#252f38", border: "1.5px solid #2d3840",
            borderRadius: "10px", color: "#f5f5f5", fontSize: "15px", outline: "none",
            boxSizing: "border-box",
          }}
          onFocus={e => { e.target.style.borderColor = "#e2d609"; e.target.style.boxShadow = "0 0 0 3px rgba(226,214,9,0.1)"; }}
          onBlur={e => { e.target.style.borderColor = "#2d3840"; e.target.style.boxShadow = "none"; }}
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        style={{
          width: "100%", padding: "14px",
          borderRadius: "9999px",
          background: loading ? "rgba(226,214,9,0.4)" : "#e2d609",
          color: "#0f1317", fontSize: "15px", fontWeight: 800,
          border: "none", cursor: loading ? "not-allowed" : "pointer",
          boxShadow: "0 0 24px rgba(226,214,9,0.2)",
          transition: "all 0.2s ease",
        }}
      >
        {loading ? "Checking in…" : "Check In Customer →"}
      </button>
    </form>
  );
}

// ─── Queue Entry Row ──────────────────────────────────────────────────────────

interface QueueRowProps {
  entry:      QueueEntryView;
  isSelected: boolean;
  onSelect:   () => void;
  barbers:    BarberLaneView[];
}

function QueueRow({ entry, isSelected, onSelect, barbers }: QueueRowProps) {
  const barberLane = barbers.find(b => b.barber_id === entry.preferred_barber_id);

  const statusVariant = {
    WAITING:    "waiting",
    RESERVED:   "reserved",
    CALLED:     "called",
    IN_SERVICE: "in-service",
    EXPIRED:    "expired",
    CANCELLED:  "completed",
  }[entry.status] ?? "neutral";

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
        transition: "background 0.15s",
        display: "flex", alignItems: "center", gap: "12px",
      }}
    >
      {/* Position */}
      <div style={{
        width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0,
        background: isSelected ? "#e2d609" : "#2d3840",
        color: isSelected ? "#0f1317" : "rgba(255,255,255,0.5)",
        fontSize: "11px", fontWeight: 700,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {entry.position}
      </div>

      {/* Token + info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "14px", fontWeight: 900, color: "#e2d609" }}>
            {entry.queue_token || "—"}
          </span>
          <span style={{ fontSize: "14px", fontWeight: 600, color: "#f5f5f5", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {entry.customer_display}
          </span>
        </div>
        <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", marginTop: "2px", display: "flex", alignItems: "center", gap: "6px" }}>
          {barberLane && <BarberStatusDot status={barberLane.status} />}
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {entry.preferred_barber_id
              ? (barberLane?.barber_name ?? entry.preferred_barber_id)
              : "Any barber"}
          </span>
          {entry.intents.length > 0 && (
            <span style={{ color: "rgba(255,255,255,0.25)" }}>
              · {entry.intents.length} service{entry.intents.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* Status + wait */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px", flexShrink: 0 }}>
        <Badge variant={statusVariant as "waiting"} label={entry.status} size="sm" />
        <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.25)" }}>
          ~{entry.estimated_wait_minutes}m
        </span>
      </div>
    </button>
  );
}

// ─── Selected Entry Action Panel ──────────────────────────────────────────────

interface ActionPanelProps {
  entry:     QueueEntryView;
  barbers:   BarberLaneView[];
  sessionId: string;
  onClose:   () => void;
}

function ActionPanel({ entry, barbers, sessionId, onClose }: ActionPanelProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const preferredLane = barbers.find(b => b.barber_id === entry.preferred_barber_id);
  const canCall = !entry.preferred_barber_id || preferredLane?.status === "AVAILABLE";

  const handleCall = async () => {
    if (!canCall || loading) return;
    setLoading("call");
    try {
      await callCustomer({
        aggregateId:      entry.queue_entry_id,
        aggregateVersion: 2,
        sessionId,
        barberId:         entry.preferred_barber_id ?? "",
      });
      onClose();
    } catch (e) { console.error(e); }
    finally { setLoading(null); }
  };

  const handleNoShow = async () => {
    if (loading) return;
    setLoading("noshow");
    try {
      await cancelReservation({
        aggregateId:      entry.queue_entry_id,
        aggregateVersion: 2,
        sessionId,
        reasonCode:       "NO_SHOW",
      });
      onClose();
    } catch (e) { console.error(e); }
    finally { setLoading(null); }
  };

  const handleCancel = async () => {
    if (loading) return;
    setLoading("cancel");
    try {
      await cancelReservation({
        aggregateId:      entry.queue_entry_id,
        aggregateVersion: 2,
        sessionId,
        reasonCode:       "CUSTOMER_REQUEST",
      });
      onClose();
    } catch (e) { console.error(e); }
    finally { setLoading(null); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* Customer summary */}
      <div style={{ padding: "16px", background: "#1e262d", borderRadius: "12px", border: "1px solid #2d3840" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
          <span style={{ fontSize: "24px", fontWeight: 900, color: "#e2d609" }}>{entry.queue_token}</span>
          <div>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "#f5f5f5" }}>{entry.customer_display}</div>
            <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>
              {preferredLane?.barber_name ?? entry.preferred_barber_id ?? "Any barber"}
            </div>
          </div>
          <div style={{ marginLeft: "auto" }}>
            <Badge variant={entry.status === "WAITING" ? "waiting" : "called"} label={entry.status} size="sm" />
          </div>
        </div>

        {/* Services */}
        {entry.intents.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {entry.intents.map(id => {
              const svc = SERVICES.find(s => s.id === id);
              return (
                <div key={id} style={{
                  display: "flex", alignItems: "center", gap: "4px",
                  padding: "3px 10px", borderRadius: "9999px",
                  background: "rgba(226,214,9,0.08)", border: "1px solid rgba(226,214,9,0.2)",
                }}>
                  <span style={{ fontSize: "11px", color: "#e2d609", fontWeight: 600 }}>
                    {svc?.name ?? id}
                  </span>
                  {!entry.is_intent_locked && (
                    <button
                      onClick={() => removeServiceIntent({ aggregateId: entry.queue_entry_id, aggregateVersion: 2, sessionId, serviceId: id })}
                      style={{ background: "none", border: "none", color: "rgba(226,214,9,0.5)", cursor: "pointer", fontSize: "12px", padding: "0 2px", lineHeight: 1 }}
                      aria-label={`Remove ${svc?.name ?? id}`}
                    >×</button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Call to Chair — PRIMARY action */}
      <button
        onClick={handleCall}
        disabled={!canCall || !!loading}
        style={{
          width: "100%", padding: "14px",
          borderRadius: "9999px",
          background: canCall ? "#e2d609" : "rgba(226,214,9,0.15)",
          color: canCall ? "#0f1317" : "rgba(255,255,255,0.25)",
          fontSize: "14px", fontWeight: 800,
          border: "none", cursor: canCall ? "pointer" : "not-allowed",
          boxShadow: canCall ? "0 0 24px rgba(226,214,9,0.2)" : "none",
          transition: "all 0.2s",
        }}
      >
        {loading === "call" ? "Calling…" : "Call to Chair →"}
      </button>

      {/* Barber unavailable reason */}
      {!canCall && preferredLane && (
        <p style={{ textAlign: "center", fontSize: "12px", color: "rgba(255,255,255,0.3)", marginTop: "-8px" }}>
          {preferredLane.barber_name} is {preferredLane.status.toLowerCase().replace("_", " ")} — cannot call yet
        </p>
      )}

      {/* Secondary actions */}
      <div style={{ display: "flex", gap: "8px" }}>
        <button
          onClick={handleNoShow}
          disabled={!!loading}
          style={{
            flex: 1, padding: "11px",
            borderRadius: "9999px",
            background: "transparent", color: "rgba(245,158,11,0.7)",
            border: "1px solid rgba(245,158,11,0.25)",
            fontSize: "13px", fontWeight: 600, cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          {loading === "noshow" ? "…" : "No-Show"}
        </button>
        <button
          onClick={handleCancel}
          disabled={!!loading}
          style={{
            flex: 1, padding: "11px",
            borderRadius: "9999px",
            background: "transparent", color: "rgba(239,68,68,0.7)",
            border: "1px solid rgba(239,68,68,0.2)",
            fontSize: "13px", fontWeight: 600, cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          {loading === "cancel" ? "…" : "Cancel"}
        </button>
      </div>

      <button
        onClick={onClose}
        style={{
          background: "none", border: "none",
          color: "rgba(255,255,255,0.3)", cursor: "pointer",
          fontSize: "12px", textAlign: "center",
          padding: "4px",
        }}
      >
        ← Back to queue
      </button>
    </div>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CashierScreen() {
  const { view: queue }  = useQueueBoard();
  const { view: lanes }  = useBarberLane();
  const { session }      = useSession();
  const [tab, setTab]    = useState<Tab>("checkin");
  const [selected, setSelected] = useState<QueueEntryView | null>(null);
  const [lastToken, setLastToken] = useState<string | null>(null);

  if (!session) return null;

  // All barbers from roster (for check-in form)
  const rosterBarbers = sessionService.getRoster()
    .filter(op => op.role === "BARBER" && op.barber_id)
    .map(op => ({ actor_id: op.actor_id, name: op.name, barber_id: op.barber_id }));

  const barberLanes  = lanes?.lanes ?? [];
  const waiting      = queue?.entries ?? [];
  const reserved     = queue?.reservations ?? [];
  const called       = queue?.called ?? [];
  const inService    = queue?.in_service ?? [];
  const totalWaiting = queue?.total_waiting ?? 0;
  const totalToday   = waiting.length + called.length + inService.length;

  const allActive = [...reserved, ...waiting, ...called];

  return (
    <div style={{ minHeight: "100dvh", background: "#0f1317", display: "flex", flexDirection: "column" }}>
      <TopBar session={session} />

      {/* ── Tab bar ──────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", background: "#171d22", borderBottom: "1px solid #2d3840", flexShrink: 0 }}>
        {([
          { id: "checkin", label: "Check In", count: null },
          { id: "queue",   label: "Queue",    count: totalWaiting },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setSelected(null); }}
            style={{
              flex: 1, padding: "14px 16px",
              background: "transparent", border: "none",
              borderBottom: `2px solid ${tab === t.id ? "#e2d609" : "transparent"}`,
              color: tab === t.id ? "#e2d609" : "rgba(255,255,255,0.4)",
              fontSize: "13px", fontWeight: tab === t.id ? 700 : 500,
              cursor: "pointer", transition: "all 0.2s",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            }}
          >
            {t.label}
            {t.count !== null && t.count > 0 && (
              <span style={{
                padding: "1px 7px", borderRadius: "9999px",
                background: tab === t.id ? "rgba(226,214,9,0.15)" : "rgba(255,255,255,0.08)",
                color: tab === t.id ? "#e2d609" : "rgba(255,255,255,0.4)",
                fontSize: "11px", fontWeight: 700,
              }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <AnimatePresence mode="wait">

          {/* ── CHECK-IN TAB ─────────────────────────────────────────────── */}
          {tab === "checkin" && (
            <motion.div
              key="checkin"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ flex: 1, overflowY: "auto", padding: "20px 16px" }}
            >
              <div style={{ maxWidth: "480px", margin: "0 auto" }}>
                <div style={{ marginBottom: "20px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#e2d609", textTransform: "uppercase", letterSpacing: "0.15em" }}>
                    New Walk-In
                  </span>
                </div>
                <CheckInForm
                  barbers={barberLanes}
                  rosterBarbers={rosterBarbers}
                  totalToday={totalToday}
                  sessionId={session.session_id}
                  onSuccess={token => { setLastToken(token); setTab("queue"); }}
                />
              </div>
            </motion.div>
          )}

          {/* ── QUEUE TAB ────────────────────────────────────────────────── */}
          {tab === "queue" && (
            <motion.div
              key="queue"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ flex: 1, display: "flex", overflow: "hidden" }}
            >
              {/* Queue list */}
              <div style={{
                width: selected ? "45%" : "100%",
                borderRight: selected ? "1px solid #2d3840" : "none",
                display: "flex", flexDirection: "column",
                overflow: "hidden",
                transition: "width 0.3s ease",
              }}>
                {/* Header */}
                <div style={{
                  padding: "12px 16px",
                  borderBottom: "1px solid #2d3840",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  flexShrink: 0,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#e2d609", textTransform: "uppercase", letterSpacing: "0.12em" }}>
                      Waiting Queue
                    </span>
                    {totalWaiting > 0 && (
                      <span style={{ padding: "1px 7px", borderRadius: "9999px", background: "rgba(59,130,246,0.15)", color: "#3b82f6", fontSize: "11px", fontWeight: 700 }}>
                        {totalWaiting}
                      </span>
                    )}
                  </div>
                  <SyncIndicator state="verified" compact />
                </div>

                {/* Reserved section */}
                {reserved.length > 0 && (
                  <div style={{ borderBottom: "1px solid #2d3840", flexShrink: 0 }}>
                    <div style={{ padding: "6px 16px", background: "rgba(139,92,246,0.06)" }}>
                      <span style={{ fontSize: "10px", fontWeight: 700, color: "#8b5cf6", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                        Reserved ({reserved.length})
                      </span>
                    </div>
                    {reserved.map(e => (
                      <QueueRow key={e.queue_entry_id} entry={e} isSelected={selected?.queue_entry_id === e.queue_entry_id} onSelect={() => setSelected(e)} barbers={barberLanes} />
                    ))}
                  </div>
                )}

                {/* Waiting + Called */}
                <div style={{ flex: 1, overflowY: "auto" }}>
                  {allActive.filter(e => e.status !== "RESERVED").length === 0 ? (
                    <div style={{ padding: "48px 20px", textAlign: "center" }}>
                      <div style={{ fontSize: "28px", marginBottom: "10px" }}>🪑</div>
                      <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.25)" }}>
                        No customers waiting
                      </p>
                      <button
                        onClick={() => setTab("checkin")}
                        style={{
                          marginTop: "16px", padding: "10px 20px",
                          borderRadius: "9999px", background: "transparent",
                          border: "1px solid #2d3840", color: "rgba(255,255,255,0.4)",
                          fontSize: "13px", cursor: "pointer",
                        }}
                      >
                        Check in a customer →
                      </button>
                    </div>
                  ) : (
                    allActive
                      .filter(e => e.status !== "RESERVED")
                      .map(e => (
                        <QueueRow
                          key={e.queue_entry_id}
                          entry={e}
                          isSelected={selected?.queue_entry_id === e.queue_entry_id}
                          onSelect={() => setSelected(e)}
                          barbers={barberLanes}
                        />
                      ))
                  )}
                </div>

                {/* In-service strip */}
                {inService.length > 0 && (
                  <div style={{ borderTop: "1px solid #2d3840", padding: "8px 16px", background: "rgba(16,185,129,0.04)", flexShrink: 0 }}>
                    <span style={{ fontSize: "10px", fontWeight: 700, color: "#10b981", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                      In Service ({inService.length})
                    </span>
                    <div style={{ display: "flex", gap: "6px", marginTop: "6px", flexWrap: "wrap" }}>
                      {inService.map(e => (
                        <span key={e.queue_entry_id} style={{
                          padding: "3px 10px", borderRadius: "9999px",
                          background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)",
                          fontSize: "12px", color: "#10b981", fontWeight: 700,
                        }}>
                          {e.queue_token}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action panel */}
              <AnimatePresence>
                {selected && (
                  <motion.div
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 16 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    style={{ flex: 1, overflowY: "auto", padding: "20px 16px" }}
                  >
                    <ActionPanel
                      entry={selected}
                      barbers={barberLanes}
                      sessionId={session.session_id}
                      onClose={() => setSelected(null)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
