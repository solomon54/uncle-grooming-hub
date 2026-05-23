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
 *                AGENT.md §6 — UI Rules
 *
 * READS FROM: useQueueBoard(), useBarberLane(), useTransaction(), useSession()
 * EMITS VIA:  transaction.actions (EVENT 09), schedule.actions (EVENT 24)
 *
 * Four sections: Audit Log | Shop Config | Sync Health | Quality Alerts
 * Sidebar on desktop ≥1024px. Single column on mobile.
 */

"use client";

import React, { useState }         from "react";
import { useQueueBoard }           from "@/ui/hooks/useQueueBoard";
import { useBarberLane }           from "@/ui/hooks/useBarberLane";
import { useTransaction }          from "@/ui/hooks/useTransaction";
import { useSession }              from "@/ui/hooks/useSession";
import { useSyncStatus }           from "@/ui/hooks/useSyncStatus";
import { TopBar }                  from "@/ui/components/shell/TopBar";
import { Badge }                   from "@/ui/components/primitives/Badge";
import { SyncIndicator }           from "@/ui/components/primitives/SyncIndicator";

// ─── Section types ────────────────────────────────────────────────────────────

type Section = "audit" | "config" | "sync" | "staff";

const SECTIONS: { id: Section; label: string; icon: string }[] = [
  { id: "audit",  label: "Audit Log",     icon: "📋" },
  { id: "config", label: "Shop Config",   icon: "⚙️" },
  { id: "sync",   label: "Sync Health",   icon: "🔄" },
  { id: "staff",  label: "Staff",         icon: "👥" },
];

// ─── Audit Log Section ────────────────────────────────────────────────────────

function AuditSection() {
  const { view: ledger } = useTransaction();
  const allTx = [...(ledger?.active ?? []), ...(ledger?.settled_today ?? [])];

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

      {allTx.length === 0 ? (
        <div style={{ padding: "32px", textAlign: "center", background: "#1e262d", borderRadius: "12px", border: "1px solid #2d3840" }}>
          <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.3)" }}>No transactions today</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1px", borderRadius: "12px", overflow: "hidden", border: "1px solid #2d3840" }}>
          {allTx.map(tx => (
            <div key={tx.transaction_id} style={{
              padding: "14px 16px", background: "#1e262d",
              display: "flex", alignItems: "center", gap: "12px",
            }}>
              <span style={{ fontSize: "13px", fontWeight: 900, color: "#e2d609", minWidth: "48px" }}>
                {tx.queue_token || "—"}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "13px", color: "#f5f5f5", fontWeight: 600 }}>{tx.customer_display}</div>
                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)", marginTop: "2px" }}>
                  {tx.transaction_id.slice(0, 8)}…
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "14px", fontWeight: 800, color: "#f5f5f5" }}>
                  {tx.total_etb > 0 ? `${tx.total_etb.toLocaleString()} ETB` : "—"}
                </div>
                <Badge
                  variant={tx.is_settled ? "in-service" : "called"}
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

// ─── Shop Config Section ──────────────────────────────────────────────────────

function ConfigSection() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div>
        <span style={{ fontSize: "11px", fontWeight: 700, color: "#e2d609", textTransform: "uppercase", letterSpacing: "0.15em" }}>
          Shop Configuration
        </span>
        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", marginTop: "4px" }}>
          Changes apply prospectively — active sessions are not affected.
        </p>
      </div>

      {/* Operating hours */}
      <div style={{ padding: "20px", background: "#1e262d", borderRadius: "12px", border: "1px solid #2d3840" }}>
        <div style={{ fontSize: "12px", fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "16px" }}>
          Operating Hours
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "15px", fontWeight: 700, color: "#f5f5f5" }}>Every Day</div>
            <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)" }}>8:00 AM – 8:00 PM</div>
          </div>
          <button style={{
            padding: "8px 16px", borderRadius: "9999px",
            background: "transparent", color: "#e2d609",
            border: "1px solid rgba(226,214,9,0.3)",
            fontSize: "12px", fontWeight: 700, cursor: "pointer",
          }}>
            Override (EVENT 24)
          </button>
        </div>
      </div>

      {/* Price registry */}
      <div style={{ padding: "20px", background: "#1e262d", borderRadius: "12px", border: "1px solid #2d3840" }}>
        <div style={{ fontSize: "12px", fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>
          Price Registry
        </div>
        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.35)" }}>
          Price changes are recorded as Adjustment Events (EVENT 09) and apply to future transactions only.
        </p>
        <div style={{ marginTop: "12px", padding: "10px 14px", background: "rgba(226,214,9,0.06)", borderRadius: "8px", border: "1px solid rgba(226,214,9,0.15)" }}>
          <span style={{ fontSize: "12px", color: "#e2d609" }}>
            Phase 2 — Price registry management coming soon
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Sync Health Section ──────────────────────────────────────────────────────

function SyncSection() {
  const sync = useSyncStatus();
  const { view: queue } = useQueueBoard();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div>
        <span style={{ fontSize: "11px", fontWeight: 700, color: "#e2d609", textTransform: "uppercase", letterSpacing: "0.15em" }}>
          Sync Health
        </span>
      </div>

      {/* Status cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        {[
          { label: "Sync State",     value: sync.state.toUpperCase(), color: sync.state === "verified" ? "#10b981" : "#f59e0b" },
          { label: "Pending Events", value: String(sync.pendingCount), color: sync.pendingCount > 0 ? "#f59e0b" : "#10b981" },
          { label: "Queue Entries",  value: String(queue?.total_waiting ?? 0), color: "#3b82f6" },
          { label: "Last HLC",       value: queue?.last_updated_hlc?.slice(0, 13) ?? "—", color: "rgba(255,255,255,0.4)" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ padding: "16px", background: "#1e262d", borderRadius: "12px", border: "1px solid #2d3840" }}>
            <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>{label}</div>
            <div style={{ fontSize: "18px", fontWeight: 800, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Sync indicator */}
      <div style={{ padding: "16px 20px", background: "#1e262d", borderRadius: "12px", border: "1px solid #2d3840", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)" }}>Cloud Sync Status</span>
        <SyncIndicator state={sync.state} pendingCount={sync.pendingCount} />
      </div>

      <div style={{ padding: "12px 16px", background: "rgba(226,214,9,0.06)", borderRadius: "10px", border: "1px solid rgba(226,214,9,0.15)" }}>
        <span style={{ fontSize: "12px", color: "#e2d609" }}>
          Phase 4.3 — Full sync engine with Supabase coming in Phase 8
        </span>
      </div>
    </div>
  );
}

// ─── Staff Section ────────────────────────────────────────────────────────────

function StaffSection() {
  const { view: lanes } = useBarberLane();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div>
        <span style={{ fontSize: "11px", fontWeight: 700, color: "#e2d609", textTransform: "uppercase", letterSpacing: "0.15em" }}>
          Staff & Lanes
        </span>
        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", marginTop: "4px" }}>
          Staff account management (Events 27–31) — Phase 2
        </p>
      </div>

      {/* Current lane states */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {(lanes?.lanes ?? []).length === 0 ? (
          <div style={{ padding: "32px", textAlign: "center", background: "#1e262d", borderRadius: "12px", border: "1px solid #2d3840" }}>
            <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.3)" }}>No barbers active</p>
          </div>
        ) : (
          lanes!.lanes.map(lane => (
            <div key={lane.barber_id} style={{
              padding: "16px 20px", background: "#1e262d",
              borderRadius: "12px", border: "1px solid #2d3840",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div>
                <div style={{ fontSize: "15px", fontWeight: 700, color: "#f5f5f5" }}>{lane.barber_name}</div>
                <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", marginTop: "2px" }}>{lane.barber_id}</div>
              </div>
              <Badge
                variant={
                  lane.status === "AVAILABLE"  ? "waiting"    :
                  lane.status === "IN_SERVICE" ? "in-service" :
                  lane.status === "CALLED"     ? "called"     :
                  "neutral"
                }
                label={lane.status}
                size="sm"
              />
            </div>
          ))
        )}
      </div>

      <div style={{ padding: "12px 16px", background: "rgba(226,214,9,0.06)", borderRadius: "10px", border: "1px solid rgba(226,214,9,0.15)" }}>
        <span style={{ fontSize: "12px", color: "#e2d609" }}>
          Full staff management (create, deactivate, PIN reset) — Phase 2
        </span>
      </div>
    </div>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AdminScreen() {
  const { session }         = useSession();
  const [section, setSection] = useState<Section>("audit");

  if (!session) return null;

  const activeSection = SECTIONS.find(s => s.id === section)!;

  return (
    <div style={{ minHeight: "100dvh", background: "#0f1317", display: "flex", flexDirection: "column" }}>
      <TopBar session={session} />

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* ── Sidebar ───────────────────────────────────────────────────────── */}
        <nav
          style={{
            width: "220px", flexShrink: 0,
            background: "#171d22", borderRight: "1px solid #2d3840",
            display: "flex", flexDirection: "column",
            padding: "16px 12px", gap: "4px",
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
        </nav>

        {/* ── Content ───────────────────────────────────────────────────────── */}
        <main style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
          <div style={{ maxWidth: "800px" }}>
            {section === "audit"  && <AuditSection />}
            {section === "config" && <ConfigSection />}
            {section === "sync"   && <SyncSection />}
            {section === "staff"  && <StaffSection />}
          </div>
        </main>
      </div>
    </div>
  );
}
