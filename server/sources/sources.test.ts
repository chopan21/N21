import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cache } from "../lib/cache.ts";
import { mockFetch } from "../test/mockFetch.ts";
import { aqiBand } from "./airQuality.ts";
import { buildQuery, classify, summariseAmenities, toAmenities, type OsmElement } from "./amenities.ts";
import { floodAreaKind, floodReport, toFloodWarning } from "./flood.ts";
import { parseLrDate, priceReport, priceStats, toSale, type LrTransaction } from "./landRegistry.ts";
import { crimeReport, previousMonths, summariseCrimes } from "./police.ts";
import { deprivationFor } from "./postcodes.ts";

beforeEach(() => cache.clear());
afterEach(() => vi.unstubAllGlobals());

const lrTx = (overrides: Partial<LrTransaction> = {}): LrTransaction => ({
  transactionDate: "Fri, 31 Oct 2025",
  pricePaid: 250_000,
  newBuild: false,
  propertyAddress: { saon: "FLAT 2", paon: "14", street: "GROVE ROAD", postcode: "LS6 2AB" },
  propertyType: { _about: "http://landregistry.data.gov.uk/def/common/flat-maisonette" },
  estateType: { _about: "http://landregistry.data.gov.uk/def/common/leasehold" },
  recordStatus: { _about: "http://landregistry.data.gov.uk/def/ppi/add" },
  transactionCategory: { _about: "http://landregistry.data.gov.uk/def/ppi/standardPricePaidTransaction" },
  ...overrides,
});

describe("Land Registry", () => {
  it("parses Land Registry dates", () => {
    expect(parseLrDate("Fri, 31 Oct 2025")).toBe("2025-10-31");
    expect(parseLrDate("Mon, 5 Jan 2024")).toBe("2024-01-05");
    expect(parseLrDate("2023-06-01")).toBe("2023-06-01");
    expect(parseLrDate("nonsense")).toBeNull();
  });

  it("maps a transaction to a sale", () => {
    expect(toSale(lrTx())).toEqual({
      date: "2025-10-31",
      price: 250_000,
      address: "Flat 2, 14, Grove Road",
      postcode: "LS6 2AB",
      propertyType: "flat-maisonette",
      newBuild: false,
      tenure: "leasehold",
    });
  });

  it("drops deleted records and non-market transfers", () => {
    expect(toSale(lrTx({ recordStatus: { _about: "http://x/def/ppi/delete" } }))).toBeNull();
    expect(
      toSale(lrTx({ transactionCategory: { _about: "http://x/def/ppi/additionalPricePaidTransaction" } })),
    ).toBeNull();
    expect(toSale(lrTx({ pricePaid: undefined }))).toBeNull();
  });

  it("computes stats by type and year", () => {
    const sales = [
      toSale(lrTx({ pricePaid: 200_000, transactionDate: "Fri, 3 Mar 2023" }))!,
      toSale(lrTx({ pricePaid: 300_000 }))!,
      toSale(
        lrTx({ pricePaid: 500_000, propertyType: { _about: "http://x/def/common/detached" } }),
      )!,
    ];
    const stats = priceStats(sales);
    expect(stats).toMatchObject({ count: 3, median: 300_000, mean: 333_333, min: 200_000, max: 500_000 });
    expect(stats.byType).toEqual([
      { type: "flat-maisonette", count: 2, median: 250_000 },
      { type: "detached", count: 1, median: 500_000 },
    ]);
    expect(stats.byYear).toEqual([
      { year: 2023, count: 1, median: 200_000 },
      { year: 2025, count: 2, median: 400_000 },
    ]);
  });

  it("merges several postcodes, newest first, and tolerates partial failures", async () => {
    mockFetch([
      {
        match: /postcode=LS6\+2AB/,
        body: { result: { items: [lrTx({ transactionDate: "Mon, 1 Jan 2024" })] } },
      },
      {
        match: /postcode=LS6\+2BA/,
        body: { result: { items: [lrTx({ transactionDate: "Tue, 1 Jul 2025", pricePaid: 400_000 })] } },
      },
      { match: /postcode=LS6\+9ZZ/, status: 500, body: {} },
    ]);

    const report = await priceReport(["LS6 2AB", "LS6 2BA", "LS6 9ZZ"], new Date("2026-09-01"));
    expect(report.sinceYear).toBe(2021);
    expect(report.sales.map((s) => s.date)).toEqual(["2025-07-01", "2024-01-01"]);
    expect(report.stats.median).toBe(325_000);
  });

  it("fails when every postcode lookup fails", async () => {
    mockFetch([{ match: /landregistry/, status: 500, body: {} }]);
    await expect(priceReport(["LS6 2AB"])).rejects.toThrow(/Land Registry/);
  });
});

describe("police", () => {
  it("lists previous months across a year boundary", () => {
    expect(previousMonths("2026-02", 4)).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"]);
  });

  it("summarises crimes by category, most common first", () => {
    const crime = (category: string) => ({ category, month: "2026-07", location: null });
    expect(summariseCrimes([crime("burglary"), crime("drugs"), crime("burglary")])).toEqual([
      { category: "burglary", label: "Burglary", count: 2 },
      { category: "drugs", label: "Drugs", count: 1 },
    ]);
  });

  it("builds a report with a trend from the latest published month", async () => {
    const point = { latitude: "53.8", longitude: "-1.5", street: { name: "On or near Grove Road" } };
    mockFetch([
      { match: /crimes-street-dates/, body: [{ date: "2026-06" }, { date: "2026-07" }] },
      {
        match: /date=2026-07/,
        body: [
          { category: "burglary", month: "2026-07", location: point },
          { category: "violent-crime", month: "2026-07", location: point },
        ],
      },
      { match: /date=2026-06/, status: 500, body: {} },
      { match: /all-crime/, body: [{ category: "drugs", month: "x", location: point }] },
    ]);

    const report = await crimeReport(53.8, -1.5);
    expect(report.month).toBe("2026-07");
    expect(report.total).toBe(2);
    expect(report.trend.map((t) => t.month)).toEqual(["2026-02", "2026-03", "2026-04", "2026-05", "2026-07"]);
    expect(report.points[0]).toEqual({ lat: 53.8, lng: -1.5, category: "burglary", street: "On or near Grove Road" });
  });
});

describe("flood", () => {
  it("distinguishes warning areas from alert areas", () => {
    expect(floodAreaKind("063FWT23Islewrth")).toBe("warning");
    expect(floodAreaKind("123FWF737")).toBe("warning");
    expect(floodAreaKind("063WAT231N")).toBe("alert");
  });

  it("cleans up warning messages", () => {
    const w = toFloodWarning({ floodAreaID: "x", message: "High tides\u00a0tonight.\n\n", severityLevel: 3 });
    expect(w.message).toBe("High tides tonight.");
  });

  it("skips the API outside England", async () => {
    const { fn } = mockFetch([]);
    await expect(floodReport(55.95, -3.19, "Scotland")).resolves.toEqual({
      covered: false,
      activeWarnings: [],
      floodAreas: [],
    });
    expect(fn).not.toHaveBeenCalled();
  });

  it("drops warnings that are no longer in force and sorts by severity", async () => {
    mockFetch([
      { match: /floodAreas/, body: { items: [{ notation: "123WAF1", label: "B" }, { notation: "123FWF2", label: "A" }] } },
      {
        match: /\/floods\?/,
        body: {
          items: [
            { floodAreaID: "a", severityLevel: 3 },
            { floodAreaID: "b", severityLevel: 4 },
            { floodAreaID: "c", severityLevel: 2 },
          ],
        },
      },
    ]);
    const report = await floodReport(53.8, -1.5, "England");
    expect(report.floodAreas.map((a) => a.kind)).toEqual(["warning", "alert"]);
    expect(report.activeWarnings.map((w) => w.id)).toEqual(["c", "a"]);
  });
});

describe("amenities", () => {
  it("classifies OSM tags", () => {
    expect(classify({ amenity: "school" })).toBe("school");
    expect(classify({ healthcare: "doctor" })).toBe("gp");
    expect(classify({ railway: "station" })).toBe("station");
    expect(classify({ highway: "bus_stop" })).toBe("bus_stop");
    expect(classify({ leisure: "park" })).toBe("park");
    expect(classify({ amenity: "pub" })).toBe("food_drink");
    expect(classify({ amenity: "bench" })).toBeNull();
  });

  it("builds an Overpass query around the point", () => {
    const q = buildQuery(53.8, -1.5, 1200);
    expect(q).toContain("(around:1200,53.8,-1.5)");
    expect(q.startsWith("[out:json]")).toBe(true);
  });

  it("dedupes node + outline duplicates, drops unnamed places and sorts by distance", () => {
    const elements: OsmElement[] = [
      { type: "way", id: 1, center: { lat: 53.801, lon: -1.5 }, tags: { amenity: "school", name: "Oak Primary" } },
      { type: "node", id: 2, lat: 53.8011, lon: -1.5, tags: { amenity: "school", name: "Oak Primary" } },
      { type: "node", id: 3, lat: 53.8001, lon: -1.5, tags: { shop: "supermarket", name: "Co-op" } },
      { type: "node", id: 4, lat: 53.8002, lon: -1.5, tags: { shop: "supermarket" } },
      { type: "node", id: 5, lat: 53.8003, lon: -1.5, tags: { highway: "bus_stop" } },
    ];
    const places = toAmenities(elements, 53.8, -1.5);
    expect(places.map((p) => p.name)).toEqual(["Co-op", "Bus stop", "Oak Primary"]);

    const summary = summariseAmenities(places);
    expect(summary.find((s) => s.category === "school")).toMatchObject({ count: 1, nearest: { name: "Oak Primary" } });
    expect(summary.find((s) => s.category === "gp")).toMatchObject({ count: 0, nearest: null });
  });
});

describe("deprivation & air quality", () => {
  it("converts a rank into a decile for each nation", () => {
    expect(deprivationFor("England", 1)).toEqual({ rank: 1, outOf: 32_844, decile: 1 });
    expect(deprivationFor("England", 18_901)?.decile).toBe(6);
    expect(deprivationFor("England", 32_844)?.decile).toBe(10);
    expect(deprivationFor("England", 33_000)).toEqual({ rank: 33_000, outOf: 33_755, decile: 10 });
    expect(deprivationFor("Wales", 999)).toEqual({ rank: 999, outOf: 1_909, decile: 6 });
    expect(deprivationFor("Scotland", null)).toBeNull();
    expect(deprivationFor("Isle of Man", 10)).toBeNull();
  });

  it("maps AQI values to bands", () => {
    expect(aqiBand(null)).toBe("Unknown");
    expect(aqiBand(15)).toBe("Good");
    expect(aqiBand(35)).toBe("Fair");
    expect(aqiBand(55)).toBe("Moderate");
    expect(aqiBand(75)).toBe("Poor");
    expect(aqiBand(95)).toBe("Very poor");
    expect(aqiBand(120)).toBe("Extremely poor");
  });
});
