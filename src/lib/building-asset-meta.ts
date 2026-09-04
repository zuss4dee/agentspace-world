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
  "pack.agentspace.building.echt.land-campus-1.01": {
    buildingId: undefined,
    brandId: undefined,
    footprintMeters: { width: 71.748, depth: 71.595 },
    heightMeters: 19.543,
  },
  "pack.agentspace.building.linear.land-meadow-1.01": {
    buildingId: undefined,
    brandId: undefined,
    footprintMeters: { width: 31.649, depth: 70.546 },
    heightMeters: 18.063,
  },
  "pack.agentspace.building.grove.land-parklands-2.01": {
    buildingId: undefined,
    brandId: undefined,
    footprintMeters: { width: 23.65, depth: 19.329 },
    heightMeters: 18.16,
  },
  "pack.agentspace.building.stripe.land-corporate-3.01": {
    buildingId: undefined,
    brandId: undefined,
    footprintMeters: { width: 71.65, depth: 23.052 },
    heightMeters: 14.927,
  },
  "pack.agentspace.building.land-campus-1.01": {
    buildingId: undefined,
    brandId: undefined,
    footprintMeters: { width: 27.897, depth: 18.496 },
    heightMeters: 15.39,
  },
  "pack.agentspace.building.loft.01": {
    buildingId: "loft",
    brandId: "loft",
    footprintMeters: { width: 41.778, depth: 28.196 },
    heightMeters: 18.102,
  },
  "pack.agentspace.building.corner.01": {
    buildingId: undefined,
    brandId: undefined,
    footprintMeters: { width: 27.897, depth: 18.496 },
    heightMeters: 15.39,
  },
  "pack.agentspace.building.nova.01": {
    buildingId: undefined,
    brandId: undefined,
    footprintMeters: { width: 54.812, depth: 38.773 },
    heightMeters: 51.311,
  },
  "pack.agentspace.building.echt.02": {
    buildingId: undefined,
    brandId: undefined,
    footprintMeters: { width: 48.44, depth: 32.87 },
    heightMeters: 37.599,
  },
  "pack.agentspace.building.gallery.spark.01": {
    buildingId: undefined,
    brandId: "spark",
    footprintMeters: { width: 27.897, depth: 18.418 },
    heightMeters: 15.39,
  },
  "pack.agentspace.building.gallery.nova.01": {
    buildingId: undefined,
    brandId: "nova",
    footprintMeters: { width: 54.812, depth: 38.908 },
    heightMeters: 42.053,
  },
  "pack.agentspace.building.gallery.loft.01": {
    buildingId: "loft",
    brandId: "loft",
    footprintMeters: { width: 41.564, depth: 28.15 },
    heightMeters: 18.102,
  },
  "pack.agentspace.building.gallery.orbit.01": {
    buildingId: undefined,
    brandId: "orbit",
    footprintMeters: { width: 56.908, depth: 56.605 },
    heightMeters: 22.867,
  },
  "pack.agentspace.building.gallery.corner.01": {
    buildingId: undefined,
    brandId: "corner",
    footprintMeters: { width: 73.295, depth: 26.55 },
    heightMeters: 12.52,
  },
  "pack.agentspace.building.gallery.forge.01": {
    buildingId: undefined,
    brandId: "forge",
    footprintMeters: { width: 35.021, depth: 70.184 },
    heightMeters: 18.063,
  },
};

export function buildingAssetMeta(assetId: string): BuildingAssetMeta | undefined {
  return BUILDING_ASSET_META[assetId];
}
