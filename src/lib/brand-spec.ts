/**
 * Company → building generation contracts.
 * Website/asset ingestion is explicit: an official logo may be supplied, but
 * the generator never invents one. Echt remains the handwritten frozen spec.
 */

import type { BrandColourRoles } from "./brand-profile";

export type BrandSpec = {
  companyId: string;
  companyName: string;
  website?: string;
  colourRoles?: BrandColourRoles;
  logo?: {
    assetId?: string;
    wordmark: string;
    sourceUrl?: string;
    fetchedAt?: string;
    sha256?: string;
    format?: "svg" | "png" | "jpg" | "jpeg";
    aspectRatio?: number;
    provenance?: "official" | "wordmark_fallback";
  };
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
  maxHeight?: number;
  detailDensity?: "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";
};

export const ECHT_BRAND: BrandSpec = {
  companyId: "echt",
  companyName: "Echt",
  website: "https://www.useecht.com",
  colourRoles: {
    primary: "#22a94f",
    secondary: "#cdd6d1",
    accent: "#22c55e",
    background: "#f4f6f5",
    foreground: "#0f1211",
    logo: ["#22a94f", "#5fd98a", "#0d6b2c", "#f4f6f5", "#0f1211"],
  },
  logo: {
    wordmark: "ECHT",
    assetId: "public/assets/brands/echt/logo.svg",
    sourceUrl: "https://www.useecht.com/icon.svg",
    format: "svg",
    provenance: "official",
  },
  primaryColours: ["#22a94f", "#22c55e", "#0f1211"],
  secondaryColours: ["#f4f6f5", "#cdd6d1", "#5a6a54"],
  typography: { display: "Geist", body: "Geist" },
  visualStyle: "quiet contemporary studio, white plaster, olive green, dark metal",
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
