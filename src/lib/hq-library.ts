import { TILE_METERS } from "@/lib/units";

/** Matches `scripts/blender/agentspace/plot_fit.py`. */
export const FIT_SAFETY_M = 0.35;
/** Matches `scripts/blender/agentspace/plot_envelope.py`. */
export const SETBACK_M = 0.6;

/** Authored world Echt HQs — never offered as a claim replacement. */
export const FROZEN_ECHT_ASSET_IDS = new Set([
  "pack.agentspace.building.echt.01",
  "pack.agentspace.building.echt.02",
]);

export type HqLibraryYaw = 0 | 90;

export type HqLibraryBuilding = {
  assetId: string;
  label: string;
  url: string;
  buildingMeters: { width: number; depth: number; height: number };
  companyAdAssetId?: string;
  yaw: HqLibraryYaw;
  rotated: boolean;
};

export type PlotUsableEnvelope = {
  tilesW: number;
  tilesH: number;
  lotW: number;
  lotD: number;
  usableW: number;
  usableD: number;
};

export function plotUsableEnvelope(tilesW: number, tilesH: number): PlotUsableEnvelope {
  const lotW = tilesW * TILE_METERS;
  const lotD = tilesH * TILE_METERS;
  const usableW = Math.max(lotW - SETBACK_M * 2, lotW * 0.72) - FIT_SAFETY_M;
  const usableD = Math.max(lotD - SETBACK_M * 2, lotD * 0.72) - FIT_SAFETY_M;
  return { tilesW, tilesH, lotW, lotD, usableW, usableD };
}

export function fitFootprintToEnvelope(
  width: number,
  depth: number,
  usableW: number,
  usableD: number,
): { yaw: HqLibraryYaw } | null {
  const eps = 1e-4;
  if (width <= usableW + eps && depth <= usableD + eps) return { yaw: 0 };
  if (depth <= usableW + eps && width <= usableD + eps) return { yaw: 90 };
  return null;
}

export function isHqLibraryExcluded(assetId: string): boolean {
  if (!assetId.startsWith("pack.agentspace.building.")) return true;
  if (FROZEN_ECHT_ASSET_IDS.has(assetId)) return true;
  const slug = assetId.slice("pack.agentspace.building.".length).toLowerCase();
  if (slug.includes("cube")) return true;
  const tokens = slug.split(/[._]/);
  if (tokens.some((t) => t === "qa" || t === "preview" || t === "test" || t === "qagallery")) return true;
  if (slug.startsWith("qa-") || slug.startsWith("preview-") || slug.startsWith("test-") || slug.startsWith("qagallery-")) {
    return true;
  }
  return false;
}

export function hqLibraryLabel(assetId: string): string {
  const rest = assetId.replace(/^pack\.agentspace\.building\./, "").replace(/\.0\d+$/, "");
  const parts = rest.split(".");
  const head = parts[0] ?? rest;
  if (head === "gallery" && parts[1]) return `Gallery ${titleCase(parts[1])}`;
  if (head.startsWith("land-")) return titleCase(head.replace(/^land-/, "").replace(/-\d+$/, "") || head);
  return titleCase(head);
}

function titleCase(raw: string) {
  return raw
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
