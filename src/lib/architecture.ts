import type { Building, BuildingStyle } from "./types";
import type { ArchFamily } from "./building-spec";

export type { ArchFamily } from "./building-spec";
export { CITY_KIT, registerKit, kitForFamily, modulesForSlot, registerPack, GRAMMAR_MODULES } from "./city-kit";
export { BUILDING_SPEC_SCHEMA, BUILDING_SPEC_VERSION } from "./building-spec";

export type WindowKind = "punch" | "strip" | "curtain" | "storefront" | "none";

export type ArchSpec = {
  family: ArchFamily;
  floors: number;
  setback: number;
  windowCols: number;
  windowRows: number;
  windowKind: WindowKind;
  roof: "flat" | "gable" | "shed" | "hip-civic";
  glass: string;
  mullion: string;
  plinth: string;
  kitId: string;
};

export function familyForBuilding(b: { id: string; style: BuildingStyle; kind?: string }): ArchFamily {
  if (b.id === "incubator" || b.id === "loft") return "startup";
  if (b.id === "pavilion") return "civic";
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

const KIT_BY_FAMILY: Record<ArchFamily, string> = {
  hq: "pack.northshore.building.hq.curtain-tower",
  office: "pack.northshore.building.office.ledger-frame",
  startup: "pack.northshore.building.startup.glass-wing",
  townhouse: "pack.northshore.building.townhouse.gable-row",
  apartment: "pack.northshore.building.apartment.balcony-stack",
  warehouse: "pack.northshore.building.warehouse.loading-shed",
  studio: "pack.northshore.building.studio.northlight",
  research: "pack.northshore.building.research.lab-ribbon",
  civic: "pack.northshore.building.civic.colonnade",
  cafe: "pack.northshore.building.cafe.storefront",
  retail: "pack.northshore.building.retail.shopfront",
  industrial: "pack.northshore.building.industrial.sawtooth",
};

export function specFor(family: ArchFamily, w: number, d: number, height: number): ArchSpec {
  const span = Math.max(w, d);
  const floors = Math.max(1, Math.min(8, Math.round(height / 26)));
  const cols = Math.max(2, Math.min(8, Math.round(span / 14)));
  const glassBy: Record<ArchFamily, string> = {
    hq: "#9eb4c8",
    office: "#7a8b98",
    startup: "#c5dc96",
    townhouse: "#d2c0a4",
    apartment: "#8ea09e",
    warehouse: "#5e666c",
    studio: "#c4b0bc",
    research: "#b8cde0",
    civic: "#cfc6b4",
    cafe: "#d8c4a0",
    retail: "#dcc8c0",
    industrial: "#868074",
  };
  const windowKind: WindowKind =
    family === "hq" || family === "startup"
      ? "curtain"
      : family === "cafe" || family === "retail"
        ? "storefront"
        : family === "research"
          ? "strip"
          : family === "civic"
            ? "none"
            : "punch";
  const roof: ArchSpec["roof"] =
    family === "townhouse" ? "gable" : family === "civic" ? "hip-civic" : family === "cafe" || family === "studio" ? "shed" : "flat";
  return {
    family,
    floors,
    setback: family === "hq" || family === "research" ? 0.08 : family === "warehouse" || family === "industrial" ? 0.04 : 0.1,
    windowCols: cols,
    windowRows: Math.max(1, floors),
    windowKind,
    roof,
    glass: glassBy[family],
    mullion: family === "startup" || family === "hq" ? "#3a3e44" : "#4a5056",
    plinth: family === "startup" || family === "hq" ? "#6a6862" : "#7a766e",
    kitId: KIT_BY_FAMILY[family],
  };
}

export function buildingMass(b: Building) {
  return { family: familyForBuilding(b), wall: b.wall, roof: b.roof, accent: b.accent, wallDark: b.wallDark };
}

/** Lot composition: building sits inside landscape, then paving, then walk to sidewalk. */
export const LOT_FILL = 0.64;
export const LOT_DEPTH = 0.58;
