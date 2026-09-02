import type { Building } from "./types";
import type { BrandProfile, CompanyTier } from "./brand-profile";

export type CompanyProfile = {
  name: string;
  logo: string;
  website?: string;
  does: string;
  description: string;
  founder: string;
  team: string;
  visitorMessage: string;
  /** Brand fields pulled from the company website and confirmed in the claim wizard. */
  tier?: CompanyTier;
  /** #rrggbb, primary first — palette[0] is the map accent. */
  palette?: string[];
  brand?: Partial<BrandProfile>;
};

export type ArchFamily =
  | "office"
  | "startup"
  | "townhouse"
  | "apartment"
  | "warehouse"
  | "studio"
  | "research"
  | "civic"
  | "cafe"
  | "retail"
  | "industrial"
  | "hq"
  | "finance"
  | "media";

export const BUILDING_SPEC_VERSION = 1;

export type GrammarSlot =
  | "foundation"
  | "floor"
  | "wall"
  | "window"
  | "roof"
  | "entrance"
  | "balcony"
  | "signage"
  | "landscaping"
  | "lighting"
  | "interior";

export type MassingId =
  | "block"
  | "podium-tower"
  | "wing"
  | "gable-row"
  | "colonnade"
  | "shopfront"
  | "loading"
  | "sawtooth"
  | "northlight"
  | "balcony-stack"
  | "ribbon";

export type WindowKind = "punch" | "strip" | "curtain" | "storefront" | "none";
export type RoofKind = "flat" | "gable" | "shed" | "hip-civic";
export type WallKind = "brick" | "concrete" | "metal" | "plaster" | "curtain" | "limestone";
export type EntranceKind = "door" | "wide" | "canopy" | "awning" | "loading";
export type BalconyKind = "none" | "rail" | "terrace";
export type SignageKind = "none" | "fascia" | "blade" | "roof-bar";
export type LandscapeKind = "none" | "lawn" | "plaza" | "hedge";
export type LightingKind = "none" | "warm" | "cool";
export type InteriorKind = "office-grid" | "loft-open" | "cafe-floor" | "hall-nave" | "lab-bay";
export type FoundationKind = "plinth" | "pad-wide" | "loading-slab";

export type ModuleRef = {
  slot: GrammarSlot;
  kitId: string;
  variant: string;
};

export type BuildingMaterials = {
  wall: string;
  wallDark: string;
  roof: string;
  accent: string;
  glass: string;
  mullion: string;
  plinth: string;
};

export type BuildingSpec = {
  id: string;
  companyId?: string;
  family: ArchFamily;
  style: string;
  massing: MassingId;
  version: number;
  floors: number;
  height: number;
  footprint: { w: number; d: number; setback: number; tilesW: number; tilesH: number };
  materials: BuildingMaterials;
  signage: { text: string; color: string };
  modules: ModuleRef[];
  packId?: string;
  /** Tenant card shown when someone clicks the occupied building. */
  profile?: CompanyProfile;
};

export const GRAMMAR_SLOTS: GrammarSlot[] = [
  "foundation",
  "floor",
  "wall",
  "window",
  "roof",
  "entrance",
  "balcony",
  "signage",
  "landscaping",
  "lighting",
  "interior",
];

/** JSON Schema for saved buildings. Marketplace packs must emit this shape. */
export const BUILDING_SPEC_SCHEMA = {
  $id: "agentspace.building-spec.v1",
  type: "object",
  additionalProperties: false,
  required: ["id", "family", "style", "massing", "version", "floors", "height", "footprint", "materials", "signage", "modules"],
  properties: {
    id: { type: "string" },
    companyId: { type: "string" },
    family: {
      type: "string",
      enum: [
        "office",
        "startup",
        "townhouse",
        "apartment",
        "warehouse",
        "studio",
        "research",
        "civic",
        "cafe",
        "retail",
        "industrial",
        "hq",
        "finance",
        "media",
      ],
    },
    style: { type: "string" },
    massing: {
      type: "string",
      enum: [
        "block",
        "podium-tower",
        "wing",
        "gable-row",
        "colonnade",
        "shopfront",
        "loading",
        "sawtooth",
        "northlight",
        "balcony-stack",
        "ribbon",
      ],
    },
    version: { type: "integer", minimum: 1 },
    floors: { type: "integer", minimum: 1, maximum: 12 },
    height: { type: "number" },
    footprint: {
      type: "object",
      required: ["w", "d", "setback", "tilesW", "tilesH"],
      properties: {
        w: { type: "number" },
        d: { type: "number" },
        setback: { type: "number" },
        tilesW: { type: "number" },
        tilesH: { type: "number" },
      },
    },
    materials: {
      type: "object",
      required: ["wall", "wallDark", "roof", "accent", "glass", "mullion", "plinth"],
      properties: {
        wall: { type: "string" },
        wallDark: { type: "string" },
        roof: { type: "string" },
        accent: { type: "string" },
        glass: { type: "string" },
        mullion: { type: "string" },
        plinth: { type: "string" },
      },
    },
    signage: {
      type: "object",
      required: ["text", "color"],
      properties: { text: { type: "string" }, color: { type: "string" } },
    },
    modules: {
      type: "array",
      items: {
        type: "object",
        required: ["slot", "kitId", "variant"],
        properties: {
          slot: { type: "string", enum: GRAMMAR_SLOTS },
          kitId: { type: "string" },
          variant: { type: "string" },
        },
      },
    },
    packId: { type: "string" },
    profile: {
      type: "object",
      additionalProperties: false,
      properties: {
        name: { type: "string" },
        logo: { type: "string" },
        website: { type: "string" },
        tier: { type: "string", enum: ["enterprise", "smb", "startup"] },
        palette: { type: "array", items: { type: "string" } },
        brand: { type: "object" },
        does: { type: "string" },
        description: { type: "string" },
        founder: { type: "string" },
        team: { type: "string" },
        visitorMessage: { type: "string" },
      },
    },
  },
} as const;

export function moduleOf(spec: BuildingSpec, slot: GrammarSlot): ModuleRef | undefined {
  return spec.modules.find((m) => m.slot === slot);
}

export function variantOf(spec: BuildingSpec, slot: GrammarSlot, fallback: string) {
  return moduleOf(spec, slot)?.variant ?? fallback;
}

export function setModule(spec: BuildingSpec, slot: GrammarSlot, kitId: string, variant: string): BuildingSpec {
  const rest = spec.modules.filter((m) => m.slot !== slot);
  return {
    ...spec,
    version: spec.version + 1,
    modules: [...rest, { slot, kitId, variant }],
  };
}

export function specFingerprint(spec: BuildingSpec) {
  const mods = [...spec.modules].sort((a, b) => a.slot.localeCompare(b.slot));
  return JSON.stringify({
    id: spec.id,
    family: spec.family,
    style: spec.style,
    massing: spec.massing,
    floors: spec.floors,
    height: spec.height,
    footprint: spec.footprint,
    materials: spec.materials,
    signage: spec.signage,
    modules: mods,
    packId: spec.packId ?? "",
  });
}

export function cloneSpec(spec: BuildingSpec, id: string): BuildingSpec {
  return {
    ...spec,
    id,
    version: BUILDING_SPEC_VERSION,
    footprint: { ...spec.footprint },
    materials: { ...spec.materials },
    signage: { ...spec.signage },
    modules: spec.modules.map((m) => ({ ...m })),
    profile: spec.profile ? { ...spec.profile } : undefined,
  };
}

export function windowKindOf(spec: BuildingSpec): WindowKind {
  const v = variantOf(spec, "window", "punch");
  if (v === "punch" || v === "strip" || v === "curtain" || v === "storefront" || v === "none") return v;
  return "punch";
}

export function roofKindOf(spec: BuildingSpec): RoofKind {
  const v = variantOf(spec, "roof", "flat");
  if (v === "flat" || v === "gable" || v === "shed" || v === "hip-civic") return v;
  return "flat";
}

export function wallKindOf(spec: BuildingSpec): WallKind {
  const v = variantOf(spec, "wall", "concrete");
  if (v === "brick" || v === "concrete" || v === "metal" || v === "plaster" || v === "curtain" || v === "limestone") return v;
  return "concrete";
}

export function entranceKindOf(spec: BuildingSpec): EntranceKind {
  const v = variantOf(spec, "entrance", "door");
  if (v === "door" || v === "wide" || v === "canopy" || v === "awning" || v === "loading") return v;
  return "door";
}

export function balconyKindOf(spec: BuildingSpec): BalconyKind {
  const v = variantOf(spec, "balcony", "none");
  if (v === "none" || v === "rail" || v === "terrace") return v;
  return "none";
}

export function foundationKindOf(spec: BuildingSpec): FoundationKind {
  const v = variantOf(spec, "foundation", "plinth");
  if (v === "plinth" || v === "pad-wide" || v === "loading-slab") return v;
  return "plinth";
}

export function landscapeKindOf(spec: BuildingSpec): LandscapeKind {
  const v = variantOf(spec, "landscaping", "lawn");
  if (v === "none" || v === "lawn" || v === "plaza" || v === "hedge") return v;
  return "lawn";
}

export function lightingKindOf(spec: BuildingSpec): LightingKind {
  const v = variantOf(spec, "lighting", "warm");
  if (v === "none" || v === "warm" || v === "cool") return v;
  return "warm";
}

export function interiorKindOf(spec: BuildingSpec): InteriorKind {
  const v = variantOf(spec, "interior", "office-grid");
  if (v === "office-grid" || v === "loft-open" || v === "cafe-floor" || v === "hall-nave" || v === "lab-bay") return v;
  return "office-grid";
}

export type BuildingLike = Pick<Building, "id" | "style" | "kind" | "wall" | "roof" | "accent" | "wallDark" | "sign" | "size" | "height"> & {
  name?: string;
};
