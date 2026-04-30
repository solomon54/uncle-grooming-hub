"use client";

import { useEffect, useState } from "react";
import { runtime } from "@/core/runtime/runtime";
import type { RxDatabase } from "rxdb";

/**
 * useRuntime
 * ----------------------------------------
 * Ensures system is initialized BEFORE UI uses projections.
 */
export function useRuntime(db: RxDatabase | null) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!db) return;

    async function init() {
      if (db) {
        await runtime.init(db);
      }
      await runtime.replayFromStart(); // build initial state
      setReady(true);
    }

    init();
  }, [db]);

  return ready;
}
