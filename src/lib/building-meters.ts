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
  "pack.agentspace.building.echt.land-campus-1.01": {
    width: 71.748,
    depth: 71.595,
    height: 19.543,
  },
  "pack.agentspace.building.linear.land-meadow-1.01": {
    width: 31.649,
    depth: 70.546,
    height: 18.063,
  },
  "pack.agentspace.building.grove.land-parklands-2.01": {
    width: 23.65,
    depth: 19.329,
    height: 18.16,
  },
  "pack.agentspace.building.stripe.land-corporate-3.01": {
    width: 71.65,
    depth: 23.052,
    height: 14.927,
  },
  "pack.agentspace.building.land-campus-1.01": {
    width: 27.897,
    depth: 18.496,
    height: 15.39,
  },
  "pack.agentspace.building.loft.01": {
    width: 41.778,
    depth: 28.196,
    height: 18.102,
  },
  "pack.agentspace.building.corner.01": {
    width: 27.897,
    depth: 18.496,
    height: 15.39,
  },
  "pack.agentspace.building.nova.01": {
    width: 54.812,
    depth: 38.773,
    height: 51.311,
  },
  "pack.agentspace.building.echt.02": {
    width: 48.44,
    depth: 32.87,
    height: 37.599,
  },
  "pack.agentspace.building.gallery.spark.01": {
    width: 27.897,
    depth: 18.418,
    height: 15.39,
  },
  "pack.agentspace.building.gallery.nova.01": {
    width: 54.812,
    depth: 38.908,
    height: 42.053,
  },
  "pack.agentspace.building.gallery.loft.01": {
    width: 41.564,
    depth: 28.15,
    height: 18.102,
  },
  "pack.agentspace.building.gallery.orbit.01": {
    width: 56.908,
    depth: 56.605,
    height: 22.867,
  },
  "pack.agentspace.building.gallery.corner.01": {
    width: 73.295,
    depth: 26.55,
    height: 12.52,
  },
  "pack.agentspace.building.gallery.forge.01": {
    width: 35.021,
    depth: 70.184,
    height: 18.063,
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
