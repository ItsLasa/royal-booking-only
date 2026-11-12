import { describe, expect, it } from "vitest";
import { money } from "../../src/lib/money";

describe("money", () => {
  it("rounds half up to two decimals", () => {
    expect(money(10.235).toNumber()).toBe(10.24);
  });
});
