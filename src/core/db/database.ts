/**
 * @file database.ts
 * @module core/db
 *
 * RxDB Database Factory — offline-first local journal store.
 *
 * Specification: TAS v1.0 §3 — Local Event Journal Design
 *
 * Storage: IndexedDB via Dexie (browser-native, no server required)
 * Dev mode: Wraps storage with AJV schema validator (RxDB requirement)
 * Prod mode: Raw Dexie storage (no validation overhead)
 *
 * Singleton pattern — one database instance per browser context.
 */

import { createRxDatabase, addRxPlugin, type RxDatabase } from "rxdb";

// ─── Singleton ────────────────────────────────────────────────────────────────

let dbPromise: Promise<RxDatabase> | null = null;

// ─── Factory ──────────────────────────────────────────────────────────────────

export async function getDatabase(): Promise<RxDatabase> {
  // SSR guard — RxDB is browser-only
  if (typeof window === "undefined") {
    return null as unknown as RxDatabase;
  }

  if (dbPromise) return dbPromise;

  dbPromise = (async () => {
    const isDev = process.env.NODE_ENV === "development";

    // 1. Dev mode plugin (must be added before createRxDatabase)
    if (isDev) {
      const { RxDBDevModePlugin } = await import("rxdb/plugins/dev-mode");
      addRxPlugin(RxDBDevModePlugin);
    }

    // 2. Base storage — Dexie (IndexedDB)
    const { getRxStorageDexie } = await import("rxdb/plugins/storage-dexie");
    const baseStorage = getRxStorageDexie();

    // 3. In dev mode, wrap with AJV schema validator (required by RxDB dev mode)
    //    This catches schema violations early and surfaces clear error messages.
    let storage = baseStorage;

    if (isDev) {
      const { wrappedValidateAjvStorage } = await import("rxdb/plugins/validate-ajv");
      storage = wrappedValidateAjvStorage({ storage: baseStorage }) as typeof baseStorage;
    }

    console.log("[DB] Initializing RxDB journal…");

    try {
      const db = await createRxDatabase({
        name:            "ugh_local_journal_v3",
        storage,
        ignoreDuplicate: true,
      });

      const { journalSchema } = await import("@/core/journal/journal.schema");

      await db.addCollections({
        journal: { schema: journalSchema },
      });

      console.log("[DB] Journal ready ✓");

      // Expose on window for debug console access in development
      if (isDev) {
        (window as Window & { db?: RxDatabase }).db = db;
      }

      return db;
    } catch (err) {
      console.error("[DB] Initialization failed:", err);
      // Reset so the next call retries cleanly
      dbPromise = null;
      throw err;
    }
  })();

  return dbPromise;
}
