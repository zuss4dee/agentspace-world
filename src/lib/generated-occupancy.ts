import type { BuildingSpec } from "@/lib/building-spec";

/**
 * Live occupancy is claim-only. Seeded QA gallery tenants must not occupy CITY_PLOTS.
 * These helpers stay so existing claim/sale coverage code keeps compiling.
 */
export type GeneratedOccupant = {
  plotId: string;
  companyId: string;
  companyName: string;
  assetId: string;
  website: string;
  industry: string;
  palette: string[];
  logo: string;
  does: string;
  description: string;
  visitorMessage: string;
  adHeadline: string;
  tier: "enterprise" | "smb" | "startup";
};

/** Empty — Place Building is the only way a company occupies a sale plot. */
export const GENERATED_OCCUPANCY: readonly GeneratedOccupant[] = [];

export const GENERATED_OCCUPANCY_PLOT_IDS: string[] = [];

/** Previous cube-occupancy lots — drop leftover session specs so they cannot reappear. */
const RETIRED_OCCUPANCY_PLOT_IDS = ["land-corporate-2", "land-campus-1", "land-civic-2"] as const;

const RETIRED_SET = new Set<string>(RETIRED_OCCUPANCY_PLOT_IDS);

export function occupancyHas(_plotId: string | null | undefined): boolean {
  return false;
}

export function occupancyOrRetiredHas(plotId: string | null | undefined): boolean {
  return Boolean(plotId && RETIRED_SET.has(plotId));
}

/** Claimed ids only — occupancy no longer injects extra plots. */
export function withOccupancyIds(claimed: Iterable<string>): string[] {
  return [...new Set([...claimed])];
}

export function occupancySpecs(): Record<string, BuildingSpec> {
  return {};
}

export function mergeOccupancySpecs(specs: Record<string, BuildingSpec>): Record<string, BuildingSpec> {
  return stripOccupancySpecs(specs);
}

export function stripOccupancySpecs(specs: Record<string, BuildingSpec>): Record<string, BuildingSpec> {
  const next = { ...specs };
  for (const id of RETIRED_OCCUPANCY_PLOT_IDS) delete next[id];
  for (const [id, spec] of Object.entries(next)) {
    const aid = spec.profile?.buildingAssetId ?? spec.packId;
    if (typeof aid === "string" && (aid.includes(".building.test.") || aid.includes(".building.gallery."))) {
      delete next[id];
    }
  }
  return next;
}
