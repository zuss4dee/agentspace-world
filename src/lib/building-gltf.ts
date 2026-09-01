import { BUILDINGS_ENABLED, PRODUCTION_GLB_ENABLED } from "@/lib/architecture-stage";
import { BUILDING_METERS_BY_ASSET_ID, placementMetersForAssetId } from "@/lib/building-meters";
import { PACK_GLTF } from "@/lib/pack-gltf";

/** Current Blender-published building. Prototype echt.01 and the northshore loft map here. */
export const CANONICAL_BUILDING_ASSET_ID = "pack.agentspace.building.echt.02" as const;

/** @deprecated Prefer BUILDING_METERS_BY_ASSET_ID / placementMetersForAssetId. */
export const CANONICAL_BUILDING_METERS = {
  w: BUILDING_METERS_BY_ASSET_ID[CANONICAL_BUILDING_ASSET_ID]!.width,
  d: BUILDING_METERS_BY_ASSET_ID[CANONICAL_BUILDING_ASSET_ID]!.depth,
} as const;

export { BUILDING_METERS_BY_ASSET_ID, placementMetersForAssetId };

const CANONICAL_BUILDING_URL = PACK_GLTF[CANONICAL_BUILDING_ASSET_ID];

const LEGACY_BUILDING_ASSET_IDS = new Set([
  "pack.northshore.building.studio.loft",
  "pack.agentspace.building.echt.01",
]);

export const BUILDING_GLB_BY_ASSET_ID: Record<string, string> = {
  [CANONICAL_BUILDING_ASSET_ID]: CANONICAL_BUILDING_URL,
};

export function gltfUrlForAssetId(assetId: string | undefined) {
  if (!assetId) return undefined;
  if (LEGACY_BUILDING_ASSET_IDS.has(assetId) || assetId === CANONICAL_BUILDING_ASSET_ID) {
    return CANONICAL_BUILDING_URL;
  }
  if (assetId.startsWith("pack.agentspace.building") && assetId in PACK_GLTF) {
    return PACK_GLTF[assetId as keyof typeof PACK_GLTF];
  }
  const url = BUILDING_GLB_BY_ASSET_ID[assetId];
  if (!url) return undefined;
  if (PRODUCTION_GLB_ENABLED || BUILDINGS_ENABLED) return url;
  return undefined;
}
