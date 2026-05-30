/**
 * @file CashierScreen.tsx
 * @module ui/screens
 *
 * Cashier Concierge — Concierge & Check-in module.
 * Specification: AMS v1.3, IMS v1.1, CXS v1.1
 */

"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQueueBoard }   from "@/ui/hooks/useQueueBoard";
import { useBarberLane }   from "@/ui/hooks/useBarberLane";
import { useTransaction }  from "@/ui/hooks/useTransaction";
import { useSession }      from "@/ui/hooks/useSession";
import { TopBar }          from "@/ui/components/shell/TopBar";
import { Badge }           from "@/ui/components/primitives/Badge";
import { SyncIndicator }   from "@/ui/components/primitives/SyncIndicator";
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
type Tab = "checkin" | "queue" | "reservations";

// ─── Barber option — merges roster + live projection status ───────────────────

interface BarberOption {
  id:          string;
  name:        string;
  status:      BarberLaneView["status"];
  avatar_url?: string | null;
}

// ─── Barber Avatar with status ring ──────────────────────────────────────────

function BarberAvatar({
  barber,
  size = 40,
}: {
  barber: BarberOption;
  size?:  number;
}) {
  const ringColor = {
    AVAILABLE:  "#10b981",
    CALLED:     "#f59e0b",
    IN_SERVICE: "#10b981",
    ON_BREAK:   "#6b7280",
    OFFLINE:    "#374151",
  }[barber.status] ?? "#374151";

  const initials = barber.name.trim().split(/\s+/).map(p => p[0]?.toUpperCase() ?? "").slice(0, 2).join("");

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      {barber.avatar_url ? (
        <img
          src={barber.avatar_url}
          alt={barber.name}
          width={size} height={size}
          style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: `2px solid ${ringColor}` }}
        />
      ) : (
        <div style={{
          width: size, height: size, borderRadius: "50%",
          background: "linear-gradient(135deg, #252f38, #1e262d)",
          border: `2px solid ${ringColor}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: size * 0.32, fontWeight: 800, color: "#e2d609",
        }}>
          {initials || "?"}
        </div>
      )}
      {/* Status dot */}
      <div style={{
        position: "absolute", bottom: 0, right: 0,
        width: size * 0.28, height: size * 0.28, borderRadius: "50%",
        background: ringColor, border: "2px solid #0f1317",
      }} />
    </div>
  );
}

// ─── Status dot (kept for queue rows) ────────────────────────────────────────

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
        <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>
          Preferred Barber
        </label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {/* Any Available */}
          <button type="button" onClick={() => setBarberId("")}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", padding: "10px 14px", borderRadius: "12px", background: barberId === "" ? "rgba(226,214,9,0.1)" : "#1e262d", border: `1.5px solid ${barberId === "" ? "#e2d609" : "#2d3840"}`, cursor: "pointer", minWidth: "64px", transition: "all 0.15s" }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: barberId === "" ? "rgba(226,214,9,0.15)" : "#252f38", border: `2px solid ${barberId === "" ? "#e2d609" : "#3a4650"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>
              ✂️
            </div>
            <span style={{ fontSize: "11px", fontWeight: 600, color: barberId === "" ? "#e2d609" : "rgba(255,255,255,0.5)", whiteSpace: "nowrap" }}>Any</span>
          </button>
          {/* Barber cards */}
          {barberOptions.map(b => {
            const isSel  = barberId === b.id;
            const isBusy = b.status === "IN_SERVICE" || b.status === "CALLED";
            return (
              <button key={b.id} type="button" onClick={() => setBarberId(b.id)}
                title={isBusy ? `${b.name} is currently busy — customer will wait` : b.name}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", padding: "10px 12px", borderRadius: "12px", background: isSel ? "rgba(226,214,9,0.1)" : "#1e262d", border: `1.5px solid ${isSel ? "#e2d609" : "#2d3840"}`, cursor: "pointer", minWidth: "64px", transition: "all 0.15s", position: "relative" }}>
                <BarberAvatar barber={b} size={40} />
                <span style={{ fontSize: "11px", fontWeight: 600, color: isSel ? "#e2d609" : "rgba(255,255,255,0.6)", whiteSpace: "nowrap", maxWidth: "64px", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {b.name.split(" ")[0]}
                </span>
                {isBusy && (
                  <span style={{ position: "absolute", top: "4px", right: "4px", fontSize: "8px", background: "rgba(245,158,11,0.9)", color: "#0f1317", borderRadius: "4px", padding: "1px 4px", fontWeight: 700 }}>
                    BUSY
                  </span>
                )}
              </button>
            );
          })}
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
  // Can only CALL if a barber is selected AND they are AVAILABLE right now
  const canCall    = selectedBarberId !== "" && selectedBarber?.status === "AVAILABLE";
  const barberBusy = selectedBarber?.status === "IN_SERVICE" || selectedBarber?.status === "CALLED";
  const isTransfer = !!entry.preferred_barber_id && selectedBarberId !== "" && selectedBarberId !== entry.preferred_barber_id;

  // Entry is locked — no actions allowed once CALLED or IN_SERVICE
  const isLocked = entry.status === "CALLED" || entry.status === "IN_SERVICE";

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
          <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)" }}>No barbers in roster</p>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {barberOptions.map(b => {
              const isSel   = b.id === selectedBarberId;
              const isPref  = b.id === entry.preferred_barber_id;
              const busy    = b.status === "IN_SERVICE" || b.status === "CALLED";
              const canPick = !busy;
              return (
                <button key={b.id} type="button"
                  onClick={() => { if (canPick) { setSelectedBarberId(b.id); setTransferConsent(false); } }}
                  disabled={!canPick}
                  title={busy ? `${b.name} is ${b.status.toLowerCase().replace("_", " ")}` : b.name}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "5px", padding: "8px 10px", borderRadius: "12px", background: isSel ? "rgba(226,214,9,0.1)" : "transparent", border: `1.5px solid ${isSel ? "#e2d609" : isPref ? "rgba(226,214,9,0.3)" : "#2d3840"}`, cursor: canPick ? "pointer" : "not-allowed", opacity: busy ? 0.45 : 1, minWidth: "56px", transition: "all 0.15s" }}>
                  <BarberAvatar barber={b} size={36} />
                  <span style={{ fontSize: "10px", fontWeight: 600, color: isSel ? "#e2d609" : "rgba(255,255,255,0.6)", whiteSpace: "nowrap", maxWidth: "56px", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {b.name.split(" ")[0]}
                    {isPref && !busy && " ★"}
                  </span>
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

      {/* ── LOCKED: entry is CALLED or IN_SERVICE — no actions allowed ── */}
      {isLocked ? (
        <div style={{ padding: "16px", borderRadius: "12px", background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)", textAlign: "center" }}>
          <div style={{ fontSize: "20px", marginBottom: "8px" }}>
            {entry.status === "IN_SERVICE" ? "✂️" : "📢"}
          </div>
          <p style={{ fontSize: "14px", fontWeight: 700, color: entry.status === "IN_SERVICE" ? "#10b981" : "#f59e0b", marginBottom: "4px" }}>
            {entry.status === "IN_SERVICE" ? "Service in progress" : "Called to chair"}
          </p>
          <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>
            {entry.status === "IN_SERVICE"
              ? "No actions available while service is in progress. The barber will complete the service."
              : "Customer has been called. Waiting for barber to start service."}
          </p>
        </div>
      ) : (
        <>
          {/* Call to Chair */}
          <button
            type="button"
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
                  ? "Records that the customer was called but didn't appear. Cannot be undone."
                  : "Removes the customer from the queue at their request. Cannot be undone."}
              </p>
              <div style={{ display: "flex", gap: "8px" }}>
                <button type="button" onClick={() => setConfirm(null)} style={{ flex: 1, padding: "10px", borderRadius: "9999px", background: "transparent", border: "1px solid #2d3840", color: "rgba(255,255,255,0.5)", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                  Keep in Queue
                </button>
                <button type="button" onClick={confirm === "noshow" ? handleNoShow : handleCancel} disabled={!!loading}
                  style={{ flex: 1, padding: "10px", borderRadius: "9999px", background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)", color: "#f87171", fontSize: "13px", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer" }}>
                  {loading ? "…" : confirm === "noshow" ? "Yes, No-Show" : "Yes, Cancel"}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", gap: "8px" }}>
              <button type="button" onClick={() => setConfirm("noshow")} style={{ flex: 1, padding: "11px", borderRadius: "9999px", background: "transparent", color: "rgba(245,158,11,0.8)", border: "1px solid rgba(245,158,11,0.25)", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                Didn't Show Up
              </button>
              <button type="button" onClick={() => setConfirm("cancel")} style={{ flex: 1, padding: "11px", borderRadius: "9999px", background: "transparent", color: "rgba(239,68,68,0.7)", border: "1px solid rgba(239,68,68,0.2)", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                Customer Left
              </button>
            </div>
          )}
        </>
      )}

      <button type="button" onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: "12px", textAlign: "center", padding: "4px" }}>
        ← Back to queue
      </button>
    </div>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CashierScreen() {
  const { view: queue }        = useQueueBoard();
  const { view: lanes }        = useBarberLane();
  const { view: ledger }       = useTransaction();
  const { session }            = useSession();
  const [tab,      setTab]     = useState<Tab>("checkin");
  const [selected, setSelected] = useState<QueueEntryView | null>(null);

  // Barbers fetched from cloud — replaces the removed sessionService.getRoster()
  const [cloudBarbers, setCloudBarbers] = useState<{ id: string; name: string; avatar_url?: string | null }[]>([]);
  useEffect(() => {
    fetch("/api/auth/list-operators")
      .then(r => r.json())
      .then((body: { operators?: Array<{ actor_id: string; name: string; role: string; barber_id: string | null; avatar_url?: string | null }> }) => {
        const barbers = (body.operators ?? [])
          .filter(op => op.role === "BARBER" && op.barber_id)
          .map(op => ({ id: op.barber_id!, name: op.name, avatar_url: op.avatar_url ?? null }));
        setCloudBarbers(barbers);
      })
      .catch(() => {});
  }, []);

  if (!session) return null;

  // Merge cloud roster with live projection status + avatar
  const barberOptions: BarberOption[] = cloudBarbers.map(rb => {
    const lane = lanes?.lanes.find(l => l.barber_id === rb.id);
    return { id: rb.id, name: rb.name, status: lane?.status ?? "OFFLINE", avatar_url: rb.avatar_url };
  });

  // Also include barbers visible in projection but not yet in cloud roster
  lanes?.lanes.forEach(lane => {
    if (!barberOptions.find(b => b.id === lane.barber_id)) {
      barberOptions.push({ id: lane.barber_id, name: lane.barber_name, status: lane.status, avatar_url: null });
    }
  });

  const waiting      = queue?.entries      ?? [];
  const reserved     = queue?.reservations ?? [];
  const called       = queue?.called       ?? [];
  const inService    = queue?.in_service   ?? [];
  const totalWaiting = queue?.total_waiting ?? 0;
  const allActive    = [...reserved, ...waiting, ...called];

  // Today's financial summary
  const todayRevenue = ledger?.settled_today.reduce((s, t) => s + t.total_etb, 0) ?? 0;
  const pendingCount = ledger?.active.filter(t => t.status === "PAYMENT_PENDING").length ?? 0;

  return (
    <div style={{ minHeight: "100dvh", background: "#0f1317", display: "flex", flexDirection: "column" }}>
      <TopBar session={session} />

      {/* Balance strip */}
      <div style={{ display: "flex", gap: "1px", background: "#2d3840", flexShrink: 0 }}>
        {[
          { label: "Waiting",  value: totalWaiting,  color: "#3b82f6", suffix: "" },
          { label: "Pending",  value: pendingCount,  color: "#f59e0b", suffix: "" },
          { label: "Settled",  value: todayRevenue,  color: "#10b981", suffix: " ETB" },
        ].map(({ label, value, color, suffix }) => (
          <div key={label} style={{ flex: 1, padding: "8px 12px", background: "#171d22", textAlign: "center" }}>
            <div style={{ fontSize: "16px", fontWeight: 900, color }}>{value.toLocaleString()}{suffix}</div>
            <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: "1px" }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", background: "#171d22", borderBottom: "1px solid #2d3840", flexShrink: 0 }}>
        {([
          { id: "checkin"      as Tab, label: "Check In",     count: null },
          { id: "queue"        as Tab, label: "Queue",        count: totalWaiting },
          { id: "reservations" as Tab, label: "Reservations", count: null },
        ]).map(t => (
          <button key={t.id} type="button" onClick={() => { setTab(t.id); setSelected(null); }}
            style={{ flex: 1, padding: "13px 8px", background: "transparent", border: "none", borderBottom: `2px solid ${tab === t.id ? "#e2d609" : "transparent"}`, color: tab === t.id ? "#e2d609" : "rgba(255,255,255,0.4)", fontSize: "12px", fontWeight: tab === t.id ? 700 : 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
            {t.label}
            {t.count !== null && t.count > 0 && (
              <span style={{ padding: "1px 6px", borderRadius: "9999px", background: tab === t.id ? "rgba(226,214,9,0.15)" : "rgba(255,255,255,0.08)", color: tab === t.id ? "#e2d609" : "rgba(255,255,255,0.4)", fontSize: "10px", fontWeight: 700 }}>
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

          {/* Reservations Tab */}
          {tab === "reservations" && (
            <ReservationsTab barberOptions={barberOptions} sessionId={session.session_id} />
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Reservation Requests Tab ─────────────────────────────────────────────────
// Reads from Supabase reservation_requests table (not the event journal).
// These are customer requests submitted via /reserve — cashier converts to walk-in.

interface ReservationRequest {
  id:                  string;
  customer_name:       string;
  phone:               string;
  preferred_barber_id: string | null;
  requested_date:      string;
  requested_time:      string;
  services:            Array<{ id: string; name: string; price_etb: number }>;
  notes:               string | null;
  status:              "PENDING" | "CONFIRMED" | "CANCELLED" | "CONVERTED";
  created_at:          string;
}

function ReservationsTab({ barberOptions, sessionId }: { barberOptions: BarberOption[]; sessionId: string }) {
  const [requests,   setRequests]   = useState<ReservationRequest[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");
  const [converting, setConverting] = useState<string | null>(null);
  const [converted,  setConverted]  = useState<Set<string>>(new Set());

  const load = async () => {
    setLoading(true); setError("");
    try {
      const resp = await fetch("/api/reserve/list");
      if (!resp.ok) { setError("Failed to load reservations"); return; }
      const body = await resp.json() as { requests: ReservationRequest[] };
      setRequests(body.requests ?? []);
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  };

  // Load on mount and auto-refresh every 30s
  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 30_000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConvertToWalkIn = async (req: ReservationRequest) => {
    if (converting) return;
    setConverting(req.id);
    try {
      const { journalService } = await import("@/core/journal/journal.service");
      const { checkInCustomer, addServiceIntent } = await import("@/core/actions/queue.actions");
      const { issueQueueToken } = await import("@/core/queue/queue-token");
      const aggregateId = crypto.randomUUID();
      const token = issueQueueToken();

      await checkInCustomer({
        aggregateId,
        aggregateVersion: await journalService.getNextAggregateVersion(aggregateId),
        sessionId,
        customerUuid:      crypto.randomUUID(),
        preferredBarberId: req.preferred_barber_id || null,
        checkinMethod:     "walk-in",
        customerName:      req.customer_name,
        queueToken:        token,
        contactHandle:     req.phone,
      } as Parameters<typeof checkInCustomer>[0]);

      // Add services as intents
      for (const svc of req.services ?? []) {
        const v = await journalService.getNextAggregateVersion(aggregateId);
        await addServiceIntent({ aggregateId, aggregateVersion: v, sessionId, serviceId: svc.id });
      }

      // Mark as converted in Supabase
      await fetch("/api/reserve/update-status", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: req.id, status: "CONVERTED" }),
      });
      setConverted(s => new Set([...s, req.id]));
    } catch (e) { console.error("Convert failed:", e); }
    finally { setConverting(null); }
  };

  const pending = requests.filter(r => r.status === "PENDING" && !converted.has(r.id));
  const done    = requests.filter(r => r.status !== "PENDING" || converted.has(r.id));

  // Is the date in the past?
  const isPast = (dateStr: string) => dateStr < new Date().toISOString().split("T")[0];

  return (
    <motion.div key="reservations" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
      style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
      <div style={{ maxWidth: "600px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "12px" }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#e2d609", textTransform: "uppercase", letterSpacing: "0.15em" }}>
              Reservation Requests
              {pending.length > 0 && (
                <span style={{ marginLeft: "8px", padding: "1px 7px", borderRadius: "9999px", background: "rgba(139,92,246,0.15)", color: "#8b5cf6", fontSize: "10px" }}>
                  {pending.length} pending
                </span>
              )}
            </span>
            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", marginTop: "3px" }}>
              Submitted via the booking page. Press "Check In Now" to add to queue.
            </p>
          </div>
          <button type="button" onClick={load} disabled={loading}
            style={{ background: "none", border: "1px solid #2d3840", color: "rgba(255,255,255,0.4)", borderRadius: "8px", padding: "6px 12px", fontSize: "12px", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.5 : 1 }}>
            {loading ? "…" : "↻"}
          </button>
        </div>

        {loading && requests.length === 0 ? (
          <div style={{ padding: "32px", textAlign: "center" }}><p style={{ fontSize: "13px", color: "rgba(255,255,255,0.3)" }}>Loading…</p></div>
        ) : error ? (
          <div style={{ padding: "14px 16px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <p style={{ fontSize: "13px", color: "#f87171" }}>{error}</p>
            <button type="button" onClick={load} style={{ background: "none", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", borderRadius: "8px", padding: "5px 10px", fontSize: "12px", cursor: "pointer" }}>Retry</button>
          </div>
        ) : pending.length === 0 && done.length === 0 ? (
          <div style={{ padding: "48px 20px", textAlign: "center", background: "#1e262d", borderRadius: "12px", border: "1px solid #2d3840" }}>
            <div style={{ fontSize: "28px", marginBottom: "10px" }}>📅</div>
            <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.3)" }}>No reservation requests yet</p>
          </div>
        ) : (
          <>
            {pending.map(req => {
              const barber      = barberOptions.find(b => b.id === req.preferred_barber_id);
              const isConverting = converting === req.id;
              const past        = isPast(req.requested_date);
              const totalEtb    = (req.services ?? []).reduce((s, sv) => s + sv.price_etb, 0);

              return (
                <div key={req.id} style={{ padding: "16px", background: "#1e262d", borderRadius: "12px", border: `1px solid ${past ? "rgba(245,158,11,0.3)" : "rgba(139,92,246,0.3)"}`, display: "flex", flexDirection: "column", gap: "12px" }}>

                  {/* Header */}
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
                        <span style={{ fontSize: "15px", fontWeight: 800, color: "#f5f5f5" }}>{req.customer_name}</span>
                        {past && <span style={{ padding: "2px 7px", borderRadius: "9999px", background: "rgba(245,158,11,0.12)", color: "#f59e0b", fontSize: "10px", fontWeight: 700 }}>OVERDUE</span>}
                        {!past && <span style={{ padding: "2px 7px", borderRadius: "9999px", background: "rgba(139,92,246,0.12)", color: "#8b5cf6", fontSize: "10px", fontWeight: 700 }}>PENDING</span>}
                      </div>
                      <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", display: "flex", flexWrap: "wrap", gap: "10px" }}>
                        <span>📞 {req.phone}</span>
                        <span>📅 {req.requested_date} at {req.requested_time.slice(0, 5)}</span>
                        {barber ? <span>✂️ {barber.name}</span> : <span style={{ color: "rgba(255,255,255,0.3)" }}>Any barber</span>}
                      </div>
                    </div>
                    {totalEtb > 0 && (
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: "16px", fontWeight: 900, color: "#e2d609" }}>{totalEtb.toLocaleString()} ETB</div>
                        <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)" }}>{(req.services ?? []).length} service{(req.services ?? []).length !== 1 ? "s" : ""}</div>
                      </div>
                    )}
                  </div>

                  {/* Services */}
                  {(req.services ?? []).length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {(req.services ?? []).map(svc => (
                        <span key={svc.id} style={{ padding: "3px 10px", borderRadius: "9999px", background: "rgba(226,214,9,0.07)", border: "1px solid rgba(226,214,9,0.2)", fontSize: "11px", color: "#e2d609", fontWeight: 600 }}>
                          {svc.name} · {svc.price_etb} ETB
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Customer note */}
                  {req.notes && (
                    <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", fontStyle: "italic", margin: 0 }}>"{req.notes}"</p>
                  )}

                  {/* Action */}
                  <button type="button" onClick={() => handleConvertToWalkIn(req)} disabled={isConverting}
                    style={{ padding: "11px 18px", borderRadius: "9999px", background: isConverting ? "rgba(226,214,9,0.3)" : "#e2d609", color: "#0f1317", fontSize: "13px", fontWeight: 800, border: "none", cursor: isConverting ? "not-allowed" : "pointer", alignSelf: "flex-start", transition: "all 0.15s" }}>
                    {isConverting ? "Adding to queue…" : "→ Check In Now"}
                  </button>
                </div>
              );
            })}

            {done.length > 0 && (
              <div style={{ marginTop: "4px" }}>
                <div style={{ padding: "6px 0" }}>
                  <span style={{ fontSize: "10px", fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Handled ({done.length})</span>
                </div>
                {done.map(req => (
                  <div key={req.id} style={{ padding: "12px 16px", background: "rgba(255,255,255,0.02)", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.06)", marginBottom: "6px", opacity: 0.6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "13px", fontWeight: 600, color: "rgba(255,255,255,0.5)" }}>{req.customer_name}</span>
                      <span style={{ fontSize: "10px", color: converted.has(req.id) || req.status === "CONVERTED" ? "#10b981" : req.status === "CANCELLED" ? "#ef4444" : "#6b7280", fontWeight: 700 }}>
                        {converted.has(req.id) ? "CONVERTED" : req.status}
                      </span>
                      <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", marginLeft: "auto" }}>
                        {req.requested_date} {req.requested_time.slice(0, 5)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}
