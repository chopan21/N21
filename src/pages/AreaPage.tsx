import { useEffect } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import type {
  AirQualityReport,
  AmenityReport,
  AreaProfile,
  CrimeReport,
  FloodReport,
  PriceReport,
} from "../../shared/types.ts";
import { areaUrl, useApi } from "../lib/api.ts";
import { useShortlist } from "../lib/shortlist.ts";
import { AreaMap } from "../components/AreaMap.tsx";
import { AtAGlance } from "../components/AtAGlance.tsx";
import { SearchBox } from "../components/SearchBox.tsx";
import { Skeleton } from "../components/Section.tsx";
import { AirSection } from "../sections/AirSection.tsx";
import { AmenitiesSection } from "../sections/AmenitiesSection.tsx";
import { AreaSection } from "../sections/AreaSection.tsx";
import { CrimeSection } from "../sections/CrimeSection.tsx";
import { FloodSection } from "../sections/FloodSection.tsx";
import { PricesSection } from "../sections/PricesSection.tsx";

export function AreaPage() {
  const { postcode = "" } = useParams();
  const area = useApi<AreaProfile>(areaUrl(postcode));

  if (area.status === "error") {
    return (
      <div className="container page">
        <div className="card empty-state">
          <h1>{area.error.status === 404 ? "Postcode not found" : "Something went wrong"}</h1>
          <p>{area.error.message}</p>
          <SearchBox size="compact" autoFocus />
          {area.error.status !== 404 && area.error.status !== 400 && (
            <button className="btn btn--ghost" onClick={area.retry}>
              Try again
            </button>
          )}
        </div>
      </div>
    );
  }

  if (area.status === "loading") {
    return (
      <div className="container page">
        <div className="card">
          <Skeleton lines={3} />
        </div>
      </div>
    );
  }

  return <AreaReport key={area.data.postcode} area={area.data} />;
}

function AreaReport({ area }: { area: AreaProfile }) {
  const location = useLocation();
  const placeName = (location.state as { label?: string } | null)?.label;
  const shortlist = useShortlist();

  const prices = useApi<PriceReport>(areaUrl(area.postcode, "prices"));
  const crime = useApi<CrimeReport>(areaUrl(area.postcode, "crime"));
  const flood = useApi<FloodReport>(areaUrl(area.postcode, "flood"));
  const amenities = useApi<AmenityReport>(areaUrl(area.postcode, "amenities"));
  const air = useApi<AirQualityReport>(areaUrl(area.postcode, "air"));

  const heading = placeName ?? area.adminWard ?? area.postcode;
  const saved = shortlist.has(area.postcode);

  useEffect(() => {
    document.title = `${area.postcode} – ${heading} | N21 Neighbourhood Explorer`;
  }, [area.postcode, heading]);

  return (
    <div className="container page">
      <div className="report-header">
        <div>
          <p className="eyebrow">Neighbourhood report</p>
          <h1>
            {heading} <span className="report-header__postcode">{area.postcode}</span>
          </h1>
          <p className="muted">
            {[area.adminWard !== heading ? area.adminWard : null, area.adminDistrict, area.region ?? area.country]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <div className="report-header__actions">
          <button
            className={`btn ${saved ? "btn--saved" : "btn--primary"}`}
            aria-pressed={saved}
            disabled={!saved && shortlist.isFull}
            title={!saved && shortlist.isFull ? "Your shortlist is full – remove an area to add this one" : undefined}
            onClick={() =>
              saved ? shortlist.remove(area.postcode) : shortlist.add(area.postcode, heading)
            }
          >
            {saved ? "★ On your shortlist" : "☆ Add to shortlist"}
          </button>
          {shortlist.items.length > 1 && (
            <Link className="btn btn--ghost" to="/compare">
              Compare {shortlist.items.length} areas
            </Link>
          )}
        </div>
      </div>

      <AtAGlance area={area} prices={prices} crime={crime} flood={flood} amenities={amenities} air={air} />

      <nav className="jump" aria-label="Jump to section">
        <a href="#prices">Prices</a>
        <a href="#amenities">Amenities</a>
        <a href="#crime">Crime</a>
        <a href="#flood">Flood</a>
        <a href="#air">Air</a>
        <a href="#area">Area</a>
      </nav>

      <div className="card map-card">
        <AreaMap
          lat={area.latitude}
          lon={area.longitude}
          postcode={area.postcode}
          amenities={amenities.data}
          crime={crime.data}
        />
      </div>

      <div className="grid">
        <PricesSection area={area} state={prices} />
        <AmenitiesSection state={amenities} />
        <CrimeSection area={area} state={crime} />
        <FloodSection area={area} state={flood} />
        <AirSection state={air} />
        <AreaSection area={area} />
      </div>
    </div>
  );
}
