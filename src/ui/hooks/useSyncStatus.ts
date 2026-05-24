/**
 * @file useSyncStatus.ts
 * @module ui/hooks
 *
 * useSyncStatus — reactive hook for sync engine state.
 *
 * Specification: MODULE_PRIORITY.md P5.5
 *                PRD §10.4 — State Transparency (Local_Only / Transmitting / Cloud_Verified)
 *                ui-standards.md §5.4 — Sync Indicator
 *
 * Subscribes to syncEngine status updates.
 * Returns live sync state for display in TopBar and Admin screen.
 */

"use client";

import { useState, useEffect } from "react";
import type { SyncEngineStatus } from "@/core/sync/sync.types";

export function useSyncStatus(): SyncEngineStatus {
  const [status, setStatus] = useState<SyncEngineStatus>({
    state:        "verified",
    pendingCount: 0,
  });

  useEffect(() => {
    // Lazy import to avoid SSR issues
    import("@/core/sync/sync.engine").then(({ syncEngine }) => {
      // Sync current state immediately
      setStatus(syncEngine.getStatus());

      // Subscribe to future updates
      const unsubscribe = syncEngine.subscribe(() => {
        setStatus(syncEngine.getStatus());
      });

      return unsubscribe;
    });
  }, []);

  return status;
}
