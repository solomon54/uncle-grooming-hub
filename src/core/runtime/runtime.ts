/**
 * @file runtime.ts
 * @module core/runtime
 *
 * Runtime Orchestrator — bootstrap sequence and single write entry point.
 *
 * Specification: MODULE_PRIORITY.md P4.1
 *                TAS v1.0 §3 — Local Event Journal Design
 *                AGENT.md §2 — Layer Architecture (Layer 2)
 *
 * Bootstrap sequence (order matters per MODULE_PRIORITY.md P4.1):
 *   1. terminalIdentity — ensure terminal_id exists
 *   2. initializeDatabase — open RxDB, register all 6 aggregate schemas
 *   3. journalService.setDatabase — wire journal to DB
 *   4. projectionEngine.registerCoreProjections — load all 3 projectors
 *   5. replayFromStart — reconstitute state from journal
 *
 * Write path: emit() → journalService.commitEvent() → projectionEngine.apply()
 */

import type { RxDatabase } from "rxdb";
import { journalService } from "@/core/journal/journal.service";
import { projectionEngine } from "@/core/projection/projection.engine";
import { terminalIdentity } from "@/core/terminal/terminal.identity";
import { clockService } from "@/core/clock/clock.service";
import { sessionService } from "@/core/session/session.service";
import { syncEngine } from "@/core/sync/sync.engine";
import type { AllEvents } from "@/domain/events/event.definitions";
import type { ActiveSession } from "@/core/session/session.types";
import type { CommitResult } from "@/core/journal/journal.service";
import type { QueueBoardView } from "@/projections/queue-board.view";

// ─── Runtime ──────────────────────────────────────────────────────────────────

export class Runtime {
  private initialized = false;

  // ── Init ────────────────────────────────────────────────────────────────────

  async init(db: RxDatabase): Promise<void> {
    if (this.initialized) return;

    terminalIdentity.init();

    // Wire journal to database
    journalService.setDatabase(db);

    // Register all core projections (QueueBoard, BarberLane, Transaction, Availability)
    await projectionEngine.registerCoreProjections();

    this.initialized = true;
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error("[Runtime] Not initialized. Call runtime.init() first.");
    }
  }

  // ── Write Path ───────────────────────────────────────────────────────────────

  /**
   * Emit a domain event.
   * Flow: commitEvent() → journal (RxDB) → projectionEngine.apply() → notify subscribers
   *
   * Returns CommitResult — callers can handle rejections properly.
   * Pass session explicitly or omit to auto-resolve from sessionService.
   */
  async emit(
    event: AllEvents,
    session?: ActiveSession | null
  ): Promise<CommitResult> {
    this.ensureInitialized();

    const activeSession =
      session === undefined ? sessionService.getActiveSession() : session;

    // 1. Persist to journal (enforces all 5 invariants)
    const result = await journalService.commitEvent(event, activeSession ?? undefined);

    if (!result.success) {
      return result;
    }

    // 2. Advance local HLC to stay ahead of committed timestamp
    clockService.receive(result.hlc_timestamp);

    // 3. Update projections synchronously
    projectionEngine.apply({
      ...event,
      metadata: { ...event.metadata, hlc_timestamp: result.hlc_timestamp },
    });

    // 4. Notify sync engine — triggers immediate push attempt
    syncEngine.notifyPending();

    return result;
  }

  /** Start background sync loop (MODULE_PRIORITY P4.1 step 5) */
  startSync(): void {
    syncEngine.start();
  }

  stopSync(): void {
    syncEngine.stop();
  }

  // ── Bootstrap ────────────────────────────────────────────────────────────────

  /**
   * Full replay from beginning of journal.
   * Called once after init() to reconstitute state.
   */
  async replayFromStart(): Promise<QueueBoardView | undefined> {
    this.ensureInitialized();

    const events = await journalService.getEventsAfter("0");
    projectionEngine.rebuild(events);

    return projectionEngine.getState<QueueBoardView>("QUEUE_BOARD_VIEW");
  }

  // ── Incremental Sync ─────────────────────────────────────────────────────────

  /**
   * Apply only new events since last known HLC.
   * Used by sync engine when new cloud events arrive.
   */
  async syncNewEvents(): Promise<QueueBoardView | undefined> {
    this.ensureInitialized();

    const lastHLC = projectionEngine.getLastHLC();
    if (!lastHLC) return this.replayFromStart();

    const newEvents = await journalService.getEventsAfter(lastHLC);
    projectionEngine.applyBatch(newEvents);

    return projectionEngine.getState<QueueBoardView>("QUEUE_BOARD_VIEW");
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

export const runtime = new Runtime();
