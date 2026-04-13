//src/core/projection/projection.engine.ts

import { BaseEvent } from "@/core/journal/event.types";

/**
 * Projection Handler Type
 * ----------------------------------------
 * Each projection registers a handler per event type
 */
type ProjectionHandler<TState> = (state: TState, event: BaseEvent) => TState;

/**
 * Projection Definition
 */
export interface Projection<TState> {
  name: string;
  initialState: TState;
  handlers: Record<string, ProjectionHandler<TState>>;
}

/**
 * Projection Engine
 * ----------------------------------------
 * Responsible for:
 * - Applying events to projections
 * - Maintaining materialized views
 * - Full replay (rebuild)
 * - Incremental updates
 */
export class ProjectionEngine {
  /**
   * Registered projections
   */
  private projections: Map<string, Projection<unknown>> = new Map();

  /**
   * Current materialized state
   */
  private state: Map<string, unknown> = new Map();

  /**
   * Last processed HLC (for incremental updates)
   */
  private lastHLC: string | null = null;

  // --------------------------------------------------
  // REGISTER PROJECTION
  // --------------------------------------------------
  register<TState>(projection: Projection<TState>) {
    this.projections.set(projection.name, projection as Projection<unknown>);
    this.state.set(projection.name, projection.initialState);
  }

  // --------------------------------------------------
  // APPLY SINGLE EVENT (INCREMENTAL)
  // --------------------------------------------------
  apply(event: BaseEvent) {
    this.projections.forEach((projection, name) => {
      const handler = projection.handlers[event.event_type];

      if (!handler) return; // projection ignores this event

      const currentState = this.state.get(name) as unknown; // Temporary cast for handler call (safe because we control registration)

      const newState = handler(currentState, event);

      this.state.set(name, newState);
    });

    this.lastHLC = event.metadata.hlc_timestamp;
  }

  // --------------------------------------------------
  // FULL REBUILD (REPLAY)
  // --------------------------------------------------
  rebuild(events: BaseEvent[]) {
    // 1. Reset all projections to initial state
    this.projections.forEach((projection, name) => {
      this.state.set(name, projection.initialState);
    });

    // 2. Sort by HLC (guarantee total ordering per TAS §2.2)
    const sorted = [...events].sort((a, b) =>
      a.metadata.hlc_timestamp.localeCompare(b.metadata.hlc_timestamp)
    );

    // 3. Replay all events in order
    for (const event of sorted) {
      this.apply(event);
    }
  }

  // --------------------------------------------------
  // APPLY MANY EVENTS (SYNC / BATCH)
  // --------------------------------------------------
  applyBatch(events: BaseEvent[]) {
    const sorted = [...events].sort((a, b) =>
      a.metadata.hlc_timestamp.localeCompare(b.metadata.hlc_timestamp)
    );

    for (const event of sorted) {
      this.apply(event);
    }
  }

  // --------------------------------------------------
  // GET PROJECTION STATE
  // --------------------------------------------------
  getState<TState>(projectionName: string): TState | undefined {
    return this.state.get(projectionName) as TState | undefined;
  }

  // --------------------------------------------------
  // GET LAST HLC
  // --------------------------------------------------
  getLastHLC(): string | null {
    return this.lastHLC;
  }

  // --------------------------------------------------
  // CLEAR (TESTING / RESET)
  // --------------------------------------------------
  clear() {
    this.state.clear();
    this.lastHLC = null;
  }
}

/**
 * Singleton Engine Instance
 */
export const projectionEngine = new ProjectionEngine();
