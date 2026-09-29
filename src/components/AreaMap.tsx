import { useState } from "react";
import L from "leaflet";
import { Circle, CircleMarker, MapContainer, Marker, Popup, TileLayer, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { AmenityReport, CrimeReport } from "../../shared/types.ts";
import { AMENITY_GROUPS, AMENITY_STYLE } from "../lib/categories.ts";
import { formatDistance, formatNumber } from "../lib/format.ts";
import { labelFor } from "../../shared/crimeLabels.ts";

const homeIcon = L.divIcon({
  className: "map-home",
  html: '<span aria-hidden="true">🏠</span>',
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

interface Props {
  lat: number;
  lon: number;
  postcode: string;
  amenities?: AmenityReport;
  crime?: CrimeReport;
}

export function AreaMap({ lat, lon, postcode, amenities, crime }: Props) {
  const [groups, setGroups] = useState<Set<string>>(() => new Set(AMENITY_GROUPS));
  const [showCrime, setShowCrime] = useState(false);

  const toggle = (g: string) =>
    setGroups((prev) => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g);
      else next.add(g);
      return next;
    });

  const places = amenities?.places.filter((p) => groups.has(AMENITY_STYLE[p.category].group)) ?? [];

  return (
    <div className="map">
      <div className="map__filters" role="group" aria-label="Map layers">
        {AMENITY_GROUPS.map((g) => (
          <label key={g} className={`chip ${groups.has(g) ? "is-on" : ""}`}>
            <input type="checkbox" checked={groups.has(g)} onChange={() => toggle(g)} />
            {g}
          </label>
        ))}
        <label className={`chip chip--crime ${showCrime ? "is-on" : ""}`}>
          <input
            type="checkbox"
            checked={showCrime}
            disabled={!crime}
            onChange={() => setShowCrime((v) => !v)}
          />
          Crime{crime ? ` (${crime.points.length})` : ""}
        </label>
      </div>

      <MapContainer key={postcode} center={[lat, lon]} zoom={15} scrollWheelZoom={false} className="map__canvas">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Circle
          center={[lat, lon]}
          radius={amenities?.radiusM ?? 1200}
          pathOptions={{ color: "#0f766e", weight: 1.5, fillOpacity: 0.04, dashArray: "6 6" }}
        />

        {showCrime &&
          crime?.points.map((p, i) => (
            <CircleMarker
              key={`c${i}`}
              center={[p.lat, p.lng]}
              radius={4}
              pathOptions={{ color: "#b91c1c", fillColor: "#ef4444", fillOpacity: 0.55, weight: 0.5 }}
            >
              <Tooltip>
                {labelFor(p.category)}
                {p.street ? ` – ${p.street}` : ""}
              </Tooltip>
            </CircleMarker>
          ))}

        {places.map((p) => {
          const style = AMENITY_STYLE[p.category];
          return (
            <CircleMarker
              key={p.id}
              center={[p.lat, p.lon]}
              radius={6}
              pathOptions={{ color: "#fff", weight: 1.5, fillColor: style.color, fillOpacity: 0.95 }}
            >
              <Popup>
                <strong>
                  {style.icon} {p.name}
                </strong>
                <br />
                {formatDistance(p.distanceM)}
              </Popup>
            </CircleMarker>
          );
        })}

        <Marker position={[lat, lon]} icon={homeIcon} zIndexOffset={1000}>
          <Popup>{postcode}</Popup>
        </Marker>
      </MapContainer>
      <p className="map__caption">
        Dashed circle shows a {((amenities?.radiusM ?? 1200) / 1000).toFixed(1)} km radius, roughly a 15-minute walk.
        {showCrime && crime && (
          <>
            {" "}
            Crime locations are approximate – police.uk snaps them to nearby anonymous points.
            {crime.points.length < crime.total &&
              ` Showing ${formatNumber(crime.points.length)} of ${formatNumber(crime.total)} crimes.`}
          </>
        )}
      </p>
    </div>
  );
}
