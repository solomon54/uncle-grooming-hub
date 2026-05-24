import { describe, it, expect, vi, beforeEach } from "vitest";
import { JournalService }  from "../journal.service";
import type { AllEvents }  from "@/domain/events/event.definitions";
import type { ActiveSession } from "@/core/session/session.types";

vi.mock("@/core/clock/clock.service", () => ({
  clockService: { tick: vi.fn(() => "1712329800000:0000:test_term") },
}));

vi.mock("@/core/terminal/terminal.identity", () => ({
  terminalIdentity: { get terminalId() { return "test_term"; } },
}));

describe("JournalService — 5 invariant guards", () => {
  let journal: JournalService;
  let mockCollection: any;

  const session: ActiveSession = {
    session_id:     "sess-123",
    actor_id:       "actor-123",
    role:           "CASHIER",
    actor_name:     "Test Operator",
    terminal_id:    "test_term",
    opened_at:      "1712329800000:0000:test_term",
    is_first_login: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    journal = new JournalService();

    mockCollection = {
      findOne: vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue(null) }),
      insert:  vi.fn().mockResolvedValue({}),
      find:    vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue([]) }),
    };

    journal.setDatabase({ collections: { journal: mockCollection } } as never);
  });

  const baseEvent = (): AllEvents => ({
    event_id:          "evt-123",
    aggregate_id:      "agg-123",
    aggregate_version: 1,
    event_type:        "CUSTOMER_CHECKED_IN",
    payload:           { customer_uuid: "cust-1", preferred_barber_id: "", checkin_method: "walk-in" },
    metadata:          { session_id: "sess-123", hlc_timestamp: "1712329800000:0000:test_term", terminal_id: "test_term" },
  } as AllEvents);

  it("Guard 1 — rejects CLOUD_AUTHORITY_ONLY events locally", async () => {
    const event = { ...baseEvent(), event_type: "PAYMENT_SETTLED" } as AllEvents;
    const result = await journal.commitEvent(event, session);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("CLOUD_AUTHORITY_ONLY");
    expect(mockCollection.insert).not.toHaveBeenCalled();
  });

  it("Guard 2 — rejects INSUFFICIENT_ROLE for admin-only events", async () => {
    const event = { ...baseEvent(), event_type: "SHOP_HOURS_CHANGED" } as AllEvents;
    const result = await journal.commitEvent(event, session); // CASHIER role
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("INSUFFICIENT_ROLE");
  });

  it("Guard 3 — idempotent success for DUPLICATE_EVENT", async () => {
    mockCollection.findOne.mockReturnValue({
      exec: vi.fn().mockResolvedValue({ event_id: "evt-123", hlc: "old-hlc" }),
    });
    const result = await journal.commitEvent(baseEvent(), session);
    expect(result.success).toBe(true);
    expect(mockCollection.insert).not.toHaveBeenCalled();
  });

  it("Guard 4 — rejects VERSION_CONFLICT", async () => {
    mockCollection.findOne
      .mockReturnValueOnce({ exec: vi.fn().mockResolvedValue(null) })          // dup check
      .mockReturnValueOnce({ exec: vi.fn().mockResolvedValue({ aggregate_version: 2 }) }); // version check

    const event = { ...baseEvent(), aggregate_version: 2 } as AllEvents;
    const result = await journal.commitEvent(event, session);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("VERSION_CONFLICT");
  });

  it("Guard 5 — rejects INTENT_LOCKED after SERVICE_ENGAGED", async () => {
    mockCollection.findOne
      .mockReturnValueOnce({ exec: vi.fn().mockResolvedValue(null) })                          // dup check
      .mockReturnValueOnce({ exec: vi.fn().mockResolvedValue({ aggregate_version: 0 }) })      // version check
      .mockReturnValueOnce({ exec: vi.fn().mockResolvedValue({ event_type: "SERVICE_ENGAGED" }) }); // intent lock

    const event = { ...baseEvent(), event_type: "SERVICE_INTENT_ADDED" } as AllEvents;
    const result = await journal.commitEvent(event, session);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("INTENT_LOCKED");
  });

  it("successfully appends a valid event", async () => {
    const result = await journal.commitEvent(baseEvent(), session);
    expect(result.success).toBe(true);
    expect(mockCollection.insert).toHaveBeenCalledTimes(1);
    const doc = mockCollection.insert.mock.calls[0][0];
    expect(doc.is_synced).toBe(false);
    expect(doc.metadata.terminal_id).toBe("test_term");
  });
});
