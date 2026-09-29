import type { PriceReport, PriceStats, PropertyType, Sale } from "../../shared/types.ts";
import { cache, DAY } from "../lib/cache.ts";
import { fetchJson } from "../lib/http.ts";
import { median } from "../lib/geo.ts";

const BASE = process.env.LAND_REGISTRY_API_URL ?? "https://landregistry.data.gov.uk";
const SOURCE = "HM Land Registry";
export const YEARS_OF_HISTORY = 5;
const MAX_SALES_RETURNED = 150;

interface Resource {
  _about?: string;
}

export interface LrTransaction {
  transactionDate?: string;
  pricePaid?: number;
  newBuild?: boolean;
  propertyAddress?: {
    saon?: string;
    paon?: string;
    street?: string;
    town?: string;
    postcode?: string;
  };
  propertyType?: Resource;
  estateType?: Resource;
  recordStatus?: Resource;
  transactionCategory?: Resource;
}

const MONTHS: Record<string, string> = {
  Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
  Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
};

/** Converts Land Registry's "Fri, 31 Oct 2025" dates to "2025-10-31". */
export function parseLrDate(value: string): string | null {
  const m = value.match(/(\d{1,2}) (\w{3}) (\d{4})/);
  if (m && MONTHS[m[2]]) return `${m[3]}-${MONTHS[m[2]]}-${m[1].padStart(2, "0")}`;
  const iso = value.match(/^\d{4}-\d{2}-\d{2}/);
  return iso ? iso[0] : null;
}

const lastSegment = (r?: Resource) => r?._about?.split("/").pop() ?? "";

const PROPERTY_TYPES: PropertyType[] = ["detached", "semi-detached", "terraced", "flat-maisonette"];

const titleCase = (s: string) => s.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());

export function toSale(t: LrTransaction): Sale | null {
  if (lastSegment(t.recordStatus) === "delete") return null;
  // Category B covers repossessions, transfers to companies and similar non-market sales.
  if (t.transactionCategory && !lastSegment(t.transactionCategory).startsWith("standard")) return null;
  if (typeof t.pricePaid !== "number" || !t.transactionDate) return null;
  const date = parseLrDate(t.transactionDate);
  if (!date) return null;

  const a = t.propertyAddress ?? {};
  const type = lastSegment(t.propertyType) as PropertyType;
  const tenure = lastSegment(t.estateType);
  return {
    date,
    price: t.pricePaid,
    address: titleCase([a.saon, a.paon, a.street].filter(Boolean).join(", ")),
    postcode: a.postcode ?? "",
    propertyType: PROPERTY_TYPES.includes(type) ? type : "other",
    newBuild: Boolean(t.newBuild),
    tenure: tenure === "freehold" || tenure === "leasehold" ? tenure : "unknown",
  };
}

export function priceStats(sales: Sale[]): PriceStats {
  const prices = sales.map((s) => s.price);

  const group = <K>(keyOf: (s: Sale) => K) => {
    const groups = new Map<K, number[]>();
    for (const s of sales) {
      const k = keyOf(s);
      groups.set(k, [...(groups.get(k) ?? []), s.price]);
    }
    return groups;
  };

  const byType = [...group((s) => s.propertyType).entries()]
    .map(([type, p]) => ({ type, count: p.length, median: median(p)! }))
    .sort((a, b) => b.count - a.count);

  const byYear = [...group((s) => Number(s.date.slice(0, 4))).entries()]
    .map(([year, p]) => ({ year, count: p.length, median: median(p)! }))
    .sort((a, b) => a.year - b.year);

  return {
    count: sales.length,
    median: median(prices),
    mean: prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : null,
    min: prices.length ? Math.min(...prices) : null,
    max: prices.length ? Math.max(...prices) : null,
    byType,
    byYear,
  };
}

function salesForPostcode(postcode: string, since: string): Promise<Sale[]> {
  return cache.getOrLoad(`lr:${postcode}:${since}`, DAY, async () => {
    const params = new URLSearchParams({
      "propertyAddress.postcode": postcode,
      "min-transactionDate": since,
      _pageSize: "200",
      _sort: "-transactionDate",
    });
    const data = await fetchJson<{ result: { items: LrTransaction[] } }>(
      `${BASE}/data/ppi/transaction-record.json?${params}`,
      { source: SOURCE, timeoutMs: 20_000 },
    );
    return data.result.items.flatMap((t) => toSale(t) ?? []);
  });
}

export async function priceReport(postcodes: string[], now = new Date()): Promise<PriceReport> {
  const sinceYear = now.getUTCFullYear() - YEARS_OF_HISTORY;
  const since = `${sinceYear}-01-01`;
  const results = await Promise.allSettled(postcodes.map((pc) => salesForPostcode(pc, since)));

  const failures = results.filter((r) => r.status === "rejected");
  if (failures.length === results.length && failures.length > 0) {
    throw (failures[0] as PromiseRejectedResult).reason;
  }

  const sales = results
    .flatMap((r) => (r.status === "fulfilled" ? r.value : []))
    .sort((a, b) => b.date.localeCompare(a.date) || b.price - a.price);

  return {
    sinceYear,
    postcodesSearched: postcodes,
    stats: priceStats(sales),
    sales: sales.slice(0, MAX_SALES_RETURNED),
  };
}
