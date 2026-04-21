// src/core/runtime/runtime.ts

import type { RxDatabase } from "rxdb";
import { journalService } from "@/core/journal/journal.service";
import { projectionEngine } from "@/core/projection/projection.engine";
import { AllEvents } from "@/domain/events/event.definitions";
import type { QueueBoardState } from "@/core/projection/queue-board.projection";

/**
 * Runtime Orchestrator
 *
 * Central execution layer of the system.
 *
 * Guarantees:
 * - Single write entry point
 * - Strict append-only event flow
 * - Deterministic projection updates
 */
export class Runtime {
  private initialized = false;

  // --------------------------------------------------
  // INIT
  // --------------------------------------------------

  /**
   * Initialize runtime (MUST be called once)
   */
  async init(db: RxDatabase): Promise<void> {
    if (this.initialized) return;

    journalService.setDatabase(db);

    // IMPORTANT: must await (prevents race condition)
    await projectionEngine.registerCoreProjections();

    this.initialized = true;
  }

  /**
   * Internal safety guard
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error("Runtime not initialized. Call runtime.init() first.");
    }
  }

  // --------------------------------------------------
  // WRITE PATH
  // --------------------------------------------------

  /**
   * Emit a domain event
   *
   * Flow:
   * 1. Persist → Journal
   * 2. Apply → Projections
   */
  async emit(event: AllEvents): Promise<QueueBoardState | undefined> {
    this.ensureInitialized();

    // 1. Source of truth
    await journalService.appendEvent(event);

    // 2. Update read models
    projectionEngine.apply(event);

    return projectionEngine.getState<QueueBoardState>("QUEUE_BOARD_VIEW");
  }

  // --------------------------------------------------
  // BOOTSTRAP
  // --------------------------------------------------

  /**
   * Full replay from beginning of time
   */
  async replayFromStart(): Promise<QueueBoardState | undefined> {
    this.ensureInitialized();

    const events = await journalService.getEventsAfter("0");

    projectionEngine.rebuild(events);

    return projectionEngine.getState<QueueBoardState>("QUEUE_BOARD_VIEW");
  }

  // --------------------------------------------------
  // SYNC
  // --------------------------------------------------

  /**
   * Incremental sync using HLC cursor
   */
  async syncNewEvents(): Promise<QueueBoardState | undefined> {
    this.ensureInitialized();

    const lastHLC = projectionEngine.getLastHLC();

    if (!lastHLC) {
      return this.replayFromStart();
    }

    const newEvents = await journalService.getEventsAfter(lastHLC);

    projectionEngine.applyBatch(newEvents);

    return projectionEngine.getState<QueueBoardState>("QUEUE_BOARD_VIEW");
  }
}

/**
 * Singleton
 */
export const runtime = new Runtime();
