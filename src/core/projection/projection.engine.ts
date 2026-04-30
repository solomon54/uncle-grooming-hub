// src/core/projection/projection.engine.ts

import { AllEvents } from "@/domain/events/event.definitions";

/**
 * Projection Handler
 */
export type ProjectionHandler<TState> = (
  state: TState,
  event: AllEvents
) => TState;

/**
 * Projection Definition
 */
export interface Projection<TState> {
  name: string;
  initialState: TState;
  handlers: Partial<Record<string, ProjectionHandler<TState>>>;
}

/**
 * Internal Projection Instance
 */
interface ProjectionInstance<TState> {
  projection: Projection<TState>;
  state: TState;
}

/**
 * Projection Engine
 *
 * NOTE:
 * This layer is a type boundary.
 * We use `unknown` internally but NEVER leak it outside.
 */
export class ProjectionEngine {
  private projections = new Map<string, ProjectionInstance<unknown>>();
  private lastHLC: string | null = null;

  // --------------------------------------------------
  // REGISTRATION
  // --------------------------------------------------

  register<TState>(projection: Projection<TState>): void {
    const instance: ProjectionInstance<TState> = {
      projection,
      state: projection.initialState,
    };

    // SAFE boundary cast (contained inside engine only)
    this.projections.set(
      projection.name,
      instance as unknown as ProjectionInstance<unknown>
    );
  }

  async registerCoreProjections(): Promise<void> {
    const { queueBoardProjection } = await import(
      "@/core/projection/queue-board.projection"
    );

    this.register(queueBoardProjection);
  }

  // --------------------------------------------------
  // SUBSCRIPTION
  // --------------------------------------------------

  private listeners = new Set<() => void>();

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  // --------------------------------------------------
  // EVENT APPLICATION
  // --------------------------------------------------

  apply(event: AllEvents): void {
    for (const instance of this.projections.values()) {
      this.applyToInstance(instance, event);
    }

    // Monotonic HLC guarantee
    const incoming = event.metadata.hlc_timestamp;
    if (!this.lastHLC || incoming > this.lastHLC) {
      this.lastHLC = incoming;
    }

    this.notify();
  }

  private applyToInstance(
    instance: ProjectionInstance<unknown>,
    event: AllEvents
  ): void {
    const handler = instance.projection.handlers[event.event_type];

    if (!handler) return;

    /**
     * SAFE CAST:
     * We KNOW handler and state match because they were registered together.
     */
    const typedHandler = handler as ProjectionHandler<unknown>;

    instance.state = typedHandler(instance.state, event);
  }

  applyBatch(events: AllEvents[]): void {
    const sorted = [...events].sort((a, b) =>
      a.metadata.hlc_timestamp.localeCompare(b.metadata.hlc_timestamp)
    );

    for (const event of sorted) {
      // Direct application to avoid multiple notify() calls
      for (const instance of this.projections.values()) {
        this.applyToInstance(instance, event);
      }

      // Keep HLC updated
      const incoming = event.metadata.hlc_timestamp;
      if (!this.lastHLC || incoming > this.lastHLC) {
        this.lastHLC = incoming;
      }
    }

    this.notify(); // Single notification at the end
  }

  // --------------------------------------------------
  // REBUILD
  // --------------------------------------------------

  rebuild(events: AllEvents[]): void {
    for (const instance of this.projections.values()) {
      instance.state = instance.projection.initialState;
    }

    this.applyBatch(events);
  }

  // --------------------------------------------------
  // ACCESSORS
  // --------------------------------------------------

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

/**
 * Singleton
 */
export const projectionEngine = new ProjectionEngine();
