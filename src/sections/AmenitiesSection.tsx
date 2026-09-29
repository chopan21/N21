import type { AmenityReport } from "../../shared/types.ts";
import type { ApiState } from "../lib/api.ts";
import { AMENITY_GROUPS, AMENITY_STYLE } from "../lib/categories.ts";
import { formatDistance } from "../lib/format.ts";
import { Section } from "../components/Section.tsx";

interface Props {
  state: ApiState<AmenityReport> & { retry: () => void };
}

export function AmenitiesSection({ state }: Props) {
  return (
    <Section
      id="amenities"
      title="Schools, transport & amenities"
      icon="🏫"
      state={state}
      className="section--wide"
      source={
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
          © OpenStreetMap contributors (ODbL)
        </a>
      }
    >
      {(data) => (
        <>
          <div className="amenity-groups">
            {AMENITY_GROUPS.map((group) => {
              const rows = data.summary.filter((s) => AMENITY_STYLE[s.category].group === group);
              return (
                <div key={group} className="amenity-group">
                  <h3>{group}</h3>
                  <ul className="amenities">
                    {rows.map((s) => (
                      <li key={s.category} className={s.count === 0 ? "is-empty" : undefined}>
                        <span className="amenities__icon" aria-hidden="true">
                          {AMENITY_STYLE[s.category].icon}
                        </span>
                        <span className="amenities__main">
                          <span className="amenities__label">
                            {s.label} <span className="count">{s.count}</span>
                          </span>
                          <span className="amenities__nearest">
                            {s.nearest
                              ? `Nearest: ${s.nearest.name} · ${formatDistance(s.nearest.distanceM)}`
                              : "None within walking distance"}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
          <p className="footnote">
            Counts everything mapped within {(data.radiusM / 1000).toFixed(1)} km as the crow flies. OpenStreetMap is
            community-maintained, so check school catchments and GP lists with the council and NHS.
          </p>
        </>
      )}
    </Section>
  );
}
