import type { AirQualityReport } from "../../shared/types.ts";
import { cache, MINUTE } from "../lib/cache.ts";
import { fetchJson } from "../lib/http.ts";

const BASE = process.env.AIR_QUALITY_API_URL ?? "https://air-quality-api.open-meteo.com/v1/air-quality";
const SOURCE = "Open-Meteo Air Quality";

interface OpenMeteoResponse {
  current?: {
    time: string;
    european_aqi?: number | null;
    pm2_5?: number | null;
    pm10?: number | null;
    nitrogen_dioxide?: number | null;
    ozone?: number | null;
  };
}

/** European Air Quality Index bands, as published by the European Environment Agency. */
export function aqiBand(aqi: number | null): string {
  if (aqi == null) return "Unknown";
  if (aqi <= 20) return "Good";
  if (aqi <= 40) return "Fair";
  if (aqi <= 60) return "Moderate";
  if (aqi <= 80) return "Poor";
  if (aqi <= 100) return "Very poor";
  return "Extremely poor";
}

export function airQualityReport(lat: number, lon: number): Promise<AirQualityReport> {
  const key = `air:${lat.toFixed(2)},${lon.toFixed(2)}`;
  return cache.getOrLoad(key, 30 * MINUTE, async () => {
    const params = new URLSearchParams({
      latitude: lat.toFixed(4),
      longitude: lon.toFixed(4),
      current: "european_aqi,pm2_5,pm10,nitrogen_dioxide,ozone",
      timezone: "Europe/London",
    });
    const data = await fetchJson<OpenMeteoResponse>(`${BASE}?${params}`, { source: SOURCE });
    const c = data.current;
    const aqi = c?.european_aqi ?? null;
    return {
      time: c?.time ?? new Date().toISOString(),
      europeanAqi: aqi,
      band: aqiBand(aqi),
      pm2_5: c?.pm2_5 ?? null,
      pm10: c?.pm10 ?? null,
      no2: c?.nitrogen_dioxide ?? null,
      o3: c?.ozone ?? null,
    };
  });
}
