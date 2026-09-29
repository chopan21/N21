import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "./app.ts";
import { cache } from "./lib/cache.ts";
import { mockFetch } from "./test/mockFetch.ts";

const LS6 = {
  postcode: "LS6 2AB",
  latitude: 53.822226,
  longitude: -1.572262,
  country: "England",
  region: "Yorkshire and The Humber",
  admin_district: "Leeds",
  admin_ward: "Headingley & Hyde Park",
  parish: "Leeds, unparished area",
  parliamentary_constituency: "Leeds Central and Headingley",
  parliamentary_constituency_2024: "Leeds Central and Headingley",
  lsoa: "Leeds 110D",
  ruc21: "Urban: Nearer to a major town or city",
  pfa: "West Yorkshire",
  index_of_multiple_deprivation: 18901,
};

const postcodeRoute = {
  match: /api\.postcodes\.io\/postcodes\/LS6%202AB$/,
  body: { status: 200, result: LS6 },
};

beforeEach(() => cache.clear());
afterEach(() => vi.unstubAllGlobals());

describe("API", () => {
  const app = createApp();

  it("reports health", async () => {
    await request(app).get("/api/health").expect(200, { ok: true });
  });

  it("returns a 404 for unknown API routes", async () => {
    await request(app).get("/api/nope").expect(404);
  });

  it("looks up an area profile, accepting postcodes without spaces", async () => {
    mockFetch([postcodeRoute]);
    const res = await request(app).get("/api/areas/ls62ab").expect(200);
    expect(res.body).toMatchObject({
      postcode: "LS6 2AB",
      adminDistrict: "Leeds",
      deprivation: { rank: 18901, decile: 6 },
    });
  });

  it("rejects things that aren't postcodes without calling upstream", async () => {
    const { fn } = mockFetch([]);
    const res = await request(app).get("/api/areas/not-a-postcode").expect(400);
    expect(res.body.error).toMatch(/postcode/i);
    expect(fn).not.toHaveBeenCalled();
  });

  it("returns a friendly 404 for unknown postcodes", async () => {
    mockFetch([{ match: /postcodes\/XX1/, status: 404, body: { status: 404, error: "Postcode not found" } }]);
    const res = await request(app).get("/api/areas/XX11XX").expect(404);
    expect(res.body.error).toBe("We couldn't find the postcode XX1 1XX");
  });

  it("maps upstream outages to 502", async () => {
    mockFetch([postcodeRoute, { match: /open-meteo/, status: 500, body: {} }]);
    const res = await request(app).get("/api/areas/LS62AB/air").expect(502);
    expect(res.body.error).toMatch(/Open-Meteo/);
  });

  it("returns air quality", async () => {
    mockFetch([
      postcodeRoute,
      {
        match: /open-meteo/,
        body: { current: { time: "2026-09-29T21:00", european_aqi: 35, pm2_5: 12.7, pm10: 20, nitrogen_dioxide: 10, ozone: 64 } },
      },
    ]);
    const res = await request(app).get("/api/areas/LS62AB/air").expect(200);
    expect(res.body).toMatchObject({ europeanAqi: 35, band: "Fair", no2: 10 });
  });

  it("searches sold prices across the nearest postcodes", async () => {
    const { calls } = mockFetch([
      postcodeRoute,
      {
        match: /postcodes\?lat=/,
        body: { status: 200, result: [{ postcode: "LS6 2BA" }, { postcode: "LS6 2AB" }] },
      },
      { match: /landregistry/, body: { result: { items: [] } } },
    ]);
    const res = await request(app).get("/api/areas/LS62AB/prices").expect(200);
    expect(res.body.postcodesSearched).toEqual(["LS6 2AB", "LS6 2BA"]);
    expect(calls.filter((c) => c.includes("landregistry"))).toHaveLength(2);
  });

  describe("search", () => {
    it("returns nothing for very short queries", async () => {
      const { fn } = mockFetch([]);
      await request(app).get("/api/search?q=a").expect(200, { results: [] });
      expect(fn).not.toHaveBeenCalled();
    });

    it("resolves a full postcode", async () => {
      mockFetch([postcodeRoute]);
      const res = await request(app).get("/api/search?q=ls6%202ab").expect(200);
      expect(res.body.results).toEqual([
        expect.objectContaining({ kind: "postcode", postcode: "LS6 2AB", detail: "Headingley & Hyde Park, Leeds" }),
      ]);
    });

    it("autocompletes partial postcodes", async () => {
      mockFetch([{ match: /autocomplete/, body: { status: 200, result: ["LS6 1AA", "LS6 1AB"] } }]);
      const res = await request(app).get("/api/search?q=LS6").expect(200);
      expect(res.body.results.map((r: { postcode: string }) => r.postcode)).toEqual(["LS6 1AA", "LS6 1AB"]);
    });

    it("finds places and resolves each to its nearest postcode", async () => {
      mockFetch([
        {
          match: /places\?q=headingley/i,
          body: {
            status: 200,
            result: [
              { code: "a", name_1: "Headingley", local_type: "Suburban Area", district_borough: "Leeds", region: "Yorkshire and the Humber", country: "England", latitude: 53.8, longitude: -1.57 },
              { code: "b", name_1: "Nowhere", local_type: "Hamlet", region: null, country: "England", latitude: 50, longitude: -4 },
            ],
          },
        },
        {
          match: /postcodes$/,
          body: (_url: URL, init?: RequestInit) => {
            expect(JSON.parse(String(init?.body)).geolocations).toHaveLength(2);
            return { status: 200, result: [{ result: [{ postcode: "LS6 3BP" }] }, { result: null }] };
          },
        },
      ]);
      const res = await request(app).get("/api/search?q=Headingley").expect(200);
      expect(res.body.results).toEqual([
        {
          id: "place:a",
          label: "Headingley",
          detail: "Suburban Area · Leeds · Yorkshire and the Humber",
          kind: "place",
          postcode: "LS6 3BP",
        },
      ]);
    });
  });
});
