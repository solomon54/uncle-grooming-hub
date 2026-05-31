/**
 * @file projection.engine.ts
 * @module core/projection
 *
 * Projection Engine — orchestrates all projectors.
 *
 * Specification: PRS v1.1 §3 — Projection Engine
 *                MODULE_PRIORITY.md P2.1
 *                AGENT.md §5 — Projection Rules
 *
 * Responsibilities:
 *   - Register projections (pure state reducers)
 *   - Apply events to all registered projections
 *   - Maintain HLC high-water mark for incremental sync
 *   - Notify subscribers on state change
 *   - Support full rebuild (cold start / recovery)
 *
 * Layer 4 — reads from Journal, produces Materialized Views.
 * Never writes to DB. Never imports from src/ui/.
 */

import type { AllEvents } from "@/domain/events/event.definitions";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProjectionHandler<TState> = (
  state: TState,
  event: AllEvents
) => TState;

export interface Projection<TState> {
  name: string;
  initialState: TState;
  handlers: Partial<Record<string, ProjectionHandler<TState>>>;
}

interface ProjectionInstance<TState> {
  projection: Projection<TState>;
  state: TState;
}

// ─── Engine ───────────────────────────────────────────────────────────────────

export class ProjectionEngine {
  private projections = new Map<string, ProjectionInstance<unknown>>();
  private lastHLC: string | null = null;
  private listeners = new Set<() => void>();

  // ── Registration ────────────────────────────────────────────────────────────

  register<TState>(projection: Projection<TState>): void {
    this.projections.set(
      projection.name,
      { projection, state: projection.initialState } as unknown as ProjectionInstance<unknown>
    );
  }

  /**
   * Register all core projections.
   * Called once during runtime bootstrap.
   */
  async registerCoreProjections(): Promise<void> {
    const [
      { queueBoardProjection },
      { barberLaneProjection },
      { transactionProjection },
      { availabilityProjection },
    ] = await Promise.all([
      import("@/core/projection/queue-board.projection"),
      import("@/core/projection/barber-lane.projection"),
      import("@/core/projection/transaction.projection"),
      import("@/core/projection/availability.projection"),
    ]);

    this.register(queueBoardProjection);
    this.register(barberLaneProjection);
    this.register(transactionProjection);
    this.register(availabilityProjection);
  }

  // ── Subscription ────────────────────────────────────────────────────────────

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }

  // ── Event Application ────────────────────────────────────────────────────────

  apply(event: AllEvents): void {
    for (const instance of this.projections.values()) {
      this.applyToInstance(instance, event);
    }
    this.advanceHLC(event.metadata.hlc_timestamp);
    this.notify();
  }

  applyBatch(events: AllEvents[]): void {
    const sorted = [...events].sort((a, b) =>
      a.metadata.hlc_timestamp.localeCompare(b.metadata.hlc_timestamp)
    );

    for (const event of sorted) {
      for (const instance of this.projections.values()) {
        this.applyToInstance(instance, event);
      }
      this.advanceHLC(event.metadata.hlc_timestamp);
    }

    this.notify();
  }

  private applyToInstance(instance: ProjectionInstance<unknown>, event: AllEvents): void {
    const handler = instance.projection.handlers[event.event_type];
    if (!handler) return;
    instance.state = (handler as ProjectionHandler<unknown>)(instance.state, event);
  }

  private advanceHLC(incoming: string): void {
    if (!this.lastHLC || incoming > this.lastHLC) {
      this.lastHLC = incoming;
    }
  }

  // ── Rebuild ──────────────────────────────────────────────────────────────────

  rebuild(events: AllEvents[]): void {
    for (const instance of this.projections.values()) {
      instance.state = instance.projection.initialState;
    }
    this.lastHLC = null;
    this.applyBatch(events);
  }

  // ── Accessors ────────────────────────────────────────────────────────────────

  getState<TState>(name: string): TState | undefined {
    const instance = this.projections.get(name);
    return instance ? (instance.state as TState) : undefined;
  }

  getLastHLC(): string | null {
    return this.lastHLC;
  }

  clear(): void {
    for (const instance of this.projections.values()) {
      instance.state = instance.projection.initialState;
    }
    this.lastHLC = null;
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

export const projectionEngine = new ProjectionEngine();
