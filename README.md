# N21 Neighbourhood Explorer

A home-search companion for UK homebuyers. Search any postcode or place and get a neighbourhood report built
entirely from free, openly licensed data: sold prices, schools and amenities, transport, crime, flood risk, air
quality and deprivation. Shortlist up to six areas and compare them side by side.

Property listings aren't open data, so the site is designed to be used alongside a property portal: find a
listing you like, paste its postcode, and see what the area is really like.

## Features

- **Search** by full or partial postcode (`LS6 2AB`, `LS6`) or by place name (`Headingley`), with keyboard-friendly
  autocomplete.
- **Neighbourhood report** for each postcode:
  - At-a-glance summary tiles, each linking to the relevant section.
  - Interactive map with a 15-minute-walk radius, amenities by category and optional street-level crime points.
  - **Sold prices**: every standard residential sale in the 12 closest postcodes over the last five years, with
    medians by year and property type and a filterable sales table.
  - **Schools, transport & amenities**: counts and the nearest school, nursery, GP, dentist, pharmacy, hospital,
    supermarket, station, bus stop, park, playground, gym, library and café/pub within 1.2 km.
  - **Crime**: crimes within one mile for the latest published month, by category, with a six-month trend.
  - **Flood risk**: Environment Agency flood warning and alert areas within 1 km, and active warnings within 5 km.
  - **Air quality**: current European Air Quality Index plus PM2.5, PM10, NO₂ and ozone.
  - **About the area**: council, ward, constituency, police force, rural/urban classification and the
    deprivation decile for the neighbourhood (LSOA).
- **Shortlist and compare** up to six areas. The shortlist is stored in the browser, so there's no account needed.
- Coverage messages where a dataset doesn't cover a nation (for example, Land Registry prices outside England and
  Wales, or Environment Agency flood data outside England).

## Data sources

| Dataset | Used for | Coverage | Licence |
| --- | --- | --- | --- |
| [HM Land Registry Price Paid Data](https://www.gov.uk/government/collections/price-paid-data) | Sold prices | England & Wales | OGL v3 |
| [data.police.uk](https://data.police.uk/docs/) | Street-level crime | England, Wales & NI | OGL v3 |
| [Environment Agency flood monitoring](https://environment.data.gov.uk/flood-monitoring/doc/reference) | Flood areas & warnings | England | OGL v3 |
| [OpenStreetMap via Overpass](https://wiki.openstreetmap.org/wiki/Overpass_API) | Amenities, map tiles | Worldwide | ODbL |
| [postcodes.io](https://postcodes.io/) (ONS Postcode Directory, OS Open Names) | Search, geography, deprivation rank | UK | OGL v3 |
| [Open-Meteo Air Quality](https://open-meteo.com/en/docs/air-quality-api) (Copernicus CAMS) | Air quality | Worldwide | CC BY 4.0 |

None of these need an API key.

## Getting started

Requires Node.js 20 or later.

```bash
npm install
npm run dev
```

This starts the API on <http://localhost:3001> and the site on <http://localhost:5173>. Vite proxies `/api`
requests to the API.

### Production

```bash
npm run build   # builds the site into dist/
npm start       # serves the site and API on $PORT (default 3001)
```

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | API and site with hot reload |
| `npm run build` | Production build of the site |
| `npm start` | Serve the built site and the API |
| `npm test` | Run the test suite (Vitest) |
| `npm run typecheck` | Type-check the server, shared code and site |

### Configuration

All settings are optional environment variables.

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3001` | Port for the API (and site in production) |
| `OVERPASS_URLS` | `overpass-api.de`, then `overpass.private.coffee` | Comma-separated Overpass endpoints, tried in order |
| `UPSTREAM_USER_AGENT` | `N21-Neighbourhood-Explorer/1.0 (...)` | User-Agent sent to upstream APIs. Set a contact address if you deploy publicly |
| `POSTCODES_API_URL`, `POLICE_API_URL`, `LAND_REGISTRY_API_URL`, `FLOOD_API_URL`, `AIR_QUALITY_API_URL` | Public endpoints | Override an upstream base URL, for example to point at a mirror |

## How it works

```
shared/          Types and labels used by both the server and the site
server/
  app.ts         Express routes and error handling
  lib/           TTL cache, HTTP helper with timeouts, geo and postcode utilities
  sources/       One module per open dataset: fetches, normalises and summarises it
src/
  pages/         Home, neighbourhood report, compare and about pages
  sections/      Report sections (prices, amenities, crime, flood, air, area)
  components/    Search box, map, charts and shared UI
  lib/           API hooks, formatting and the shortlist store
```

The browser never calls the upstream APIs directly. The Express server:

- exposes one endpoint per dataset (`/api/areas/:postcode/{prices,crime,flood,amenities,air}`), so the report loads
  progressively and one slow or failing source doesn't block the others;
- caches responses in memory with TTLs that suit each dataset (minutes for flood warnings, a day for sold prices,
  a week for amenities) and shares in-flight requests, which keeps us well within upstream fair-use limits;
- rate-limits clients (240 requests a minute per IP) and turns upstream failures into clear error messages.

### API

| Endpoint | Returns |
| --- | --- |
| `GET /api/search?q=` | Matching postcodes and places, each resolved to a postcode |
| `GET /api/areas/:postcode` | Area profile: geography, deprivation |
| `GET /api/areas/:postcode/prices` | Sold price stats and recent sales |
| `GET /api/areas/:postcode/crime` | Latest month's crimes by category, trend and locations |
| `GET /api/areas/:postcode/flood` | Flood warning/alert areas and active warnings |
| `GET /api/areas/:postcode/amenities` | Amenity counts, nearest of each type and map points |
| `GET /api/areas/:postcode/air` | Current air quality |

## Limitations

- Crime counts cover a one-mile radius and aren't population-adjusted, so busy centres nearby push numbers up.
  Police Scotland doesn't publish to data.police.uk.
- OpenStreetMap is community-maintained. It's usually very good in towns but can have gaps in rural areas.
- Flood data covers river and sea warning areas in England, not surface-water or long-term risk.
- Deprivation ranks are relative within each UK nation and can't be compared across nations.
- Nothing here is financial, legal or surveying advice.
