/**
 * @file AdminScreen.tsx
 * @module ui/screens
 *
 * Admin Governance Panel — full staff management + audit + config.
 * Specification: AMS v1.3, SOS v1.0, ECS v1.4 Events 27–31
 */

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useQueueBoard }    from "@/ui/hooks/useQueueBoard";
import { useBarberLane }    from "@/ui/hooks/useBarberLane";
import { useTransaction }   from "@/ui/hooks/useTransaction";
import { useSession }       from "@/ui/hooks/useSession";
import { useSyncStatus }    from "@/ui/hooks/useSyncStatus";
import { TopBar }           from "@/ui/components/shell/TopBar";
import { Badge }            from "@/ui/components/primitives/Badge";
import { SyncIndicator }    from "@/ui/components/primitives/SyncIndicator";
import { appendAdjustment } from "@/core/actions/transaction.actions";
import { overrideShopHours } from "@/core/actions/schedule.actions";

// ─── Types ────────────────────────────────────────────────────────────────────

type Section = "audit" | "adjustment" | "config" | "staff";

interface CloudOperatorRow {
  actor_id:       string;
  email:          string;
  name:           string;
  role:           "SYSTEM_OWNER" | "ADMIN" | "CASHIER" | "BARBER";
  barber_id:      string | null;
  is_active:      boolean;
  is_first_login: boolean;
  created_at:     string;
}

const SECTIONS: { id: Section; label: string; icon: string }[] = [
  { id: "audit",      label: "Audit Log",   icon: "📋" },
  { id: "adjustment", label: "Adjustment",  icon: "✏️" },
  { id: "config",     label: "Shop Config", icon: "⚙️" },
  { id: "staff",      label: "Staff",       icon: "👥" },
];

const ROLE_COLOR: Record<string, string> = {
  SYSTEM_OWNER: "#fb923c",
  ADMIN:        "#e2d609",
  CASHIER:      "#38bdf8",
  BARBER:       "#2dd4bf",
};

// ─── Shared input style ───────────────────────────────────────────────────────

const INPUT: React.CSSProperties = {
  width: "100%", padding: "11px 14px",
  background: "#252f38", border: "1.5px solid #2d3840",
  borderRadius: "10px", color: "#f5f5f5", fontSize: "14px",
  outline: "none", boxSizing: "border-box", fontFamily: "inherit",
};

const LABEL: React.CSSProperties = {
  display: "block", fontSize: "11px", fontWeight: 700,
  color: "rgba(255,255,255,0.4)", textTransform: "uppercase",
  letterSpacing: "0.1em", marginBottom: "6px",
};

// ─── Audit Section ────────────────────────────────────────────────────────────

function AuditSection() {
  const { view: ledger } = useTransaction();
  const { view: queue }  = useQueueBoard();
  const [filter, setFilter] = useState<"all" | "active" | "settled">("all");

  const allTx = [...(ledger?.active ?? []), ...(ledger?.settled_today ?? [])];
  const filtered = filter === "active" ? (ledger?.active ?? [])
    : filter === "settled" ? (ledger?.settled_today ?? []) : allTx;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div>
        <span style={{ fontSize: "11px", fontWeight: 700, color: "#e2d609", textTransform: "uppercase", letterSpacing: "0.15em" }}>Transaction Audit Log</span>
        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", marginTop: "4px" }}>Append-only. Corrections via Adjustment Entry only.</p>
      </div>
      <div style={{ display: "flex", gap: "8px" }}>
        {(["all", "active", "settled"] as const).map(f => (
          <button key={f} type="button" onClick={() => setFilter(f)} style={{ padding: "6px 14px", borderRadius: "9999px", background: filter === f ? "rgba(226,214,9,0.1)" : "transparent", border: `1px solid ${filter === f ? "rgba(226,214,9,0.3)" : "#2d3840"}`, color: filter === f ? "#e2d609" : "rgba(255,255,255,0.4)", fontSize: "12px", fontWeight: 600, cursor: "pointer", textTransform: "capitalize" }}>
            {f} ({f === "all" ? allTx.length : f === "active" ? (ledger?.active.length ?? 0) : (ledger?.settled_today.length ?? 0)})
          </button>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
        {[{ label: "Waiting", value: queue?.total_waiting ?? 0, color: "#3b82f6" }, { label: "In Service", value: queue?.in_service.length ?? 0, color: "#10b981" }, { label: "Today", value: allTx.length, color: "#e2d609" }].map(({ label, value, color }) => (
          <div key={label} style={{ padding: "12px 14px", background: "#1e262d", borderRadius: "10px", border: "1px solid #2d3840" }}>
            <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>{label}</div>
            <div style={{ fontSize: "22px", fontWeight: 900, color }}>{value}</div>
          </div>
        ))}
      </div>
      {filtered.length === 0 ? (
        <div style={{ padding: "32px", textAlign: "center", background: "#1e262d", borderRadius: "12px", border: "1px solid #2d3840" }}>
          <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.3)" }}>No transactions</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1px", borderRadius: "12px", overflow: "hidden", border: "1px solid #2d3840" }}>
          {filtered.map(tx => (
            <div key={tx.transaction_id} style={{ padding: "14px 16px", background: "#1e262d", display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "14px", fontWeight: 900, color: "#e2d609", minWidth: "52px" }}>{tx.queue_token || "—"}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "13px", color: "#f5f5f5", fontWeight: 600 }}>{tx.customer_display || "Guest"}</div>
                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)", marginTop: "2px" }}>{tx.transaction_id.slice(0, 12)}…{tx.service_snapshot.length > 0 && ` · ${tx.service_snapshot.length} service(s)`}</div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: "14px", fontWeight: 800, color: "#f5f5f5" }}>{tx.total_etb > 0 ? `${tx.total_etb.toLocaleString()} ETB` : "—"}</div>
                <Badge variant={tx.is_settled ? "in-service" : tx.status === "PAYMENT_PENDING" ? "called" : "waiting"} label={tx.status.replace("_", " ")} size="sm" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Adjustment Section ───────────────────────────────────────────────────────

function AdjustmentSection({ session }: { session: NonNullable<ReturnType<typeof useSession>["session"]> }) {
  const { view: ledger } = useTransaction();
  const [txId, setTxId] = useState("");
  const [reasonCode, setReasonCode] = useState("CORRECTION");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const allTx = [...(ledger?.active ?? []), ...(ledger?.settled_today ?? [])];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txId) { setError("Select a transaction"); return; }
    if (!notes.trim()) { setError("Notes are required for audit trail"); return; }
    setLoading(true); setError("");
    try {
      const { journalService } = await import("@/core/journal/journal.service");
      const adjId = crypto.randomUUID();
      await appendAdjustment({ adjustmentId: adjId, aggregateVersion: await journalService.getNextAggregateVersion(adjId), originalTransactionUuid: txId, reasonCode, adjustmentData: { notes: notes.trim(), adjusted_by: session.actor_id, adjusted_by_name: session.actor_name } }, session);
      setSuccess(true); setTxId(""); setNotes("");
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) { setError("Adjustment failed — check console"); console.error(err); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div>
        <span style={{ fontSize: "11px", fontWeight: 700, color: "#e2d609", textTransform: "uppercase", letterSpacing: "0.15em" }}>Adjustment Entry</span>
        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", marginTop: "4px" }}>Non-destructive correction. Original record preserved. EVENT 09.</p>
      </div>
      {success && <div style={{ padding: "12px 16px", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: "10px" }}><span style={{ fontSize: "13px", color: "#10b981", fontWeight: 600 }}>✓ Adjustment recorded</span></div>}
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <div>
          <label style={LABEL}>Transaction</label>
          <select value={txId} onChange={e => setTxId(e.target.value)} aria-label="Select transaction" style={{ ...INPUT }}>
            <option value="">Select transaction…</option>
            {allTx.map(tx => <option key={tx.transaction_id} value={tx.transaction_id}>{tx.queue_token} — {tx.customer_display} — {tx.total_etb} ETB ({tx.status})</option>)}
          </select>
        </div>
        <div>
          <label style={LABEL}>Reason Code</label>
          <select value={reasonCode} onChange={e => setReasonCode(e.target.value)} aria-label="Reason code" style={{ ...INPUT }}>
            <option value="CORRECTION">Correction</option>
            <option value="REFUND">Refund</option>
            <option value="DISPUTE">Dispute</option>
            <option value="SYSTEM_ERROR">System Error</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
        <div>
          <label style={LABEL}>Notes *</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Describe the correction in detail…" rows={3} style={{ ...INPUT, resize: "vertical" }} />
        </div>
        {error && <p style={{ fontSize: "12px", color: "#f87171" }}>{error}</p>}
        <button type="submit" disabled={loading || !txId} style={{ padding: "13px", borderRadius: "9999px", background: loading || !txId ? "rgba(226,214,9,0.3)" : "#e2d609", color: "#0f1317", fontSize: "14px", fontWeight: 800, border: "none", cursor: loading || !txId ? "not-allowed" : "pointer" }}>
          {loading ? "Recording…" : "Record Adjustment (EVENT 09)"}
        </button>
      </form>
    </div>
  );
}

// ─── Config Section ───────────────────────────────────────────────────────────

function ConfigSection({ session }: { session: NonNullable<ReturnType<typeof useSession>["session"]> }) {
  const [openTime, setOpenTime] = useState("08:00");
  const [closeTime, setCloseTime] = useState("20:00");
  const [isClosed, setIsClosed] = useState(false);
  const [dateScope, setDateScope] = useState("DEFAULT");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const validateDateScope = (v: string) => {
    if (v === "DEFAULT") return "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return "Use DEFAULT or YYYY-MM-DD format";
    const d = new Date(v);
    if (isNaN(d.getTime())) return "Invalid date";
    return "";
  };

  const handleSave = async () => {
    const scopeErr = validateDateScope(dateScope);
    if (scopeErr) { setError(scopeErr); return; }
    if (!isClosed && openTime >= closeTime) { setError("Opening time must be before closing time"); return; }
    setLoading(true); setError("");
    try {
      const { journalService } = await import("@/core/journal/journal.service");
      const sysId = "system_process_001";
      await overrideShopHours({ systemProcessId: sysId, aggregateVersion: await journalService.getNextAggregateVersion(sysId), dateScope, openTime: isClosed ? undefined : openTime, closeTime: isClosed ? undefined : closeTime, isClosed }, session);
      setSuccess(true); setTimeout(() => setSuccess(false), 3000);
    } finally { setLoading(false); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div>
        <span style={{ fontSize: "11px", fontWeight: 700, color: "#e2d609", textTransform: "uppercase", letterSpacing: "0.15em" }}>Shop Configuration</span>
        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", marginTop: "4px" }}>Changes apply prospectively. Active sessions unaffected.</p>
      </div>
      {success && <div style={{ padding: "12px 16px", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: "10px" }}><span style={{ fontSize: "13px", color: "#10b981", fontWeight: 600 }}>✓ Shop hours updated (EVENT 24)</span></div>}
      <div style={{ padding: "20px", background: "#1e262d", borderRadius: "12px", border: "1px solid #2d3840", display: "flex", flexDirection: "column", gap: "14px" }}>
        <div style={{ fontSize: "12px", fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Operating Hours Override</div>
        <div>
          <label style={LABEL}>Date Scope</label>
          <input type="text" value={dateScope} onChange={e => { setDateScope(e.target.value); setError(""); }} placeholder="DEFAULT or YYYY-MM-DD" style={{ ...INPUT }} />
          <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", marginTop: "4px" }}>Use DEFAULT for recurring schedule, or a specific date for one-day override</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button type="button" onClick={() => setIsClosed(c => !c)} style={{ width: "40px", height: "22px", borderRadius: "9999px", background: isClosed ? "#ef4444" : "#2d3840", border: "none", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }} aria-label="Toggle closed">
            <div style={{ position: "absolute", top: "3px", left: isClosed ? "20px" : "3px", width: "16px", height: "16px", borderRadius: "50%", background: "#f5f5f5", transition: "left 0.2s" }} />
          </button>
          <span style={{ fontSize: "13px", color: isClosed ? "#ef4444" : "rgba(255,255,255,0.5)" }}>{isClosed ? "Shop Closed" : "Shop Open"}</span>
        </div>
        {!isClosed && (
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <div style={{ flex: 1 }}>
              <label style={LABEL}>Open</label>
              <input type="time" value={openTime} onChange={e => setOpenTime(e.target.value)} style={{ ...INPUT }} aria-label="Opening time" />
            </div>
            <span style={{ color: "rgba(255,255,255,0.3)", marginTop: "18px" }}>→</span>
            <div style={{ flex: 1 }}>
              <label style={LABEL}>Close</label>
              <input type="time" value={closeTime} onChange={e => setCloseTime(e.target.value)} style={{ ...INPUT }} aria-label="Closing time" />
            </div>
          </div>
        )}
        {error && <p style={{ fontSize: "12px", color: "#f87171" }}>{error}</p>}
        <button type="button" onClick={handleSave} disabled={loading} style={{ padding: "12px", borderRadius: "9999px", background: loading ? "rgba(226,214,9,0.3)" : "#e2d609", color: "#0f1317", fontSize: "14px", fontWeight: 800, border: "none", cursor: loading ? "not-allowed" : "pointer" }}>
          {loading ? "Saving…" : "Save Hours (EVENT 24)"}
        </button>
      </div>
    </div>
  );
}

// ─── Staff Section ────────────────────────────────────────────────────────────

type StaffView = "roster" | "register";

interface RegisterForm {
  name:        string;
  email:       string;
  role:        "ADMIN" | "CASHIER" | "BARBER";
  barber_id:   string;
  initial_pin: string;
  confirm_pin: string;
}

interface FormErrors {
  name?:        string;
  email?:       string;
  role?:        string;
  barber_id?:   string;
  initial_pin?: string;
  confirm_pin?: string;
  submit?:      string;
}

// PIN strength rules
function validatePin(pin: string): string {
  if (pin.length !== 6)                          return "Must be exactly 6 digits";
  if (!/^\d{6}$/.test(pin))                      return "Digits only (0–9)";
  if (/^(\d)\1{5}$/.test(pin))                   return "Cannot be all the same digit (e.g. 111111)";
  if (["012345","123456","234567","345678","456789","567890","098765","987654","876543","765432","654321","543210"].includes(pin))
                                                  return "Cannot be a sequential run";
  return "";
}

function validateEmail(email: string): string {
  if (!email.trim())                                      return "Email is required";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) return "Enter a valid email address";
  return "";
}

// Server-side email deliverability check (MX + disposable domain)
async function verifyEmailDeliverable(email: string): Promise<{ valid: boolean; reason?: string }> {
  try {
    const resp = await fetch("/api/auth/verify-email", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    return await resp.json() as { valid: boolean; reason?: string };
  } catch {
    return { valid: true }; // network error — don't block
  }
}

function validateName(name: string): string {
  if (!name.trim())                              return "Full name is required";
  if (name.trim().length < 2)                    return "At least 2 characters";
  if (name.trim().length > 60)                   return "Too long (max 60 characters)";
  if (!/^[a-zA-Z\u00C0-\u024F\s'-]+$/.test(name.trim())) return "Letters, spaces, hyphens and apostrophes only";
  return "";
}

function validateBarberId(id: string): string {
  if (!id.trim())                                return "Lane ID is required for barbers";
  if (!/^lane_\d{3}$/.test(id.trim()))           return "Format: lane_001, lane_002, …";
  return "";
}

// ── Register Form ─────────────────────────────────────────────────────────────

function RegisterStaffForm({
  session,
  onSuccess,
  existingEmails,
  existingBarberIds,
}: {
  session:          NonNullable<ReturnType<typeof useSession>["session"]>;
  onSuccess:        (op: CloudOperatorRow) => void;
  existingEmails:   string[];
  existingBarberIds: string[];
}) {
  const [form, setForm] = useState<RegisterForm>({
    name: "", email: "", role: "CASHIER", barber_id: "", initial_pin: "", confirm_pin: "",
  });
  const [errors, setErrors]         = useState<FormErrors>({});
  const [loading, setLoading]       = useState(false);
  const [showPin, setShowPin]       = useState(false);
  const [pinStrength, setPinStrength] = useState<"" | "weak" | "ok" | "strong">("");
  const [emailStatus, setEmailStatus] = useState<"idle" | "checking" | "valid" | "invalid">("idle");
  const [emailReason, setEmailReason] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  const set = (k: keyof RegisterForm, v: string) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: undefined, submit: undefined }));
    if (k === "email") { setEmailStatus("idle"); setEmailReason(""); }
    if (k === "initial_pin") {
      const err = validatePin(v);
      if (!v) setPinStrength("");
      else if (err) setPinStrength("weak");
      else if (/^(\d)\1/.test(v) || v === "000000") setPinStrength("ok");
      else setPinStrength("strong");
    }
  };

  const handleEmailBlur = async () => {
    const fmtErr = validateEmail(form.email);
    if (fmtErr || !form.email.trim()) return;
    if (existingEmails.includes(form.email.trim().toLowerCase())) return;
    setEmailStatus("checking");
    const result = await verifyEmailDeliverable(form.email.trim());
    if (result.valid) {
      setEmailStatus("valid");
      setEmailReason("");
    } else {
      setEmailStatus("invalid");
      setEmailReason(result.reason ?? "Email address cannot receive mail");
      setErrors(e => ({ ...e, email: result.reason ?? "Email address cannot receive mail" }));
    }
  };

  const validate = (): FormErrors => {
    const e: FormErrors = {};
    const nameErr = validateName(form.name);
    if (nameErr) e.name = nameErr;
    const emailErr = validateEmail(form.email);
    if (emailErr) e.email = emailErr;
    else if (existingEmails.includes(form.email.trim().toLowerCase())) e.email = "This email is already registered";
    else if (emailStatus === "invalid") e.email = emailReason || "Email address cannot receive mail";
    const pinErr = validatePin(form.initial_pin);
    if (pinErr) e.initial_pin = pinErr;
    if (form.confirm_pin !== form.initial_pin) e.confirm_pin = "PINs do not match";
    if (form.role === "BARBER") {
      const bErr = validateBarberId(form.barber_id);
      if (bErr) e.barber_id = bErr;
      else if (existingBarberIds.includes(form.barber_id.trim())) e.barber_id = "This lane ID is already assigned";
    }
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    // Show confirmation dialog before actually registering
    setShowConfirm(true);
  };

  const handleConfirmedSubmit = async () => {
    setShowConfirm(false);
    setLoading(true);
    try {
      const actorId = crypto.randomUUID();
      const resp = await fetch("/api/auth/create-operator", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actor_id:    actorId,
          email:       form.email.trim().toLowerCase(),
          name:        form.name.trim(),
          role:        form.role,
          initial_pin: form.initial_pin,
          barber_id:   form.role === "BARBER" ? form.barber_id.trim() : null,
        }),
      });
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({})) as { error?: string };
        setErrors({ submit: body.error ?? "Registration failed" });
        return;
      }
      onSuccess({
        actor_id: actorId, email: form.email.trim().toLowerCase(),
        name: form.name.trim(), role: form.role,
        barber_id: form.role === "BARBER" ? form.barber_id.trim() : null,
        is_active: true, is_first_login: true,
        created_at: new Date().toISOString(),
      });
      setForm({ name: "", email: "", role: "CASHIER", barber_id: "", initial_pin: "", confirm_pin: "" });
      setPinStrength("");
    } catch {
      setErrors({ submit: "Network error — try again" });
    } finally { setLoading(false); }
  };

  const strengthColor = pinStrength === "strong" ? "#10b981" : pinStrength === "ok" ? "#f59e0b" : "#ef4444";
  const strengthLabel = pinStrength === "strong" ? "Strong" : pinStrength === "ok" ? "Acceptable" : pinStrength === "weak" ? "Weak" : "";

  return (
    <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* Name */}
      <div>
        <label style={LABEL}>Full Name *</label>
        <input type="text" value={form.name} onChange={e => set("name", e.target.value)}
          placeholder="e.g. Abebe Girma" autoComplete="off"
          style={{ ...INPUT, borderColor: errors.name ? "#ef4444" : form.name.length >= 2 ? "#10b981" : "#2d3840" }} />
        {errors.name && <p style={{ fontSize: "12px", color: "#f87171", marginTop: "4px" }}>{errors.name}</p>}
      </div>

      {/* Email */}
      <div>
        <label style={LABEL}>Email Address *</label>
        <div style={{ position: "relative" }}>
          <input type="email" value={form.email} onChange={e => set("email", e.target.value)}
            onBlur={handleEmailBlur}
            placeholder="staff@unclegrooming.com" autoComplete="off" autoCapitalize="none"
            style={{ ...INPUT, borderColor: errors.email ? "#ef4444" : emailStatus === "valid" ? "#10b981" : emailStatus === "checking" ? "#f59e0b" : form.email.includes("@") ? "#3a4650" : "#2d3840", paddingRight: emailStatus !== "idle" ? "36px" : undefined }} />
          {emailStatus === "checking" && (
            <span style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "12px", color: "#f59e0b" }}>⟳</span>
          )}
          {emailStatus === "valid" && (
            <span style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "14px", color: "#10b981" }}>✓</span>
          )}
          {emailStatus === "invalid" && (
            <span style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "14px", color: "#ef4444" }}>✗</span>
          )}
        </div>
        {errors.email && <p style={{ fontSize: "12px", color: "#f87171", marginTop: "4px" }}>{errors.email}</p>}
        {emailStatus === "checking" && !errors.email && <p style={{ fontSize: "11px", color: "#f59e0b", marginTop: "4px" }}>Verifying email domain…</p>}
        {emailStatus === "valid" && !errors.email && <p style={{ fontSize: "11px", color: "#10b981", marginTop: "4px" }}>✓ Email domain verified — can receive mail</p>}
        <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", marginTop: "4px" }}>Used to log in. Must be unique. Domain is verified for deliverability.</p>
      </div>

      {/* Role */}
      <div>
        <label style={LABEL}>Role *</label>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {(["ADMIN", "CASHIER", "BARBER"] as const).map(r => (
            <button key={r} type="button" onClick={() => set("role", r)}
              style={{ padding: "9px 18px", borderRadius: "9999px", background: form.role === r ? `${ROLE_COLOR[r]}18` : "transparent", border: `1.5px solid ${form.role === r ? ROLE_COLOR[r] : "#2d3840"}`, color: form.role === r ? ROLE_COLOR[r] : "rgba(255,255,255,0.5)", fontSize: "13px", fontWeight: 700, cursor: "pointer", transition: "all 0.15s" }}>
              {r}
            </button>
          ))}
        </div>
        <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", marginTop: "6px" }}>
          {form.role === "ADMIN" ? "Full access: audit, adjustments, shop config, staff management" :
           form.role === "CASHIER" ? "Queue management, check-in, settlement desk" :
           "Barber lane cockpit, service start/complete, schedule"}
        </p>
      </div>

      {/* Barber lane ID — only for BARBER role */}
      {form.role === "BARBER" && (
        <div>
          <label style={LABEL}>Lane ID *</label>
          <input type="text" value={form.barber_id} onChange={e => set("barber_id", e.target.value)}
            placeholder="lane_001" autoComplete="off"
            style={{ ...INPUT, borderColor: errors.barber_id ? "#ef4444" : form.barber_id.match(/^lane_\d{3}$/) ? "#10b981" : "#2d3840" }} />
          {errors.barber_id && <p style={{ fontSize: "12px", color: "#f87171", marginTop: "4px" }}>{errors.barber_id}</p>}
          <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", marginTop: "4px" }}>Format: lane_001, lane_002, lane_003… Must be unique.</p>
        </div>
      )}

      {/* Initial PIN */}
      <div>
        <label style={LABEL}>Initial PIN * <span style={{ fontWeight: 400, textTransform: "none", color: "rgba(255,255,255,0.3)" }}>(6 digits — staff must change on first login)</span></label>
        <div style={{ position: "relative" }}>
          <input type={showPin ? "text" : "password"} value={form.initial_pin}
            onChange={e => set("initial_pin", e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="••••••" inputMode="numeric" maxLength={6}
            style={{ ...INPUT, borderColor: errors.initial_pin ? "#ef4444" : pinStrength === "strong" ? "#10b981" : pinStrength === "ok" ? "#f59e0b" : "#2d3840", paddingRight: "44px" }} />
          <button type="button" onClick={() => setShowPin(s => !s)}
            style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: "13px" }}
            aria-label={showPin ? "Hide PIN" : "Show PIN"}>
            {showPin ? "Hide" : "Show"}
          </button>
        </div>
        {pinStrength && <p style={{ fontSize: "11px", color: strengthColor, marginTop: "4px", fontWeight: 600 }}>Strength: {strengthLabel}</p>}
        {errors.initial_pin && <p style={{ fontSize: "12px", color: "#f87171", marginTop: "4px" }}>{errors.initial_pin}</p>}
        <div style={{ marginTop: "6px", display: "flex", flexDirection: "column", gap: "2px" }}>
          {["6 digits only", "No all-same digits (111111)", "No sequential runs (123456)"].map(rule => (
            <p key={rule} style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)" }}>· {rule}</p>
          ))}
        </div>
      </div>

      {/* Confirm PIN */}
      <div>
        <label style={LABEL}>Confirm PIN *</label>
        <input type={showPin ? "text" : "password"} value={form.confirm_pin}
          onChange={e => set("confirm_pin", e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="••••••" inputMode="numeric" maxLength={6}
          style={{ ...INPUT, borderColor: errors.confirm_pin ? "#ef4444" : form.confirm_pin.length === 6 && form.confirm_pin === form.initial_pin ? "#10b981" : "#2d3840" }} />
        {errors.confirm_pin && <p style={{ fontSize: "12px", color: "#f87171", marginTop: "4px" }}>{errors.confirm_pin}</p>}
        {form.confirm_pin.length === 6 && form.confirm_pin === form.initial_pin && !errors.confirm_pin && (
          <p style={{ fontSize: "11px", color: "#10b981", marginTop: "4px" }}>✓ PINs match</p>
        )}
      </div>

      {errors.submit && (
        <div style={{ padding: "12px 16px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: "10px" }}>
          <p style={{ fontSize: "13px", color: "#f87171" }}>{errors.submit}</p>
        </div>
      )}

      <button type="submit" disabled={loading || emailStatus === "checking"}
        style={{ padding: "14px", borderRadius: "9999px", background: loading || emailStatus === "checking" ? "rgba(226,214,9,0.3)" : "#e2d609", color: "#0f1317", fontSize: "15px", fontWeight: 900, border: "none", cursor: loading || emailStatus === "checking" ? "not-allowed" : "pointer", boxShadow: "0 0 24px rgba(226,214,9,0.2)", transition: "all 0.2s" }}>
        {loading ? "Registering…" : emailStatus === "checking" ? "Verifying email…" : `Register ${form.role === "BARBER" ? "Barber" : form.role === "ADMIN" ? "Admin" : "Cashier"} →`}
      </button>

      {/* Registration confirmation modal */}
      {showConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: "16px" }}>
          <div style={{ width: "100%", maxWidth: "420px", background: "#171d22", borderRadius: "20px", border: "1px solid #2d3840", padding: "28px 24px", display: "flex", flexDirection: "column", gap: "20px" }}>
            <div>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#e2d609", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "8px" }}>Confirm Registration</div>
              <p style={{ fontSize: "14px", color: "#f5f5f5", lineHeight: 1.6 }}>
                You are about to create a new <strong style={{ color: ROLE_COLOR[form.role] }}>{form.role}</strong> account for:
              </p>
            </div>
            <div style={{ padding: "16px", background: "#252f38", borderRadius: "12px", border: "1px solid #2d3840", display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>Name</span>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "#f5f5f5" }}>{form.name.trim()}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>Email</span>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "#f5f5f5" }}>{form.email.trim().toLowerCase()}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>Role</span>
                <span style={{ fontSize: "13px", fontWeight: 700, color: ROLE_COLOR[form.role] }}>{form.role}</span>
              </div>
              {form.role === "BARBER" && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>Lane</span>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "#2dd4bf" }}>{form.barber_id.trim()}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>First login</span>
                <span style={{ fontSize: "13px", color: "#f59e0b" }}>Must change PIN</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button type="button" onClick={() => setShowConfirm(false)}
                style={{ flex: 1, padding: "12px", borderRadius: "9999px", background: "transparent", border: "1px solid #2d3840", color: "rgba(255,255,255,0.5)", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>
                Cancel
              </button>
              <button type="button" onClick={handleConfirmedSubmit}
                style={{ flex: 2, padding: "12px", borderRadius: "9999px", background: "#e2d609", color: "#0f1317", fontSize: "14px", fontWeight: 900, border: "none", cursor: "pointer" }}>
                Yes, Register →
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}

// ── Operator Card (roster row) ────────────────────────────────────────────────

function OperatorCard({
  op,
  currentActorId,
  canManage,
  onDeactivate,
  onReactivate,
  onResetPin,
  onDelete,
}: {
  op:             CloudOperatorRow;
  currentActorId: string;
  canManage:      boolean;
  onDeactivate:   (id: string) => void;
  onReactivate:   (id: string) => void;
  onResetPin:     (op: CloudOperatorRow) => void;
  onDelete:       (op: CloudOperatorRow) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [confirm, setConfirm]   = useState<"deactivate" | "reactivate" | null>(null);
  const isSelf = op.actor_id === currentActorId;

  return (
    <div style={{
      background: op.is_active ? "#1e262d" : "rgba(30,38,45,0.5)",
      borderRadius: "12px",
      border: `1px solid ${op.is_active ? "#2d3840" : "rgba(45,56,64,0.5)"}`,
      overflow: "hidden",
      opacity: op.is_active ? 1 : 0.65,
    }}>
      {/* Header row */}
      <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: "12px" }}>
        {/* Role dot */}
        <div style={{
          width: "36px", height: "36px", borderRadius: "10px", flexShrink: 0,
          background: `${ROLE_COLOR[op.role] ?? "#6b7280"}18`,
          border: `1px solid ${ROLE_COLOR[op.role] ?? "#6b7280"}40`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "14px",
        }}>
          {op.role === "BARBER" ? "✂️" : op.role === "CASHIER" ? "💳" : op.role === "ADMIN" ? "🔑" : "👑"}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "14px", fontWeight: 700, color: "#f5f5f5" }}>{op.name}</span>
            {isSelf && <span style={{ fontSize: "10px", color: "#e2d609", fontWeight: 700, padding: "1px 6px", borderRadius: "9999px", background: "rgba(226,214,9,0.1)", border: "1px solid rgba(226,214,9,0.2)" }}>YOU</span>}
            {op.is_first_login && <span style={{ fontSize: "10px", color: "#f59e0b", fontWeight: 700, padding: "1px 6px", borderRadius: "9999px", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}>FIRST LOGIN</span>}
            {!op.is_active && <span style={{ fontSize: "10px", color: "#ef4444", fontWeight: 700, padding: "1px 6px", borderRadius: "9999px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>INACTIVE</span>}
          </div>
          <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {op.email}
            {op.barber_id && <span style={{ color: "#2dd4bf", marginLeft: "8px" }}>· {op.barber_id}</span>}
          </div>
        </div>

        {/* Role badge */}
        <span style={{
          padding: "3px 10px", borderRadius: "9999px", flexShrink: 0,
          background: `${ROLE_COLOR[op.role] ?? "#6b7280"}18`,
          color: ROLE_COLOR[op.role] ?? "#6b7280",
          fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em",
        }}>
          {op.role.replace("_", " ")}
        </span>

        {/* Expand toggle */}
        {canManage && !isSelf && op.role !== "SYSTEM_OWNER" && (
          <button type="button" onClick={() => setExpanded(e => !e)}
            style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: "18px", padding: "4px", lineHeight: 1, transition: "transform 0.2s", transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
            aria-label={expanded ? "Collapse" : "Expand actions"}>
            ⌄
          </button>
        )}
      </div>

      {/* Action drawer */}
      {expanded && canManage && !isSelf && op.role !== "SYSTEM_OWNER" && (
        <div style={{ padding: "12px 16px 16px", borderTop: "1px solid #2d3840", display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button type="button" onClick={() => onResetPin(op)}
            style={{ padding: "8px 16px", borderRadius: "9999px", background: "transparent", border: "1px solid rgba(226,214,9,0.3)", color: "#e2d609", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>
            🔄 Reset PIN
          </button>
          {op.is_active ? (
            <button type="button" onClick={() => onDeactivate(op.actor_id)}
              style={{ padding: "8px 16px", borderRadius: "9999px", background: "transparent", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>
              🚫 Deactivate
            </button>
          ) : (
            <button type="button" onClick={() => onReactivate(op.actor_id)}
              style={{ padding: "8px 16px", borderRadius: "9999px", background: "transparent", border: "1px solid rgba(16,185,129,0.3)", color: "#10b981", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>
              ✅ Reactivate
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Reset PIN Modal ───────────────────────────────────────────────────────────

function ResetPinModal({
  target,
  onClose,
  onDone,
}: {
  target:  CloudOperatorRow;
  onClose: () => void;
  onDone:  () => void;
}) {
  const [newPin,     setNewPin]     = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showPin,    setShowPin]    = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [success,    setSuccess]    = useState(false);

  const pinErr     = newPin.length > 0 ? validatePin(newPin) : "";
  const confirmErr = confirmPin.length > 0 && confirmPin !== newPin ? "PINs do not match" : "";
  const canSubmit  = newPin.length === 6 && !pinErr && confirmPin === newPin;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true); setError("");
    try {
      const resp = await fetch("/api/auth/reset-pin", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actor_id: target.actor_id, new_pin: newPin }),
      });
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({})) as { error?: string };
        setError(body.error ?? "Failed to reset PIN");
        return;
      }
      setSuccess(true);
      setTimeout(() => { onDone(); onClose(); }, 1500);
    } catch {
      setError("Network error — try again");
    } finally { setLoading(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "16px" }}>
      <div style={{ width: "100%", maxWidth: "400px", background: "#171d22", borderRadius: "20px", border: "1px solid #2d3840", padding: "28px 24px", display: "flex", flexDirection: "column", gap: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#e2d609", textTransform: "uppercase", letterSpacing: "0.15em" }}>Reset PIN</div>
            <div style={{ fontSize: "16px", fontWeight: 800, color: "#f5f5f5", marginTop: "2px" }}>{target.name}</div>
            <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>{target.email}</div>
          </div>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: "22px", lineHeight: 1 }} aria-label="Close">×</button>
        </div>

        {success ? (
          <div style={{ padding: "20px", textAlign: "center" }}>
            <div style={{ fontSize: "32px", marginBottom: "8px" }}>✓</div>
            <p style={{ fontSize: "14px", color: "#10b981", fontWeight: 700 }}>PIN reset — staff must change on next login</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ padding: "12px 14px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: "10px" }}>
              <p style={{ fontSize: "12px", color: "#f59e0b" }}>⚠️ Staff will be required to change this PIN on their next login.</p>
            </div>

            <div>
              <label style={LABEL}>New PIN *</label>
              <div style={{ position: "relative" }}>
                <input type={showPin ? "text" : "password"} value={newPin}
                  onChange={e => { setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }}
                  placeholder="••••••" inputMode="numeric" maxLength={6}
                  style={{ ...INPUT, borderColor: pinErr ? "#ef4444" : newPin.length === 6 && !pinErr ? "#10b981" : "#2d3840", paddingRight: "44px" }} />
                <button type="button" onClick={() => setShowPin(s => !s)}
                  style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: "13px" }}>
                  {showPin ? "Hide" : "Show"}
                </button>
              </div>
              {pinErr && <p style={{ fontSize: "12px", color: "#f87171", marginTop: "4px" }}>{pinErr}</p>}
            </div>

            <div>
              <label style={LABEL}>Confirm PIN *</label>
              <input type={showPin ? "text" : "password"} value={confirmPin}
                onChange={e => { setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }}
                placeholder="••••••" inputMode="numeric" maxLength={6}
                style={{ ...INPUT, borderColor: confirmErr ? "#ef4444" : confirmPin.length === 6 && confirmPin === newPin ? "#10b981" : "#2d3840" }} />
              {confirmErr && <p style={{ fontSize: "12px", color: "#f87171", marginTop: "4px" }}>{confirmErr}</p>}
            </div>

            {error && <p style={{ fontSize: "12px", color: "#f87171" }}>{error}</p>}

            <div style={{ display: "flex", gap: "10px" }}>
              <button type="button" onClick={onClose}
                style={{ flex: 1, padding: "12px", borderRadius: "9999px", background: "transparent", border: "1px solid #2d3840", color: "rgba(255,255,255,0.5)", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>
                Cancel
              </button>
              <button type="submit" disabled={!canSubmit || loading}
                style={{ flex: 2, padding: "12px", borderRadius: "9999px", background: canSubmit && !loading ? "#e2d609" : "rgba(226,214,9,0.3)", color: "#0f1317", fontSize: "14px", fontWeight: 800, border: "none", cursor: canSubmit && !loading ? "pointer" : "not-allowed" }}>
                {loading ? "Resetting…" : "Reset PIN"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ── Staff Section (main) ──────────────────────────────────────────────────────

function StaffSection({ session }: { session: NonNullable<ReturnType<typeof useSession>["session"]> }) {
  const [view,        setView]        = useState<StaffView>("roster");
  const [operators,   setOperators]   = useState<CloudOperatorRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError,   setListError]   = useState("");
  const [resetTarget, setResetTarget] = useState<CloudOperatorRow | null>(null);
  const [actionMsg,   setActionMsg]   = useState("");
  const [filterRole,  setFilterRole]  = useState<"ALL" | "ADMIN" | "CASHIER" | "BARBER">("ALL");
  const [filterActive, setFilterActive] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ACTIVE");

  const canManage = session.role === "SYSTEM_OWNER" || session.role === "ADMIN";

  const fetchOperators = useCallback(async () => {
    setLoadingList(true); setListError("");
    try {
      const resp = await fetch("/api/auth/list-operators");
      if (!resp.ok) { setListError("Failed to load staff roster"); return; }
      const body = await resp.json() as { operators: CloudOperatorRow[] };
      setOperators(body.operators ?? []);
    } catch { setListError("Network error — check connection"); }
    finally { setLoadingList(false); }
  }, []);

  useEffect(() => { void fetchOperators(); }, [fetchOperators]);

  const handleDeactivate = async (actorId: string) => {
    const resp = await fetch("/api/auth/deactivate-operator", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actor_id: actorId }),
    });
    if (resp.ok) {
      setOperators(ops => ops.map(o => o.actor_id === actorId ? { ...o, is_active: false } : o));
      setActionMsg("Staff member deactivated");
      setTimeout(() => setActionMsg(""), 3000);
    }
  };

  const handleReactivate = async (actorId: string) => {
    const resp = await fetch("/api/auth/reactivate-operator", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actor_id: actorId }),
    });
    if (resp.ok) {
      setOperators(ops => ops.map(o => o.actor_id === actorId ? { ...o, is_active: true } : o));
      setActionMsg("Staff member reactivated");
      setTimeout(() => setActionMsg(""), 3000);
    }
  };

  const handleRegistered = (newOp: CloudOperatorRow) => {
    setOperators(ops => [...ops, newOp]);
    setView("roster");
    setActionMsg(`✓ ${newOp.name} registered as ${newOp.role}`);
    setTimeout(() => setActionMsg(""), 4000);
  };

  const existingEmails    = operators.map(o => o.email.toLowerCase());
  const existingBarberIds = operators.filter(o => o.barber_id).map(o => o.barber_id!);

  const filtered = operators.filter(o => {
    if (filterRole !== "ALL" && o.role !== filterRole) return false;
    if (filterActive === "ACTIVE" && !o.is_active) return false;
    if (filterActive === "INACTIVE" && o.is_active) return false;
    return true;
  });

  const counts = {
    total:    operators.length,
    active:   operators.filter(o => o.is_active).length,
    barbers:  operators.filter(o => o.role === "BARBER" && o.is_active).length,
    cashiers: operators.filter(o => o.role === "CASHIER" && o.is_active).length,
    admins:   operators.filter(o => (o.role === "ADMIN" || o.role === "SYSTEM_OWNER") && o.is_active).length,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
        <div>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "#e2d609", textTransform: "uppercase", letterSpacing: "0.15em" }}>Staff Management</span>
          <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", marginTop: "4px" }}>Register, manage and deactivate staff accounts.</p>
        </div>
        {canManage && (
          <button type="button" onClick={() => setView(v => v === "register" ? "roster" : "register")}
            style={{ padding: "9px 18px", borderRadius: "9999px", background: view === "register" ? "rgba(226,214,9,0.1)" : "#e2d609", color: view === "register" ? "#e2d609" : "#0f1317", border: `1.5px solid ${view === "register" ? "#e2d609" : "transparent"}`, fontSize: "13px", fontWeight: 800, cursor: "pointer", flexShrink: 0 }}>
            {view === "register" ? "← Back to Roster" : "+ Register Staff"}
          </button>
        )}
      </div>

      {/* Action feedback */}
      {actionMsg && (
        <div style={{ padding: "12px 16px", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: "10px" }}>
          <span style={{ fontSize: "13px", color: "#10b981", fontWeight: 600 }}>{actionMsg}</span>
        </div>
      )}

      {view === "register" ? (
        <RegisterStaffForm
          session={session}
          onSuccess={handleRegistered}
          existingEmails={existingEmails}
          existingBarberIds={existingBarberIds}
        />
      ) : (
        <>
          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(80px, 1fr))", gap: "8px" }}>
            {[
              { label: "Active",    value: counts.active,   color: "#10b981" },
              { label: "Barbers",   value: counts.barbers,  color: "#2dd4bf" },
              { label: "Cashiers",  value: counts.cashiers, color: "#38bdf8" },
              { label: "Admins",    value: counts.admins,   color: "#e2d609" },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ padding: "10px 12px", background: "#1e262d", borderRadius: "10px", border: "1px solid #2d3840", textAlign: "center" }}>
                <div style={{ fontSize: "20px", fontWeight: 900, color }}>{value}</div>
                <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: "2px" }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {(["ALL", "ADMIN", "CASHIER", "BARBER"] as const).map(r => (
              <button key={r} type="button" onClick={() => setFilterRole(r)}
                style={{ padding: "5px 12px", borderRadius: "9999px", background: filterRole === r ? `${ROLE_COLOR[r] ?? "rgba(226,214,9,0.1)"}18` : "transparent", border: `1px solid ${filterRole === r ? (ROLE_COLOR[r] ?? "#e2d609") : "#2d3840"}`, color: filterRole === r ? (ROLE_COLOR[r] ?? "#e2d609") : "rgba(255,255,255,0.4)", fontSize: "11px", fontWeight: 700, cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {r}
              </button>
            ))}
            <div style={{ width: "1px", background: "#2d3840", margin: "0 4px" }} />
            {(["ACTIVE", "INACTIVE", "ALL"] as const).map(s => (
              <button key={s} type="button" onClick={() => setFilterActive(s)}
                style={{ padding: "5px 12px", borderRadius: "9999px", background: filterActive === s ? "rgba(255,255,255,0.06)" : "transparent", border: `1px solid ${filterActive === s ? "#3a4650" : "#2d3840"}`, color: filterActive === s ? "#f5f5f5" : "rgba(255,255,255,0.35)", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}>
                {s}
              </button>
            ))}
          </div>

          {/* Roster */}
          {loadingList ? (
            <div style={{ padding: "32px", textAlign: "center" }}>
              <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.3)" }}>Loading roster…</p>
            </div>
          ) : listError ? (
            <div style={{ padding: "16px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <p style={{ fontSize: "13px", color: "#f87171" }}>{listError}</p>
              <button type="button" onClick={fetchOperators} style={{ background: "none", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", borderRadius: "8px", padding: "6px 12px", fontSize: "12px", cursor: "pointer" }}>Retry</button>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "32px", textAlign: "center", background: "#1e262d", borderRadius: "12px", border: "1px solid #2d3840" }}>
              <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.3)" }}>No staff match the current filter</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {filtered.map(op => (
                <OperatorCard
                  key={op.actor_id}
                  op={op}
                  currentActorId={session.actor_id}
                  canManage={canManage}
                  onDeactivate={handleDeactivate}
                  onReactivate={handleReactivate}
                  onResetPin={setResetTarget}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Reset PIN modal */}
      {resetTarget && (
        <ResetPinModal
          target={resetTarget}
          onClose={() => setResetTarget(null)}
          onDone={() => {
            setOperators(ops => ops.map(o => o.actor_id === resetTarget.actor_id ? { ...o, is_first_login: true } : o));
            setActionMsg(`PIN reset for ${resetTarget.name}`);
            setTimeout(() => setActionMsg(""), 3000);
          }}
        />
      )}
    </div>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AdminScreen() {
  const { session }           = useSession();
  const sync                  = useSyncStatus();
  const [section, setSection] = useState<Section>("audit");

  if (!session) return null;

  return (
    <div style={{ minHeight: "100dvh", background: "#0f1317", display: "flex", flexDirection: "column" }}>
      <TopBar session={session} />

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* ── Sidebar — desktop only ─────────────────────────────────────── */}
        <nav
          style={{
            width: "200px", flexShrink: 0,
            background: "#171d22", borderRight: "1px solid #2d3840",
            display: "flex", flexDirection: "column",
            padding: "16px 10px", gap: "4px",
          }}
          aria-label="Admin navigation"
          className="admin-sidebar"
        >
          {SECTIONS.map(s => (
            <button
              key={s.id}
              type="button"
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

          {/* Sync status */}
          <div style={{ marginTop: "auto", padding: "10px 12px" }}>
            <SyncIndicator state={sync.state} pendingCount={sync.pendingCount} />
          </div>
        </nav>

        {/* ── Content ───────────────────────────────────────────────────────── */}
        <main style={{ flex: 1, overflowY: "auto", padding: "clamp(16px,3vw,24px)" }}>
          <div style={{ maxWidth: "720px" }}>
            {section === "audit"      && <AuditSection />}
            {section === "adjustment" && <AdjustmentSection session={session} />}
            {section === "config"     && <ConfigSection session={session} />}
            {section === "staff"      && <StaffSection session={session} />}
          </div>
        </main>
      </div>

      {/* ── Mobile bottom tab bar ─────────────────────────────────────────── */}
      <nav
        className="admin-bottom-tabs"
        style={{
          display: "none",
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
          background: "#171d22", borderTop: "1px solid #2d3840",
          padding: "0 0 env(safe-area-inset-bottom, 0)",
        }}
        aria-label="Admin navigation"
      >
        {SECTIONS.map(s => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSection(s.id)}
            style={{
              flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
              gap: "3px", padding: "10px 4px 8px",
              background: "transparent", border: "none",
              color: section === s.id ? "#e2d609" : "rgba(255,255,255,0.4)",
              fontSize: "9px", fontWeight: section === s.id ? 700 : 500,
              cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.06em",
              borderTop: `2px solid ${section === s.id ? "#e2d609" : "transparent"}`,
              transition: "all 0.15s",
            }}
          >
            <span style={{ fontSize: "18px", lineHeight: 1 }}>{s.icon}</span>
            <span>{s.label}</span>
          </button>
        ))}
      </nav>

      <style>{`
        @media (max-width: 640px) {
          .admin-sidebar { display: none !important; }
          .admin-bottom-tabs { display: flex !important; }
          /* Add bottom padding so content isn't hidden behind tab bar */
          main { padding-bottom: calc(64px + env(safe-area-inset-bottom, 0)) !important; }
        }
      `}</style>
    </div>
  );
}
