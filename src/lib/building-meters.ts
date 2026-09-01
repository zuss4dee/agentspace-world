/**
 * Per-asset footprint metadata for authored building GLBs.
 * Values for pack.agentspace.building.echt.02 are measured from the published GLB
 * (public/assets/gltf/buildings/pack.agentspace.building.echt.02.glb).
 */
export type BuildingFootprintMeters = {
  width: number;
  depth: number;
  height: number;
};

export const BUILDING_METERS_BY_ASSET_ID: Record<string, BuildingFootprintMeters> = {
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
