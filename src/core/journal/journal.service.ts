// src/core/journal/journal.service.ts

import { RxDatabase, RxCollection } from "rxdb";
import { AllEvents } from "@/domain/events/event.definitions";
import { BaseEvent } from "./event.types";

/**
 * Journal Service
 * ----------------------------------------
 * Core service for the Local Journal as defined in TAS v1.0 §2–3 and §7.
 *
 * Responsibilities:
 * - Append-only event storage with strict validation
 * - Optimistic concurrency control via aggregate_version
 * - Idempotency via event_id
 * - HLC-based deterministic ordering
 * - Integration with RxDB for offline-first persistence
 */

type JournalDoc = {
  event_id: string;
  aggregate_id: string;
  aggregate_version: number;
  event_type: string;
  payload: Record<string, unknown>;
  metadata: Record<string, unknown>;
  hlc: string;
};
export class JournalService {
  private collection: RxCollection<JournalDoc> | null = null;
  /**
   * Initialize the journal with the RxDB instance from local-journal-cloud-ledger.ts
   */
  public setDatabase(db: RxDatabase): void {
    this.collection = db.collections.journal;
  }

  /**
   * Append a validated event to the local journal (append-only)
   * Enforces TAS §2.1 (append-only), §2.3 (version check), and §2 (idempotency)
   */
  public async appendEvent<T extends AllEvents>(event: T): Promise<void> {
    if (!this.collection) {
      throw new Error(
        "JournalService: RxDB collection not initialized. Call setDatabase first."
      );
    }

    // 1. Idempotency Guard
    const existing = await this.collection
      .findOne({ selector: { event_id: event.event_id } })
      .exec();
    if (existing) {
      return; // Idempotent success
    }

    // 2. Optimistic Concurrency Control
    const latest = await this.collection
      .findOne({
        selector: { aggregate_id: event.aggregate_id },
        sort: [{ aggregate_version: "desc" }],
      })
      .exec();

    const currentVersion = latest ? latest.aggregate_version : 0;

    if (event.aggregate_version !== currentVersion + 1) {
      throw new Error(
        `Concurrency Conflict: Aggregate ${
          event.aggregate_id
        } expected version ${currentVersion + 1}, got ${
          event.aggregate_version
        }`
      );
    }

    // 3. Append to journal (immutable - append-only invariant)
    await this.collection.insert({
      event_id: event.event_id, // Primary key per schema
      aggregate_id: event.aggregate_id,
      aggregate_version: event.aggregate_version,
      event_type: event.event_type,
      payload: event.payload,
      metadata: event.metadata,
      hlc: event.metadata.hlc_timestamp, // For indexing and sorting
    });
  }

  /**
   * Replay all events for a specific aggregate (state reconstitution)
   * Used by Projection Engine (TAS §3)
   */
  public async replay(aggregateId: string): Promise<AllEvents[]> {
    if (!this.collection) return [];

    const docs = await this.collection
      .find({
        selector: { aggregate_id: aggregateId },
        sort: [{ hlc: "asc" }],
      })
      .exec();

    return docs.map(
      (doc) =>
        ({
          event_id: doc.event_id,
          aggregate_id: doc.aggregate_id,
          aggregate_version: doc.aggregate_version,
          event_type: doc.event_type,
          payload: doc.payload,
          metadata: doc.metadata,
        } as AllEvents)
    );
  }

  /**
   * Reconstitute aggregate state using a reducer (pure function)
   */
  public async reconstitute<T>(
    aggregateId: string,
    reducer: (state: T, event: AllEvents) => T,
    initialState: T
  ): Promise<T> {
    const events = await this.replay(aggregateId);
    return events.reduce(reducer, initialState);
  }

  /**
   * Get events after a specific HLC (for sync / incremental updates)
   */
  public async getEventsAfter(
    hlcTimestamp: string,
    limit = 100
  ): Promise<AllEvents[]> {
    if (!this.collection) return [];

    const docs = await this.collection
      .find({
        selector: { hlc: { $gt: hlcTimestamp } },
        sort: [{ hlc: "asc" }],
        limit,
      })
      .exec();

    return docs.map(
      (doc) =>
        ({
          event_id: doc.event_id,
          aggregate_id: doc.aggregate_id,
          aggregate_version: doc.aggregate_version,
          event_type: doc.event_type,
          payload: doc.payload,
          metadata: doc.metadata,
        } as AllEvents)
    );
  }

  /**
   * Clear journal (only for testing / development)
   */
  public async clear(): Promise<void> {
    if (this.collection) {
      await this.collection.find().remove();
    }
  }
}

/**
 * Singleton instance (used app-wide)
 */
export const journalService = new JournalService();
