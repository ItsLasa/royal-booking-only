import { describe, expect, it } from "vitest";
import { nightsBetween, occupiedNights, rangesOverlap } from "../../src/lib/dates";

describe("date and availability primitives", () => {
  it("treats checkout as exclusive", () => {
    const start = new Date("2026-08-10T00:00:00.000Z");
    const end = new Date("2026-08-12T00:00:00.000Z");
    expect(nightsBetween(start, end)).toBe(2);
    expect(occupiedNights(start, end).map((d) => d.toISOString().slice(0, 10))).toEqual(["2026-08-10", "2026-08-11"]);
  });
  it("detects overlapping reservations", () => {
    expect(rangesOverlap(new Date("2026-08-10"), new Date("2026-08-12"), new Date("2026-08-12"), new Date("2026-08-14"))).toBe(false);
    expect(rangesOverlap(new Date("2026-08-10"), new Date("2026-08-12"), new Date("2026-08-11"), new Date("2026-08-13"))).toBe(true);
  });
});
