import type { AreaProfile } from "../../shared/types.ts";
import { DecileScale } from "../components/Charts.tsx";
import { formatNumber, ordinal } from "../lib/format.ts";

export function deprivationSummary(decile: number): string {
  if (decile <= 2) return "among the most deprived neighbourhoods";
  if (decile <= 4) return "more deprived than average";
  if (decile <= 6) return "around the middle";
  if (decile <= 8) return "less deprived than average";
  return "among the least deprived neighbourhoods";
}

export function AreaSection({ area }: { area: AreaProfile }) {
  const rows: [string, string | null][] = [
    ["Council", area.adminDistrict],
    ["Ward", area.adminWard],
    ["Parish", area.parish?.endsWith("unparished area") ? null : area.parish],
    ["Parliamentary constituency", area.constituency],
    ["Region", area.region ?? area.country],
    ["Police force", area.policeForce],
    ["Setting", area.ruralUrban?.replace(/^\(England\/Wales\)\s*/, "") ?? null],
    ["Neighbourhood (LSOA)", area.lsoa],
  ];
  const d = area.deprivation;

  return (
    <section className="card section" id="area" aria-labelledby="area-title">
      <header className="section__header">
        <h2 id="area-title">
          <span className="section__icon" aria-hidden="true">
            🏘️
          </span>
          About the area
        </h2>
      </header>
      <div className="section__body">
        {d ? (
          <div className="deprivation">
            <h3>Deprivation</h3>
            <p>
              This neighbourhood is in the <strong>{ordinal(d.decile)} decile</strong> –{" "}
              {deprivationSummary(d.decile)} in {area.country}. It ranks {formatNumber(d.rank)} of{" "}
              {formatNumber(d.outOf)}, where 1 is the most deprived.
            </p>
            <DecileScale decile={d.decile} />
            <p className="footnote">
              The index combines income, employment, education, health, crime, housing and living environment.
            </p>
          </div>
        ) : (
          <p className="muted">No deprivation index is published for this postcode.</p>
        )}
        <dl className="facts">
          {rows
            .filter((r): r is [string, string] => Boolean(r[1]))
            .map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
        </dl>
      </div>
      <footer className="section__source">
        Source:{" "}
        <a href="https://postcodes.io/" target="_blank" rel="noreferrer">
          postcodes.io
        </a>{" "}
        (ONS Postcode Directory &amp; Indices of Deprivation, OGL)
      </footer>
    </section>
  );
}
