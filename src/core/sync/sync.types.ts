/**
 * @file sync.types.ts
 * @module core/sync
 *
 * Sync engine types — TAS v1.0 §5, MODULE_PRIORITY P4.3
 */

import type { SyncState } from "@/ui/components/primitives/SyncIndicator";

export interface SyncPushBatch {
  terminal_id: string;
  events:      unknown[];
}

export interface SyncPushAck {
  batch_id:       string;
  ack_event_ids:  string[];
}

export interface SyncEngineStatus {
  state:         SyncState;
  pendingCount:  number;
  lastPushAt?:   string;
  lastError?:    string;
}
