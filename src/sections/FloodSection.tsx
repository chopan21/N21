import type { AreaProfile, FloodReport } from "../../shared/types.ts";
import type { ApiState } from "../lib/api.ts";
import { Section } from "../components/Section.tsx";

interface Props {
  area: AreaProfile;
  state: ApiState<FloodReport> & { retry: () => void };
}

const OTHER_AGENCIES: Record<string, { name: string; url: string }> = {
  Wales: { name: "Natural Resources Wales", url: "https://naturalresources.wales/flooding" },
  Scotland: { name: "SEPA", url: "https://www.sepa.org.uk/environment/water/flooding/" },
  "Northern Ireland": { name: "NI Direct", url: "https://www.nidirect.gov.uk/articles/flooding" },
};

export function FloodSection({ area, state }: Props) {
  return (
    <Section
      id="flood"
      title="Flood risk"
      icon="🌊"
      state={state}
      source={
        <a href="https://environment.data.gov.uk/flood-monitoring/doc/reference" target="_blank" rel="noreferrer">
          Environment Agency flood-monitoring API
        </a>
      }
    >
      {(data) => {
        if (!data.covered) {
          const agency = OTHER_AGENCIES[area.country];
          return (
            <p className="empty">
              The Environment Agency covers England only.{" "}
              {agency && (
                <>
                  Check flood risk for {area.country} with{" "}
                  <a href={agency.url} target="_blank" rel="noreferrer">
                    {agency.name}
                  </a>
                  .
                </>
              )}
            </p>
          );
        }

        const warningAreas = data.floodAreas.filter((a) => a.kind === "warning");
        const alertAreas = data.floodAreas.filter((a) => a.kind === "alert");

        return (
          <>
            {data.activeWarnings.length > 0 ? (
              <div className="notice notice--warning" role="status">
                <strong>
                  {data.activeWarnings.length} active flood {data.activeWarnings.length === 1 ? "alert" : "alerts"}{" "}
                  within 5 km
                </strong>
                <ul>
                  {data.activeWarnings.slice(0, 4).map((w) => (
                    <li key={w.id}>
                      <span className={`severity severity--${w.severityLevel}`}>{w.severity}</span> {w.area}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="notice notice--ok">No flood warnings are in force within 5 km right now.</div>
            )}

            <h3>Flood warning areas within 1 km</h3>
            {warningAreas.length ? (
              <ul className="plain-list">
                {warningAreas.map((a) => (
                  <li key={a.id}>
                    <strong>{a.label}</strong>
                    {a.riverOrSea && <span className="muted"> · {a.riverOrSea}</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">
                None – the EA doesn't expect river or sea flooding to directly affect properties here.
              </p>
            )}

            {alertAreas.length > 0 && (
              <p className="footnote">
                Also inside {alertAreas.length} wider flood alert {alertAreas.length === 1 ? "area" : "areas"}:{" "}
                {alertAreas.map((a) => a.label).join("; ")}.
              </p>
            )}
            <p className="footnote">
              Warning areas are where the EA issues direct flood warnings to properties. For surface-water risk and
              long-term risk, see{" "}
              <a href="https://www.gov.uk/check-long-term-flood-risk" target="_blank" rel="noreferrer">
                Check your long term flood risk
              </a>
              .
            </p>
          </>
        );
      }}
    </Section>
  );
}
