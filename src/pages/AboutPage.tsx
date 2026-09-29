import { useEffect } from "react";

const SOURCES = [
  {
    name: "HM Land Registry Price Paid Data",
    url: "https://www.gov.uk/government/collections/price-paid-data",
    covers: "England & Wales",
    updated: "Monthly",
    licence: "Open Government Licence v3.0",
    use: "Sold prices for the searched postcode and the 11 closest to it, over the last five years.",
  },
  {
    name: "data.police.uk",
    url: "https://data.police.uk/",
    covers: "England, Wales & Northern Ireland",
    updated: "Monthly, about two months behind",
    licence: "Open Government Licence v3.0",
    use: "Street-level crimes within one mile, by category, with a six-month trend.",
  },
  {
    name: "Environment Agency real-time flood monitoring",
    url: "https://environment.data.gov.uk/flood-monitoring/doc/reference",
    covers: "England",
    updated: "Every 15 minutes",
    licence: "Open Government Licence v3.0",
    use: "Flood warning and alert areas within 1 km, and active warnings within 5 km.",
  },
  {
    name: "OpenStreetMap via Overpass API",
    url: "https://www.openstreetmap.org/copyright",
    covers: "Worldwide",
    updated: "Continuously, by volunteers",
    licence: "Open Database Licence (ODbL)",
    use: "Schools, health services, shops, transport, parks and leisure within 1.2 km, plus the map tiles.",
  },
  {
    name: "postcodes.io (ONS Postcode Directory & OS Open Names)",
    url: "https://postcodes.io/",
    covers: "United Kingdom",
    updated: "Quarterly",
    licence: "Open Government Licence v3.0 (contains OS and ONS data)",
    use: "Postcode and place search, local authority, ward, constituency and deprivation rank.",
  },
  {
    name: "Open-Meteo Air Quality (Copernicus CAMS)",
    url: "https://open-meteo.com/en/docs/air-quality-api",
    covers: "Worldwide",
    updated: "Hourly",
    licence: "CC BY 4.0",
    use: "Modelled current European Air Quality Index and pollutant concentrations.",
  },
];

export function AboutPage() {
  useEffect(() => {
    document.title = "About the data | N21 Neighbourhood Explorer";
  }, []);

  return (
    <div className="container page prose">
      <p className="eyebrow">About the data</p>
      <h1>Where the numbers come from</h1>
      <p className="lead">
        N21 Neighbourhood Explorer combines free, openly licensed datasets so you can research an area before
        committing to the biggest purchase of your life. Nothing is scraped or paywalled, and every section links to
        its source.
      </p>

      <div className="sources">
        {SOURCES.map((s) => (
          <article key={s.name} className="card source">
            <h2>
              <a href={s.url} target="_blank" rel="noreferrer">
                {s.name}
              </a>
            </h2>
            <p>{s.use}</p>
            <dl className="facts facts--inline">
              <div>
                <dt>Coverage</dt>
                <dd>{s.covers}</dd>
              </div>
              <div>
                <dt>Updated</dt>
                <dd>{s.updated}</dd>
              </div>
              <div>
                <dt>Licence</dt>
                <dd>{s.licence}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>

      <h2>Things to bear in mind</h2>
      <ul>
        <li>
          Crime counts cover a one-mile radius and aren't adjusted for population, so a nearby town centre or
          stadium can push them up.
        </li>
        <li>
          OpenStreetMap is maintained by volunteers. It's usually excellent in towns, but check school catchments and
          GP registration with the council and the NHS.
        </li>
        <li>Flood information shows river and sea warning areas, not surface-water or long-term risk.</li>
        <li>
          Deprivation ranks are relative within each UK nation and can't be compared across England, Wales, Scotland
          and Northern Ireland.
        </li>
        <li>Nothing here is financial, legal or surveying advice. Always instruct a conveyancer and surveyor.</li>
      </ul>
      <p className="footnote">
        Contains HM Land Registry data © Crown copyright and database right. Contains public sector information
        licensed under the Open Government Licence v3.0. Contains OS data © Crown copyright and database right. Map
        data © OpenStreetMap contributors.
      </p>
    </div>
  );
}
