/**
 * @file QueueEntryCard.tsx
 * @module ui/components/operational
 *
 * QueueEntryCard — reusable queue entry display component.
 *
 * Specification: ui-standards.md §5.2 — Cards
 *                CXS v1.1 §3.2 — Status Board display rules
 *                PRD §13.1 — Anonymized identification (tokens only on public board)
 *
 * Used by: CashierScreen, StatusBoardScreen
 * Reads from: QueueEntryView (projection output only)
 */

"use client";

import React from "react";
import { Badge }                                    from "@/ui/components/primitives/Badge";
import { hlcToElapsedMinutes, formatWaitEstimate }  from "@/shared/utils/hlc.utils";
import type { QueueEntryView }                      from "@/projections/queue-board.view";

// ─── Types ────────────────────────────────────────────────────────────────────

interface QueueEntryCardProps {
  entry:       QueueEntryView;
  isSelected?: boolean;
  showName?:   boolean;   // false on public status board (tokens only)
  compact?:    boolean;
  onClick?:    () => void;
}

// ─── Status → Badge variant ───────────────────────────────────────────────────

const STATUS_VARIANT: Record<string, "waiting" | "reserved" | "called" | "in-service" | "expired" | "completed"> = {
  WAITING:    "waiting",
  RESERVED:   "reserved",
  CALLED:     "called",
  IN_SERVICE: "in-service",
  EXPIRED:    "expired",
  CANCELLED:  "completed",
};

// ─── Inner content ────────────────────────────────────────────────────────────

function CardContent({
  entry,
  isSelected,
  showName,
  compact,
}: Omit<QueueEntryCardProps, "onClick">) {
  const elapsed = hlcToElapsedMinutes(entry.checkin_hlc);
  const variant = STATUS_VARIANT[entry.status] ?? "waiting";

  return (
    <>
      {/* Position */}
      <div style={{
        width: "28px", height: "28px", borderRadius: "50%",
        background: isSelected ? "#e2d609" : "#2d3840",
        color: isSelected ? "#0f1317" : "rgba(255,255,255,0.5)",
        fontSize: "11px", fontWeight: 700,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        {entry.position}
      </div>

      {/* Token + info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "13px", fontWeight: 900, color: "#e2d609" }}>
            {entry.queue_token || "—"}
          </span>
          {showName && (
            <span style={{ fontSize: "14px", fontWeight: 600, color: "#f5f5f5", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {entry.customer_display}
            </span>
          )}
        </div>
        {!compact && (
          <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", marginTop: "2px" }}>
            {entry.preferred_barber_name ?? entry.preferred_barber_id ?? "Any barber"}
            {entry.intents.length > 0 && (
              <span style={{ marginLeft: "6px" }}>
                · {entry.intents.length} service{entry.intents.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Status + wait */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px", flexShrink: 0 }}>
        <Badge variant={variant} label={entry.status} size="sm" />
        {!compact && (
          <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>
            {entry.estimated_wait_minutes > 0
              ? formatWaitEstimate(entry.estimated_wait_minutes)
              : elapsed > 0 ? `${elapsed}m waiting` : "Just arrived"}
          </span>
        )}
      </div>
    </>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function QueueEntryCard({
  entry,
  isSelected = false,
  showName   = true,
  compact    = false,
  onClick,
}: QueueEntryCardProps) {
  const baseStyle = {
    padding:      compact ? "10px 14px" : "14px 16px",
    background:   isSelected ? "#252f38" : "#1e262d",
    border:       `1px solid ${isSelected ? "#e2d609" : "#2d3840"}`,
    borderRadius: "12px",
    transition:   "all 0.15s ease",
    display:      "flex",
    alignItems:   "center",
    gap:          "12px",
    width:        "100%",
  };

  if (onClick) {
    return (
      <button
        onClick={onClick}
        style={{ ...baseStyle, cursor: "pointer", textAlign: "left" }}
      >
        <CardContent entry={entry} isSelected={isSelected} showName={showName} compact={compact} />
      </button>
    );
  }

  return (
    <div style={baseStyle}>
      <CardContent entry={entry} isSelected={isSelected} showName={showName} compact={compact} />
    </div>
  );
}
