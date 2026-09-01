/**
 * Company → building generation contracts.
 * Website scrape / LLM fill is later. Echt is the first handwritten spec.
 */

export type BrandSpec = {
  companyId: string;
  companyName: string;
  website?: string;
  logo?: { assetId?: string; wordmark: string };
  primaryColours: string[];
  secondaryColours: string[];
  typography: { display: string; body: string };
  visualStyle: string;
  industry: string;
  personality: string[];
  imageryStyle: string;
  architecturalDirection: string;
  materials: string[];
  facadeDirection: string;
  lightingDirection: string;
  signageDirection: string;
};

export type GeneratedBuildingSpec = {
  assetId: string;
  buildingId: string;
  parcelId: string;
  brand: BrandSpec;
  /** Blender recipe id — selects silhouette archetype. */
  recipe: string;
  grid: { origin: { x: number; y: number }; size: { x: number; y: number } };
  /** Plot tile allocation mirrored in Blender plot_validator */
  plotGrid?: { x: number; y: number; w: number; h: number };
  floors: number;
  floorHeight: number;
  /** Footprint in metres (published GLB horizontal bbox). */
  footprint: { w: number; d: number; setback: { n: number; s: number; e: number; w: number } };
  facadeBays: { north: number; south: number; east: number; west: number };
  glassRatio: number;
  roofKind: "membrane" | "terrace" | "pitch";
  /** Exterior export kinds only — no interior geometry. */
  runtimeExportKinds: string[];
};

export const ECHT_BRAND: BrandSpec = {
  companyId: "echt",
  companyName: "Echt",
  website: "https://echt.studio",
  logo: { wordmark: "ECHT" },
  primaryColours: ["#c8cfc2", "#6a8a4a", "#111827"],
  secondaryColours: ["#5a6a54", "#e8eee4"],
  typography: { display: "Geist", body: "Geist" },
  visualStyle: "quiet contemporary studio, olive plaster, dark metal",
  industry: "design / campaigns",
  personality: ["precise", "calm", "editorial"],
  imageryStyle: "daylight interiors, product stills, muted greens",
  architecturalDirection: "four-storey loft bar, deep north glass, solid flanks",
  materials: [
    "asw.mat.plaster.light",
    "asw.mat.concrete.raw",
    "asw.mat.glass.clear",
    "asw.mat.metal.dark",
    "asw.mat.brand.primary",
  ],
  facadeDirection: "curtain grid on the street face, punched openings on the sides",
  lightingDirection: "warm interior wash, cool exterior metal",
  signageDirection: "low lettermark at the entrance canopy",
};

export const ECHT_GENERATED_BUILDING: GeneratedBuildingSpec = {
  assetId: "pack.agentspace.building.echt.02",
  buildingId: "loft",
  parcelId: "plot-b-loft",
  brand: ECHT_BRAND,
  recipe: "bridge_complex",
  grid: { origin: { x: 26, y: 0 }, size: { x: 7, y: 5 } },
  plotGrid: { x: 26, y: 0, w: 7, h: 5 },
  floors: 4,
  floorHeight: 18,
  footprint: { w: 48.11, d: 32.67, setback: { n: 2.0, s: 2.5, e: 2.5, w: 2.5 } },
  facadeBays: { north: 6, south: 4, east: 4, west: 4 },
  glassRatio: 0.62,
  roofKind: "membrane",
  runtimeExportKinds: [
    "structure",
    "facade",
    "window",
    "door",
    "roof",
    "canopy",
    "signage",
    "brand",
    "site",
    "landscape",
  ],
};
