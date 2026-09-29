import { useEffect } from "react";
import { Link } from "react-router-dom";
import { areaPath, SearchBox } from "../components/SearchBox.tsx";
import { useShortlist } from "../lib/shortlist.ts";

const EXAMPLES = [
  { label: "Headingley, Leeds", postcode: "LS6 3BP" },
  { label: "Clifton, Bristol", postcode: "BS8 4AA" },
  { label: "Didsbury, Manchester", postcode: "M20 2RN" },
  { label: "Walthamstow, London", postcode: "E17 4QH" },
];

const FEATURES = [
  { icon: "💷", title: "Sold prices", text: "Every registered sale nearby over five years, with medians by year and property type." },
  { icon: "🏫", title: "Schools & amenities", text: "Schools, GPs, stations, supermarkets and parks within a 15-minute walk." },
  { icon: "🚓", title: "Crime", text: "Street-level crime within a mile, broken down by type with a six-month trend." },
  { icon: "🌊", title: "Flood risk", text: "Environment Agency warning areas and any flood alerts in force right now." },
  { icon: "🌬️", title: "Air quality", text: "Current modelled pollution levels for PM2.5, PM10, NO₂ and ozone." },
  { icon: "🏘️", title: "Deprivation", text: "Where the neighbourhood sits on the official Index of Multiple Deprivation." },
];

export function HomePage() {
  const shortlist = useShortlist();

  useEffect(() => {
    document.title = "N21 Neighbourhood Explorer – know the area before you buy";
  }, []);

  return (
    <>
      <section className="hero">
        <div className="container hero__inner">
          <p className="eyebrow eyebrow--light">Free · No sign-up · Official open data</p>
          <h1>Know the neighbourhood before you buy</h1>
          <p className="hero__lead">
            Search any UK postcode or place to see sold prices, schools, transport, crime, flood risk and more –
            pulled live from government and community open data.
          </p>
          <SearchBox autoFocus />
          <div className="hero__examples">
            <span>Try:</span>
            {EXAMPLES.map((e) => (
              <Link key={e.postcode} to={areaPath(e.postcode)} state={{ label: e.label.split(",")[0] }} className="chip chip--light">
                {e.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="container page">
        {shortlist.items.length > 0 && (
          <section className="card shortlist-preview">
            <div>
              <h2>Your shortlist</h2>
              <ul className="inline-list">
                {shortlist.items.map((i) => (
                  <li key={i.postcode}>
                    <Link to={areaPath(i.postcode)}>
                      {i.label} <span className="muted">{i.postcode}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            {shortlist.items.length > 1 && (
              <Link to="/compare" className="btn btn--primary">
                Compare {shortlist.items.length} areas
              </Link>
            )}
          </section>
        )}

        <h2 className="section-title">Everything in one neighbourhood report</h2>
        <div className="features">
          {FEATURES.map((f) => (
            <div key={f.title} className="card feature">
              <span className="feature__icon" aria-hidden="true">
                {f.icon}
              </span>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </div>
          ))}
        </div>

        <div className="card how">
          <h2>How it works</h2>
          <ol>
            <li>
              <strong>Search</strong> a postcode from a listing you like, or a place you're considering.
            </li>
            <li>
              <strong>Read the report.</strong> Every figure links back to its official source.
            </li>
            <li>
              <strong>Shortlist and compare</strong> up to six areas side by side. Your shortlist stays on this device.
            </li>
          </ol>
          <p className="muted">
            Property listings aren't open data, so use this alongside your favourite property portal. See{" "}
            <Link to="/about">where the data comes from</Link>.
          </p>
        </div>
      </div>
    </>
  );
}
