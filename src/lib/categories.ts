import type { AmenityCategory } from "../../shared/types.ts";

export const AMENITY_STYLE: Record<AmenityCategory, { icon: string; color: string; group: string }> = {
  school: { icon: "🏫", color: "#2563eb", group: "Education" },
  nursery: { icon: "🧸", color: "#60a5fa", group: "Education" },
  library: { icon: "📚", color: "#1e40af", group: "Education" },
  gp: { icon: "🩺", color: "#dc2626", group: "Health" },
  dentist: { icon: "🦷", color: "#f87171", group: "Health" },
  pharmacy: { icon: "💊", color: "#e11d48", group: "Health" },
  hospital: { icon: "🏥", color: "#991b1b", group: "Health" },
  supermarket: { icon: "🛒", color: "#d97706", group: "Shops & leisure" },
  convenience: { icon: "🏪", color: "#f59e0b", group: "Shops & leisure" },
  food_drink: { icon: "☕", color: "#a16207", group: "Shops & leisure" },
  gym: { icon: "🏋️", color: "#7c3aed", group: "Shops & leisure" },
  station: { icon: "🚉", color: "#0f172a", group: "Transport" },
  bus_stop: { icon: "🚌", color: "#475569", group: "Transport" },
  park: { icon: "🌳", color: "#16a34a", group: "Green space" },
  playground: { icon: "🛝", color: "#4ade80", group: "Green space" },
};

export const AMENITY_GROUPS = ["Education", "Health", "Transport", "Shops & leisure", "Green space"];
