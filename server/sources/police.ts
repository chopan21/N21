import type { CategoryCount, CrimeReport } from "../../shared/types.ts";
import { labelFor } from "../../shared/crimeLabels.ts";
import { cache, HOUR } from "../lib/cache.ts";
import { fetchJson, UpstreamError } from "../lib/http.ts";

const BASE = process.env.POLICE_API_URL ?? "https://data.police.uk/api";
const SOURCE = "data.police.uk";
const TREND_MONTHS = 6;
const MAX_POINTS = 600;

export interface StreetCrime {
  category: string;
  month: string;
  location: { latitude: string; longitude: string; street?: { name?: string } } | null;
}

export function summariseCrimes(crimes: StreetCrime[]): CategoryCount[] {
  const counts = new Map<string, number>();
  for (const c of crimes) counts.set(c.category, (counts.get(c.category) ?? 0) + 1);
  return [...counts.entries()]
    .map(([category, count]) => ({ category, label: labelFor(category), count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

/** Returns `count` months ending at `latest` (YYYY-MM), oldest first. */
export function previousMonths(latest: string, count: number): string[] {
  const [y, m] = latest.split("-").map(Number);
  const months: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    months.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return months;
}

function latestMonth(): Promise<string> {
  return cache.getOrLoad("police:latest", 6 * HOUR, async () => {
    const dates = await fetchJson<{ date: string }[]>(`${BASE}/crimes-street-dates`, { source: SOURCE });
    const latest = dates.map((d) => d.date).sort().at(-1);
    if (!latest) throw new UpstreamError("No crime data has been published yet", 502, SOURCE);
    return latest;
  });
}

function crimesFor(lat: number, lon: number, month: string): Promise<StreetCrime[]> {
  const key = `police:${lat.toFixed(4)},${lon.toFixed(4)}:${month}`;
  return cache.getOrLoad(key, 12 * HOUR, async () => {
    try {
      return await fetchJson<StreetCrime[]>(
        `${BASE}/crimes-street/all-crime?lat=${lat}&lng=${lon}&date=${month}`,
        { source: SOURCE, timeoutMs: 25_000 },
      );
    } catch (err) {
      // The police API returns 503 when a mile-radius search exceeds 10,000 crimes.
      if (err instanceof UpstreamError && err.status === 503) {
        throw new UpstreamError("Too many crimes recorded here for police.uk to return", 502, SOURCE);
      }
      throw err;
    }
  });
}

export async function crimeReport(lat: number, lon: number): Promise<CrimeReport> {
  const latest = await latestMonth();
  const months = previousMonths(latest, TREND_MONTHS);
  const results = await Promise.allSettled(months.map((m) => crimesFor(lat, lon, m)));

  const current = results.at(-1)!;
  if (current.status === "rejected") throw current.reason;
  const crimes = current.value;

  const trend = months.flatMap((month, i) => {
    const r = results[i];
    return r.status === "fulfilled" ? [{ month, total: r.value.length }] : [];
  });

  const points = crimes.flatMap((c) =>
    c.location
      ? [
          {
            lat: Number(c.location.latitude),
            lng: Number(c.location.longitude),
            category: c.category,
            street: c.location.street?.name ?? "",
          },
        ]
      : [],
  );

  return {
    month: latest,
    total: crimes.length,
    byCategory: summariseCrimes(crimes),
    trend,
    points: points.slice(0, MAX_POINTS),
  };
}
