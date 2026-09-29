const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });
const compactGbp = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  notation: "compact",
  maximumFractionDigits: 1,
});
const number = new Intl.NumberFormat("en-GB");

export const formatPrice = (n: number | null | undefined) => (n == null ? "–" : gbp.format(n));
export const formatPriceShort = (n: number | null | undefined) => (n == null ? "–" : compactGbp.format(n));
export const formatNumber = (n: number | null | undefined) => (n == null ? "–" : number.format(n));

export function formatMonth(yyyyMm: string, style: "long" | "short" = "long"): string {
  const [y, m] = yyyyMm.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", {
    month: style,
    year: style === "long" ? "numeric" : "2-digit",
    timeZone: "UTC",
  });
}

export function formatDate(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Distance plus an approximate walking time at 80 m/min (about 3 mph). */
export function formatDistance(metres: number): string {
  const walk = Math.max(1, Math.round(metres / 80));
  const dist = metres < 1000 ? `${Math.round(metres / 10) * 10} m` : `${(metres / 1000).toFixed(1)} km`;
  return `${dist} · ${walk} min walk`;
}

export const PROPERTY_TYPE_LABELS: Record<string, string> = {
  detached: "Detached",
  "semi-detached": "Semi-detached",
  terraced: "Terraced",
  "flat-maisonette": "Flat / maisonette",
  other: "Other",
};

export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
