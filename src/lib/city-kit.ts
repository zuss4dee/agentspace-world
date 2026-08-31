import { assetId } from "./assets";
import type { ArchFamily } from "./architecture";

/** Plug-in registry: marketplace packs later replace or extend these ids. */

export type KitKind = "building" | "tree" | "prop" | "material";

export type KitEntry = {
  id: string;
  kind: KitKind;
  slug: string;
  family: string;
  label: string;
};

function entry(kind: KitKind, family: string, slug: string, label: string): KitEntry {
  return { id: assetId(kind, `${family}.${slug}`), kind, slug, family, label };
}

export const BUILDING_KITS: KitEntry[] = [
  entry("building", "hq", "curtain-tower", "Curtain-wall tower"),
  entry("building", "office", "ledger-frame", "Concrete frame office"),
  entry("building", "startup", "glass-wing", "Glass wing loft"),
  entry("building", "townhouse", "gable-row", "Gable townhouse"),
  entry("building", "apartment", "balcony-stack", "Balcony stack"),
  entry("building", "warehouse", "loading-shed", "Loading shed"),
  entry("building", "studio", "northlight", "North-light studio"),
  entry("building", "research", "lab-ribbon", "Ribbon lab"),
  entry("building", "civic", "colonnade", "Colonnade hall"),
  entry("building", "cafe", "storefront", "Cafe storefront"),
  entry("building", "retail", "shopfront", "Retail shopfront"),
  entry("building", "industrial", "sawtooth", "Sawtooth works"),
];

export const TREE_KITS: KitEntry[] = [
  entry("tree", "oak", "crown-oak", "Crown oak"),
  entry("tree", "pine", "tier-pine", "Tiered pine"),
  entry("tree", "willow", "weep-willow", "Weeping willow"),
  entry("tree", "cedar", "column-cedar", "Column cedar"),
];

export const PROP_KITS: KitEntry[] = [
  entry("prop", "street", "lamp-arm", "Arm street lamp"),
  entry("prop", "street", "bench", "Plaza bench"),
  entry("prop", "street", "planter", "Bowl planter"),
  entry("prop", "lot", "sale-fence", "Plot fence"),
  entry("prop", "lot", "sale-sign", "Plot sign"),
  entry("prop", "roof", "hvac", "Roof HVAC"),
];

export const MATERIAL_KITS: KitEntry[] = [
  entry("material", "glass", "curtain", "Curtain glass"),
  entry("material", "masonry", "brick", "Face brick"),
  entry("material", "masonry", "concrete", "Cast concrete"),
  entry("material", "metal", "panel", "Standing-seam metal"),
  entry("material", "plant", "lawn", "Maintained lawn"),
];

export const CITY_KIT = {
  buildings: BUILDING_KITS,
  trees: TREE_KITS,
  props: PROP_KITS,
  materials: MATERIAL_KITS,
};

export function kitForFamily(family: ArchFamily) {
  return BUILDING_KITS.find((k) => k.family === family) ?? BUILDING_KITS[1]!;
}

export function registerKit(entry: KitEntry, into: KitKind = entry.kind) {
  const bag =
    into === "building"
      ? BUILDING_KITS
      : into === "tree"
        ? TREE_KITS
        : into === "prop"
          ? PROP_KITS
          : MATERIAL_KITS;
  if (!bag.some((k) => k.id === entry.id)) bag.push(entry);
  return entry.id;
}
