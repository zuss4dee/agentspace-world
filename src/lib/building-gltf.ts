import {
  BUILDINGS_ENABLED,
  CLAIMED_BUILDING_GLB_ENABLED,
  PRODUCTION_GLB_ENABLED,
} from "@/lib/architecture-stage";
import { BUILDING_METERS_BY_ASSET_ID, placementMetersForAssetId } from "@/lib/building-meters";
import { PACK_GLTF } from "@/lib/pack-gltf";
import type { BuildingFootprintMeters } from "@/lib/building-meters";

/** Default Silicon City pack building (startup loft archetype). Echt remains in PACK_GLTF unused by demos. */
export const CANONICAL_BUILDING_ASSET_ID = "pack.agentspace.building.loft.01" as const;

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

export function publishedBuildingGlbUrl(assetId: string): string {
  return `/assets/gltf/buildings/${assetId}.glb`;
}

export function gltfUrlForAssetId(assetId: string | undefined) {
  if (!assetId) return undefined;
  if (assetId.startsWith("pack.agentspace.building.")) {
    if (assetId in PACK_GLTF) return PACK_GLTF[assetId as keyof typeof PACK_GLTF];
    if (CLAIMED_BUILDING_GLB_ENABLED) return publishedBuildingGlbUrl(assetId);
  }
  // Legacy Echt / northshore ids still resolve to the canonical GLB when production is on.
  if (!PRODUCTION_GLB_ENABLED && !BUILDINGS_ENABLED) return undefined;
  if (LEGACY_BUILDING_ASSET_IDS.has(assetId) || assetId === CANONICAL_BUILDING_ASSET_ID) {
    return CANONICAL_BUILDING_URL;
  }
  return BUILDING_GLB_BY_ASSET_ID[assetId];
}

/** Horizontal fit bbox for a claimed-company HQ (registry first, then profile meters). */
export function placementMetersForClaim(
  assetId: string | undefined,
  profileMeters?: BuildingFootprintMeters | { width: number; depth: number; height?: number },
) {
  const fromRegistry = placementMetersForAssetId(assetId);
  if (fromRegistry) return fromRegistry;
  if (!profileMeters) return undefined;
  return { w: profileMeters.width, d: profileMeters.depth };
}
