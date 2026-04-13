//src/core/journal/journal.service.ts

import { BaseEvent } from "./event.types";

/**
 * Journal Service
 * ----------------------------------------
 * مسؤول عن:
 * - Append-only event storage
 * - Optimistic concurrency control
 * - Idempotency enforcement
 *
 * NOTE:
 * This is an in-memory implementation (Phase 1)
 * Replace storage adapter later with RxDB
 */

export class JournalService {
  /**
   * Internal event store (ordered by HLC)
   */
  private events: BaseEvent[] = [];

  /**
   * Fast lookup: aggregate_id -> last known version
   */
  private aggregateVersionMap: Map<string, number> = new Map();

  /**
   * Idempotency guard (event_id uniqueness)
   */
  private eventIdSet: Set<string> = new Set();

  // --------------------------------------------------
  // APPEND EVENT
  // --------------------------------------------------
  async appendEvent(event: BaseEvent): Promise<void> {
    // 1. Idempotency check
    if (this.eventIdSet.has(event.event_id)) {
      // Silent success (idempotent behavior)
      return;
    }

    // 2. Optimistic Concurrency Control
    const currentVersion =
      this.aggregateVersionMap.get(event.aggregate_id) || 0;

    if (event.aggregate_version !== currentVersion + 1) {
      throw new Error(
        `VERSION_CONFLICT: aggregate ${event.aggregate_id} expected version ${
          currentVersion + 1
        }, received ${event.aggregate_version}`
      );
    }

    // 3. Append (append-only invariant)
    this.events.push(event);

    // 4. Update indexes
    this.aggregateVersionMap.set(event.aggregate_id, event.aggregate_version);

    this.eventIdSet.add(event.event_id);

    // 5. Sort by HLC (safety for out-of-order inserts)
    this.events.sort((a, b) =>
      a.metadata.hlc_timestamp.localeCompare(b.metadata.hlc_timestamp)
    );
  }

  // --------------------------------------------------
  // READ EVENTS BY AGGREGATE
  // --------------------------------------------------
  async getEventsByAggregate(aggregate_id: string): Promise<BaseEvent[]> {
    return this.events.filter((e) => e.aggregate_id === aggregate_id);
  }

  // --------------------------------------------------
  // GET ALL EVENTS (FOR PROJECTION ENGINE)
  // --------------------------------------------------
  async getAllEvents(): Promise<BaseEvent[]> {
    return [...this.events];
  }

  // --------------------------------------------------
  // GET EVENTS AFTER HLC (FOR SYNC / INCREMENTAL PROJECTION)
  // --------------------------------------------------
  async getEventsAfter(hlc_timestamp: string): Promise<BaseEvent[]> {
    return this.events.filter((e) => e.metadata.hlc_timestamp > hlc_timestamp);
  }

  // --------------------------------------------------
  // GET CURRENT AGGREGATE VERSION
  // --------------------------------------------------
  getAggregateVersion(aggregate_id: string): number {
    return this.aggregateVersionMap.get(aggregate_id) || 0;
  }

  // --------------------------------------------------
  // CLEAR (ONLY FOR TESTING / RESET)
  // --------------------------------------------------
  clear(): void {
    this.events = [];
    this.aggregateVersionMap.clear();
    this.eventIdSet.clear();
  }
}

/**
 * Singleton Instance (App-wide Journal)
 */
export const journal = new JournalService();
