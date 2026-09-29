import type {
  AirQualityReport,
  AmenityReport,
  AreaProfile,
  CrimeReport,
  FloodReport,
  PriceReport,
} from "../../shared/types.ts";
import type { ApiState } from "../lib/api.ts";
import { formatDistance, formatMonth, formatNumber, formatPriceShort, ordinal } from "../lib/format.ts";

interface Props {
  area: AreaProfile;
  prices: ApiState<PriceReport>;
  crime: ApiState<CrimeReport>;
  flood: ApiState<FloodReport>;
  amenities: ApiState<AmenityReport>;
  air: ApiState<AirQualityReport>;
}

type Tone = "good" | "ok" | "bad" | "neutral";

function Tile({ href, label, state, value, hint, tone = "neutral" }: {
  href: string;
  label: string;
  state: ApiState<unknown>;
  value?: string;
  hint?: string;
  tone?: Tone;
}) {
  return (
    <a href={href} className={`glance__tile glance__tile--${tone}`}>
      <span className="glance__label">{label}</span>
      {state.status === "loading" && <span className="glance__value glance__value--loading">Loading…</span>}
      {state.status === "error" && <span className="glance__value glance__value--muted">Unavailable</span>}
      {state.status === "success" && (
        <>
          <span className="glance__value">{value}</span>
          {hint && <span className="glance__hint">{hint}</span>}
        </>
      )}
    </a>
  );
}

export function AtAGlance({ area, prices, crime, flood, amenities, air }: Props) {
  const d = area.deprivation;
  const station = amenities.data?.summary.find((s) => s.category === "station")?.nearest;
  const schools = amenities.data?.summary.find((s) => s.category === "school")?.count ?? 0;
  const warnings = flood.data?.activeWarnings.length ?? 0;
  const warningAreas = flood.data?.floodAreas.filter((a) => a.kind === "warning").length ?? 0;
  const aqi = air.data?.europeanAqi ?? null;

  const floodValue = !flood.data?.covered
    ? "Not covered"
    : warnings > 0
      ? `${warnings} active alert${warnings > 1 ? "s" : ""}`
      : warningAreas > 0
        ? "Near a warning area"
        : "No warning areas";
  const floodTone: Tone = !flood.data?.covered ? "neutral" : warnings > 0 ? "bad" : warningAreas > 0 ? "ok" : "good";

  return (
    <div className="glance" aria-label="At a glance">
      <Tile
        href="#prices"
        label="Median sold price"
        state={prices}
        value={prices.data?.stats.count ? formatPriceShort(prices.data.stats.median) : "No sales"}
        hint={prices.data?.stats.count ? `${prices.data.stats.count} sales since ${prices.data.sinceYear}` : undefined}
      />
      <Tile
        href="#crime"
        label="Crimes within 1 mile"
        state={crime}
        value={formatNumber(crime.data?.total)}
        hint={crime.data ? formatMonth(crime.data.month) : undefined}
      />
      <Tile
        href="#area"
        label="Deprivation decile"
        state={{ status: "success", data: d }}
        value={d ? `${ordinal(d.decile)} of 10` : "n/a"}
        hint={d ? "10th = least deprived" : undefined}
        tone={!d ? "neutral" : d.decile >= 7 ? "good" : d.decile >= 4 ? "ok" : "bad"}
      />
      <Tile href="#flood" label="Flood risk" state={flood} value={floodValue} tone={floodTone} />
      <Tile
        href="#amenities"
        label="Nearest station"
        state={amenities}
        value={station ? station.name : "None nearby"}
        hint={station ? formatDistance(station.distanceM) : `${schools} schools within 1.2 km`}
      />
      <Tile
        href="#air"
        label="Air quality now"
        state={air}
        value={air.data ? `${air.data.band}${aqi != null ? ` (${aqi})` : ""}` : undefined}
        tone={aqi == null ? "neutral" : aqi <= 40 ? "good" : aqi <= 60 ? "ok" : "bad"}
      />
    </div>
  );
}
