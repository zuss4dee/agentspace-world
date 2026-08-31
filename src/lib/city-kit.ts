import { assetId } from "./assets";
import type { ArchFamily } from "./building-spec";
import type { GrammarSlot } from "./building-spec";

/** Plug-in registry: marketplace packs later replace or extend these ids. */

export type KitKind = "building" | "tree" | "prop" | "material" | "module" | "pack";

export type KitEntry = {
  id: string;
  kind: KitKind;
  slug: string;
  family: string;
  label: string;
  slot?: GrammarSlot;
  variant?: string;
};

function entry(kind: KitKind, family: string, slug: string, label: string, extra?: Pick<KitEntry, "slot" | "variant">): KitEntry {
  return { id: assetId(kind, `${family}.${slug}`), kind, slug, family, label, ...extra };
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

function mod(slot: GrammarSlot, variant: string, label: string): KitEntry {
  return entry("module", slot, variant, label, { slot, variant });
}

export const GRAMMAR_MODULES: KitEntry[] = [
  mod("foundation", "plinth", "Stone plinth"),
  mod("foundation", "pad-wide", "Civic pad"),
  mod("foundation", "loading-slab", "Loading slab"),
  mod("floor", "belt-concrete", "Floor belt"),
  mod("floor", "belt-none", "Flush floors"),
  mod("wall", "brick", "Face brick"),
  mod("wall", "concrete", "Cast concrete"),
  mod("wall", "metal", "Metal panel"),
  mod("wall", "plaster", "Lime plaster"),
  mod("wall", "curtain", "Curtain frame"),
  mod("window", "punch", "Punched windows"),
  mod("window", "strip", "Ribbon strip"),
  mod("window", "curtain", "Curtain wall"),
  mod("window", "storefront", "Storefront"),
  mod("window", "none", "Blank wall"),
  mod("roof", "flat", "Parapet roof"),
  mod("roof", "gable", "Gable"),
  mod("roof", "shed", "Shed"),
  mod("roof", "hip-civic", "Civic hip"),
  mod("entrance", "door", "Door"),
  mod("entrance", "wide", "Wide door"),
  mod("entrance", "canopy", "Canopy"),
  mod("entrance", "awning", "Awning"),
  mod("entrance", "loading", "Loading bay"),
  mod("balcony", "none", "No balcony"),
  mod("balcony", "rail", "Rail stack"),
  mod("balcony", "terrace", "Roof terrace"),
  mod("signage", "none", "No sign"),
  mod("signage", "fascia", "Fascia"),
  mod("signage", "blade", "Blade"),
  mod("signage", "roof-bar", "Roof bar"),
  mod("landscaping", "none", "Bare lot"),
  mod("landscaping", "lawn", "Lawn walk"),
  mod("landscaping", "plaza", "Plaza pave"),
  mod("landscaping", "hedge", "Hedge yard"),
  mod("lighting", "none", "Unlit"),
  mod("lighting", "warm", "Warm windows"),
  mod("lighting", "cool", "Cool canopy"),
  mod("interior", "office-grid", "Office grid"),
  mod("interior", "loft-open", "Open loft"),
  mod("interior", "cafe-floor", "Cafe floor"),
  mod("interior", "hall-nave", "Hall nave"),
  mod("interior", "lab-bay", "Lab bay"),
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

export type GrammarPack = {
  id: string;
  label: string;
  family?: ArchFamily;
  modules: KitEntry[];
};

export const CITY_PACKS: GrammarPack[] = [
  {
    id: assetId("pack", "northshore.core"),
    label: "Northshore core",
    modules: GRAMMAR_MODULES,
  },
];

export const CITY_KIT = {
  buildings: BUILDING_KITS,
  trees: TREE_KITS,
  props: PROP_KITS,
  materials: MATERIAL_KITS,
  modules: GRAMMAR_MODULES,
  packs: CITY_PACKS,
};

export function kitForFamily(family: ArchFamily) {
  return BUILDING_KITS.find((k) => k.family === family) ?? BUILDING_KITS[1]!;
}

export function modulesForSlot(slot: GrammarSlot) {
  return GRAMMAR_MODULES.filter((k) => k.slot === slot);
}

export function kitIdFor(slot: GrammarSlot, variant: string) {
  return GRAMMAR_MODULES.find((k) => k.slot === slot && k.variant === variant)?.id ?? assetId("module", `${slot}.${variant}`);
}

export function registerKit(entry: KitEntry, into: KitKind = entry.kind) {
  const bag =
    into === "building"
      ? BUILDING_KITS
      : into === "tree"
        ? TREE_KITS
        : into === "prop"
          ? PROP_KITS
          : into === "module"
            ? GRAMMAR_MODULES
            : MATERIAL_KITS;
  if (!bag.some((k) => k.id === entry.id)) bag.push(entry);
  return entry.id;
}

export function registerPack(pack: GrammarPack) {
  if (!CITY_PACKS.some((p) => p.id === pack.id)) CITY_PACKS.push(pack);
  for (const m of pack.modules) registerKit(entry("module", m.slot ?? "wall", m.variant ?? m.slug, m.label, { slot: m.slot, variant: m.variant }));
  return pack.id;
}
