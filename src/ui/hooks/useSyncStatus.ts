/**
 * @file useSyncStatus.ts
 * @module ui/hooks
 *
 * useSyncStatus — reactive hook for sync engine state.
 *
 * Specification: MODULE_PRIORITY.md P5.5
 *                PRD §10.4 — State Transparency (Local_Only / Transmitting / Cloud_Verified)
 *                ui-standards.md §5.4 — Sync Indicator
 *                AGENT.md §8 — Sync Engine Rules
 *
 * Subscribes to syncEngine status updates — re-renders on every state change.
 */

"use client";

import { useEffect, useState } from "react";
import { syncEngine }          from "@/core/sync/sync.engine";
import type { SyncEngineStatus } from "@/core/sync/sync.types";

export type { SyncEngineStatus as SyncStatus };

export function useSyncStatus(): SyncEngineStatus {
  const [status, setStatus] = useState<SyncEngineStatus>(
    () => syncEngine.getStatus()
  );

  useEffect(() => {
    // Sync immediately in case status changed before mount
    setStatus(syncEngine.getStatus());

    const unsubscribe = syncEngine.subscribe(() => {
      setStatus(syncEngine.getStatus());
    });

    return unsubscribe;
  }, []);

  return status;
}
