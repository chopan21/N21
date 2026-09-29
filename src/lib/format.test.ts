import { describe, expect, it } from "vitest";
import { formatDate, formatDistance, formatMonth, formatPrice, formatPriceShort, ordinal } from "./format.ts";

describe("format", () => {
  it("formats prices", () => {
    expect(formatPrice(248750)).toBe("£248,750");
    expect(formatPriceShort(248750)).toBe("£248.8K");
    expect(formatPrice(null)).toBe("–");
  });

  it("formats months and dates", () => {
    expect(formatMonth("2026-07")).toBe("July 2026");
    expect(formatMonth("2026-07", "short")).toBe("Jul 26");
    expect(formatDate("2025-10-31")).toBe("31 Oct 2025");
  });

  it("formats distances with walking time", () => {
    expect(formatDistance(123)).toBe("120 m · 2 min walk");
    expect(formatDistance(1180)).toBe("1.2 km · 15 min walk");
    expect(formatDistance(10)).toBe("10 m · 1 min walk");
  });

  it("adds ordinal suffixes", () => {
    expect([1, 2, 3, 4, 10, 11, 12, 13, 21, 22].map(ordinal)).toEqual([
      "1st", "2nd", "3rd", "4th", "10th", "11th", "12th", "13th", "21st", "22nd",
    ]);
  });
});
