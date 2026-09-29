import type { AirQualityReport } from "../../shared/types.ts";
import type { ApiState } from "../lib/api.ts";
import { Section } from "../components/Section.tsx";

interface Props {
  state: ApiState<AirQualityReport> & { retry: () => void };
}

const fmt = (n: number | null) => (n == null ? "–" : n.toFixed(1));

export function AirSection({ state }: Props) {
  return (
    <Section
      id="air"
      title="Air quality now"
      icon="🌬️"
      state={state}
      source={
        <a href="https://open-meteo.com/en/docs/air-quality-api" target="_blank" rel="noreferrer">
          Open-Meteo / Copernicus CAMS (CC BY 4.0)
        </a>
      }
    >
      {(data) => (
        <>
          <div className="aqi">
            <span className={`aqi__badge aqi__badge--${data.band.toLowerCase().replace(/\s+/g, "-")}`}>
              {data.europeanAqi ?? "–"}
            </span>
            <div>
              <strong>{data.band}</strong>
              <span className="muted"> on the European Air Quality Index</span>
            </div>
          </div>
          <dl className="pollutants">
            <div>
              <dt>PM2.5</dt>
              <dd>{fmt(data.pm2_5)} µg/m³</dd>
            </div>
            <div>
              <dt>PM10</dt>
              <dd>{fmt(data.pm10)} µg/m³</dd>
            </div>
            <div>
              <dt>NO₂</dt>
              <dd>{fmt(data.no2)} µg/m³</dd>
            </div>
            <div>
              <dt>Ozone</dt>
              <dd>{fmt(data.o3)} µg/m³</dd>
            </div>
          </dl>
          <p className="footnote">
            Modelled hourly estimate for this location. Busy roads can be noticeably worse than the model suggests.
          </p>
        </>
      )}
    </Section>
  );
}
