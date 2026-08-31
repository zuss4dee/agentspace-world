import type { ArchFamily } from "./building-spec";
import {
  BUILDING_SPEC_VERSION,
  type BuildingSpec,
  type GrammarSlot,
  type MassingId,
  type ModuleRef,
} from "./building-spec";
import { kitForFamily, kitIdFor } from "./city-kit";

export type QuickPreset = {
  id: string;
  label: string;
  family: ArchFamily;
  massing: MassingId;
  style: string;
};

export const QUICK_PRESETS: QuickPreset[] = [
  { id: "quick.hq", label: "HQ tower", family: "hq", massing: "podium-tower", style: "curtain" },
  { id: "quick.office", label: "Ledger office", family: "office", massing: "block", style: "ledger" },
  { id: "quick.startup", label: "Glass wing", family: "startup", massing: "wing", style: "curtain" },
  { id: "quick.townhouse", label: "Gable house", family: "townhouse", massing: "gable-row", style: "gable" },
  { id: "quick.apartment", label: "Balcony stack", family: "apartment", massing: "balcony-stack", style: "stack" },
  { id: "quick.warehouse", label: "Loading shed", family: "warehouse", massing: "loading", style: "shed" },
  { id: "quick.studio", label: "North-light", family: "studio", massing: "northlight", style: "shed" },
  { id: "quick.research", label: "Ribbon lab", family: "research", massing: "ribbon", style: "strip" },
  { id: "quick.civic", label: "Colonnade", family: "civic", massing: "colonnade", style: "civic" },
  { id: "quick.cafe", label: "Cafe front", family: "cafe", massing: "shopfront", style: "storefront" },
  { id: "quick.retail", label: "Shopfront", family: "retail", massing: "shopfront", style: "storefront" },
  { id: "quick.industrial", label: "Sawtooth", family: "industrial", massing: "sawtooth", style: "works" },
];

const GLASS: Record<ArchFamily, string> = {
  hq: "#7f9aaf",
  office: "#6a7d8a",
  startup: "#8aa09a",
  townhouse: "#8a9aa2",
  apartment: "#7a8e90",
  warehouse: "#5a6268",
  studio: "#8a8490",
  research: "#8aa8bc",
  civic: "#9aa49a",
  cafe: "#7a8a86",
  retail: "#7a868c",
  industrial: "#6a6e68",
};

export function massingForFamily(family: ArchFamily): MassingId {
  switch (family) {
    case "hq":
      return "podium-tower";
    case "startup":
      return "wing";
    case "townhouse":
      return "gable-row";
    case "civic":
      return "colonnade";
    case "cafe":
    case "retail":
      return "shopfront";
    case "warehouse":
      return "loading";
    case "industrial":
      return "sawtooth";
    case "studio":
    case "media":
      return "northlight";
    case "apartment":
      return "balcony-stack";
    case "research":
      return "ribbon";
    default:
      return "block";
  }
}

function ref(slot: GrammarSlot, variant: string): ModuleRef {
  return { slot, kitId: kitIdFor(slot, variant), variant };
}

export function defaultModules(family: ArchFamily): ModuleRef[] {
  const window =
    family === "hq" || family === "startup"
      ? "curtain"
      : family === "cafe" || family === "retail"
        ? "storefront"
        : family === "research" || family === "media"
          ? "strip"
          : family === "civic"
            ? "none"
            : "punch";
  const roof =
    family === "townhouse" || family === "civic" ? (family === "civic" ? "hip-civic" : "gable") : family === "cafe" || family === "studio" || family === "industrial" || family === "media" ? "shed" : "flat";
  const wall =
    family === "finance"
      ? "limestone"
      : family === "townhouse" || family === "cafe" || family === "industrial" || family === "retail"
        ? "brick"
        : family === "warehouse" || family === "media"
          ? "metal"
          : family === "startup" || family === "hq"
            ? "curtain"
            : family === "studio"
              ? "plaster"
              : "concrete";
  const entrance =
    family === "cafe" || family === "retail" || family === "hq" || family === "finance" || family === "media"
      ? family === "cafe"
        ? "awning"
        : "wide"
      : family === "warehouse" || family === "industrial"
        ? "loading"
        : family === "civic"
          ? "wide"
          : "canopy";
  const balcony = family === "apartment" ? "rail" : family === "research" ? "terrace" : "none";
  const signage = family === "cafe" || family === "retail" || family === "startup" || family === "hq" || family === "finance" ? "fascia" : family === "studio" || family === "media" ? "blade" : family === "office" ? "roof-bar" : "none";
  const landscape = family === "civic" || family === "finance" || family === "hq" ? "plaza" : family === "warehouse" || family === "industrial" ? "none" : family === "research" || family === "studio" ? "hedge" : "lawn";
  const interior =
    family === "cafe"
      ? "cafe-floor"
      : family === "civic"
        ? "hall-nave"
        : family === "research"
          ? "lab-bay"
          : family === "startup" || family === "studio" || family === "media"
            ? "loft-open"
            : "office-grid";
  const foundation = family === "civic" || family === "finance" ? "pad-wide" : family === "warehouse" || family === "industrial" ? "loading-slab" : "plinth";
  return [
    ref("foundation", foundation),
    ref("floor", "belt-concrete"),
    ref("wall", wall),
    ref("window", window),
    ref("roof", roof),
    ref("entrance", entrance),
    ref("balcony", balcony),
    ref("signage", signage),
    ref("landscaping", landscape),
    ref("lighting", family === "research" || family === "media" ? "cool" : "warm"),
    ref("interior", interior),
  ];
}

export function paletteForUse(useId: string) {
  switch (useId) {
    case "hq":
    case "office":
    case "lab":
      return { wall: "#d4dbe4", roof: "#3f4654", accent: "#c45c3a", wallDark: "#6a7b96" };
    case "warehouse":
      return { wall: "#c4ae7a", roof: "#57534e", accent: "#d4a017", wallDark: "#57534e" };
    case "studio":
      return { wall: "#d8a8bc", roof: "#6b3048", accent: "#fb7185", wallDark: "#9a6a7e" };
    case "shop":
      return { wall: "#e8d2b8", roof: "#6b3a28", accent: "#f59e0b", wallDark: "#b06a40" };
    case "house":
      return { wall: "#ead9c4", roof: "#7a4a32", accent: "#b45309", wallDark: "#b08970" };
    default:
      return { wall: "#d8d0c4", roof: "#4a453e", accent: "#8a8178", wallDark: "#6a6560" };
  }
}

export function glassForFamily(family: ArchFamily) {
  return GLASS[family];
}

export function presetByFamily(family: ArchFamily) {
  return QUICK_PRESETS.find((p) => p.family === family) ?? QUICK_PRESETS[1]!;
}

export function applyPreset(spec: BuildingSpec, preset: QuickPreset): BuildingSpec {
  return {
    ...spec,
    family: preset.family,
    style: preset.style,
    massing: preset.massing,
    packId: kitForFamily(preset.family).id,
    version: spec.version + 1,
    materials: {
      ...spec.materials,
      glass: GLASS[preset.family],
      mullion: preset.family === "startup" || preset.family === "hq" ? "#3a3e44" : "#4a5056",
      plinth: preset.family === "startup" || preset.family === "hq" ? "#6a6862" : "#7a766e",
    },
    modules: defaultModules(preset.family),
  };
}

export function emptySpec(id: string, family: ArchFamily, w: number, d: number, height: number, tilesW: number, tilesH: number): BuildingSpec {
  const floors = Math.max(1, Math.min(8, Math.round(height / 26)));
  const preset = presetByFamily(family);
  return {
    id,
    family,
    style: preset.style,
    massing: preset.massing,
    version: BUILDING_SPEC_VERSION,
    floors,
    height,
    footprint: {
      w,
      d,
      setback: family === "hq" || family === "research" ? 0.08 : family === "warehouse" || family === "industrial" ? 0.04 : 0.1,
      tilesW,
      tilesH,
    },
    materials: {
      wall: "#d4dbe4",
      wallDark: "#6a7b96",
      roof: "#3f4654",
      accent: "#c45c3a",
      glass: GLASS[family],
      mullion: family === "startup" || family === "hq" ? "#3a3e44" : "#4a5056",
      plinth: family === "startup" || family === "hq" ? "#6a6862" : "#7a766e",
    },
    signage: { text: "", color: "#c45c3a" },
    modules: defaultModules(family),
    packId: kitForFamily(family).id,
  };
}
