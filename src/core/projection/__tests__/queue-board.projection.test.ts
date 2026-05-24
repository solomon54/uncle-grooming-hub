import { describe, it, expect, beforeEach } from "vitest";
import { ProjectionEngine }      from "../projection.engine";
import { queueBoardProjection }  from "../queue-board.projection";
import type { AllEvents }        from "@/domain/events/event.definitions";
import type { QueueBoardView }   from "@/projections/queue-board.view";

function meta(hlc: string): AllEvents["metadata"] {
  return { session_id: "sess-1", hlc_timestamp: hlc, terminal_id: "term_test" };
}

function checkIn(id: string, version: number, hlc: string, token: string): AllEvents {
  return {
    event_id:          `evt-${id}-v${version}`,
    aggregate_id:      id,
    aggregate_version: version,
    event_type:        "CUSTOMER_CHECKED_IN",
    payload: {
      customer_uuid:       "cust-1",
      preferred_barber_id: "",
      checkin_method:      "walk-in",
      queue_token:         token,
      customer_name:       "Dawit Bekele",
    },
    metadata: meta(hlc),
  } as AllEvents;
}

describe("QueueBoard projection", () => {
  let engine: ProjectionEngine;

  beforeEach(() => {
    engine = new ProjectionEngine();
    engine.register(queueBoardProjection);
  });

  it("materializes WAITING entry with queue token after EVENT 01", () => {
    engine.apply(checkIn("qe-1", 1, "1000:0001:term_a", "A-07"));

    const view = engine.getState<QueueBoardView>("QUEUE_BOARD_VIEW");
    expect(view?.entries).toHaveLength(1);
    expect(view?.entries[0].queue_token).toBe("A-07");
    expect(view?.entries[0].status).toBe("WAITING");
    expect(view?.entries[0].position).toBe(1);
    expect(view?.total_waiting).toBe(1);
  });

  it("preserves HLC order for two walk-ins (REQ-P-01)", () => {
    engine.applyBatch([
      checkIn("qe-1", 1, "1000:0001:term_a", "A-01"),
      checkIn("qe-2", 1, "1000:0002:term_a", "A-02"),
    ]);

    const view = engine.getState<QueueBoardView>("QUEUE_BOARD_VIEW");
    expect(view?.entries.map(e => e.queue_token)).toEqual(["A-01", "A-02"]);
  });

  it("moves entry to called on EVENT 03", () => {
    engine.apply(checkIn("qe-1", 1, "1000:0001:term_a", "A-07"));
    engine.apply({
      event_id:          "evt-call",
      aggregate_id:      "qe-1",
      aggregate_version: 2,
      event_type:        "CUSTOMER_CALLED_TO_CHAIR",
      payload:           { barber_id: "barber-1" },
      metadata:          meta("1000:0003:term_a"),
    } as AllEvents);

    const view = engine.getState<QueueBoardView>("QUEUE_BOARD_VIEW");
    expect(view?.entries).toHaveLength(0);
    expect(view?.called).toHaveLength(1);
    expect(view?.called[0].status).toBe("CALLED");
  });
});
