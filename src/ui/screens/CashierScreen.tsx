/**
 * @file CashierScreen.tsx
 * @module ui/screens
 *
 * Cashier Concierge — Concierge & Check-in module.
 * Specification: AMS v1.3, IMS v1.1, CXS v1.1
 */

"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQueueBoard }   from "@/ui/hooks/useQueueBoard";
import { useBarberLane }   from "@/ui/hooks/useBarberLane";
import { useSession }      from "@/ui/hooks/useSession";
import { TopBar }          from "@/ui/components/shell/TopBar";
import { Badge }           from "@/ui/components/primitives/Badge";
import { SyncIndicator }   from "@/ui/components/primitives/SyncIndicator";
import { sessionService }  from "@/core/session/session.service";
import {
  checkInCustomer,
  callCustomer,
  cancelReservation,
  addServiceIntent,
  removeServiceIntent,
  transferQueue,
} from "@/core/actions/queue.actions";
import { issueQueueToken } from "@/core/queue/queue-token";
import type { QueueEntryView } from "@/projections/queue-board.view";
import type { BarberLaneView } from "@/projections/barber-lane.view";

// ─── Constants ────────────────────────────────────────────────────────────────

const SERVICES = [
  { id: "classic_cut", name: "Classic Cut",      price: 350 },
  { id: "premium_cut", name: "Premium Cut",       price: 500 },
  { id: "beard_groom", name: "Beard Grooming",    price: 250 },
  { id: "cut_beard",   name: "Cut & Beard Combo", price: 700 },
  { id: "head_shave",  name: "Head Shave",        price: 300 },
  { id: "kids_cut",    name: "Kids Cut",          price: 200 },
] as const;

type ServiceId = typeof SERVICES[number]["id"];
type Tab = "checkin" | "queue";

// ─── Barber option — merges roster + live projection status ───────────────────

interface BarberOption {
  id:     string;
  name:   string;
  status: BarberLaneView["status"];
}

// ─── Status dot ───────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: BarberLaneView["status"] }) {
  const color = {
    AVAILABLE:  "#10b981",
    CALLED:     "#f59e0b",
    IN_SERVICE: "#10b981",
    ON_BREAK:   "#6b7280",
    OFFLINE:    "#374151",
  }[status] ?? "#374151";
  return <span style={{ display: "inline-block", width: "7px", height: "7px", borderRadius: "50%", background: color, flexShrink: 0 }} />;
}

// ─── Check-In Form ────────────────────────────────────────────────────────────

function CheckInForm({
  barberOptions,
  sessionId,
  onSuccess,
}: {
  barberOptions: BarberOption[];
  sessionId:     string;
  onSuccess:     (token: string) => void;
}) {
  const [name,      setName]      = useState("");
  const [barberId,  setBarberId]  = useState("");
  const [contact,   setContact]   = useState("");
  const [intents,   setIntents]   = useState<ServiceId[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [errors,    setErrors]    = useState<Record<string, string>>({});
  const [lastToken, setLastToken] = useState<string | null>(null);

  const validateName = (v: string) => {
    if (!v.trim()) return "Name is required";
    if (v.trim().length < 2) return "At least 2 characters";
    if (v.trim().length > 50) return "Too long";
    return "";
  };

  const validateContact = (v: string) => {
    if (!v.trim()) return "";
    const d = v.replace(/\D/g, "");
    if (d.length < 9 || d.length > 13) return "Enter a valid phone number";
    return "";
  };

  const toggleService = (id: ServiceId) => {
    setIntents(p => p.includes(id) ? p.filter(s => s !== id) : [...p, id]);
    setErrors(e => ({ ...e, intents: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nameErr    = validateName(name);
    const contactErr = validateContact(contact);
    const intentsErr = intents.length === 0 ? "Select at least one service" : "";
    if (nameErr || contactErr || intentsErr) {
      setErrors({ name: nameErr, contact: contactErr, intents: intentsErr });
      return;
    }
    setLoading(true);
    setErrors({});
    try {
      const aggregateId = crypto.randomUUID();
      const token       = issueQueueToken();
      const { journalService } = await import("@/core/journal/journal.service");

      await checkInCustomer({
        aggregateId,
        aggregateVersion:  await journalService.getNextAggregateVersion(aggregateId),
        sessionId,
        customerUuid:      crypto.randomUUID(),
        preferredBarberId: barberId || null,
        checkinMethod:     "walk-in",
        customerName:      name.trim(),
        queueToken:        token,
        contactHandle:     contact.trim() || undefined,
      } as Parameters<typeof checkInCustomer>[0]);

      for (const serviceId of intents) {
        const v = await journalService.getNextAggregateVersion(aggregateId);
        await addServiceIntent({ aggregateId, aggregateVersion: v, sessionId, serviceId });
      }

      setLastToken(token);
      setName(""); setBarberId(""); setContact(""); setIntents([]);
      onSuccess(token);
    } catch (err) {
      setErrors({ submit: "Check-in failed — try again" });
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const totalPrice = SERVICES.filter(s => intents.includes(s.id)).reduce((sum, s) => sum + s.price, 0);

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>

      {/* Success */}
      {lastToken && (
        <div style={{ padding: "12px 16px", borderRadius: "10px", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: "13px", color: "#10b981", fontWeight: 600 }}>✓ Checked in</span>
          <span style={{ fontSize: "24px", fontWeight: 900, color: "#e2d609" }}>{lastToken}</span>
        </div>
      )}

      {/* Name */}
      <div>
        <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "6px" }}>
          Customer Name *
        </label>
        <input
          type="text"
          value={name}
          onChange={e => { setName(e.target.value); setErrors(er => ({ ...er, name: validateName(e.target.value) })); }}
          placeholder="First name"
          autoComplete="off"
          style={{ width: "100%", padding: "11px 14px", background: "#252f38", border: `1.5px solid ${errors.name ? "#ef4444" : name.length >= 2 ? "#10b981" : "#2d3840"}`, borderRadius: "10px", color: "#f5f5f5", fontSize: "15px", outline: "none", boxSizing: "border-box" }}
          onFocus={e => { e.target.style.borderColor = "#e2d609"; e.target.style.boxShadow = "0 0 0 3px rgba(226,214,9,0.1)"; }}
          onBlur={e => { e.target.style.borderColor = errors.name ? "#ef4444" : name.length >= 2 ? "#10b981" : "#2d3840"; e.target.style.boxShadow = "none"; }}
        />
        {errors.name && <p style={{ fontSize: "12px", color: "#f87171", marginTop: "4px" }}>{errors.name}</p>}
      </div>

      {/* Barber */}
      <div>
        <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "6px" }}>
          Preferred Barber
        </label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          <button type="button" onClick={() => setBarberId("")}
            style={{ padding: "7px 14px", borderRadius: "9999px", background: barberId === "" ? "rgba(226,214,9,0.1)" : "transparent", border: `1.5px solid ${barberId === "" ? "#e2d609" : "#2d3840"}`, color: barberId === "" ? "#e2d609" : "rgba(255,255,255,0.5)", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
            Any Available
          </button>
          {barberOptions.map(b => (
            <button key={b.id} type="button" onClick={() => setBarberId(b.id)}
              style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 14px", borderRadius: "9999px", background: barberId === b.id ? "rgba(226,214,9,0.1)" : "transparent", border: `1.5px solid ${barberId === b.id ? "#e2d609" : "#2d3840"}`, color: barberId === b.id ? "#e2d609" : "rgba(255,255,255,0.5)", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
              <StatusDot status={b.status} />
              {b.name}
            </button>
          ))}
        </div>
      </div>

      {/* Services */}
      <div>
        <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: errors.intents ? "#f87171" : "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "6px" }}>
          Services * {intents.length > 0 && <span style={{ color: "#10b981", fontWeight: 400, textTransform: "none" }}>({intents.length} selected)</span>}
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          {SERVICES.map(s => {
            const sel = intents.includes(s.id);
            return (
              <button key={s.id} type="button" onClick={() => toggleService(s.id)}
                style={{ padding: "10px 12px", borderRadius: "10px", textAlign: "left", background: sel ? "rgba(226,214,9,0.08)" : "#1e262d", border: `1.5px solid ${sel ? "#e2d609" : errors.intents ? "rgba(239,68,68,0.3)" : "#2d3840"}`, cursor: "pointer" }}>
                <div style={{ fontSize: "13px", fontWeight: 600, color: sel ? "#e2d609" : "#f5f5f5" }}>{sel ? "✓ " : ""}{s.name}</div>
                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)", marginTop: "2px" }}>{s.price.toLocaleString()} ETB</div>
              </button>
            );
          })}
        </div>
        {errors.intents && <p style={{ fontSize: "12px", color: "#f87171", marginTop: "5px" }}>{errors.intents}</p>}
        {totalPrice > 0 && <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", marginTop: "6px" }}>Total: <span style={{ color: "#e2d609", fontWeight: 700 }}>{totalPrice.toLocaleString()} ETB</span></p>}
      </div>

      {/* Contact */}
      <div>
        <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "6px" }}>
          Phone <span style={{ fontWeight: 400, textTransform: "none" }}>(optional)</span>
        </label>
        <input
          type="tel"
          value={contact}
          onChange={e => { setContact(e.target.value); setErrors(er => ({ ...er, contact: validateContact(e.target.value) })); }}
          placeholder="+251 9XX XXX XXX"
          inputMode="tel"
          style={{ width: "100%", padding: "11px 14px", background: "#252f38", border: `1.5px solid ${errors.contact ? "#ef4444" : contact && !errors.contact ? "#10b981" : "#2d3840"}`, borderRadius: "10px", color: "#f5f5f5", fontSize: "15px", outline: "none", boxSizing: "border-box" }}
          onFocus={e => { e.target.style.borderColor = "#e2d609"; e.target.style.boxShadow = "0 0 0 3px rgba(226,214,9,0.1)"; }}
          onBlur={e => { e.target.style.borderColor = errors.contact ? "#ef4444" : contact && !errors.contact ? "#10b981" : "#2d3840"; e.target.style.boxShadow = "none"; }}
        />
        {errors.contact && <p style={{ fontSize: "12px", color: "#f87171", marginTop: "4px" }}>{errors.contact}</p>}
      </div>

      {errors.submit && <p style={{ fontSize: "13px", color: "#f87171", textAlign: "center" }}>{errors.submit}</p>}

      <button type="submit" disabled={loading}
        style={{ width: "100%", padding: "14px", borderRadius: "9999px", background: loading ? "rgba(226,214,9,0.4)" : "#e2d609", color: "#0f1317", fontSize: "15px", fontWeight: 800, border: "none", cursor: loading ? "not-allowed" : "pointer", boxShadow: "0 0 24px rgba(226,214,9,0.2)" }}>
        {loading ? "Checking in…" : "Check In Customer →"}
      </button>
    </form>
  );
}

// ─── Queue Row ────────────────────────────────────────────────────────────────

function QueueRow({ entry, isSelected, onSelect, barberOptions }: {
  entry:         QueueEntryView;
  isSelected:    boolean;
  onSelect:      () => void;
  barberOptions: BarberOption[];
}) {
  const barber = barberOptions.find(b => b.id === entry.preferred_barber_id);
  const variant = ({ WAITING: "waiting", RESERVED: "reserved", CALLED: "called", IN_SERVICE: "in-service", EXPIRED: "expired", CANCELLED: "completed" } as const)[entry.status] ?? "neutral" as "waiting";

  return (
    <button onClick={onSelect} style={{ width: "100%", textAlign: "left", padding: "14px 16px", background: isSelected ? "#252f38" : "transparent", border: "none", borderBottom: "1px solid #1e262d", cursor: "pointer", display: "flex", alignItems: "center", gap: "12px" }}>
      <div style={{ width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0, background: isSelected ? "#e2d609" : "#2d3840", color: isSelected ? "#0f1317" : "rgba(255,255,255,0.5)", fontSize: "11px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {entry.position}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "14px", fontWeight: 900, color: "#e2d609" }}>{entry.queue_token || "—"}</span>
          <span style={{ fontSize: "14px", fontWeight: 600, color: "#f5f5f5", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.customer_display}</span>
        </div>
        <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", marginTop: "2px", display: "flex", alignItems: "center", gap: "6px" }}>
          {barber && <StatusDot status={barber.status} />}
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {barber?.name ?? (entry.preferred_barber_id ? entry.preferred_barber_id : "Any barber")}
          </span>
          {entry.intents.length > 0 && <span style={{ color: "rgba(255,255,255,0.25)" }}>· {entry.intents.length} service{entry.intents.length !== 1 ? "s" : ""}</span>}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px", flexShrink: 0 }}>
        <Badge variant={variant} label={entry.status} size="sm" />
        <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.25)" }}>~{entry.estimated_wait_minutes}m</span>
      </div>
    </button>
  );
}

// ─── Action Panel ─────────────────────────────────────────────────────────────

function ActionPanel({ entry: initialEntry, barberOptions, sessionId, onClose }: {
  entry:         QueueEntryView;
  barberOptions: BarberOption[];
  sessionId:     string;
  onClose:       () => void;
}) {
  // Read LIVE entry from projection — not the stale prop snapshot
  const { view: queue } = useQueueBoard();
  const entry = [
    ...(queue?.entries ?? []),
    ...(queue?.called ?? []),
    ...(queue?.reservations ?? []),
    ...(queue?.in_service ?? []),
  ].find(e => e.queue_entry_id === initialEntry.queue_entry_id) ?? initialEntry;

  const [selectedBarberId, setSelectedBarberId] = useState(initialEntry.preferred_barber_id ?? "");
  const [transferConsent,  setTransferConsent]  = useState(false);
  const [confirm,          setConfirm]          = useState<"noshow" | "cancel" | null>(null);
  const [loading,          setLoading]          = useState<string | null>(null);

  // ── Derived state ───────────────────────────────────────────────────────────
  const selectedBarber = barberOptions.find(b => b.id === selectedBarberId);
  // Barbers who are IN_SERVICE or CALLED cannot take new customers
  const barberBusy = selectedBarber?.status === "IN_SERVICE" || selectedBarber?.status === "CALLED";
  // Can only CALL if barber is AVAILABLE (not just assigned)
  const canCall    = selectedBarberId !== "" && selectedBarber?.status === "AVAILABLE";
  const isTransfer = !!entry.preferred_barber_id && selectedBarberId !== "" && selectedBarberId !== entry.preferred_barber_id;

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleCall = async () => {
    if (!canCall || loading) return;
    if (isTransfer && !transferConsent) return;
    setLoading("call");
    try {
      const { journalService } = await import("@/core/journal/journal.service");
      let v = await journalService.getNextAggregateVersion(entry.queue_entry_id);
      if (isTransfer) {
        await transferQueue({ aggregateId: entry.queue_entry_id, aggregateVersion: v, sessionId, originatingBarberId: entry.preferred_barber_id!, receivingBarberId: selectedBarberId, customerConsentConfirmed: true });
        v += 1;
      }
      await callCustomer({ aggregateId: entry.queue_entry_id, aggregateVersion: v, sessionId, barberId: selectedBarberId });
      onClose();
    } catch (e) {
      console.error("Call to chair failed:", e);
      alert("Call failed — see browser console for details.");
    } finally { setLoading(null); }
  };

  const handleNoShow = async () => {
    setLoading("noshow");
    try {
      const { journalService } = await import("@/core/journal/journal.service");
      const v = await journalService.getNextAggregateVersion(entry.queue_entry_id);
      await cancelReservation({ aggregateId: entry.queue_entry_id, aggregateVersion: v, sessionId, reasonCode: "NO_SHOW" });
      onClose();
    } catch (e) { console.error(e); } finally { setLoading(null); }
  };

  const handleCancel = async () => {
    setLoading("cancel");
    try {
      const { journalService } = await import("@/core/journal/journal.service");
      const v = await journalService.getNextAggregateVersion(entry.queue_entry_id);
      await cancelReservation({ aggregateId: entry.queue_entry_id, aggregateVersion: v, sessionId, reasonCode: "CUSTOMER_REQUEST" });
      onClose();
    } catch (e) { console.error(e); } finally { setLoading(null); }
  };

  const handleAddService = async (serviceId: string) => {
    if (entry.is_intent_locked) return;
    try {
      const { journalService } = await import("@/core/journal/journal.service");
      const v = await journalService.getNextAggregateVersion(entry.queue_entry_id);
      await addServiceIntent({ aggregateId: entry.queue_entry_id, aggregateVersion: v, sessionId, serviceId });
    } catch (e) { console.error("Add service failed:", e); }
  };

  const handleRemoveService = async (serviceId: string) => {
    if (entry.is_intent_locked || entry.intents.length <= 1) return;
    try {
      const { journalService } = await import("@/core/journal/journal.service");
      const v = await journalService.getNextAggregateVersion(entry.queue_entry_id);
      await removeServiceIntent({ aggregateId: entry.queue_entry_id, aggregateVersion: v, sessionId, serviceId });
    } catch (e) { console.error("Remove service failed:", e); }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* Customer summary */}
      <div style={{ padding: "16px", background: "#1e262d", borderRadius: "12px", border: "1px solid #2d3840" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
          <span style={{ fontSize: "24px", fontWeight: 900, color: "#e2d609" }}>{entry.queue_token}</span>
          <div>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "#f5f5f5" }}>{entry.customer_display}</div>
            <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>
              {selectedBarber?.name ?? entry.preferred_barber_id ?? "Any barber"}
            </div>
          </div>
          <div style={{ marginLeft: "auto" }}>
            <Badge variant={entry.status === "WAITING" ? "waiting" : "called"} label={entry.status} size="sm" />
          </div>
        </div>

        {/* Services */}
        <div>
          <div style={{ fontSize: "10px", fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>
            Services {entry.is_intent_locked && <span style={{ color: "rgba(255,255,255,0.2)", fontWeight: 400 }}>(locked)</span>}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "8px" }}>
            {entry.intents.length === 0 && <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.25)" }}>No services</span>}
            {entry.intents.map(id => {
              const svc = SERVICES.find(s => s.id === id);
              return (
                <div key={id} style={{ display: "flex", alignItems: "center", gap: "4px", padding: "3px 10px", borderRadius: "9999px", background: "rgba(226,214,9,0.08)", border: "1px solid rgba(226,214,9,0.2)" }}>
                  <span style={{ fontSize: "11px", color: "#e2d609", fontWeight: 600 }}>{svc?.name ?? id}</span>
                  {!entry.is_intent_locked && (
                    <button
                      onClick={() => handleRemoveService(id)}
                      disabled={entry.intents.length <= 1}
                      title={entry.intents.length <= 1 ? "Cannot remove the only service" : `Remove ${svc?.name}`}
                      aria-label={`Remove ${svc?.name ?? id}`}
                      style={{ background: "none", border: "none", color: entry.intents.length <= 1 ? "rgba(226,214,9,0.2)" : "rgba(226,214,9,0.6)", cursor: entry.intents.length <= 1 ? "not-allowed" : "pointer", fontSize: "14px", padding: "0 2px", lineHeight: 1 }}
                    >×</button>
                  )}
                </div>
              );
            })}
          </div>
          {!entry.is_intent_locked && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {SERVICES.filter(s => !entry.intents.includes(s.id)).map(s => (
                <button key={s.id} onClick={() => handleAddService(s.id)}
                  style={{ padding: "3px 10px", borderRadius: "9999px", background: "transparent", border: "1px dashed #2d3840", color: "rgba(255,255,255,0.4)", fontSize: "11px", cursor: "pointer" }}>
                  + {s.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Barber selector — ALL barbers, always visible */}
      <div>
        <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "7px" }}>
          Assign to Barber
        </label>
        {barberOptions.length === 0 ? (
          <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)" }}>No barbers in roster — check operator seed</p>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {barberOptions.map(b => {
              const isSel   = b.id === selectedBarberId;
              const isPref  = b.id === entry.preferred_barber_id;
              const busy    = b.status === "IN_SERVICE" || b.status === "CALLED";
              const canPick = !busy; // can assign if not actively serving someone
              return (
                <button key={b.id} type="button"
                  onClick={() => { if (canPick) { setSelectedBarberId(b.id); setTransferConsent(false); } }}
                  disabled={!canPick}
                  title={busy ? `${b.name} is currently ${b.status.toLowerCase().replace("_", " ")} — cannot assign` : undefined}
                  style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 12px", borderRadius: "9999px",
                    background: isSel ? "rgba(226,214,9,0.1)" : "transparent",
                    border: `1.5px solid ${isSel ? "#e2d609" : isPref ? "rgba(226,214,9,0.3)" : busy ? "rgba(255,255,255,0.06)" : "#2d3840"}`,
                    color: busy ? "rgba(255,255,255,0.2)" : isSel ? "#e2d609" : "rgba(255,255,255,0.7)",
                    fontSize: "12px", fontWeight: 600,
                    cursor: canPick ? "pointer" : "not-allowed",
                    opacity: busy ? 0.5 : 1,
                  }}>
                  <StatusDot status={b.status} />
                  {b.name}
                  {isPref && !busy && <span style={{ fontSize: "9px", color: "#e2d609", opacity: 0.7 }}>★</span>}
                  {busy && <span style={{ fontSize: "10px" }}>({b.status.toLowerCase().replace("_", " ")})</span>}
                  {b.status === "OFFLINE" && !busy && <span style={{ fontSize: "10px", opacity: 0.5 }}>(offline)</span>}
                  {b.status === "ON_BREAK" && <span style={{ fontSize: "10px", opacity: 0.5 }}>(break)</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Transfer consent */}
      {isTransfer && (
        <div style={{ padding: "14px 16px", borderRadius: "12px", background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.25)" }}>
          <p style={{ fontSize: "13px", fontWeight: 700, color: "#f59e0b", marginBottom: "6px" }}>⚠️ Barber Transfer</p>
          <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", marginBottom: "12px", lineHeight: 1.5 }}>
            Customer requested <strong style={{ color: "rgba(255,255,255,0.7)" }}>{barberOptions.find(b => b.id === entry.preferred_barber_id)?.name ?? entry.preferred_barber_id}</strong>. Transfer requires verbal consent.
          </p>
          <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
            <input type="checkbox" checked={transferConsent} onChange={e => setTransferConsent(e.target.checked)}
              style={{ width: "16px", height: "16px", accentColor: "#e2d609", cursor: "pointer" }} />
            <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>Customer has given verbal consent</span>
          </label>
        </div>
      )}

      {/* Call to Chair */}
      <button
        onClick={handleCall}
        disabled={!canCall || !!loading || (isTransfer && !transferConsent)}
        style={{ width: "100%", padding: "14px", borderRadius: "9999px", background: canCall && (!isTransfer || transferConsent) ? "#e2d609" : "rgba(226,214,9,0.15)", color: canCall && (!isTransfer || transferConsent) ? "#0f1317" : "rgba(255,255,255,0.25)", fontSize: "14px", fontWeight: 800, border: "none", cursor: canCall && (!isTransfer || transferConsent) ? "pointer" : "not-allowed", boxShadow: canCall && (!isTransfer || transferConsent) ? "0 0 24px rgba(226,214,9,0.2)" : "none", transition: "all 0.2s" }}
      >
        {loading === "call" ? "Calling…" : isTransfer ? "Transfer & Call to Chair →" : "Call to Chair →"}
      </button>

      {/* Status hints */}
      {!selectedBarberId && <p style={{ textAlign: "center", fontSize: "12px", color: "rgba(255,255,255,0.3)", marginTop: "-8px" }}>Select a barber above</p>}
      {selectedBarberId && barberBusy && <p style={{ textAlign: "center", fontSize: "12px", color: "rgba(255,255,255,0.3)", marginTop: "-8px" }}>{selectedBarber?.name} is {selectedBarber?.status.toLowerCase().replace("_", " ")} — select another</p>}
      {isTransfer && !transferConsent && <p style={{ textAlign: "center", fontSize: "12px", color: "rgba(245,158,11,0.6)", marginTop: "-8px" }}>Confirm consent above to proceed</p>}

      {/* Confirmation dialogs */}
      {confirm ? (
        <div style={{ padding: "16px", borderRadius: "12px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.25)" }}>
          <p style={{ fontSize: "14px", fontWeight: 700, color: "#f87171", marginBottom: "6px" }}>
            {confirm === "noshow" ? "⚠️ Mark as No-Show?" : "⚠️ Cancel this spot?"}
          </p>
          <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", marginBottom: "14px", lineHeight: 1.5 }}>
            {confirm === "noshow"
              ? "Records that the customer was called but didn't appear. Cannot be undone. Counts toward no-show history."
              : "Removes the customer from the queue at their request. Cannot be undone."}
          </p>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={() => setConfirm(null)} style={{ flex: 1, padding: "10px", borderRadius: "9999px", background: "transparent", border: "1px solid #2d3840", color: "rgba(255,255,255,0.5)", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
              Keep in Queue
            </button>
            <button onClick={confirm === "noshow" ? handleNoShow : handleCancel} disabled={!!loading}
              style={{ flex: 1, padding: "10px", borderRadius: "9999px", background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)", color: "#f87171", fontSize: "13px", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer" }}>
              {loading ? "…" : confirm === "noshow" ? "Yes, No-Show" : "Yes, Cancel"}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={() => setConfirm("noshow")} style={{ flex: 1, padding: "11px", borderRadius: "9999px", background: "transparent", color: "rgba(245,158,11,0.8)", border: "1px solid rgba(245,158,11,0.25)", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
            Didn't Show Up
          </button>
          <button onClick={() => setConfirm("cancel")} style={{ flex: 1, padding: "11px", borderRadius: "9999px", background: "transparent", color: "rgba(239,68,68,0.7)", border: "1px solid rgba(239,68,68,0.2)", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
            Customer Left
          </button>
        </div>
      )}

      <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: "12px", textAlign: "center", padding: "4px" }}>
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
  const [tab,      setTab]      = useState<Tab>("checkin");
  const [selected, setSelected] = useState<QueueEntryView | null>(null);

  if (!session) return null;

  // Build barberOptions: roster (always present) merged with live projection status
  const rosterBarbers = sessionService.getRoster()
    .filter(op => op.role === "BARBER" && op.barber_id)
    .map(op => ({ id: op.barber_id!, name: op.name }));

  const barberOptions: BarberOption[] = rosterBarbers.map(rb => {
    const lane = lanes?.lanes.find(l => l.barber_id === rb.id);
    return { id: rb.id, name: rb.name, status: lane?.status ?? "OFFLINE" };
  });

  const waiting   = queue?.entries      ?? [];
  const reserved  = queue?.reservations ?? [];
  const called    = queue?.called       ?? [];
  const inService = queue?.in_service   ?? [];
  const totalWaiting = queue?.total_waiting ?? 0;
  const allActive = [...reserved, ...waiting, ...called];

  return (
    <div style={{ minHeight: "100dvh", background: "#0f1317", display: "flex", flexDirection: "column" }}>
      <TopBar session={session} />

      {/* Tabs */}
      <div style={{ display: "flex", background: "#171d22", borderBottom: "1px solid #2d3840", flexShrink: 0 }}>
        {([
          { id: "checkin" as Tab, label: "Check In",  count: null },
          { id: "queue"   as Tab, label: "Queue",     count: totalWaiting },
        ]).map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setSelected(null); }}
            style={{ flex: 1, padding: "14px 16px", background: "transparent", border: "none", borderBottom: `2px solid ${tab === t.id ? "#e2d609" : "transparent"}`, color: tab === t.id ? "#e2d609" : "rgba(255,255,255,0.4)", fontSize: "13px", fontWeight: tab === t.id ? 700 : 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
            {t.label}
            {t.count !== null && t.count > 0 && (
              <span style={{ padding: "1px 7px", borderRadius: "9999px", background: tab === t.id ? "rgba(226,214,9,0.15)" : "rgba(255,255,255,0.08)", color: tab === t.id ? "#e2d609" : "rgba(255,255,255,0.4)", fontSize: "11px", fontWeight: 700 }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <AnimatePresence mode="wait">

          {/* Check-In Tab */}
          {tab === "checkin" && (
            <motion.div key="checkin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
              style={{ flex: 1, overflowY: "auto", padding: "20px 16px" }}>
              <div style={{ maxWidth: "480px", margin: "0 auto" }}>
                <div style={{ marginBottom: "20px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#e2d609", textTransform: "uppercase", letterSpacing: "0.15em" }}>
                    New Walk-In
                  </span>
                </div>
                <CheckInForm
                  barberOptions={barberOptions}
                  sessionId={session.session_id}
                  onSuccess={() => setTab("queue")}
                />
              </div>
            </motion.div>
          )}

          {/* Queue Tab */}
          {tab === "queue" && (
            <motion.div key="queue" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
              style={{ flex: 1, display: "flex", overflow: "hidden" }}>

              {/* Queue list */}
              <div style={{ width: selected ? "45%" : "100%", borderRight: selected ? "1px solid #2d3840" : "none", display: "flex", flexDirection: "column", overflow: "hidden", transition: "width 0.3s ease" }}>

                {/* Header */}
                <div style={{ padding: "12px 16px", borderBottom: "1px solid #2d3840", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#e2d609", textTransform: "uppercase", letterSpacing: "0.12em" }}>Waiting Queue</span>
                    {totalWaiting > 0 && (
                      <span style={{ padding: "1px 7px", borderRadius: "9999px", background: "rgba(59,130,246,0.15)", color: "#3b82f6", fontSize: "11px", fontWeight: 700 }}>{totalWaiting}</span>
                    )}
                  </div>
                  <SyncIndicator state="verified" compact />
                </div>

                {/* Reserved section */}
                {reserved.length > 0 && (
                  <div style={{ borderBottom: "1px solid #2d3840", flexShrink: 0 }}>
                    <div style={{ padding: "6px 16px", background: "rgba(139,92,246,0.06)" }}>
                      <span style={{ fontSize: "10px", fontWeight: 700, color: "#8b5cf6", textTransform: "uppercase", letterSpacing: "0.1em" }}>Reserved ({reserved.length})</span>
                    </div>
                    {reserved.map(e => (
                      <QueueRow key={e.queue_entry_id} entry={e} isSelected={selected?.queue_entry_id === e.queue_entry_id} onSelect={() => setSelected(e)} barberOptions={barberOptions} />
                    ))}
                  </div>
                )}

                {/* Waiting + Called */}
                <div style={{ flex: 1, overflowY: "auto" }}>
                  {allActive.filter(e => e.status !== "RESERVED").length === 0 ? (
                    <div style={{ padding: "48px 20px", textAlign: "center" }}>
                      <div style={{ fontSize: "28px", marginBottom: "10px" }}>🪑</div>
                      <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.25)" }}>No customers waiting</p>
                      <button onClick={() => setTab("checkin")} style={{ marginTop: "16px", padding: "10px 20px", borderRadius: "9999px", background: "transparent", border: "1px solid #2d3840", color: "rgba(255,255,255,0.4)", fontSize: "13px", cursor: "pointer" }}>
                        Check in a customer →
                      </button>
                    </div>
                  ) : (
                    allActive.filter(e => e.status !== "RESERVED").map(e => (
                      <QueueRow key={e.queue_entry_id} entry={e} isSelected={selected?.queue_entry_id === e.queue_entry_id} onSelect={() => setSelected(e)} barberOptions={barberOptions} />
                    ))
                  )}
                </div>

                {/* In-service strip */}
                {inService.length > 0 && (
                  <div style={{ borderTop: "1px solid #2d3840", padding: "8px 16px", background: "rgba(16,185,129,0.04)", flexShrink: 0 }}>
                    <span style={{ fontSize: "10px", fontWeight: 700, color: "#10b981", textTransform: "uppercase", letterSpacing: "0.1em" }}>In Service ({inService.length})</span>
                    <div style={{ display: "flex", gap: "6px", marginTop: "6px", flexWrap: "wrap" }}>
                      {inService.map(e => (
                        <span key={e.queue_entry_id} style={{ padding: "3px 10px", borderRadius: "9999px", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", fontSize: "12px", color: "#10b981", fontWeight: 700 }}>
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
                  <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.22, ease: "easeOut" }}
                    style={{ flex: 1, overflowY: "auto", padding: "20px 16px" }}>
                    <ActionPanel
                      entry={selected}
                      barberOptions={barberOptions}
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
