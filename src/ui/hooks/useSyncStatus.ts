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
 * Phase 1: Returns static "verified" state.
 * Phase 4.3: Wire to sync engine when built.
 *
 * @todo Phase 4.3 — Connect to sync.engine.ts observable
 */

"use client";

import { useState } from "react";
import type { SyncState } from "@/ui/components/primitives/SyncIndicator";

export interface SyncStatus {
  state:        SyncState;
  pendingCount: number;
}

export function useSyncStatus(): SyncStatus {
  // Phase 1 placeholder — always verified until sync engine is built
  const [status] = useState<SyncStatus>({
    state:        "verified",
    pendingCount: 0,
  });

  return status;
}
