/**
 * @file hlc.ts
 * @module core/clock
 *
 * Hybrid Logical Clock (HLC) implementation.
 *
 * Specification: TAS v1.0 §4 — Distributed Ordering & Clock Strategy
 *
 * Format: "<physical_ms>:<logical_counter_padded>:<terminal_id>"
 * Example: "1712329800000:0003:term_01"
 *
 * Ordering Rules (TAS §4):
 *   1. Compare physical_ms (wall clock milliseconds)
 *   2. If equal, compare logical_counter
 *   3. If equal, use terminal_id as deterministic tie-breaker
 *
 * Guarantees:
 *   - Monotonically increasing — never goes backward
 *   - Drift rejection — rejects events > 60s in the future (TAS §4)
 *   - Deterministic string comparison — lexicographic sort is valid
 *     because physical_ms is zero-padded to 13 digits and
 *     logical_counter is zero-padded to 4 digits
 */

// ─── Constants ────────────────────────────────────────────────────────────────

/** Maximum allowed clock drift in milliseconds (TAS §4) */
const MAX_DRIFT_MS = 60_000;

/** Logical counter zero-pad width */
const COUNTER_PAD = 4;

/** Physical timestamp zero-pad width (covers year 9999 in ms) */
const PHYSICAL_PAD = 13;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HLCComponents {
  physicalMs: number;
  logicalCounter: number;
  terminalId: string;
}

// ─── HLC Class ────────────────────────────────────────────────────────────────

export class HybridLogicalClock {
  private physicalMs: number = 0;
  private logicalCounter: number = 0;
  private readonly terminalId: string;

  constructor(terminalId: string) {
    this.terminalId = terminalId;
  }

  // ── Tick (local event) ──────────────────────────────────────────────────────

  /**
   * Generate a new HLC timestamp for a locally emitted event.
   * Guarantees the result is strictly greater than the last issued timestamp.
   */
  tick(): string {
    const wallMs = Date.now();

    if (wallMs > this.physicalMs) {
      this.physicalMs = wallMs;
      this.logicalCounter = 0;
    } else {
      // Wall clock hasn't advanced — increment logical counter
      this.logicalCounter += 1;
    }

    return this.serialize();
  }

  // ── Receive (remote event) ──────────────────────────────────────────────────

  /**
   * Update the local HLC upon receiving a remote event.
   * Ensures local clock is always ahead of any received timestamp.
   *
   * @throws {Error} if the remote timestamp is more than MAX_DRIFT_MS ahead
   */
  receive(remoteHLC: string): string {
    const remote = HybridLogicalClock.parse(remoteHLC);
    const wallMs = Date.now();

    // Drift guard (TAS §4)
    if (remote.physicalMs > wallMs + MAX_DRIFT_MS) {
      throw new Error(
        `HLC drift violation: remote timestamp is ${remote.physicalMs - wallMs}ms ahead of local wall clock. Max allowed: ${MAX_DRIFT_MS}ms.`
      );
    }

    const maxPhysical = Math.max(this.physicalMs, remote.physicalMs, wallMs);

    if (maxPhysical === this.physicalMs && maxPhysical === remote.physicalMs) {
      // Both clocks at same physical time — take max logical + 1
      this.logicalCounter = Math.max(this.logicalCounter, remote.logicalCounter) + 1;
    } else if (maxPhysical === this.physicalMs) {
      // Local is ahead — just increment local logical
      this.logicalCounter += 1;
    } else if (maxPhysical === remote.physicalMs) {
      // Remote is ahead — adopt remote logical + 1
      this.physicalMs = remote.physicalMs;
      this.logicalCounter = remote.logicalCounter + 1;
    } else {
      // Wall clock is ahead of both — reset logical
      this.physicalMs = maxPhysical;
      this.logicalCounter = 0;
    }

    this.physicalMs = maxPhysical;
    return this.serialize();
  }

  // ── Comparison ──────────────────────────────────────────────────────────────

  /**
   * Compare two HLC strings.
   * Returns negative if a < b, 0 if equal, positive if a > b.
   * Safe for use as Array.sort() comparator.
   */
  static compare(a: string, b: string): number {
    const pa = HybridLogicalClock.parse(a);
    const pb = HybridLogicalClock.parse(b);

    if (pa.physicalMs !== pb.physicalMs) {
      return pa.physicalMs - pb.physicalMs;
    }
    if (pa.logicalCounter !== pb.logicalCounter) {
      return pa.logicalCounter - pb.logicalCounter;
    }
    // Deterministic tie-breaker: terminal_id lexicographic order (TAS §4)
    return pa.terminalId.localeCompare(pb.terminalId);
  }

  // ── Serialization ────────────────────────────────────────────────────────────

  private serialize(): string {
    return [
      String(this.physicalMs).padStart(PHYSICAL_PAD, "0"),
      String(this.logicalCounter).padStart(COUNTER_PAD, "0"),
      this.terminalId,
    ].join(":");
  }

  static parse(hlc: string): HLCComponents {
    const parts = hlc.split(":");

    if (parts.length < 3) {
      throw new Error(`Invalid HLC format: "${hlc}". Expected "<physicalMs>:<counter>:<terminalId>"`);
    }

    // terminal_id may contain colons — rejoin everything after index 1
    const physicalMs     = parseInt(parts[0], 10);
    const logicalCounter = parseInt(parts[1], 10);
    const terminalId     = parts.slice(2).join(":");

    if (isNaN(physicalMs) || isNaN(logicalCounter)) {
      throw new Error(`Invalid HLC components in: "${hlc}"`);
    }

    return { physicalMs, logicalCounter, terminalId };
  }

  // ── Utilities ────────────────────────────────────────────────────────────────

  /** Returns the current HLC state without advancing it */
  peek(): string {
    return this.serialize();
  }

  /** Returns the physical wall-clock time embedded in an HLC string */
  static toDate(hlc: string): Date {
    const { physicalMs } = HybridLogicalClock.parse(hlc);
    return new Date(physicalMs);
  }

  /** The zero-value HLC — used as a cursor for "replay from beginning" */
  static readonly ZERO = "0000000000000:0000:ZERO";
}
