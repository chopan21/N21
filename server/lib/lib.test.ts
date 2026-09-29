import { describe, expect, it, vi } from "vitest";
import { TtlCache } from "./cache.ts";
import { distanceMetres, median, normalisePostcode } from "./geo.ts";

describe("normalisePostcode", () => {
  it.each([
    ["sw1a1aa", "SW1A 1AA"],
    ["  ls6   2ab ", "LS6 2AB"],
    ["M1 1AE", "M1 1AE"],
    ["EC1A1BB", "EC1A 1BB"],
    ["b338th", "B33 8TH"],
  ])("normalises %s to %s", (input, expected) => {
    expect(normalisePostcode(input)).toBe(expected);
  });

  it.each(["", "LS6", "Headingley", "12345", "SW1A 1A"])("rejects %j", (input) => {
    expect(normalisePostcode(input)).toBeNull();
  });
});

describe("median", () => {
  it("handles odd, even and empty lists", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([100, 200, 400, 300])).toBe(250);
    expect(median([])).toBeNull();
  });
});

describe("distanceMetres", () => {
  it("measures a known distance (Leeds to York is ~35 km)", () => {
    const d = distanceMetres(53.7997, -1.5492, 53.9591, -1.0815);
    expect(d).toBeGreaterThan(34_000);
    expect(d).toBeLessThan(36_000);
  });

  it("is zero for the same point", () => {
    expect(distanceMetres(51.5, -0.1, 51.5, -0.1)).toBe(0);
  });
});

describe("TtlCache", () => {
  it("shares in-flight loads and caches results", async () => {
    const cache = new TtlCache();
    const load = vi.fn(async () => 42);
    const [a, b] = await Promise.all([cache.getOrLoad("k", 1000, load), cache.getOrLoad("k", 1000, load)]);
    expect(a).toBe(42);
    expect(b).toBe(42);
    await cache.getOrLoad("k", 1000, load);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("does not cache failures", async () => {
    const cache = new TtlCache();
    const load = vi.fn().mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce("ok");
    await expect(cache.getOrLoad("k", 1000, load)).rejects.toThrow("boom");
    await expect(cache.getOrLoad("k", 1000, load)).resolves.toBe("ok");
  });

  it("expires entries after the TTL", async () => {
    vi.useFakeTimers();
    try {
      const cache = new TtlCache();
      const load = vi.fn(async () => Date.now());
      await cache.getOrLoad("k", 1000, load);
      vi.advanceTimersByTime(1001);
      await cache.getOrLoad("k", 1000, load);
      expect(load).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("evicts the least recently used entry when full", async () => {
    const cache = new TtlCache(2);
    await cache.getOrLoad("a", 1000, async () => 1);
    await cache.getOrLoad("b", 1000, async () => 2);
    await cache.getOrLoad("a", 1000, async () => 1);
    await cache.getOrLoad("c", 1000, async () => 3);
    expect(cache.size).toBe(2);
    const reloadB = vi.fn(async () => 2);
    await cache.getOrLoad("b", 1000, reloadB);
    expect(reloadB).toHaveBeenCalled();
  });
});
