export interface SearchResult {
  id: string;
  label: string;
  detail: string;
  kind: "postcode" | "place";
  postcode: string;
}

export interface Deprivation {
  rank: number;
  outOf: number;
  decile: number;
}

export interface AreaProfile {
  postcode: string;
  latitude: number;
  longitude: number;
  country: string;
  region: string | null;
  adminDistrict: string | null;
  adminWard: string | null;
  parish: string | null;
  constituency: string | null;
  lsoa: string | null;
  ruralUrban: string | null;
  policeForce: string | null;
  deprivation: Deprivation | null;
}

export interface CategoryCount {
  category: string;
  label: string;
  count: number;
}

export interface CrimePoint {
  lat: number;
  lng: number;
  category: string;
  street: string;
}

export interface CrimeReport {
  month: string;
  total: number;
  byCategory: CategoryCount[];
  trend: { month: string; total: number }[];
  points: CrimePoint[];
}

export type PropertyType = "detached" | "semi-detached" | "terraced" | "flat-maisonette" | "other";

export interface Sale {
  date: string;
  price: number;
  address: string;
  postcode: string;
  propertyType: PropertyType;
  newBuild: boolean;
  tenure: "freehold" | "leasehold" | "unknown";
}

export interface PriceStats {
  count: number;
  median: number | null;
  mean: number | null;
  min: number | null;
  max: number | null;
  byType: { type: PropertyType; count: number; median: number }[];
  byYear: { year: number; count: number; median: number }[];
}

export interface PriceReport {
  sinceYear: number;
  postcodesSearched: string[];
  stats: PriceStats;
  sales: Sale[];
}

export interface FloodWarning {
  id: string;
  area: string;
  severity: string;
  severityLevel: number;
  message: string;
  timeRaised: string | null;
}

export interface FloodArea {
  id: string;
  label: string;
  kind: "warning" | "alert";
  riverOrSea: string | null;
}

export interface FloodReport {
  covered: boolean;
  activeWarnings: FloodWarning[];
  floodAreas: FloodArea[];
}

export type AmenityCategory =
  | "school"
  | "nursery"
  | "gp"
  | "dentist"
  | "pharmacy"
  | "hospital"
  | "supermarket"
  | "convenience"
  | "station"
  | "bus_stop"
  | "park"
  | "playground"
  | "food_drink"
  | "gym"
  | "library";

export interface Amenity {
  id: string;
  name: string;
  category: AmenityCategory;
  lat: number;
  lon: number;
  distanceM: number;
}

export interface AmenitySummary {
  category: AmenityCategory;
  label: string;
  count: number;
  nearest: Amenity | null;
}

export interface AmenityReport {
  radiusM: number;
  summary: AmenitySummary[];
  places: Amenity[];
}

export interface AirQualityReport {
  time: string;
  europeanAqi: number | null;
  band: string;
  pm2_5: number | null;
  pm10: number | null;
  no2: number | null;
  o3: number | null;
}

export interface ApiError {
  error: string;
}
