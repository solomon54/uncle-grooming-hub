/**
 * @file hlc-display.ts
 * @module core/clock
 *
 * Display-only helpers derived from HLC physical timestamps.
 * For UI labels (wait labels, elapsed service time) — NOT for ordering or business rules.
 *
 * Specification: AGENT.md §3 invariant #5 — wall-clock only in display labels
 */

import { HybridLogicalClock } from "./hlc";

/** Minutes between two HLC timestamps (physical component only). */
export function minutesBetweenHlc(fromHlc: string, toHlc: string): number {
  try {
    const fromMs = HybridLogicalClock.parse(fromHlc).physicalMs;
    const toMs   = HybridLogicalClock.parse(toHlc).physicalMs;
    return Math.max(0, Math.floor((toMs - fromMs) / 60_000));
  } catch {
    return 0;
  }
}

/** Human label for projected wait (PRD — position over precision). */
export function formatEstimatedWait(minutes: number): string {
  if (minutes <= 0) return "Soon";
  if (minutes === 1) return "~1 min";
  return `~${minutes} min`;
}
