import type { FloodArea, FloodReport, FloodWarning } from "../../shared/types.ts";
import { cache, DAY, MINUTE } from "../lib/cache.ts";
import { fetchJson } from "../lib/http.ts";

const BASE = process.env.FLOOD_API_URL ?? "https://environment.data.gov.uk/flood-monitoring";
const SOURCE = "Environment Agency";
const AREA_RADIUS_KM = 1;
const WARNING_RADIUS_KM = 5;

interface EaFloodArea {
  notation: string;
  label?: string;
  description?: string;
  riverOrSea?: string;
}

interface EaFlood {
  floodAreaID: string;
  description?: string;
  severity?: string;
  severityLevel?: number;
  message?: string;
  timeRaised?: string;
}

/** EA codes look like "063FWT23Islewrth" (warning area) or "063WAT231N" (alert area). */
export function floodAreaKind(notation: string): FloodArea["kind"] {
  return /^\d{3}FW/i.test(notation) ? "warning" : "alert";
}

export function toFloodArea(a: EaFloodArea): FloodArea {
  return {
    id: a.notation,
    label: a.label ?? a.description ?? a.notation,
    kind: floodAreaKind(a.notation),
    riverOrSea: a.riverOrSea ?? null,
  };
}

export function toFloodWarning(f: EaFlood): FloodWarning {
  return {
    id: f.floodAreaID,
    area: f.description ?? f.floodAreaID,
    severity: f.severity ?? "Flood alert",
    severityLevel: f.severityLevel ?? 3,
    message: (f.message ?? "").replace(/\u00a0/g, " ").trim(),
    timeRaised: f.timeRaised ?? null,
  };
}

export async function floodReport(lat: number, lon: number, country: string): Promise<FloodReport> {
  // The Environment Agency only covers England; Wales, Scotland and NI have their own agencies.
  if (country !== "England") return { covered: false, activeWarnings: [], floodAreas: [] };

  const coords = `lat=${lat.toFixed(5)}&long=${lon.toFixed(5)}`;
  const [areas, floods] = await Promise.all([
    cache.getOrLoad(`flood-areas:${coords}`, 7 * DAY, () =>
      fetchJson<{ items: EaFloodArea[] }>(`${BASE}/id/floodAreas?${coords}&dist=${AREA_RADIUS_KM}`, {
        source: SOURCE,
      }),
    ),
    cache.getOrLoad(`floods:${coords}`, 5 * MINUTE, () =>
      fetchJson<{ items: EaFlood[] }>(`${BASE}/id/floods?${coords}&dist=${WARNING_RADIUS_KM}`, {
        source: SOURCE,
      }),
    ),
  ]);

  return {
    covered: true,
    floodAreas: areas.items
      .map(toFloodArea)
      .sort((a, b) => (a.kind === b.kind ? a.label.localeCompare(b.label) : a.kind === "warning" ? -1 : 1)),
    activeWarnings: floods.items
      .map(toFloodWarning)
      .filter((w) => w.severityLevel < 4)
      .sort((a, b) => a.severityLevel - b.severityLevel),
  };
}
