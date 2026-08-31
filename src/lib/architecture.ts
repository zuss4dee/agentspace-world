import type { Building, BuildingStyle } from "./types";

/** Reusable architectural families for the miniature city. */
export type ArchFamily =
  | "office"
  | "startup"
  | "townhouse"
  | "apartment"
  | "warehouse"
  | "studio"
  | "research"
  | "civic"
  | "cafe"
  | "retail"
  | "industrial"
  | "hq";

export type ArchSpec = {
  family: ArchFamily;
  floors: number;
  setback: number;
  windowCols: number;
  windowRows: number;
  roof: "flat" | "hip" | "shed" | "hip-civic";
  glass: string;
  mullion: string;
  plinth: string;
};

export function familyForBuilding(b: { id: string; style: BuildingStyle; kind?: string }): ArchFamily {
  if (b.id === "incubator") return "startup";
  if (b.id === "pavilion" || b.id === "kiosk") return "civic";
  switch (b.style) {
    case "hq":
      return "hq";
    case "office":
      return "office";
    case "hall":
    case "pavilion":
      return "civic";
    case "studio":
    case "gallery":
      return "studio";
    case "cafe":
    case "restaurant":
      return "cafe";
    case "retail":
    case "shop":
      return "retail";
    case "house":
      return "townhouse";
    case "apartment":
    case "hotel":
      return "apartment";
    case "warehouse":
    case "station":
      return "warehouse";
    case "factory":
    case "workshop":
      return "industrial";
    case "lab":
    case "conference":
    case "data":
      return "research";
    default:
      return "office";
  }
}

export function familyForUse(useId: string): ArchFamily {
  switch (useId) {
    case "hq":
      return "hq";
    case "office":
      return "office";
    case "lab":
      return "research";
    case "warehouse":
      return "warehouse";
    case "studio":
      return "studio";
    case "shop":
      return "retail";
    case "house":
      return "townhouse";
    default:
      return "office";
  }
}

export function specFor(family: ArchFamily, w: number, d: number, height: number): ArchSpec {
  const span = Math.max(w, d);
  const floors = Math.max(1, Math.min(8, Math.round(height / 28)));
  const cols = Math.max(2, Math.min(7, Math.round(span / 18)));
  const glassBy: Record<ArchFamily, string> = {
    hq: "#8aa0b8",
    office: "#7d8f9c",
    startup: "#c6e28a",
    townhouse: "#d7c4a8",
    apartment: "#9aaba8",
    warehouse: "#6a7278",
    studio: "#c9b8c4",
    research: "#b7c9d4",
    civic: "#cfc4ae",
    cafe: "#d4c09a",
    retail: "#d8c8c0",
    industrial: "#8a8478",
  };
  const roof: ArchSpec["roof"] =
    family === "townhouse" ? "hip" : family === "civic" ? "hip-civic" : family === "cafe" || family === "studio" ? "shed" : "flat";
  return {
    family,
    floors,
    setback: family === "hq" || family === "research" ? 0.06 : family === "warehouse" || family === "industrial" ? 0.02 : 0.04,
    windowCols: cols,
    windowRows: Math.max(1, floors - (family === "cafe" || family === "retail" ? 0 : 0)),
    roof,
    glass: glassBy[family],
    mullion: family === "startup" || family === "hq" ? "#1c1916" : "#3a3f46",
    plinth: family === "startup" || family === "hq" ? "#1a1814" : "#2c2a26",
  };
}

export function buildingMass(b: Building) {
  return { family: familyForBuilding(b), wall: b.wall, roof: b.roof, accent: b.accent, wallDark: b.wallDark };
}
