/**
 * Authoritative building ↔ brand metadata merged into ASSET_CATALOG on publish.
 * Hand-maintained for live assets; publish.mjs preserves these fields per assetId.
 */
export type BuildingAssetMeta = {
  buildingId?: string;
  brandId?: string;
  footprintMeters: { width: number; depth: number };
  heightMeters: number;
};

export const BUILDING_ASSET_META: Record<string, BuildingAssetMeta> = {
  "pack.agentspace.building.land-campus-1.01": {
    buildingId: undefined,
    brandId: undefined,
    footprintMeters: { width: 27.897, depth: 18.85 },
    heightMeters: 15.39,
  },
  "pack.agentspace.building.loft.01": {
    buildingId: "loft",
    brandId: "loft",
    footprintMeters: { width: 41.245, depth: 28.5 },
    heightMeters: 16.692,
  },
  "pack.agentspace.building.corner.01": {
    buildingId: "corner",
    brandId: "corner",
    footprintMeters: { width: 27.897, depth: 18.85 },
    heightMeters: 15.39,
  },
  "pack.agentspace.building.nova.01": {
    buildingId: "nova",
    brandId: "nova",
    footprintMeters: { width: 54.812, depth: 39.053 },
    heightMeters: 51.311,
  },
  "pack.agentspace.building.echt.02": {
    buildingId: "loft",
    brandId: "echt",
    footprintMeters: { width: 48.11, depth: 32.67 },
    heightMeters: 30.0,
  },
};

export function buildingAssetMeta(assetId: string): BuildingAssetMeta | undefined {
  return BUILDING_ASSET_META[assetId];
}
