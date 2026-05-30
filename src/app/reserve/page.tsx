/**
 * @file page.tsx
 * @module app/reserve
 *
 * Customer Reservation Request — /reserve
 *
 * Full service selection with cost breakdown.
 * Customers must select at least one service before submitting.
 * Stores to Supabase reservation_requests via /api/reserve.
 * Cashier converts to EVENT 01 (CUSTOMER_CHECKED_IN) on arrival.
 */

"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence }     from "framer-motion";

// ─── Service catalogue (mirrors server-side validation) ───────────────────────

const SERVICES = [
  { id: "classic_cut", name: "Classic Cut",      price: 350, duration: 30, desc: "Precision cut, wash & style" },
  { id: "premium_cut", name: "Premium Cut",       price: 500, duration: 45, desc: "Premium cut with hot towel finish" },
  { id: "beard_groom", name: "Beard Grooming",    price: 250, duration: 20, desc: "Shape, trim & condition" },
  { id: "cut_beard",   name: "Cut & Beard Combo", price: 700, duration: 60, desc: "Full cut + beard grooming" },
  { id: "head_shave",  name: "Head Shave",        price: 300, duration: 25, desc: "Clean head shave with hot towel" },
  { id: "kids_cut",    name: "Kids Cut",          price: 200, duration: 20, desc: "For children under 12" },
] as const;

type ServiceId = typeof SERVICES[number]["id"];

interface BarberOption { actor_id: string; name: string; barber_id: string }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function validatePhone(p: string): string {
  const clean = p.replace(/\s/g, "");
  if (!clean) return "Phone number is required";
  if (!/^(\+251|0)[79]\d{8}$/.test(clean)) return "Enter a valid Ethiopian number (e.g. 0912 345 678)";
  return "";
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReservePage() {
  const [name,       setName]       = useState("");
  const [phone,      setPhone]      = useState("");
  const [barberId,   setBarberId]   = useState("");
  const [date,       setDate]       = useState(todayISO());
  const [time,       setTime]       = useState("09:00");
  const [notes,      setNotes]      = useState("");
  const [selected,   setSelected]   = useState<ServiceId[]>([]);
  const [errors,     setErrors]     = useState<Record<string, string>>({});
  const [loading,    setLoading]    = useState(false);
  const [success,    setSuccess]    = useState(false);
  const [barbers,    setBarbers]    = useState<BarberOption[]>([]);

  // Load barbers from cloud
  useEffect(() => {
    fetch("/api/auth/list-operators")
      .then(r => r.json())
      .then((body: { operators?: Array<{ actor_id: string; name: string; role: string; barber_id: string | null }> }) => {
        setBarbers(
          (body.operators ?? [])
            .filter(o => o.role === "BARBER" && o.barber_id)
            .map(o => ({ actor_id: o.actor_id, name: o.name, barber_id: o.barber_id! }))
        );
      })
      .catch(() => {});
  }, []);

  // ── Service toggle ──────────────────────────────────────────────────────────

  const toggleService = (id: ServiceId) => {
    setSelected(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
    setErrors(e => ({ ...e, services: "" }));
  };

  // ── Derived totals ──────────────────────────────────────────────────────────

  const selectedServices = SERVICES.filter(s => selected.includes(s.id));
  const totalPrice       = selectedServices.reduce((sum, s) => sum + s.price, 0);
  const totalDuration    = selectedServices.reduce((sum, s) => sum + s.duration, 0);

  // ── Validation ──────────────────────────────────────────────────────────────

  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (!name.trim() || name.trim().length < 2) e.name = "Full name is required";
    const phoneErr = validatePhone(phone);
    if (phoneErr) e.phone = phoneErr;
    if (selected.length === 0) e.services = "Select at least one service";
    if (!date) e.date = "Date is required";
    else if (date < todayISO()) e.date = "Date must be today or in the future";
    if (!time) e.time = "Time is required";
    else if (time < "08:00" || time > "20:00") e.time = "Must be between 08:00 and 20:00";
    return e;
  };

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setLoading(true);
    try {
      const resp = await fetch("/api/reserve", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:                name.trim(),
          phone:               phone.replace(/\s/g, ""),
          services:            selected,
          preferred_barber_id: barberId || undefined,
          requested_date:      date,
          requested_time:      time,
          notes:               notes.trim() || undefined,
        }),
      });
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({})) as { error?: string };
        setErrors({ submit: body.error ?? "Something went wrong — try again" });
        return;
      }
      setSuccess(true);
    } catch {
      setErrors({ submit: "Network error — check your connection and try again" });
    } finally { setLoading(false); }
  };

  // ── Styles ──────────────────────────────────────────────────────────────────

  const INPUT: React.CSSProperties = {
    width: "100%", padding: "12px 14px",
    background: "#252f38", border: "1.5px solid #2d3840",
    borderRadius: "10px", color: "#f5f5f5", fontSize: "15px",
    outline: "none", boxSizing: "border-box", fontFamily: "inherit",
  };
  const LABEL: React.CSSProperties = {
    display: "block", fontSize: "11px", fontWeight: 700,
    color: "rgba(255,255,255,0.4)", textTransform: "uppercase",
    letterSpacing: "0.1em", marginBottom: "6px",
  };
  const ERR: React.CSSProperties = { fontSize: "12px", color: "#f87171", marginTop: "4px" };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: "100dvh", background: "#0f1317", display: "flex", flexDirection: "column", alignItems: "center", padding: "clamp(16px,4vw,32px) clamp(12px,4vw,24px)" }}>

      {/* Brand */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16,1,0.3,1] }}
        style={{ textAlign: "center", margin: "clamp(16px,4vw,32px) 0 clamp(20px,4vw,28px)" }}>
        <div style={{ width: "52px", height: "52px", borderRadius: "14px", background: "#e2d609", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", boxShadow: "0 0 32px rgba(226,214,9,0.25)" }}>
          <span style={{ color: "#0f1317", fontSize: "22px", fontWeight: 900 }}>U</span>
        </div>
        <h1 style={{ fontSize: "clamp(18px,4vw,24px)", fontWeight: 900, color: "#f5f5f5", margin: 0 }}>Dove Barber</h1>
        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.35)", marginTop: "4px" }}>Reserve your spot</p>
      </motion.div>

      {/* Card */}
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1, ease: [0.16,1,0.3,1] }}
        style={{ width: "100%", maxWidth: "480px", background: "#171d22", border: "1px solid #2d3840", borderRadius: "20px", overflow: "hidden", marginBottom: "32px" }}>

        <AnimatePresence mode="wait">

          {/* ── Success ─────────────────────────────────────────────────────── */}
          {success ? (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}
              style={{ padding: "40px 28px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
              <div style={{ width: "72px", height: "72px", borderRadius: "50%", background: "rgba(16,185,129,0.12)", border: "2px solid rgba(16,185,129,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px" }}>✓</div>
              <div>
                <h2 style={{ fontSize: "22px", fontWeight: 900, color: "#10b981", marginBottom: "8px" }}>Reservation Received!</h2>
                <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.5)", lineHeight: 1.7 }}>
                  We'll call <strong style={{ color: "#f5f5f5" }}>{phone}</strong> to confirm your spot.<br />
                  See you at Dove Barber!
                </p>
              </div>
              {/* Summary */}
              <div style={{ width: "100%", padding: "16px", background: "#252f38", borderRadius: "12px", border: "1px solid #2d3840", textAlign: "left" }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "10px" }}>Your booking</div>
                {selectedServices.map(s => (
                  <div key={s.id} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #2d3840" }}>
                    <span style={{ fontSize: "13px", color: "#f5f5f5" }}>{s.name}</span>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "#e2d609" }}>{s.price.toLocaleString()} ETB</span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "10px", marginTop: "4px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "rgba(255,255,255,0.6)" }}>Total</span>
                  <span style={{ fontSize: "18px", fontWeight: 900, color: "#e2d609" }}>{totalPrice.toLocaleString()} ETB</span>
                </div>
                <div style={{ marginTop: "10px", fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>
                  📅 {date} at {time} · ~{totalDuration} min
                </div>
              </div>
              <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
                <a href="/status" style={{ padding: "11px 22px", borderRadius: "9999px", background: "#e2d609", color: "#0f1317", fontSize: "13px", fontWeight: 800, textDecoration: "none" }}>View Live Queue →</a>
                <a href="/" style={{ padding: "11px 22px", borderRadius: "9999px", background: "transparent", border: "1px solid #2d3840", color: "rgba(255,255,255,0.5)", fontSize: "13px", fontWeight: 600, textDecoration: "none" }}>Home</a>
              </div>
            </motion.div>

          ) : (

            /* ── Form ─────────────────────────────────────────────────────── */
            <motion.form key="form" onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column" }}>

              {/* Header */}
              <div style={{ padding: "24px 24px 0" }}>
                <h2 style={{ fontSize: "17px", fontWeight: 800, color: "#f5f5f5", marginBottom: "4px" }}>Book a Spot</h2>
                <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)" }}>We'll call to confirm. Walk-ins always welcome.</p>
              </div>

              <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "18px" }}>

                {/* ── Services ─────────────────────────────────────────────── */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                    <label style={{ ...LABEL, marginBottom: 0, color: errors.services ? "#f87171" : "rgba(255,255,255,0.4)" }}>
                      Services * {selected.length > 0 && <span style={{ color: "#10b981", fontWeight: 400, textTransform: "none" }}>({selected.length} selected)</span>}
                    </label>
                    {selected.length > 0 && (
                      <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>~{totalDuration} min</span>
                    )}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {SERVICES.map(svc => {
                      const isSel = selected.includes(svc.id);
                      return (
                        <button key={svc.id} type="button" onClick={() => toggleService(svc.id)}
                          style={{
                            display: "flex", alignItems: "center", gap: "12px",
                            padding: "12px 14px", borderRadius: "12px", textAlign: "left",
                            background: isSel ? "rgba(226,214,9,0.07)" : "#1e262d",
                            border: `1.5px solid ${isSel ? "#e2d609" : errors.services ? "rgba(239,68,68,0.3)" : "#2d3840"}`,
                            cursor: "pointer", transition: "all 0.15s ease",
                          }}>
                          {/* Checkbox */}
                          <div style={{
                            width: "20px", height: "20px", borderRadius: "6px", flexShrink: 0,
                            background: isSel ? "#e2d609" : "transparent",
                            border: `2px solid ${isSel ? "#e2d609" : "#3a4650"}`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            transition: "all 0.15s",
                          }}>
                            {isSel && <span style={{ color: "#0f1317", fontSize: "12px", fontWeight: 900, lineHeight: 1 }}>✓</span>}
                          </div>
                          {/* Info */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: "14px", fontWeight: 700, color: isSel ? "#e2d609" : "#f5f5f5" }}>{svc.name}</div>
                            <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginTop: "2px" }}>{svc.desc} · ~{svc.duration} min</div>
                          </div>
                          {/* Price */}
                          <div style={{ fontSize: "15px", fontWeight: 800, color: isSel ? "#e2d609" : "rgba(255,255,255,0.6)", flexShrink: 0 }}>
                            {svc.price.toLocaleString()} ETB
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {errors.services && <p style={ERR}>{errors.services}</p>}

                  {/* Cost summary */}
                  {selected.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
                      style={{ marginTop: "10px", padding: "12px 14px", background: "rgba(226,214,9,0.06)", borderRadius: "10px", border: "1px solid rgba(226,214,9,0.2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginBottom: "2px" }}>
                          {selected.length} service{selected.length !== 1 ? "s" : ""} · ~{totalDuration} min
                        </div>
                        <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>
                          {selectedServices.map(s => s.name).join(", ")}
                        </div>
                      </div>
                      <div style={{ fontSize: "22px", fontWeight: 900, color: "#e2d609" }}>
                        {totalPrice.toLocaleString()} ETB
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* ── Name ─────────────────────────────────────────────────── */}
                <div>
                  <label style={LABEL} htmlFor="res-name">Full Name *</label>
                  <input id="res-name" type="text" value={name} onChange={e => { setName(e.target.value); setErrors(er => ({ ...er, name: "" })); }}
                    placeholder="Your name" autoComplete="name"
                    style={{ ...INPUT, borderColor: errors.name ? "#ef4444" : name.length >= 2 ? "#10b981" : "#2d3840" }} />
                  {errors.name && <p style={ERR}>{errors.name}</p>}
                </div>

                {/* ── Phone ────────────────────────────────────────────────── */}
                <div>
                  <label style={LABEL} htmlFor="res-phone">Phone Number *</label>
                  <input id="res-phone" type="tel" value={phone} onChange={e => { setPhone(e.target.value); setErrors(er => ({ ...er, phone: "" })); }}
                    placeholder="0912 345 678" inputMode="tel" autoComplete="tel"
                    style={{ ...INPUT, borderColor: errors.phone ? "#ef4444" : phone.length >= 10 ? "#10b981" : "#2d3840" }} />
                  {errors.phone && <p style={ERR}>{errors.phone}</p>}
                  <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", marginTop: "4px" }}>We'll call this number to confirm your booking</p>
                </div>

                {/* ── Preferred Barber ─────────────────────────────────────── */}
                <div>
                  <label style={LABEL} htmlFor="res-barber">Preferred Barber <span style={{ fontWeight: 400, textTransform: "none" }}>(optional)</span></label>
                  <select id="res-barber" value={barberId} onChange={e => setBarberId(e.target.value)}
                    style={{ ...INPUT }}>
                    <option value="">Any available barber</option>
                    {barbers.map(b => <option key={b.actor_id} value={b.barber_id}>{b.name}</option>)}
                  </select>
                </div>

                {/* ── Date + Time ───────────────────────────────────────────── */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={LABEL} htmlFor="res-date">Date *</label>
                    <input id="res-date" type="date" value={date} min={todayISO()}
                      onChange={e => { setDate(e.target.value); setErrors(er => ({ ...er, date: "" })); }}
                      title="Reservation date"
                      style={{ ...INPUT, borderColor: errors.date ? "#ef4444" : "#2d3840" }} />
                    {errors.date && <p style={{ ...ERR, fontSize: "11px" }}>{errors.date}</p>}
                  </div>
                  <div>
                    <label style={LABEL} htmlFor="res-time">Time *</label>
                    <input id="res-time" type="time" value={time} min="08:00" max="20:00"
                      onChange={e => { setTime(e.target.value); setErrors(er => ({ ...er, time: "" })); }}
                      title="Reservation time"
                      style={{ ...INPUT, borderColor: errors.time ? "#ef4444" : "#2d3840" }} />
                    {errors.time && <p style={{ ...ERR, fontSize: "11px" }}>{errors.time}</p>}
                  </div>
                </div>
                <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", marginTop: "-10px" }}>Shop hours: 08:00 – 20:00</p>

                {/* ── Notes ────────────────────────────────────────────────── */}
                <div>
                  <label style={LABEL} htmlFor="res-notes">Notes <span style={{ fontWeight: 400, textTransform: "none" }}>(optional)</span></label>
                  <textarea id="res-notes" value={notes} onChange={e => setNotes(e.target.value)}
                    placeholder="Any special requests…" rows={2}
                    style={{ ...INPUT, resize: "none" }} />
                </div>

                {/* ── Error ────────────────────────────────────────────────── */}
                {errors.submit && (
                  <div style={{ padding: "12px 14px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "10px" }}>
                    <p style={{ fontSize: "13px", color: "#f87171" }}>{errors.submit}</p>
                  </div>
                )}

                {/* ── Submit ───────────────────────────────────────────────── */}
                <button type="submit" disabled={loading}
                  style={{ padding: "15px", borderRadius: "9999px", background: loading ? "rgba(226,214,9,0.4)" : "#e2d609", color: "#0f1317", fontSize: "15px", fontWeight: 900, border: "none", cursor: loading ? "not-allowed" : "pointer", boxShadow: "0 0 24px rgba(226,214,9,0.2)", transition: "all 0.2s" }}>
                  {loading ? "Sending…" : selected.length === 0 ? "Select a service to continue" : `Request Reservation · ${totalPrice.toLocaleString()} ETB →`}
                </button>

                <div style={{ display: "flex", justifyContent: "center", gap: "16px" }}>
                  <a href="/status" style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", textDecoration: "none" }}>View live queue</a>
                  <span style={{ color: "rgba(255,255,255,0.15)" }}>·</span>
                  <a href="/" style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", textDecoration: "none" }}>← Home</a>
                </div>

              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
