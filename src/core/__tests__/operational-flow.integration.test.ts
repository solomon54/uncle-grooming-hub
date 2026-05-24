/**
 * Golden operational flow — projection-level E2E (QA_STRATEGY Sequence A–C).
 * Proves: check-in → call → engage → complete → PAYMENT_PENDING without UI.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { ProjectionEngine }       from "@/core/projection/projection.engine";
import { queueBoardProjection }   from "@/core/projection/queue-board.projection";
import { barberLaneProjection }   from "@/core/projection/barber-lane.projection";
import { transactionProjection }  from "@/core/projection/transaction.projection";
import type { AllEvents }         from "@/domain/events/event.definitions";
import type { QueueBoardView }    from "@/projections/queue-board.view";
import type { TransactionLedgerView } from "@/projections/transaction-ledger.view";

const QUEUE_ID  = "qe-flow-1";
const BARBER_ID = "lane_001";
const HLC       = (n: number) => `3000:${String(n).padStart(4, "0")}:term_a`;

function meta(n: number): AllEvents["metadata"] {
  return { session_id: "sess-test", hlc_timestamp: HLC(n), terminal_id: "term_a" };
}

function evt(
  type: AllEvents["event_type"],
  version: number,
  n: number,
  payload: Record<string, unknown> = {}
): AllEvents {
  return {
    event_id:          `evt-${type}-${version}`,
    aggregate_id:      type === "BARBER_AVAILABLE" ? BARBER_ID : QUEUE_ID,
    aggregate_version: version,
    event_type:        type,
    payload,
    metadata:          meta(n),
  } as AllEvents;
}

describe("Operational flow (projections only — no DB)", () => {
  let engine: ProjectionEngine;

  beforeEach(() => {
    engine = new ProjectionEngine();
    engine.register(queueBoardProjection);
    engine.register(barberLaneProjection);
    engine.register(transactionProjection);

    engine.apply(evt("BARBER_AVAILABLE", 1, 1, { barber_id: BARBER_ID, barber_name: "Barber 1" }));
  });

  it("check-in → call → engage → complete → PAYMENT_PENDING", () => {
    engine.applyBatch([
      evt("CUSTOMER_CHECKED_IN", 1, 2, {
        customer_uuid:       "cust-1",
        preferred_barber_id: BARBER_ID,
        checkin_method:      "walk-in",
        queue_token:         "A-01",
        customer_name:       "Dawit",
      }),
      evt("CUSTOMER_CALLED_TO_CHAIR", 2, 3, { barber_id: BARBER_ID }),
      evt("SERVICE_ENGAGED", 3, 4, {
        barber_id:    BARBER_ID,
        customer_uuid: "cust-1",
        queue_token:  "A-01",
      }),
      evt("SERVICE_COMPLETED", 4, 5, {}),
    ]);

    const queue = engine.getState<QueueBoardView>("QUEUE_BOARD_VIEW");
    expect(queue?.in_service).toHaveLength(0);
    expect(queue?.entries).toHaveLength(0);

    const ledger = engine.getState<TransactionLedgerView>("TRANSACTION_LEDGER_VIEW");
    const tx = ledger?.active.find(t => t.transaction_id === QUEUE_ID);
    expect(tx?.status).toBe("PAYMENT_PENDING");
    expect(tx?.queue_token).toBe("A-01");
  });

  it("locks intents after SERVICE_ENGAGED (is_intent_locked)", () => {
    engine.apply(evt("CUSTOMER_CHECKED_IN", 1, 10, {
      customer_uuid:       "cust-2",
      preferred_barber_id: BARBER_ID,
      checkin_method:      "walk-in",
      queue_token:         "A-02",
    }));
    engine.apply(evt("CUSTOMER_CALLED_TO_CHAIR", 2, 11, { barber_id: BARBER_ID }));
    engine.apply(evt("SERVICE_ENGAGED", 3, 12, { barber_id: BARBER_ID, customer_uuid: "cust-2" }));

    const inService = engine.getState<QueueBoardView>("QUEUE_BOARD_VIEW")?.in_service[0];
    expect(inService?.is_intent_locked).toBe(true);
  });
});
