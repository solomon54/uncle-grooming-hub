import { describe, it, expect } from "vitest";
import { HybridLogicalClock }   from "../hlc";

describe("Hybrid Logical Clock (HLC)", () => {
  it("formats timestamps correctly", () => {
    const hlc = new HybridLogicalClock("term_01");
    const ts  = hlc.tick();
    expect(ts).toMatch(/^\d{13}:\d{4}:term_01$/);
  });

  it("guarantees strictly monotonic local increments within the same millisecond", () => {
    const hlc = new HybridLogicalClock("term_01");
    const ts1 = hlc.tick();
    const ts2 = hlc.tick();
    expect(ts1 < ts2).toBe(true);
    expect(HybridLogicalClock.compare(ts1, ts2)).toBeLessThan(0);
  });

  it("correctly parses an HLC string", () => {
    const parsed = HybridLogicalClock.parse("1712329800000:0003:term_01");
    expect(parsed.physicalMs).toBe(1712329800000);
    expect(parsed.logicalCounter).toBe(3);
    expect(parsed.terminalId).toBe("term_01");
  });

  it("handles a valid incoming remote timestamp (receive)", () => {
    const hlc          = new HybridLogicalClock("term_local");
    const remotePhysical = Date.now() + 5_000;
    const remoteTs     = `${remotePhysical}:0000:term_remote`;

    const resultingTs  = hlc.receive(remoteTs);

    expect(HybridLogicalClock.compare(resultingTs, remoteTs)).toBeGreaterThan(0);

    const parsed = HybridLogicalClock.parse(resultingTs);
    expect(parsed.physicalMs).toBe(remotePhysical);
    expect(parsed.logicalCounter).toBe(1);
  });

  it("throws when remote timestamp violates MAX_DRIFT (60s)", () => {
    const hlc          = new HybridLogicalClock("term_local");
    const remotePhysical = Date.now() + 120_000;
    const remoteTs     = `${remotePhysical}:0000:term_remote`;

    expect(() => hlc.receive(remoteTs)).toThrow(/HLC drift violation/);
  });
});
