//src/core/runtime/runtime.ts

import { journal } from "@/core/journal/journal.service";
import { projectionEngine } from "@/core/projection/projection.engine";
import { BaseEvent } from "@/core/journal/event.types";
import { v4 as uuidv4 } from "uuid";

/**
 * Runtime
 * ----------------------------------------
 * مسؤول عن:
 * - Event creation
 * - Writing to journal
 * - Triggering projections
 *
 * This is the ONLY write entry point in the system
 */
export class Runtime {
  /**
   * Emit Event (MAIN ENTRY POINT)
   */
  async emitEvent(input: Omit<BaseEvent, "event_id">): Promise<BaseEvent> {
    const event: BaseEvent = {
      ...input,
      event_id: uuidv4(),
    };

    // 1. Write to journal (source of truth)
    await journal.appendEvent(event);

    // 2. Apply to projections (instant feedback)
    projectionEngine.apply(event);

    return event;
  }

  // --------------------------------------------------
  // LOAD SYSTEM (BOOTSTRAP)
  // --------------------------------------------------
  async bootstrap() {
    const events = await journal.getAllEvents();

    projectionEngine.rebuild(events);
  }

  // --------------------------------------------------
  // SYNC NEW EVENTS (INCREMENTAL)
  // --------------------------------------------------
  async sync() {
    const lastHLC = projectionEngine.getLastHLC();

    if (!lastHLC) {
      await this.bootstrap();
      return;
    }

    const newEvents = await journal.getEventsAfter(lastHLC);

    projectionEngine.applyBatch(newEvents);
  }
}

/**
 * Singleton Runtime
 */
export const runtime = new Runtime();
