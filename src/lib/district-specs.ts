import { WORLD_BUILDINGS } from "./campus";
import { specFromBuilding } from "./building-ai";
import type { BuildingSpec } from "./building-spec";

const LIST = WORLD_BUILDINGS.map(specFromBuilding);

/** First-district buildings as frozen specs. Same spec = same mesh on every load. */
export const DISTRICT_SPECS: Record<string, BuildingSpec> = Object.fromEntries(LIST.map((s) => [s.id, s]));

export function districtSpec(id: string) {
  return DISTRICT_SPECS[id];
}
