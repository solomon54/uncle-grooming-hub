/**
 * @file journal.service.ts
 * @module core/journal
 *
 * Journal Service — the ONLY write path in the entire system.
 *
 * Specification: TAS v1.0 §2–3 — Event Model & Local Journal Design
 *                ECS v1.3 §2 — Domain Principles & Invariants
 *                AGENT.md §3 — The Event Contract (5 hard invariants)
 *                MODULE_PRIORITY.md P1.5
 *
 * Every commitEvent() call enforces:
 *   1. CLOUD_AUTHORITY guard — EVENT 08 and 19 rejected locally
 *   2. INTENT_LOCK guard — EVENT 21/22 rejected after EVENT 04
 *   3. VERSION_CONFLICT guard — optimistic concurrency (aggregate_version)
 *   4. DUPLICATE_EVENT guard — idempotency via event_id
 *   5. ROLE guard — privileged events (27,29,30,31) require ADMIN/SYSTEM_OWNER
 *
 * Returns a typed CommitResult — never throws on business rule violations.
 */

import type { RxDatabase, RxCollection } from "rxdb";
import type { AllEvents } from "@/domain/events/event.definitions";
import type { ActiveSession } from "@/core/session/session.types";
import { clockService } from "@/core/clock/clock.service";
import { terminalIdentity } from "@/core/terminal/terminal.identity";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CommitResult =
  | { success: true; event_id: string; hlc_timestamp: string }
  | { success: false; reason: CommitRejectionReason };

export type CommitRejectionReason =
  | "VERSION_CONFLICT"
  | "CLOUD_AUTHORITY_ONLY"
  | "INTENT_LOCKED"
  | "INSUFFICIENT_ROLE"
  | "DUPLICATE_EVENT";

// ─── Cloud-authority-only events (AGENT.md §4) ───────────────────────────────

const CLOUD_ONLY_EVENTS = new Set([
  "PAYMENT_SETTLED",        // EVENT 08
  "APPOINTMENT_RESERVED",   // EVENT 19
  "IDENTITY_MERGED",        // EVENT 11
  "SYNC_BATCH_ACKNOWLEDGED",// EVENT 15
  "RECONCILIATION_ANOMALY_DETECTED", // EVENT 16
  "CUSTOMER_NOTIFICATION_SENT",      // EVENT 26
]);

// ─── Events requiring ADMIN or SYSTEM_OWNER role (AGENT.md §12) ──────────────

const ADMIN_ONLY_EVENTS = new Set([
  "STAFF_ACCOUNT_CREATED",    // EVENT 27
  "STAFF_ACCOUNT_DEACTIVATED",// EVENT 29
  "STAFF_ACCOUNT_REACTIVATED",// EVENT 30
  "TERMINAL_PIN_CHANGED",     // EVENT 31
  "SHOP_HOURS_CHANGED",       // EVENT 24
  "ADJUSTMENT_EVENT",         // EVENT 09
]);

// ─── Journal document shape ───────────────────────────────────────────────────

type JournalDoc = {
  event_id: string;
  aggregate_id: string;
  aggregate_version: number;
  event_type: string;
  payload: Record<string, unknown>;
  metadata: Record<string, unknown>;
  hlc: string;
  is_synced: boolean;
};

// ─── Journal Service ──────────────────────────────────────────────────────────

export class JournalService {
  private collection: RxCollection<JournalDoc> | null = null;

  // ── Init ────────────────────────────────────────────────────────────────────

  public setDatabase(db: RxDatabase): void {
    this.collection = db.collections.journal;
  }

  // ── Commit ──────────────────────────────────────────────────────────────────

  /**
   * The single write path for the entire application.
   *
   * Enforces all 5 invariants from AGENT.md §3 before appending.
   * Returns CommitResult — never throws on business rule violations.
   */
  public async commitEvent(
    event: AllEvents,
    session?: ActiveSession
  ): Promise<CommitResult> {
    if (!this.collection) {
      throw new Error("[JournalService] Not initialized. Call setDatabase() first.");
    }

    const eventType = event.event_type;

    // ── Guard 0: NULL CHECK ──────────────────────────────────────────────────
    if (!event.aggregate_id || !event.event_id) {
      console.error("[JournalService] Event missing aggregate_id or event_id:", event);
      return { success: false, reason: "VERSION_CONFLICT" };
    }

    // ── Guard 1: CLOUD_AUTHORITY ─────────────────────────────────────────────
    // EVENT 08 (PAYMENT_SETTLED) and EVENT 19 (APPOINTMENT_RESERVED) are
    // Cloud Authority Only — NEVER emitted by local terminal code.
    if (CLOUD_ONLY_EVENTS.has(eventType)) {
      console.warn(`[JournalService] CLOUD_AUTHORITY_ONLY: ${eventType} cannot be emitted locally.`);
      return { success: false, reason: "CLOUD_AUTHORITY_ONLY" };
    }

    // ── Guard 2: ROLE check ──────────────────────────────────────────────────
    if (ADMIN_ONLY_EVENTS.has(eventType)) {
      const role = session?.role;
      if (role !== "ADMIN" && role !== "SYSTEM_OWNER") {
        console.warn(`[JournalService] INSUFFICIENT_ROLE: ${eventType} requires ADMIN or SYSTEM_OWNER.`);
        return { success: false, reason: "INSUFFICIENT_ROLE" };
      }
    }

    // ── Guard 3: DUPLICATE_EVENT (idempotency) ───────────────────────────────
    const existing = await this.collection
      .findOne({ selector: { event_id: event.event_id } })
      .exec();
    if (existing) {
      // Idempotent success — already committed
      return { success: true, event_id: event.event_id, hlc_timestamp: existing.hlc };
    }

    // ── Guard 4: VERSION_CONFLICT (optimistic concurrency) ───────────────────
    const latest = await this.collection
      .findOne({
        selector: { aggregate_id: event.aggregate_id },
        sort: [{ aggregate_version: "desc" }],
      })
      .exec();

    const currentVersion = latest ? latest.aggregate_version : 0;
    if (event.aggregate_version !== currentVersion + 1) {
      console.warn(
        `[JournalService] VERSION_CONFLICT: ${event.aggregate_id} ` +
        `expected v${currentVersion + 1}, got v${event.aggregate_version}`
      );
      return { success: false, reason: "VERSION_CONFLICT" };
    }

    // ── Guard 5: INTENT_LOCK ─────────────────────────────────────────────────
    // EVENT 21 (SERVICE_INTENT_ADDED) and EVENT 22 (SERVICE_INTENT_REMOVED)
    // are forbidden after EVENT 04 (SERVICE_ENGAGED) on the same aggregate.
    if (eventType === "SERVICE_INTENT_ADDED" || eventType === "SERVICE_INTENT_REMOVED") {
      const engagementEvent = await this.collection
        .findOne({
          selector: {
            aggregate_id: event.aggregate_id,
            event_type: "SERVICE_ENGAGED",
          },
        })
        .exec();

      if (engagementEvent) {
        console.warn(`[JournalService] INTENT_LOCKED: SERVICE_ENGAGED already exists for ${event.aggregate_id}`);
        return { success: false, reason: "INTENT_LOCKED" };
      }
    }

    // ── Append ───────────────────────────────────────────────────────────────
    const hlc = clockService.tick();

    await this.collection.insert({
      event_id: event.event_id,
      aggregate_id: event.aggregate_id,
      aggregate_version: event.aggregate_version,
      event_type: event.event_type,
      payload: event.payload,
      metadata: {
        ...event.metadata,
        terminal_id: terminalIdentity.terminalId,
        actor_id: session?.actor_id ?? "SYSTEM",
      },
      hlc,
      is_synced: false, // Sync engine marks true after cloud ACK (renamed from 'synced' — RxDB SC17)
    });

    return { success: true, event_id: event.event_id, hlc_timestamp: hlc };
  }

  /**
   * Ingest events received from cloud pull replication.
   * Skips CLOUD_AUTHORITY guard — these events ARE the cloud authority.
   * Marks is_synced: true — already canonical in cloud.
   */
  public async ingestCloudEvent(event: AllEvents): Promise<CommitResult> {
    if (!this.collection) {
      throw new Error("[JournalService] Not initialized. Call setDatabase() first.");
    }

    // Idempotency — already have it
    const existing = await this.collection
      .findOne({ selector: { event_id: event.event_id } })
      .exec();
    if (existing) {
      return { success: true, event_id: event.event_id, hlc_timestamp: existing.hlc };
    }

    // Version check
    const latest = await this.collection
      .findOne({
        selector: { aggregate_id: event.aggregate_id },
        sort: [{ aggregate_version: "desc" }],
      })
      .exec();

    const currentVersion = latest ? latest.aggregate_version : 0;
    if (event.aggregate_version !== currentVersion + 1) {
      return { success: false, reason: "VERSION_CONFLICT" };
    }

    const hlc = (event.metadata as Record<string, unknown>).hlc_timestamp as string ?? clockService.tick();
    clockService.receive(hlc);

    await this.collection.insert({
      event_id: event.event_id,
      aggregate_id: event.aggregate_id,
      aggregate_version: event.aggregate_version,
      event_type: event.event_type,
      payload: event.payload,
      metadata: {
        ...event.metadata,
        terminal_id: (event.metadata as Record<string, unknown>).terminal_id ?? "CLOUD",
        actor_id: "CLOUD",
      },
      hlc,
      is_synced: true,
    });

    return { success: true, event_id: event.event_id, hlc_timestamp: hlc };
  }

  // ── Legacy appendEvent (backward compat — wraps commitEvent) ─────────────

  public async appendEvent<T extends AllEvents>(event: T): Promise<void> {
    const result = await this.commitEvent(event);
    if (!result.success) {
      if (result.reason === "DUPLICATE_EVENT") return; // idempotent
      throw new Error(`[JournalService] commitEvent rejected: ${result.reason}`);
    }
  }

  // ── Replay ──────────────────────────────────────────────────────────────────

  public async replay(aggregateId: string): Promise<AllEvents[]> {
    if (!this.collection) return [];

    const docs = await this.collection
      .find({
        selector: { aggregate_id: aggregateId },
        sort: [{ hlc: "asc" }],
      })
      .exec();

    return docs.map(doc => this.docToEvent(doc));
  }

  public async reconstitute<T>(
    aggregateId: string,
    reducer: (state: T, event: AllEvents) => T,
    initialState: T
  ): Promise<T> {
    const events = await this.replay(aggregateId);
    return events.reduce(reducer, initialState);
  }

  public async getEventsAfter(hlcTimestamp: string, limit = 100): Promise<AllEvents[]> {
    if (!this.collection) return [];

    const docs = await this.collection
      .find({
        selector: { hlc: { $gt: hlcTimestamp } },
        sort: [{ hlc: "asc" }],
        limit,
      })
      .exec();

    return docs.map(doc => this.docToEvent(doc));
  }

  /** Get all unsynced events for the sync engine */
  public async getUnsynced(limit = 100): Promise<AllEvents[]> {
    if (!this.collection) return [];

    const docs = await this.collection
      .find({
        selector: { is_synced: false },
        sort: [{ hlc: "asc" }],
        limit,
      })
      .exec();

    return docs.map(doc => this.docToEvent(doc));
  }

  /** Mark events as synced after cloud ACK */
  public async markSynced(eventIds: string[]): Promise<void> {
    if (!this.collection || eventIds.length === 0) return;

    const docs = await this.collection
      .find({ selector: { event_id: { $in: eventIds } } })
      .exec();

    await Promise.all(docs.map(doc => doc.patch({ is_synced: true })));
  }

  /**
   * Next aggregate_version for optimistic concurrency (ECS §2.3).
   * Action creators use this so callers don't need to track versions manually.
   */
  public async getNextAggregateVersion(aggregateId: string): Promise<number> {
    if (!this.collection) return 1;

    const latest = await this.collection
      .findOne({
        selector: { aggregate_id: aggregateId },
        sort: [{ aggregate_version: "desc" }],
      })
      .exec();

    return latest ? latest.aggregate_version + 1 : 1;
  }

  /** Count events pending cloud sync — used by SyncEngine status */
  public async countUnsynced(): Promise<number> {
    if (!this.collection) return 0;
    const docs = await this.collection
      .find({ selector: { is_synced: false } })
      .exec();
    return docs.length;
  }

  public async clear(): Promise<void> {
    if (this.collection) {
      await this.collection.find().remove();
    }
  }

  // ── Private ──────────────────────────────────────────────────────────────────

  private docToEvent(doc: JournalDoc): AllEvents {
    return {
      event_id: doc.event_id,
      aggregate_id: doc.aggregate_id,
      aggregate_version: doc.aggregate_version,
      event_type: doc.event_type as AllEvents["event_type"],
      payload: doc.payload,
      metadata: doc.metadata as AllEvents["metadata"],
    } as AllEvents;
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

export const journalService = new JournalService();
