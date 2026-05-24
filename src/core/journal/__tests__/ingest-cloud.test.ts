import { describe, it, expect, vi, beforeEach } from "vitest";
import { JournalService } from "../journal.service";
import type { AllEvents } from "@/domain/events/event.definitions";

vi.mock("@/core/clock/clock.service", () => ({
  clockService: {
    tick:    vi.fn(() => "4000:0001:term_test"),
    receive: vi.fn(),
  },
}));

vi.mock("@/core/terminal/terminal.identity", () => ({
  terminalIdentity: { get terminalId() { return "term_test"; } },
}));

describe("ingestCloudEvent — cloud pull replication", () => {
  let journal: JournalService;
  let mockCollection: { findOne: ReturnType<typeof vi.fn>; insert: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    journal = new JournalService();
    mockCollection = {
      findOne: vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue(null) }),
      insert:  vi.fn().mockResolvedValue({}),
    };
    journal.setDatabase({ collections: { journal: mockCollection } } as never);
  });

  it("allows PAYMENT_SETTLED from cloud pull (bypasses CLOUD_AUTHORITY guard)", async () => {
    const event = {
      event_id:          "evt-settle-1",
      aggregate_id:      "tx-1",
      aggregate_version: 1,
      event_type:        "PAYMENT_SETTLED",
      payload:           { transaction_id: "tx-1", total_settled: 500 },
      metadata: {
        session_id:    "cloud",
        hlc_timestamp: "4000:0001:cloud",
        terminal_id:   "CLOUD",
      },
    } as AllEvents;

    const result = await journal.ingestCloudEvent(event);

    expect(result.success).toBe(true);
    expect(mockCollection.insert).toHaveBeenCalledWith(
      expect.objectContaining({ is_synced: true, event_type: "PAYMENT_SETTLED" })
    );
  });
});
