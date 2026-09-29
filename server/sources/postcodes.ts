import type { AreaProfile, Deprivation, SearchResult } from "../../shared/types.ts";
import { cache, DAY, HOUR } from "../lib/cache.ts";
import { fetchJson, UpstreamError } from "../lib/http.ts";
import { normalisePostcode } from "../lib/geo.ts";

const BASE = process.env.POSTCODES_API_URL ?? "https://api.postcodes.io";
const SOURCE = "postcodes.io";

interface PostcodeResult {
  postcode: string;
  latitude: number | null;
  longitude: number | null;
  country: string;
  region: string | null;
  admin_district: string | null;
  admin_ward: string | null;
  parish: string | null;
  parliamentary_constituency_2024?: string | null;
  parliamentary_constituency: string | null;
  lsoa: string | null;
  ruc21?: string | null;
  ruc11?: string | null;
  pfa?: string | null;
  index_of_multiple_deprivation?: number | null;
  distance?: number;
}

interface PlaceResult {
  code: string;
  name_1: string;
  local_type: string;
  outcode: string | null;
  district_borough: string | null;
  county_unitary: string | null;
  region: string | null;
  country: string;
  latitude: number;
  longitude: number;
}

interface Envelope<T> {
  status: number;
  result: T;
}

/**
 * Number of small areas each nation's deprivation index ranks. England's
 * index was rebased from 32,844 (IMD 2019) to 33,755 (IMD 2025) LSOAs.
 */
const DEPRIVATION_AREAS: Record<string, number[]> = {
  England: [32_844, 33_755],
  Wales: [1_909],
  Scotland: [6_976],
  "Northern Ireland": [890],
};

export function deprivationFor(country: string, rank: number | null | undefined): Deprivation | null {
  const totals = DEPRIVATION_AREAS[country];
  if (!totals || rank == null || rank < 1) return null;
  const outOf = totals.find((t) => rank <= t);
  if (!outOf) return null;
  return { rank, outOf, decile: Math.min(10, Math.ceil((rank / outOf) * 10)) };
}

export function toAreaProfile(r: PostcodeResult): AreaProfile {
  if (r.latitude == null || r.longitude == null) {
    throw new UpstreamError(`${r.postcode} has no known location`, 404, SOURCE);
  }
  return {
    postcode: r.postcode,
    latitude: r.latitude,
    longitude: r.longitude,
    country: r.country,
    region: r.region,
    adminDistrict: r.admin_district,
    adminWard: r.admin_ward,
    parish: r.parish,
    constituency: r.parliamentary_constituency_2024 ?? r.parliamentary_constituency,
    lsoa: r.lsoa,
    ruralUrban: r.ruc21 ?? r.ruc11 ?? null,
    policeForce: r.pfa ?? null,
    deprivation: deprivationFor(r.country, r.index_of_multiple_deprivation),
  };
}

export function lookupPostcode(postcode: string): Promise<AreaProfile> {
  const pc = normalisePostcode(postcode);
  if (!pc) return Promise.reject(new UpstreamError("That doesn't look like a UK postcode", 400, SOURCE));

  return cache.getOrLoad(`postcode:${pc}`, 7 * DAY, async () => {
    try {
      const data = await fetchJson<Envelope<PostcodeResult>>(
        `${BASE}/postcodes/${encodeURIComponent(pc)}`,
        { source: SOURCE },
      );
      return toAreaProfile(data.result);
    } catch (err) {
      if (err instanceof UpstreamError && err.status === 404) {
        throw new UpstreamError(`We couldn't find the postcode ${pc}`, 404, SOURCE);
      }
      throw err;
    }
  });
}

/** Postcodes closest to a point, nearest first (includes the point's own postcode). */
export function nearbyPostcodes(lat: number, lon: number, radiusM = 400, limit = 12): Promise<string[]> {
  const key = `nearby:${lat.toFixed(5)},${lon.toFixed(5)}:${radiusM}:${limit}`;
  return cache.getOrLoad(key, 7 * DAY, async () => {
    const data = await fetchJson<Envelope<PostcodeResult[] | null>>(
      `${BASE}/postcodes?lat=${lat}&lon=${lon}&radius=${radiusM}&limit=${limit}`,
      { source: SOURCE },
    );
    return (data.result ?? []).map((r) => r.postcode);
  });
}

function placeDetail(p: PlaceResult): string {
  return [p.local_type, p.district_borough ?? p.county_unitary, p.region ?? p.country]
    .filter((part, i, all) => part && all.indexOf(part) === i)
    .join(" · ");
}

export async function search(query: string): Promise<SearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  return cache.getOrLoad(`search:${q.toLowerCase()}`, HOUR, async () => {
    const full = normalisePostcode(q);
    if (full) {
      try {
        const area = await lookupPostcode(full);
        return [postcodeResult(area.postcode, [area.adminWard, area.adminDistrict])];
      } catch (err) {
        if (err instanceof UpstreamError && err.status === 404) return [];
        throw err;
      }
    }

    const looksLikePostcode = /^[a-z]{1,2}\d/i.test(q);
    if (looksLikePostcode) {
      const data = await fetchJson<Envelope<string[] | null>>(
        `${BASE}/postcodes/${encodeURIComponent(q)}/autocomplete?limit=8`,
        { source: SOURCE },
      );
      if (data.result?.length) return data.result.map((pc) => postcodeResult(pc, ["Postcode"]));
    }

    return searchPlaces(q);
  });
}

function postcodeResult(postcode: string, detail: (string | null)[]): SearchResult {
  return {
    id: `pc:${postcode}`,
    label: postcode,
    detail: detail.filter(Boolean).join(", ") || "Postcode",
    kind: "postcode",
    postcode,
  };
}

async function searchPlaces(q: string): Promise<SearchResult[]> {
  const places = await fetchJson<Envelope<PlaceResult[] | null>>(
    `${BASE}/places?q=${encodeURIComponent(q)}&limit=8`,
    { source: SOURCE },
  );
  const list = places.result ?? [];
  if (list.length === 0) return [];

  // Resolve every place to its nearest postcode in one bulk request.
  const reverse = await fetchJson<
    Envelope<{ result: PostcodeResult[] | null }[]>
  >(`${BASE}/postcodes`, {
    source: SOURCE,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      geolocations: list.map((p) => ({
        latitude: p.latitude,
        longitude: p.longitude,
        radius: 2000,
        limit: 1,
      })),
    }),
  });

  return list.flatMap((place, i): SearchResult[] => {
    const postcode = reverse.result[i]?.result?.[0]?.postcode;
    if (!postcode) return [];
    return [
      {
        id: `place:${place.code}`,
        label: place.name_1,
        detail: placeDetail(place),
        kind: "place",
        postcode,
      },
    ];
  });
}
