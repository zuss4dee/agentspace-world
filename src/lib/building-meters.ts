import type { CompanyTier } from "@/lib/brand-profile";

/**
 * Per-asset footprint metadata for authored building GLBs.
 * Silicon City values are measured from Track B publishes under public/assets/gltf/buildings/.
 */
export type BuildingFootprintMeters = {
  width: number;
  depth: number;
  height: number;
};

/** Approximate tier footprints before a GLB is measured (matches Blender TIER_DEFAULTS). */
export const TIER_FOOTPRINT_METERS: Record<CompanyTier, BuildingFootprintMeters> = {
  enterprise: { width: 54, depth: 38, height: 28 },
  smb: { width: 26, depth: 18, height: 16 },
  startup: { width: 40, depth: 28, height: 22 },
};

export const BUILDING_METERS_BY_ASSET_ID: Record<string, BuildingFootprintMeters> = {
  "pack.agentspace.building.land-campus-1.01": {
    width: 27.897,
    depth: 18.85,
    height: 15.39,
  },
  "pack.agentspace.building.loft.01": {
    width: 41.245,
    depth: 28.5,
    height: 16.692,
  },
  "pack.agentspace.building.corner.01": {
    width: 27.897,
    depth: 18.85,
    height: 15.39,
  },
  "pack.agentspace.building.nova.01": {
    width: 54.812,
    depth: 39.053,
    height: 51.311,
  },
  "pack.agentspace.building.echt.02": {
    width: 48.11,
    depth: 32.67,
    height: 30.0,
  },
};

export function buildingMetersForAssetId(assetId: string | undefined): BuildingFootprintMeters | undefined {
  if (!assetId) return undefined;
  return BUILDING_METERS_BY_ASSET_ID[assetId];
}

/** Horizontal fit bbox (width × depth) for lot placement scaling. */
export function placementMetersForAssetId(assetId: string | undefined): { w: number; d: number } | undefined {
  const m = buildingMetersForAssetId(assetId);
  if (!m) return undefined;
  return { w: m.width, d: m.depth };
}
