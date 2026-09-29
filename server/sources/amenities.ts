import type { Amenity, AmenityCategory, AmenityReport } from "../../shared/types.ts";
import { cache, DAY } from "../lib/cache.ts";
import { fetchJson, UpstreamError } from "../lib/http.ts";
import { distanceMetres } from "../lib/geo.ts";

const SOURCE = "OpenStreetMap (Overpass)";
const ENDPOINTS = (
  process.env.OVERPASS_URLS ??
  "https://overpass-api.de/api/interpreter,https://overpass.private.coffee/api/interpreter"
).split(",");

/** Roughly a 15-minute walk. */
export const AMENITY_RADIUS_M = 1200;

export const AMENITY_LABELS: Record<AmenityCategory, string> = {
  school: "Schools",
  nursery: "Nurseries",
  gp: "GP surgeries",
  dentist: "Dentists",
  pharmacy: "Pharmacies",
  hospital: "Hospitals",
  supermarket: "Supermarkets",
  convenience: "Convenience shops",
  station: "Train, tube & tram stations",
  bus_stop: "Bus stops",
  park: "Parks",
  playground: "Playgrounds",
  food_drink: "Cafés, pubs & restaurants",
  gym: "Gyms & sports centres",
  library: "Libraries",
};

export interface OsmElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

export function classify(tags: Record<string, string>): AmenityCategory | null {
  const { amenity, shop, leisure, railway, station, healthcare, highway, public_transport } = tags;
  if (amenity === "school") return "school";
  if (amenity === "kindergarten" || amenity === "childcare") return "nursery";
  if (amenity === "doctors" || healthcare === "doctor") return "gp";
  if (amenity === "dentist" || healthcare === "dentist") return "dentist";
  if (amenity === "pharmacy" || healthcare === "pharmacy") return "pharmacy";
  if (amenity === "hospital" || healthcare === "hospital") return "hospital";
  if (shop === "supermarket") return "supermarket";
  if (shop === "convenience") return "convenience";
  if (railway === "station" || railway === "halt" || station === "subway" || railway === "tram_stop")
    return "station";
  if (highway === "bus_stop" || (public_transport === "platform" && tags.bus === "yes")) return "bus_stop";
  if (leisure === "park" || leisure === "nature_reserve" || leisure === "garden") return "park";
  if (leisure === "playground") return "playground";
  if (amenity === "cafe" || amenity === "restaurant" || amenity === "pub" || amenity === "bar")
    return "food_drink";
  if (leisure === "fitness_centre" || leisure === "sports_centre") return "gym";
  if (amenity === "library") return "library";
  return null;
}

export function buildQuery(lat: number, lon: number, radius: number): string {
  const around = `(around:${radius},${lat},${lon})`;
  const filters = [
    `nwr["amenity"~"^(school|kindergarten|childcare|doctors|dentist|pharmacy|hospital|cafe|restaurant|pub|bar|library)$"]`,
    `nwr["healthcare"~"^(doctor|dentist|pharmacy|hospital)$"]`,
    `nwr["shop"~"^(supermarket|convenience)$"]`,
    `nwr["railway"~"^(station|halt|tram_stop)$"]`,
    `node["highway"="bus_stop"]`,
    `nwr["leisure"~"^(park|nature_reserve|garden|playground|fitness_centre|sports_centre)$"]`,
  ];
  return `[out:json][timeout:25];(${filters.map((f) => f + around + ";").join("")});out center tags 3000;`;
}

const UNNAMED: Partial<Record<AmenityCategory, string>> = {
  bus_stop: "Bus stop",
  park: "Green space",
  playground: "Playground",
};

export function toAmenities(elements: OsmElement[], lat: number, lon: number): Amenity[] {
  const seen = new Set<string>();
  const out: Amenity[] = [];
  for (const el of elements) {
    const tags = el.tags ?? {};
    const category = classify(tags);
    const pLat = el.lat ?? el.center?.lat;
    const pLon = el.lon ?? el.center?.lon;
    if (!category || pLat == null || pLon == null) continue;

    const name = tags.name ?? UNNAMED[category];
    if (!name) continue;

    const distanceM = Math.round(distanceMetres(lat, lon, pLat, pLon));
    // The same place is often mapped as both a node and a building outline.
    const dedupeKey = `${category}:${name.toLowerCase()}:${Math.round(distanceM / 100)}`;
    if (category !== "bus_stop" && seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    out.push({ id: `${el.type}/${el.id}`, name, category, lat: pLat, lon: pLon, distanceM });
  }
  return out.sort((a, b) => a.distanceM - b.distanceM);
}

export function summariseAmenities(places: Amenity[]) {
  return (Object.keys(AMENITY_LABELS) as AmenityCategory[]).map((category) => {
    const inCategory = places.filter((p) => p.category === category);
    return {
      category,
      label: AMENITY_LABELS[category],
      count: inCategory.length,
      nearest: inCategory[0] ?? null,
    };
  });
}

async function overpass(query: string): Promise<OsmElement[]> {
  let lastError: unknown;
  for (const url of ENDPOINTS) {
    try {
      const data = await fetchJson<{ elements: OsmElement[] }>(url, {
        source: SOURCE,
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(query)}`,
        timeoutMs: 30_000,
      });
      return data.elements;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError ?? new UpstreamError("No Overpass endpoint configured", 502, SOURCE);
}

export function amenityReport(lat: number, lon: number): Promise<AmenityReport> {
  const key = `amenities:${lat.toFixed(4)},${lon.toFixed(4)}`;
  return cache.getOrLoad(key, 7 * DAY, async () => {
    const elements = await overpass(buildQuery(lat, lon, AMENITY_RADIUS_M));
    const places = toAmenities(elements, lat, lon);
    return {
      radiusM: AMENITY_RADIUS_M,
      summary: summariseAmenities(places),
      // Bus stops are numerous and add little on the map beyond the count.
      places: places.filter((p) => p.category !== "bus_stop"),
    };
  });
}
