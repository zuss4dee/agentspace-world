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
