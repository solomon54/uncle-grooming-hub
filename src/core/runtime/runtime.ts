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

import type { RxDatabase }    from "rxdb";
import { journalService }     from "@/core/journal/journal.service";
import { projectionEngine }   from "@/core/projection/projection.engine";
import type { AllEvents }     from "@/domain/events/event.definitions";
import type { QueueBoardView } from "@/projections/queue-board.view";

// ─── Runtime ──────────────────────────────────────────────────────────────────

export class Runtime {
  private initialized = false;

  // ── Init ────────────────────────────────────────────────────────────────────

  async init(db: RxDatabase): Promise<void> {
    if (this.initialized) return;

    // Wire journal to database
    journalService.setDatabase(db);

    // Register all core projections (QueueBoard, BarberLane, Transaction)
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
   * Returns the updated QueueBoardView for backward compatibility.
   * Screens should use hooks (useQueueBoard etc.) for reactive updates.
   */
  async emit(event: AllEvents): Promise<QueueBoardView | undefined> {
    this.ensureInitialized();

    // 1. Persist to journal (enforces all 5 invariants)
    const result = await journalService.appendEvent(event);

    // 2. Update projections synchronously
    projectionEngine.apply(event);

    return projectionEngine.getState<QueueBoardView>("QUEUE_BOARD_VIEW");
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
