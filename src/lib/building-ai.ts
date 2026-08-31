import { familyForBuilding, familyForUse, LOT_DEPTH, LOT_FILL } from "./architecture";
import { applyPreset, emptySpec, glassForFamily, presetByFamily } from "./building-grammar";
import { BUILDING_SPEC_VERSION, setModule, type BuildingSpec } from "./building-spec";
import { BUILDING_PROFILES } from "./company-profile";
import { BUILDING_OWNER } from "./companies";
import { buildingHeight, TILE } from "./coords";
import type { Building } from "./types";

export type BuildingBrief = {
  personality: string;
  industry: string;
  size: "cottage" | "shop" | "office" | "campus";
  architecturalStyle: string;
  companyId?: string;
  companyName?: string;
  sign?: string;
  tilesW?: number;
  tilesH?: number;
  height?: number;
  wall?: string;
  roof?: string;
  accent?: string;
  wallDark?: string;
};

const INDUSTRY_FAMILY: Record<string, BuildingSpec["family"]> = {
  tech: "startup",
  software: "startup",
  startup: "startup",
  finance: "finance",
  bank: "finance",
  office: "office",
  civic: "civic",
  government: "civic",
  food: "cafe",
  cafe: "cafe",
  restaurant: "cafe",
  retail: "retail",
  shop: "retail",
  lab: "research",
  research: "research",
  biotech: "research",
  factory: "industrial",
  industrial: "industrial",
  warehouse: "warehouse",
  logistics: "warehouse",
  studio: "studio",
  design: "studio",
  media: "media",
  broadcast: "media",
  housing: "townhouse",
  home: "townhouse",
  apartment: "apartment",
  hotel: "apartment",
  hq: "hq",
};

const STYLE_FAMILY: Record<string, BuildingSpec["family"]> = {
  curtain: "hq",
  glass: "hq",
  gable: "townhouse",
  brick: "townhouse",
  shed: "studio",
  sawtooth: "industrial",
  colonnade: "civic",
  storefront: "cafe",
  warehouse: "warehouse",
  ribbon: "research",
};

function fnv(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick<T>(list: readonly T[], n: number, salt: number): T {
  return list[(n + salt) % list.length]!;
}

function normalize(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function familyFromBrief(input: BuildingBrief): BuildingSpec["family"] {
  const industry = normalize(input.industry);
  const style = normalize(input.architecturalStyle);
  for (const [k, fam] of Object.entries(INDUSTRY_FAMILY)) {
    if (industry.includes(k)) return fam;
  }
  for (const [k, fam] of Object.entries(STYLE_FAMILY)) {
    if (style.includes(k)) return fam;
  }
  if (input.size === "cottage") return "townhouse";
  if (input.size === "shop") return "retail";
  if (input.size === "campus") return "hq";
  return "office";
}

function dimsFromSize(size: BuildingBrief["size"], tilesW?: number, tilesH?: number, height?: number) {
  const tw = tilesW ?? (size === "cottage" ? 3 : size === "shop" ? 3 : size === "campus" ? 5 : 4);
  const th = tilesH ?? (size === "campus" ? 4 : 3);
  const hgt = height ?? (size === "cottage" ? 36 : size === "shop" ? 34 : size === "campus" ? 88 : 52);
  return {
    tilesW: tw,
    tilesH: th,
    w: tw * TILE * LOT_FILL,
    d: th * TILE * LOT_DEPTH,
    height: buildingHeight(hgt),
  };
}

/**
 * Deterministic BuildingSpec from a company brief.
 * Same inputs always yield the same modules, materials, and massing.
 * Optional LLM later can fill this same schema; heuristics never use Math.random.
 */
export function specifyBuilding(input: BuildingBrief): BuildingSpec {
  const personality = normalize(input.personality);
  const industry = normalize(input.industry);
  const style = normalize(input.architecturalStyle);
  const key = [
    input.companyId ?? "",
    input.companyName ?? "",
    personality,
    industry,
    input.size,
    style,
    input.sign ?? "",
    String(input.tilesW ?? ""),
    String(input.tilesH ?? ""),
    String(input.height ?? ""),
    input.wall ?? "",
    input.roof ?? "",
    input.accent ?? "",
  ].join("|");
  const n = fnv(key);
  const family = familyFromBrief(input);
  const preset = presetByFamily(family);
  const dim = dimsFromSize(input.size, input.tilesW, input.tilesH, input.height);
  const id = input.companyId ? `co.${input.companyId}.${n.toString(16)}` : `spec.${n.toString(16)}`;
  let spec = applyPreset(emptySpec(id, family, dim.w, dim.d, dim.height, dim.tilesW, dim.tilesH), preset);
  spec.companyId = input.companyId;
  spec.signage = {
    text: (input.sign ?? input.companyName ?? "").slice(0, 12).toUpperCase(),
    color: input.accent ?? spec.materials.accent,
  };
  if (input.wall) spec.materials.wall = input.wall;
  if (input.wallDark) spec.materials.wallDark = input.wallDark;
  if (input.roof) spec.materials.roof = input.roof;
  if (input.accent) spec.materials.accent = input.accent;
  spec.materials.glass = glassForFamily(family);

  const roofs = ["flat", "gable", "shed", "hip-civic"] as const;
  const walls = ["brick", "concrete", "metal", "plaster", "curtain"] as const;
  const entrances = ["door", "wide", "canopy", "awning", "loading"] as const;
  const signs = ["none", "fascia", "blade", "roof-bar"] as const;
  const lands = ["lawn", "plaza", "hedge", "none"] as const;

  if (style.includes("gable")) spec = setModule(spec, "roof", spec.modules.find((m) => m.slot === "roof")!.kitId, "gable");
  else if (style.includes("shed") || style.includes("sawtooth")) spec = setModule(spec, "roof", spec.modules.find((m) => m.slot === "roof")!.kitId, "shed");
  else if (style.includes("civic") || style.includes("colonnade")) spec = setModule(spec, "roof", spec.modules.find((m) => m.slot === "roof")!.kitId, "hip-civic");
  else spec = setModule(spec, "roof", spec.modules.find((m) => m.slot === "roof")!.kitId, pick(roofs, n, 3));

  if (personality.includes("warm") || personality.includes("craft")) spec = setModule(spec, "wall", spec.modules.find((m) => m.slot === "wall")!.kitId, "brick");
  else if (personality.includes("quiet") || personality.includes("lab")) spec = setModule(spec, "wall", spec.modules.find((m) => m.slot === "wall")!.kitId, "concrete");
  else spec = setModule(spec, "wall", spec.modules.find((m) => m.slot === "wall")!.kitId, pick(walls, n, 7));

  spec = setModule(spec, "entrance", spec.modules.find((m) => m.slot === "entrance")!.kitId, pick(entrances, n, 11));
  const signPick = spec.signage.text ? signs.filter((s) => s !== "none") : signs;
  spec = setModule(spec, "signage", spec.modules.find((m) => m.slot === "signage")!.kitId, pick(signPick, n, 13));
  spec = setModule(spec, "landscaping", spec.modules.find((m) => m.slot === "landscaping")!.kitId, pick(lands, n, 17));
  spec.floors = Math.max(1, Math.min(8, spec.floors + ((n >> 5) % 3) - 1));
  spec.version = BUILDING_SPEC_VERSION;
  return spec;
}

export async function specifyBuildingAsync(input: BuildingBrief): Promise<BuildingSpec> {
  return specifyBuilding(input);
}

export function specFromBuilding(b: Building): BuildingSpec {
  const family = familyForBuilding(b);
  const w = b.size.x * TILE * LOT_FILL;
  const d = b.size.y * TILE * LOT_DEPTH;
  const height = buildingHeight(b.height);
  let spec = applyPreset(emptySpec(b.id, family, w, d, height, b.size.x, b.size.y), presetByFamily(family));
  spec.companyId = BUILDING_OWNER[b.id];
  spec.materials = {
    ...spec.materials,
    wall: b.wall,
    wallDark: b.wallDark,
    roof: b.roof,
    accent: b.accent,
  };
  spec.signage = { text: (b.sign ?? "").toUpperCase(), color: b.accent };
  spec.packId = b.assetId;
  spec.profile = BUILDING_PROFILES[b.id] ? { ...BUILDING_PROFILES[b.id]! } : spec.profile;
  spec.version = BUILDING_SPEC_VERSION;
  return spec;
}

export function specFromUse(
  id: string,
  useId: string,
  tilesW: number,
  tilesH: number,
  heightWorld: number,
  palette: { wall: string; roof: string; accent: string; wallDark?: string },
): BuildingSpec {
  const family = familyForUse(useId);
  const w = tilesW * TILE * LOT_FILL;
  const d = tilesH * TILE * LOT_DEPTH;
  let spec = applyPreset(emptySpec(id, family, w, d, heightWorld, tilesW, tilesH), presetByFamily(family));
  spec.materials = {
    ...spec.materials,
    wall: palette.wall,
    roof: palette.roof,
    accent: palette.accent,
    wallDark: palette.wallDark ?? spec.materials.wallDark,
  };
  return spec;
}
