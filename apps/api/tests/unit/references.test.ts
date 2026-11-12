import { describe, expect, it } from "vitest";
import { createBookingReference } from "../../src/lib/references";

describe("booking references", () => {
  it("creates readable non sequential references", () => {
    const ref = createBookingReference("RMV", new Date("2026-08-15T00:00:00.000Z"));
    expect(ref).toMatch(/^RMV-20260815-[A-Z0-9]{6}$/);
  });
});
