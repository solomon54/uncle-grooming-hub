/**
 * @file SyncIndicator.tsx
 * @module ui/components/primitives
 *
 * Sync state indicator — maps to TAS §10.4 "State Transparency" requirement.
 * Displays one of three states: Local Only, Transmitting, Cloud Verified.
 *
 * Designed to be subtle — visible to staff without alarming customers.
 */

import React from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SyncState = "local" | "transmitting" | "verified" | "error";

interface SyncIndicatorProps {
  state: SyncState;
  pendingCount?: number;
  compact?: boolean;
  className?: string;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const SYNC_CONFIG: Record<
  SyncState,
  { label: string; color: string; dotColor: string; animated: boolean }
> = {
  local: {
    label:     "Local Only",
    color:     "text-amber-400",
    dotColor:  "bg-amber-400",
    animated:  false,
  },
  transmitting: {
    label:     "Syncing",
    color:     "text-blue-400",
    dotColor:  "bg-blue-400",
    animated:  true,
  },
  verified: {
    label:     "Cloud Verified",
    color:     "text-emerald-400",
    dotColor:  "bg-emerald-400",
    animated:  false,
  },
  error: {
    label:     "Sync Error",
    color:     "text-red-400",
    dotColor:  "bg-red-400",
    animated:  false,
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function SyncIndicator({
  state,
  pendingCount,
  compact = false,
  className = "",
}: SyncIndicatorProps) {
  const config = SYNC_CONFIG[state];

  return (
    <div
      className={[
        "inline-flex items-center gap-1.5",
        config.color,
        className,
      ].join(" ")}
      role="status"
      aria-label={`Sync status: ${config.label}`}
    >
      {/* Dot */}
      <span className="relative flex h-2 w-2 shrink-0">
        {config.animated && (
          <span
            className={[
              "absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping",
              config.dotColor,
            ].join(" ")}
          />
        )}
        <span
          className={[
            "relative inline-flex h-2 w-2 rounded-full",
            config.dotColor,
          ].join(" ")}
        />
      </span>

      {/* Label */}
      {!compact && (
        <span className="text-xs font-medium">
          {config.label}
          {pendingCount !== undefined && pendingCount > 0 && (
            <span className="ml-1 opacity-70">({pendingCount})</span>
          )}
        </span>
      )}
    </div>
  );
}
