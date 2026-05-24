/**
 * @file hlc.utils.ts
 * @module shared/utils
 *
 * HLC utility functions for UI display.
 *
 * IMPORTANT: These are display-only helpers.
 * Wall-clock (Date.now()) is ONLY used here for UI labels — never for
 * ordering or business logic (AGENT.md §3 HLC_ONLY invariant).
 */

import { HybridLogicalClock } from "@/core/clock/hlc";

/**
 * Convert HLC timestamp to elapsed minutes for display.
 * Returns 0 if HLC is invalid or in the future.
 */
export function hlcToElapsedMinutes(hlc: string): number {
  try {
    const date = HybridLogicalClock.toDate(hlc);
    const diff = Date.now() - date.getTime();
    return Math.max(0, Math.floor(diff / 60_000));
  } catch {
    return 0;
  }
}

/**
 * Format elapsed minutes as a human-readable string.
 * e.g. 0 → "Just now", 1 → "1 min ago", 65 → "1h 5m ago"
 */
export function formatElapsed(minutes: number): string {
  if (minutes < 1)  return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m ago` : `${h}h ago`;
}

/**
 * Format estimated wait minutes for display.
 * e.g. 0 → "Ready", 5 → "~5 min", 90 → "~1h 30m"
 */
export function formatWaitEstimate(minutes: number): string {
  if (minutes <= 0)  return "Ready";
  if (minutes < 60)  return `~${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `~${h}h ${m}m` : `~${h}h`;
}

/**
 * Convert HLC to a wall-clock display time (HH:MM).
 * Used only for display labels — never for ordering.
 */
export function hlcToTimeLabel(hlc: string): string {
  try {
    const date = HybridLogicalClock.toDate(hlc);
    return date.toLocaleTimeString("en-ET", { hour: "2-digit", minute: "2-digit", hour12: false });
  } catch {
    return "—";
  }
}
