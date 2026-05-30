/**
 * @file sync.engine.ts
 * @module core/sync
 *
 * Sync Engine — push-pull-reconcile (Phase 4.3).
 *
 * Specification: TAS v1.0 §5 — Synchronization Protocol
 *                AGENT.md §8 — Sync Engine Rules
 *                MODULE_PRIORITY.md P4.3
 *
 * Phase 8 will replace the dev ACK stub with Supabase ingest.
 */

import { journalService }     from "@/core/journal/journal.service";
import { terminalIdentity }   from "@/core/terminal/terminal.identity";
import { projectionEngine }   from "@/core/projection/projection.engine";
import type { AllEvents }     from "@/domain/events/event.definitions";
import type { SyncEngineStatus, SyncPushAck } from "./sync.types";

const PUSH_INTERVAL_MS = 30_000;  // push every 30s (was 60s)
const PULL_INTERVAL_MS = 10_000;  // pull every 10s for cross-terminal updates
const BASE_BACKOFF_MS  = 2_000;
const MAX_BACKOFF_MS   = 300_000;
const BATCH_LIMIT      = 100;

class SyncEngine {
  private intervalId:     ReturnType<typeof setInterval> | null = null;
  private pullIntervalId: ReturnType<typeof setInterval> | null = null;
  private backoffMs  = BASE_BACKOFF_MS;
  private pushing    = false;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private onFocus:    (() => void) | null = null;

  private status: SyncEngineStatus = {
    state:        "verified",
    pendingCount: 0,
  };

  private listeners = new Set<() => void>();

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  start(): void {
    if (typeof window === "undefined") return;
    if (this.intervalId) return;

    void this.refreshPendingCount();
    void this.push();
    void this.pull();

    // Push interval — flush local events to cloud
    this.intervalId = setInterval(() => {
      void this.push();
    }, PUSH_INTERVAL_MS);

    // Pull interval — fetch cross-terminal events every 10s
    this.pullIntervalId = setInterval(() => {
      void this.pull();
    }, PULL_INTERVAL_MS);

    // Pull on tab focus — instant update when user switches back
    if (typeof document !== "undefined") {
      this.onFocus = () => void this.pull();
      window.addEventListener("focus", this.onFocus);
    }
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.pullIntervalId) {
      clearInterval(this.pullIntervalId);
      this.pullIntervalId = null;
    }
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    if (this.onFocus && typeof window !== "undefined") {
      window.removeEventListener("focus", this.onFocus);
      this.onFocus = null;
    }
  }

  /** Triggered by Pusher when another terminal pushes events — pull immediately */
  triggerPull(): void {
    void this.pull();
  }

  /** Event-driven trigger after local commitEvent (MODULE_PRIORITY P4.3) */
  notifyPending(): void {
    void this.refreshPendingCount();
    void this.push();
    void this.pull();
  }

  /** Pull cloud-authority events (08, 19, …) — MODULE_PRIORITY P4.3 */
  async pull(): Promise<void> {
    if (typeof window === "undefined") return;

    const afterHlc = projectionEngine.getLastHLC() ?? "0";

    try {
      const params = new URLSearchParams({
        after_hlc:   afterHlc,
        terminal_id: terminalIdentity.terminalId,
      });

      const response = await fetch(`/api/sync/pull?${params}`);
      if (!response.ok) return;

      const body = (await response.json()) as { events?: AllEvents[] };
      const incoming = body.events ?? [];

      for (const event of incoming) {
        const result = await journalService.ingestCloudEvent(event);
        if (result.success) {
          projectionEngine.apply(event);
        }
      }
    } catch {
      // Pull is best-effort until Phase 8 cloud is live
    }
  }

  // ── Subscription ─────────────────────────────────────────────────────────────

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getStatus(): SyncEngineStatus {
    return this.status;
  }

  // ── Push ─────────────────────────────────────────────────────────────────────

  private async push(): Promise<void> {
    if (this.pushing || typeof window === "undefined") return;

    const events = await journalService.getUnsynced(BATCH_LIMIT);
    await this.refreshPendingCount();

    if (events.length === 0) {
      this.setStatus({ state: "verified", pendingCount: 0 });
      return;
    }

    this.pushing = true;
    this.setStatus({
      state:        "transmitting",
      pendingCount: events.length,
    });

    try {
      const response = await fetch("/api/sync/push", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          terminal_id: terminalIdentity.terminalId,
          events:      this.serializeBatch(events),
        }),
      });

      if (!response.ok) {
        throw new Error(`Sync push failed: HTTP ${response.status}`);
      }

      const ack = (await response.json()) as SyncPushAck;

      if (ack.ack_event_ids?.length) {
        await journalService.markSynced(ack.ack_event_ids);
      }

      this.backoffMs = BASE_BACKOFF_MS;
      const remaining = await journalService.countUnsynced();

      this.setStatus({
        state:        remaining > 0 ? "transmitting" : "verified",
        pendingCount: remaining,
        lastPushAt:   new Date().toISOString(),
        lastError:    undefined,
      });

      if (remaining > 0) {
        void this.push();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sync failed";
      const pending = await journalService.countUnsynced();

      this.setStatus({
        state:        "local",
        pendingCount: pending,
        lastError:    message,
      });

      this.scheduleRetry();
    } finally {
      this.pushing = false;
    }
  }

  private scheduleRetry(): void {
    if (this.retryTimer) clearTimeout(this.retryTimer);

    const jitter = Math.floor(Math.random() * 500);
    const delay  = this.backoffMs + jitter;

    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      void this.push();
    }, delay);

    this.backoffMs = Math.min(this.backoffMs * 2, MAX_BACKOFF_MS);
  }

  private serializeBatch(events: AllEvents[]): unknown[] {
    return events.map(e => ({
      event_id:          e.event_id,
      aggregate_id:      e.aggregate_id,
      aggregate_version: e.aggregate_version,
      event_type:        e.event_type,
      payload:           e.payload,
      metadata:          e.metadata,
    }));
  }

  private async refreshPendingCount(): Promise<void> {
    const pending = await journalService.countUnsynced();
    this.status = { ...this.status, pendingCount: pending };
    this.notify();
  }

  private setStatus(next: SyncEngineStatus): void {
    this.status = next;
    this.notify();
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }
}

export const syncEngine = new SyncEngine();
