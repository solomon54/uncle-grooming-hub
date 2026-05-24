import { describe, it, expect, vi, beforeEach } from "vitest";
import { JournalService } from "../journal.service";
import type { AllEvents } from "@/domain/events/event.definitions";
import type { ActiveSession } from "@/core/session/session.types";

vi.mock("@/core/clock/clock.service", () => ({
  clockService: { tick: vi.fn(() => "2000:0001:term_test") },
}));

vi.mock("@/core/terminal/terminal.identity", () => ({
  terminalIdentity: { get terminalId() { return "term_test"; } },
}));

describe("Intent lock (REQ-J-03 / Sequence B)", () => {
  let journal: JournalService;
  let mockCollection: { findOne: ReturnType<typeof vi.fn>; insert: ReturnType<typeof vi.fn> };

  const session: ActiveSession = {
    session_id:     "sess-1",
    actor_id:       "cashier-1",
    role:           "CASHIER",
    actor_name:     "Cashier",
    terminal_id:    "term_test",
    opened_at:      "1000:0001:term_test",
    is_first_login: false,
  };

  beforeEach(() => {
    journal = new JournalService();
    mockCollection = {
      findOne: vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue(null) }),
      insert:  vi.fn().mockResolvedValue({}),
    };
    journal.setDatabase({ collections: { journal: mockCollection } } as never);
  });

  const baseEvent = (type: AllEvents["event_type"], version: number): AllEvents =>
    ({
      event_id:          `evt-${type}-${version}`,
      aggregate_id:      "qe-1",
      aggregate_version: version,
      event_type:        type,
      payload:           type === "SERVICE_INTENT_ADDED" ? { service_id: "svc-1" } : {},
      metadata:          { session_id: "sess-1", hlc_timestamp: "2000:0001:term_test", terminal_id: "term_test" },
    }) as AllEvents;

  it("rejects SERVICE_INTENT_ADDED after SERVICE_ENGAGED on same aggregate", async () => {
    mockCollection.findOne.mockImplementation((query: { selector?: Record<string, unknown> }) => {
      const sel = query?.selector ?? {};
      if (sel.event_id)                        return { exec: vi.fn().mockResolvedValue(null) };
      if (sel.event_type === "SERVICE_ENGAGED") return { exec: vi.fn().mockResolvedValue({ aggregate_version: 2 }) };
      if (sel.aggregate_id)                    return { exec: vi.fn().mockResolvedValue({ aggregate_version: 2 }) };
      return { exec: vi.fn().mockResolvedValue(null) };
    });

    const result = await journal.commitEvent(baseEvent("SERVICE_INTENT_ADDED", 3), session);
    expect(result).toEqual({ success: false, reason: "INTENT_LOCKED" });
    expect(mockCollection.insert).not.toHaveBeenCalled();
  });
});
