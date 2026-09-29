import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type {
  AirQualityReport,
  AmenityCategory,
  AmenityReport,
  AreaProfile,
  CrimeReport,
  FloodReport,
  PriceReport,
} from "../../shared/types.ts";
import { areaUrl, useApiMany, type ApiState } from "../lib/api.ts";
import { formatDistance, formatNumber, formatPrice, ordinal, PROPERTY_TYPE_LABELS } from "../lib/format.ts";
import { useShortlist } from "../lib/shortlist.ts";
import { areaPath, SearchBox } from "../components/SearchBox.tsx";

function useSection<T>(postcodes: string[], section?: string) {
  const urls = postcodes.map((pc) => areaUrl(pc, section));
  const states = useApiMany<T>(urls);
  return (pc: string): ApiState<T> => states[areaUrl(pc, section)] ?? { status: "loading" };
}

function cell<T>(state: ApiState<T>, render: (data: T) => ReactNode): ReactNode {
  if (state.status === "loading") return <span className="muted">…</span>;
  if (state.status === "error") return <span className="muted">Unavailable</span>;
  return render(state.data);
}

const nearest = (a: AmenityReport, c: AmenityCategory) => {
  const n = a.summary.find((s) => s.category === c)?.nearest;
  return n ? (
    <>
      {n.name}
      <span className="muted block">{formatDistance(n.distanceM)}</span>
    </>
  ) : (
    <span className="muted">None within 1.2 km</span>
  );
};
const count = (a: AmenityReport, c: AmenityCategory) => a.summary.find((s) => s.category === c)?.count ?? 0;

export function ComparePage() {
  const shortlist = useShortlist();
  const postcodes = shortlist.items.map((i) => i.postcode);

  const area = useSection<AreaProfile>(postcodes);
  const prices = useSection<PriceReport>(postcodes, "prices");
  const crime = useSection<CrimeReport>(postcodes, "crime");
  const flood = useSection<FloodReport>(postcodes, "flood");
  const amenities = useSection<AmenityReport>(postcodes, "amenities");
  const air = useSection<AirQualityReport>(postcodes, "air");

  if (postcodes.length === 0) {
    return (
      <div className="container page">
        <div className="card empty-state">
          <h1>Your shortlist is empty</h1>
          <p>
            Search for an area and press <strong>Add to shortlist</strong> to compare neighbourhoods side by side.
          </p>
          <SearchBox size="compact" autoFocus />
        </div>
      </div>
    );
  }

  const rows: { group?: string; label: string; render: (pc: string) => ReactNode }[] = [
    { group: "Property", label: "Median sold price", render: (pc) => cell(prices(pc), (p) => (p.stats.count ? formatPrice(p.stats.median) : "No sales")) },
    { label: "Sales recorded", render: (pc) => cell(prices(pc), (p) => `${p.stats.count} since ${p.sinceYear}`) },
    {
      label: "Most common type",
      render: (pc) =>
        cell(prices(pc), (p) => {
          const top = p.stats.byType[0];
          return top ? `${PROPERTY_TYPE_LABELS[top.type]} (${top.count})` : "–";
        }),
    },
    { group: "Safety & environment", label: "Crimes within 1 mile (latest month)", render: (pc) => cell(crime(pc), (c) => formatNumber(c.total)) },
    { label: "Top crime type", render: (pc) => cell(crime(pc), (c) => c.byCategory[0]?.label ?? "–") },
    {
      label: "Flood",
      render: (pc) =>
        cell(flood(pc), (f) => {
          if (!f.covered) return <span className="muted">Not covered by EA</span>;
          const areas = f.floodAreas.filter((a) => a.kind === "warning").length;
          if (f.activeWarnings.length) return <span className="text-bad">{f.activeWarnings.length} active alerts</span>;
          return areas ? `${areas} warning area${areas > 1 ? "s" : ""} within 1 km` : <span className="text-good">No warning areas</span>;
        }),
    },
    { label: "Air quality now", render: (pc) => cell(air(pc), (a) => `${a.band}${a.europeanAqi != null ? ` (${a.europeanAqi})` : ""}`) },
    {
      label: "Deprivation decile",
      render: (pc) => cell(area(pc), (a) => (a.deprivation ? `${ordinal(a.deprivation.decile)} of 10` : "n/a")),
    },
    { group: "Within a 15-minute walk", label: "Nearest station", render: (pc) => cell(amenities(pc), (a) => nearest(a, "station")) },
    { label: "Nearest GP", render: (pc) => cell(amenities(pc), (a) => nearest(a, "gp")) },
    { label: "Nearest supermarket", render: (pc) => cell(amenities(pc), (a) => nearest(a, "supermarket")) },
    { label: "Schools", render: (pc) => cell(amenities(pc), (a) => count(a, "school")) },
    { label: "Parks & green spaces", render: (pc) => cell(amenities(pc), (a) => count(a, "park")) },
    { label: "Cafés, pubs & restaurants", render: (pc) => cell(amenities(pc), (a) => count(a, "food_drink")) },
    { label: "Bus stops", render: (pc) => cell(amenities(pc), (a) => count(a, "bus_stop")) },
  ];

  return (
    <div className="container page">
      <div className="report-header">
        <div>
          <p className="eyebrow">Shortlist</p>
          <h1>Compare neighbourhoods</h1>
          <p className="muted">Side-by-side open data for the areas you've saved on this device.</p>
        </div>
        <div className="report-header__actions">
          <SearchBox size="compact" />
        </div>
      </div>

      <div className="card table-wrap">
        <table className="table compare">
          <thead>
            <tr>
              <th scope="col" className="compare__metric">
                <span className="visually-hidden">Metric</span>
              </th>
              {shortlist.items.map((item) => (
                <th scope="col" key={item.postcode}>
                  <Link to={areaPath(item.postcode)} className="compare__area">
                    {item.label}
                    <span className="muted block">{item.postcode}</span>
                  </Link>
                  <button
                    className="btn btn--link"
                    onClick={() => shortlist.remove(item.postcode)}
                    aria-label={`Remove ${item.label} from shortlist`}
                  >
                    Remove
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <FragmentRows key={row.label} group={row.group} colSpan={postcodes.length + 1}>
                <tr>
                  <th scope="row" className="compare__metric">
                    {row.label}
                  </th>
                  {postcodes.map((pc) => (
                    <td key={pc}>{row.render(pc)}</td>
                  ))}
                </tr>
              </FragmentRows>
            ))}
          </tbody>
        </table>
      </div>
      {shortlist.items.length > 0 && (
        <button className="btn btn--ghost" onClick={shortlist.clear}>
          Clear shortlist
        </button>
      )}
    </div>
  );
}

function FragmentRows({ group, colSpan, children }: { group?: string; colSpan: number; children: ReactNode }) {
  return (
    <>
      {group && (
        <tr className="compare__group">
          <th colSpan={colSpan} scope="colgroup">
            {group}
          </th>
        </tr>
      )}
      {children}
    </>
  );
}
