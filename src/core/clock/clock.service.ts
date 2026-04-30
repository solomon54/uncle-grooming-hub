/**
 * @file clock.service.ts
 * @module core/clock
 *
 * Clock Service — singleton wrapper around HybridLogicalClock.
 *
 * Provides the single source of HLC timestamps for all event emissions
 * on this terminal. Initialized lazily on first use (safe for SSR).
 *
 * Usage:
 *   import { clockService } from "@/core/clock/clock.service";
 *   const hlc = clockService.tick();   // for local events
 *   clockService.receive(remoteHLC);   // when processing remote events
 */

import { HybridLogicalClock } from "./hlc";
import { terminalIdentity }   from "@/core/terminal/terminal.identity";

// ─── Clock Service ────────────────────────────────────────────────────────────

class ClockService {
  private _clock: HybridLogicalClock | null = null;

  private get clock(): HybridLogicalClock {
    if (!this._clock) {
      this._clock = new HybridLogicalClock(terminalIdentity.terminalId);
    }
    return this._clock;
  }

  /**
   * Generate a new HLC timestamp for a locally emitted event.
   * Monotonically increasing — safe to call in rapid succession.
   */
  tick(): string {
    return this.clock.tick();
  }

  /**
   * Update the local clock upon receiving a remote event.
   * Must be called when processing any event that originated
   * from another terminal or the cloud.
   */
  receive(remoteHLC: string): string {
    return this.clock.receive(remoteHLC);
  }

  /**
   * Read the current HLC state without advancing it.
   */
  peek(): string {
    return this.clock.peek();
  }
}

/**
 * Singleton — one clock per terminal process
 */
export const clockService = new ClockService();
