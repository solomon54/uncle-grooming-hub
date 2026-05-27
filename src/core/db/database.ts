/**
 * @file database.ts
 * @module core/db
 *
 * RxDB Database Factory — offline-first local journal store.
 *
 * Specification: TAS v1.0 §3 — Local Event Journal Design
 *                AGENT.md §2 — File System Contract (Layer 1)
 *                MODULE_PRIORITY.md P1.1
 *
 * Registers all 6 aggregate collections per ECS v1.3 §1.
 * Dev mode wraps storage with AJV schema validator (RxDB requirement).
 * Singleton — one database instance per browser context.
 */

import { createRxDatabase, addRxPlugin, type RxDatabase } from "rxdb";

// ─── Singleton ────────────────────────────────────────────────────────────────

let dbPromise: Promise<RxDatabase> | null = null;

// ─── Factory ──────────────────────────────────────────────────────────────────

export async function getDatabase(): Promise<RxDatabase> {
  if (typeof window === "undefined") {
    return null as unknown as RxDatabase;
  }

  if (dbPromise) return dbPromise;

  dbPromise = (async () => {
    const isDev = process.env.NODE_ENV === "development";

    if (isDev) {
      const { RxDBDevModePlugin } = await import("rxdb/plugins/dev-mode");
      addRxPlugin(RxDBDevModePlugin);
    }

    // Migration plugin — required when any collection schema version > 0
    const { RxDBMigrationSchemaPlugin } = await import("rxdb/plugins/migration-schema");
    addRxPlugin(RxDBMigrationSchemaPlugin);

    const { getRxStorageDexie } = await import("rxdb/plugins/storage-dexie");
    const baseStorage = getRxStorageDexie();

    let storage = baseStorage;
    if (isDev) {
      const { wrappedValidateAjvStorage } = await import("rxdb/plugins/validate-ajv");
      storage = wrappedValidateAjvStorage({ storage: baseStorage }) as typeof baseStorage;
    }

    console.log("[DB] Initializing RxDB — all 6 aggregates…");

    try {
      const db = await createRxDatabase({
        name:            "ugh_local_journal",  // stable name — never change this
        storage,
        ignoreDuplicate: true,
      });

      // ── Import all schemas ──────────────────────────────────────────────────
      const { journalSchema }          = await import("@/core/journal/journal.schema");
      const { queueEntrySchema }       = await import("./schemas/queue-entry.schema");
      const { barberLaneSchema }       = await import("./schemas/barber-lane.schema");
      const { transactionSchema }      = await import("./schemas/transaction.schema");
      const { customerProfileSchema }  = await import("./schemas/customer-profile.schema");
      const { terminalSessionSchema }  = await import("./schemas/terminal-session.schema");
      const { systemProcessSchema }    = await import("./schemas/system-process.schema");

      await db.addCollections({
        // Primary unified journal (used by journal.service.ts)
        journal: {
          schema: journalSchema,
          // Migration from v0 (had 'synced' field) to v1 (renamed to 'is_synced')
          migrationStrategies: {
            1: (oldDoc: Record<string, unknown>) => {
              // Rename synced → is_synced
              return {
                ...oldDoc,
                is_synced: oldDoc.synced ?? false,
                synced:    undefined,
              };
            },
          },
        },
        // Per-aggregate collections (used by sync engine and projections)
        queue_entries:    { schema: queueEntrySchema },
        barber_lanes:     { schema: barberLaneSchema },
        transactions:     { schema: transactionSchema },
        customer_profiles:{ schema: customerProfileSchema },
        terminal_sessions:{ schema: terminalSessionSchema },
        system_processes: { schema: systemProcessSchema },
      });

      console.log("[DB] All collections ready ✓");

      if (isDev) {
        (window as Window & { db?: RxDatabase }).db = db;
      }

      return db;
    } catch (err) {
      console.error("[DB] Initialization failed:", err);
      dbPromise = null;
      throw err;
    }
  })();

  return dbPromise;
}
