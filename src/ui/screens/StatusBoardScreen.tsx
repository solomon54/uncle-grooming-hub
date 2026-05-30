/**
 * @file StatusBoardScreen.tsx
 * @module ui/screens
 *
 * Public Status Board — Cinema Dark ambient TV display.
 *
 * Specification: PRD §13.1, AMS v1.3 "Public Status Board", IMS v1.1
 *                ui-standards.md §7.6 — Status Board
 *                CXS v1.1 §3.2 — What the Status Board shows
 *
 * Rules (from spec):
 *   - Passive projection consumer — emits NO events
 *   - Tokens only on public board — no full names, no PII
 *   - No financial data, no loyalty tier, no service prices
 *   - Bilingual EN/Amharic toggle
 *   - Offline continuity — shows local state during outages
 *   - Reads from useQueueBoard() and useBarberLane() hooks only
 */

"use client";

import React, { useEffect, useState } from "react";
import { useQueueBoard }              from "@/ui/hooks/useQueueBoard";
import { useBarberLane }              from "@/ui/hooks/useBarberLane";
import { Badge }                      from "@/ui/components/primitives/Badge";
import { SyncIndicator }              from "@/ui/components/primitives/SyncIndicator";
import { hlcToElapsedMinutes }        from "@/shared/utils/hlc.utils";
import type { QueueEntryView }        from "@/projections/queue-board.view";
import type { BarberLaneView }        from "@/projections/barber-lane.view";

// ─── Locale strings ───────────────────────────────────────────────────────────

type Locale = "en" | "am";

const T = {
  en: {
    title:     "Dove Barber",
    tagline:   "Premium Grooming — Addis Ababa",
    waiting:   "Waiting",
    called:    "Called",
    inService: "In Service",
    reserved:  "Reserved",
    nextUp:    "Next Up",
    anyBarber: "Any Barber",
    empty:     "Queue is clear",
    onBreak:   "On Break",
    offline:   "Offline",
  },
  am: {
    title:     "አንክል ግሩሚንግ ሃብ",
    tagline:   "ፕሪሚየም ግሩሚንግ — አዲስ አበባ",
    waiting:   "በጥበቃ ላይ",
    called:    "ወንበር ተጠርቷል",
    inService: "አገልግሎት ላይ",
    reserved:  "ቦታ ተይዟል",
    nextUp:    "ቀጣይ",
    anyBarber: "ማንኛውም ባርበር",
    empty:     "ወረፋ ባዶ ነው",
    onBreak:   "እረፍት ላይ",
    offline:   "ከስራ ውጭ",
  },
} as const;

// ─── Live Clock ───────────────────────────────────────────────────────────────

function LiveClock() {
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ textAlign: "right" }}>
      <div style={{ fontSize: "28px", fontWeight: 900, color: "#f5f5f5", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>
        {time.toLocaleTimeString("en-ET", { hour: "2-digit", minute: "2-digit", hour12: false })}
      </div>
      <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginTop: "2px" }}>
        {time.toLocaleDateString("en-ET", { weekday: "short", month: "short", day: "numeric" })}
      </div>
    </div>
  );
}

// ─── Queue Token Card (waiting list) ─────────────────────────────────────────

interface TokenCardProps {
  entry:  QueueEntryView;
  isNext: boolean;
  locale: Locale;
}

function TokenCard({ entry, isNext, locale }: TokenCardProps) {
  const t       = T[locale];
  const elapsed = hlcToElapsedMinutes(entry.checkin_hlc);

  return (
    <div style={{
      position: "relative",
      padding: "16px",
      borderRadius: "14px",
      background: isNext ? "#252f38" : "#1e262d",
      border: `1px solid ${isNext ? "#e2d609" : "#2d3840"}`,
      boxShadow: isNext ? "0 0 20px rgba(226,214,9,0.12)" : "none",
      transition: "all 0.3s ease",
    }}>
      {/* Position badge */}
      <div style={{
        position: "absolute", top: "-10px", left: "-10px",
        width: "24px", height: "24px", borderRadius: "50%",
        background: isNext ? "#e2d609" : "#2d3840",
        color: isNext ? "#0f1317" : "rgba(255,255,255,0.5)",
        fontSize: "10px", fontWeight: 700,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {entry.position}
      </div>

      {/* Next Up label */}
      {isNext && (
        <div style={{ fontSize: "9px", fontWeight: 700, color: "#e2d609", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "6px" }}>
          {t.nextUp}
        </div>
      )}

      {/* Token — large, prominent */}
      <div style={{ fontSize: "22px", fontWeight: 900, color: "#e2d609", letterSpacing: "-0.01em", marginBottom: "4px" }}>
        {entry.queue_token || "—"}
      </div>

      {/* Barber preference */}
      <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {entry.preferred_barber_name ?? entry.preferred_barber_id ?? t.anyBarber}
      </div>

      {/* Wait time */}
      <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.25)", marginTop: "6px" }}>
        {elapsed < 1 ? "Just arrived" : `${elapsed} min`}
      </div>
    </div>
  );
}

// ─── Barber Lane Column ───────────────────────────────────────────────────────

interface LaneColumnProps {
  lane:        BarberLaneView;
  calledEntry?: QueueEntryView;
  inService?:  QueueEntryView;
  locale:      Locale;
}

function LaneColumn({ lane, calledEntry, inService, locale }: LaneColumnProps) {
  const t = T[locale];

  const statusColor = {
    AVAILABLE:  "#10b981",
    CALLED:     "#f59e0b",
    IN_SERVICE: "#10b981",
    ON_BREAK:   "#6b7280",
    OFFLINE:    "#374151",
  }[lane.status] ?? "#374151";

  const statusLabel = {
    AVAILABLE:  "Available",
    CALLED:     t.called,
    IN_SERVICE: t.inService,
    ON_BREAK:   t.onBreak,
    OFFLINE:    t.offline,
  }[lane.status] ?? lane.status;

  const activeEntry = inService ?? calledEntry;

  return (
    <div style={{
      flex: 1,
      padding: "20px 16px",
      background: "#171d22",
      borderRadius: "16px",
      border: `1px solid ${lane.status === "IN_SERVICE" ? "rgba(16,185,129,0.25)" : "#2d3840"}`,
      display: "flex", flexDirection: "column", gap: "12px",
      minWidth: 0,
    }}>
      {/* Barber name + status */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
        <div style={{ fontSize: "14px", fontWeight: 800, color: "#f5f5f5", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {lane.barber_name}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "5px", flexShrink: 0 }}>
          <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: statusColor }} />
          <span style={{ fontSize: "10px", fontWeight: 600, color: statusColor, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            {statusLabel}
          </span>
        </div>
      </div>

      {/* Active client */}
      {activeEntry ? (
        <div style={{
          padding: "12px",
          background: lane.status === "IN_SERVICE" ? "rgba(16,185,129,0.06)" : "rgba(245,158,11,0.06)",
          borderRadius: "10px",
          border: `1px solid ${lane.status === "IN_SERVICE" ? "rgba(16,185,129,0.2)" : "rgba(245,158,11,0.2)"}`,
        }}>
          <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)", marginBottom: "4px" }}>
            {lane.status === "IN_SERVICE" ? t.inService : t.called}
          </div>
          <div style={{ fontSize: "20px", fontWeight: 900, color: lane.status === "IN_SERVICE" ? "#10b981" : "#f59e0b" }}>
            {activeEntry.queue_token}
          </div>
        </div>
      ) : (
        <div style={{ padding: "12px", background: "rgba(255,255,255,0.02)", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.2)", textAlign: "center" }}>—</div>
        </div>
      )}
    </div>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function StatusBoardScreen() {
  const { view: queue }  = useQueueBoard();
  const { view: lanes }  = useBarberLane();
  const [locale, setLocale] = useState<Locale>("en");
  const t = T[locale];

  // Refresh wait times every minute
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(n => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  // Loading state
  if (!queue) {
    return (
      <div style={{ minHeight: "100dvh", background: "#0f1317", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.3)" }}>Initializing…</div>
      </div>
    );
  }

  const waiting    = queue.entries;
  const reserved   = queue.reservations;
  const called     = queue.called;
  const inService  = queue.in_service;
  const totalActive = waiting.length + reserved.length;
  const barberLanes = lanes?.lanes ?? [];

  return (
    <div style={{ minHeight: "100dvh", background: "#0f1317", display: "flex", flexDirection: "column", userSelect: "none" }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 32px",
        borderBottom: "1px solid #2d3840",
        background: "#171d22",
        flexShrink: 0,
      }}>
        {/* Brand */}
        <div>
          <h1 style={{ fontSize: "18px", fontWeight: 800, color: "#f5f5f5", letterSpacing: "-0.01em" }}>
            {t.title}
          </h1>
          <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)", marginTop: "2px" }}>
            {t.tagline}
          </p>
        </div>

        {/* Queue count */}
        {totalActive > 0 && (
          <div style={{
            display: "flex", alignItems: "center", gap: "8px",
            padding: "8px 20px", borderRadius: "9999px",
            background: "#1e262d", border: "1px solid #2d3840",
          }}>
            <span style={{ fontSize: "24px", fontWeight: 900, color: "#e2d609", fontVariantNumeric: "tabular-nums" }}>
              {totalActive}
            </span>
            <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>
              {totalActive === 1 ? "guest waiting" : "guests waiting"}
            </span>
          </div>
        )}

        {/* Right controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <SyncIndicator state="verified" compact />
          <button
            onClick={() => setLocale(l => l === "en" ? "am" : "en")}
            style={{
              padding: "5px 12px", borderRadius: "6px",
              background: "transparent", border: "1px solid #2d3840",
              color: "rgba(255,255,255,0.4)", fontSize: "11px", fontWeight: 600,
              cursor: "pointer", transition: "all 0.2s",
            }}
            aria-label="Toggle language"
          >
            {locale === "en" ? "አማ" : "EN"}
          </button>
          <LiveClock />
        </div>
      </header>

      {/* ── Barber Lanes ───────────────────────────────────────────────────── */}
      {barberLanes.length > 0 && (
        <div style={{
          padding: "16px 32px",
          borderBottom: "1px solid #2d3840",
          display: "flex", gap: "12px",
          flexShrink: 0,
        }}>
          {barberLanes.map(lane => {
            const calledEntry  = called.find(e => e.preferred_barber_id === lane.barber_id);
            const serviceEntry = inService.find(e => e.preferred_barber_id === lane.barber_id);
            return (
              <LaneColumn
                key={lane.barber_id}
                lane={lane}
                calledEntry={calledEntry}
                inService={serviceEntry}
                locale={locale}
              />
            );
          })}
        </div>
      )}

      {/* ── Waiting Queue ──────────────────────────────────────────────────── */}
      <main style={{ flex: 1, padding: "20px 32px", overflowY: "auto" }}>

        {/* Section header */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
          <Badge variant="waiting" label={t.waiting} />
          {reserved.length > 0 && (
            <Badge variant="reserved" label={`${reserved.length} ${t.reserved}`} size="sm" />
          )}
        </div>

        {/* Empty state */}
        {waiting.length === 0 && reserved.length === 0 ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "160px" }}>
            <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.25)" }}>{t.empty}</p>
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: "16px",
          }}>
            {/* Waiting — HLC ordered, position preserved */}
            {[...waiting]
              .sort((a, b) => a.checkin_hlc.localeCompare(b.checkin_hlc))
              .map((entry, i) => (
                <TokenCard key={entry.queue_entry_id} entry={entry} isNext={i === 0} locale={locale} />
              ))}

            {/* Reserved */}
            {[...reserved]
              .sort((a, b) => a.checkin_hlc.localeCompare(b.checkin_hlc))
              .map(entry => (
                <div key={entry.queue_entry_id} style={{
                  padding: "16px", borderRadius: "14px",
                  background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.2)",
                }}>
                  <div style={{ marginBottom: "6px" }}>
                    <Badge variant="reserved" label={t.reserved} size="sm" />
                  </div>
                  <div style={{ fontSize: "22px", fontWeight: 900, color: "#8b5cf6" }}>
                    {entry.queue_token || "—"}
                  </div>
                  <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)", marginTop: "4px" }}>
                    {entry.preferred_barber_name ?? entry.preferred_barber_id ?? t.anyBarber}
                  </div>
                </div>
              ))}
          </div>
        )}
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer style={{
        padding: "10px 32px",
        borderTop: "1px solid #2d3840",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexShrink: 0,
      }}>
        <SyncIndicator state="verified" />
        <div style={{ height: "1px", width: "80px", background: "linear-gradient(90deg, transparent, #e2d609, transparent)" }} aria-hidden="true" />
        <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.2)", textTransform: "uppercase", letterSpacing: "0.12em" }}>
          Dove Barber · v1.0
        </div>
      </footer>
    </div>
  );
}
