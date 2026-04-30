/**
 * @file runQueueFlowTest.ts
 * @module debug
 *
 * End-to-end queue flow test — exercises the full event pipeline.
 * Verifies: check-in → call → engage → complete lifecycle.
 *
 * Usage: call runQueueFlowTest(db) from a browser console or dev page.
 */

import { runtime }        from "@/core/runtime/runtime";
import { projectionEngine } from "@/core/projection/projection.engine";
import {
  checkInCustomer,
  callCustomer,
  startService,
  completeService,
} from "@/core/actions/queue.actions";
import type { QueueBoardState } from "@/core/projection/queue-board.projection";
import type { RxDatabase }      from "rxdb";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TEST_SESSION_ID = "debug-session-001";

function logState(label: string, state: QueueBoardState | undefined) {
  console.log(`\n===== ${label} =====`);
  console.log(JSON.stringify(state, null, 2));
}

async function resetSystem() {
  console.log("🔄 Resetting projection state…");
  projectionEngine.clear();
  await runtime.replayFromStart();
}

// ─── Test Flow ────────────────────────────────────────────────────────────────

export async function runQueueFlowTest(db: RxDatabase) {
  console.log("🚀 Running Queue Flow Test…\n");

  await runtime.init(db);
  await resetSystem();

  const aggregateId = "TEST-QUEUE-1";

  // ── Step 1: Check-in ────────────────────────────────────────────────────────
  await checkInCustomer({
    aggregateId,
    aggregateVersion:  1,
    sessionId:         TEST_SESSION_ID,
    customerUuid:      "cust-test-1",
    preferredBarberId: "barber-1",
  });

  let state = await runtime.syncNewEvents();
  logState("AFTER CHECK-IN", state);
  // Expected: waiting: 1

  // ── Step 2: Call to Chair ───────────────────────────────────────────────────
  await callCustomer({
    aggregateId,
    aggregateVersion: 2,
    sessionId:        TEST_SESSION_ID,
    barberId:         "barber-1",
  });

  state = await runtime.syncNewEvents();
  logState("AFTER CALL", state);
  // Expected: waiting: 0, called: 1

  // ── Step 3: Service Engaged ─────────────────────────────────────────────────
  await startService({
    aggregateId,
    aggregateVersion: 3,
    sessionId:        TEST_SESSION_ID,
    priceSnapshotId:  crypto.randomUUID(),
  });

  state = await runtime.syncNewEvents();
  logState("AFTER SERVICE START", state);
  // Expected: called: 0, in_service: 1

  // ── Step 4: Service Completed ───────────────────────────────────────────────
  await completeService({
    aggregateId,
    aggregateVersion: 4,
    sessionId:        TEST_SESSION_ID,
  });

  state = await runtime.syncNewEvents();
  logState("AFTER COMPLETE", state);
  // Expected: in_service: 0

  console.log("\n✅ Queue Flow Test Finished");
}
