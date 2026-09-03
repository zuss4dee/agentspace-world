import { WORLD_BUILDINGS } from "./campus";
import type { AdImageFrame, BuildingSpec, CompanyProfile, LogoPose } from "./building-spec";
import { COMPANIES, companyForBuilding } from "./companies";
import { getPlot } from "./plots";
import type { Building } from "./types";
import { cleanPalette, isCompanyTier } from "./brand-profile";

export type { CompanyProfile, LogoPose } from "./building-spec";

/** Profile updates; `logoPose: null` clears a saved outdoor logo placement. */
export type CompanyProfilePatch = Partial<Omit<CompanyProfile, "logoPose">> & {
  logoPose?: LogoPose | null;
};

export const EMPTY_PROFILE: CompanyProfile = {
  name: "",
  logo: "",
  website: "",
  does: "",
  description: "",
  founder: "",
  team: "",
  visitorMessage: "",
  adHeadline: "",
  adImage: "",
  ctaLabel: "",
  ctaUrl: "",
};

/** Normalize a user-entered URL for safe external navigation. */
export function normalizeWebsiteUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withProto);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.href;
  } catch {
    return null;
  }
}

export function visitSiteUrl(profile: Pick<CompanyProfile, "website">): string | null {
  return normalizeWebsiteUrl(profile.website ?? "");
}

export const PROFILE_STORAGE_KEY = "agentspace.building-profiles.v1";

/** Authored first-district copy so a click is never an empty card. */
export const BUILDING_PROFILES: Record<string, CompanyProfile> = {
  hq: {
    name: "Agentspace",
    logo: "",
    does: "Runs the open city — HQ, lots, and the streets agents walk.",
    description:
      "Agentspace HQ sits on Corporate glass. The week is assigned from this floor: who gets a desk, which lot opens, and what the city is for.",
    founder: "Jarvis",
    team: "Jarvis, Friday",
    visitorMessage: "The door is open. Come up — the city is already running.",
  },
  finance: {
    name: "Ledger House",
    logo: "",
    does: "Keeps the city’s books, bids, and burn in one house.",
    description:
      "Quiet glass next to HQ. Midas reads the numbers so the rest of Agentspace can ship without guessing the till.",
    founder: "Midas",
    team: "Midas, Watchtower",
    visitorMessage: "If you are here about a bid or a burn, you are in the right house.",
  },
  hall: {
    name: "Board Hall",
    logo: "",
    does: "Public table for the companies that share this block.",
    description:
      "A civic hall, not a tenant. Round table, long light, no lease on the door. The district meets here when the street is not enough.",
    founder: "",
    team: "Athena",
    visitorMessage: "Sit if you have something the block should hear.",
  },
  pavilion: {
    name: "Lawn Pavilion",
    logo: "",
    does: "Shade on the parklands — public fabric, not a shop.",
    description:
      "A small civic roof on the lawn. Agents cut through; visitors rest. Nothing is for sale here except the afternoon.",
    founder: "",
    team: "",
    visitorMessage: "Stay as long as the light is good.",
  },
  loft: {
    name: "Echt Studio",
    logo: "",
    does: "Campaigns and the product surface for Echt.",
    description:
      "Upstairs on Startup Row: mood walls, decks, and the look of the thing Echt is shipping this week.",
    founder: "Vega",
    team: "Vega, Merlin",
    visitorMessage: "If you brought a brief, pin it. If you brought a feeling, even better.",
  },
  incubator: {
    name: "Echt",
    logo: "https://www.useecht.com/icon.svg?icon.0dies.oh8h0xt.svg",
    does: "A startup on Agentspace — desks downstairs, founder room on the glass.",
    description:
      "Echt House is the company building on Startup Row. Floor desks, a ship table, and the front door the city actually uses.",
    founder: "Echt",
    team: "Vega, Merlin",
    visitorMessage: "We are in the middle of a ship. Come in anyway — the kettle is on.",
  },
  "seed-cafe": {
    name: "Seed Cafe",
    logo: "",
    does: "The cafe that onboards walk-ins next door to Echt.",
    description:
      "Bar, booth, warm roof. Seed is where new agents sit before they pick a desk. Coffee is the onboarding.",
    founder: "Seed",
    team: "Seed",
    visitorMessage: "Order something. Tell us who you are when you are ready.",
  },
  retail: {
    name: "Ribbon Shop",
    logo: "",
    does: "Seed’s street window — small goods for the row.",
    description:
      "A shopfront on Startup Row. Ribbon is the till and the window display; Seed runs it so the cafe is not the only door.",
    founder: "Seed",
    team: "Seed",
    visitorMessage: "Look, then buy, then come next door for the rest.",
  },
  studio: {
    name: "Signal Studio",
    logo: "",
    does: "Makes the look of the world — edit bays and a mood wall.",
    description:
      "Signal’s main floor on Creative. This is where the city’s surfaces get their colour before they hit the street.",
    founder: "Signal",
    team: "Vanta, Signal",
    visitorMessage: "If it is on a wall in this city, it probably started in this room.",
  },
  cottage: {
    name: "Vanta Cottage",
    logo: "",
    does: "Signal’s quiet house — easel, porch, and after-hours work.",
    description:
      "A small roof behind the studio. Vanta is where Signal drafts when the edit bay is too loud.",
    founder: "Signal",
    team: "Vanta",
    visitorMessage: "Knock. If the easel is out, come around the side.",
  },
  atlas: {
    name: "Atlas",
    logo: "",
    does: "A tech office — product, APIs, and a quiet floor of desks.",
    description:
      "Atlas Frame sits on the corporate block next to Ledger House. Concrete frame, punched windows, a roof bar you can read from the street.",
    founder: "Atlas",
    team: "Atlas floor",
    visitorMessage: "If you have a spec, we have a desk. Come up.",
  },
  airwave: {
    name: "Airwave",
    logo: "",
    does: "Media house — edit, mix, and a shed that faces the street.",
    description:
      "Dark metal on Creative. Airwave is where the city’s sound and picture get cut before they go out.",
    founder: "Airwave",
    team: "Control, mix",
    visitorMessage: "Headphones on the hook. Sit in if the red light is off.",
  },
  "helix-lab": {
    name: "Helix Lab",
    logo: "",
    does: "Research — quiet racks, a terrace, and a long glass strip.",
    description:
      "Helix sits on Research. Cool light, hedge yard, a roof you can step onto when the bench is enough.",
    founder: "Helix",
    team: "Helix, Northwind",
    visitorMessage: "Badge at the canopy. The terrace is open after four.",
  },
  foundry: {
    name: "Forge Works",
    logo: "",
    does: "Industrial yard — sawtooth sheds and a loading door.",
    description:
      "Brick and metal south of the mill. Forge is the works: bays, a roof bar, no lawn.",
    founder: "Forge",
    team: "Bay crew",
    visitorMessage: "Stay clear of the bay when the door is up. The office is the small door.",
  },
};

export function letterMark(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "·";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

export function profileFromCompany(companyId?: string): CompanyProfile | undefined {
  if (!companyId) return undefined;
  const c = COMPANIES[companyId];
  if (!c) return undefined;
  return {
    name: c.name,
    logo: "",
    does: c.does,
    description: c.does,
    founder: "",
    team: "",
    visitorMessage: "",
  };
}

const TEXT_KEYS = Object.keys(EMPTY_PROFILE) as Array<
  | "name"
  | "logo"
  | "website"
  | "does"
  | "description"
  | "founder"
  | "team"
  | "visitorMessage"
  | "adHeadline"
  | "adImage"
  | "ctaLabel"
  | "ctaUrl"
>;

/** Ad fields that may be cleared explicitly (empty string removes prior value). */
const CLEARABLE_AD_KEYS = ["adHeadline", "adImage", "ctaLabel", "ctaUrl"] as const;

const AD_IMAGE_FRAMES = new Set<AdImageFrame>(["landscape", "square", "portrait"]);

function isAdImageFrame(v: unknown): v is AdImageFrame {
  return typeof v === "string" && AD_IMAGE_FRAMES.has(v as AdImageFrame);
}

function normalizeYaw(deg: number): number {
  const n = deg % 360;
  return n < 0 ? n + 360 : n;
}

function parseLogoPose(v: unknown): LogoPose | undefined {
  if (!v || typeof v !== "object") return undefined;
  const p = v as Record<string, unknown>;
  if (typeof p.x !== "number" || typeof p.z !== "number" || typeof p.yaw !== "number") return undefined;
  if (!Number.isFinite(p.x) || !Number.isFinite(p.z) || !Number.isFinite(p.yaw)) return undefined;
  return { x: p.x, z: p.z, yaw: normalizeYaw(p.yaw) };
}

export function mergeProfile(...parts: Array<CompanyProfilePatch | undefined>): CompanyProfile {
  const out: CompanyProfile = { ...EMPTY_PROFILE };
  for (const part of parts) {
    if (!part) continue;
    for (const key of TEXT_KEYS) {
      if ((CLEARABLE_AD_KEYS as readonly string[]).includes(key)) continue;
      const v = part[key];
      if (typeof v === "string" && v.trim()) out[key] = v;
    }
    for (const key of CLEARABLE_AD_KEYS) {
      if (!Object.prototype.hasOwnProperty.call(part, key)) continue;
      const v = part[key];
      if (typeof v !== "string") continue;
      if (v.trim()) out[key] = v;
      else out[key] = "";
    }
    if (isAdImageFrame(part.adImageFrame)) out.adImageFrame = part.adImageFrame;
    if (isCompanyTier(part.tier)) out.tier = part.tier;
    if (Array.isArray(part.palette)) out.palette = cleanPalette(part.palette);
    if (part.brand && typeof part.brand === "object") out.brand = { ...out.brand, ...part.brand };
    if (typeof part.buildingAssetId === "string" && part.buildingAssetId.trim()) {
      out.buildingAssetId = part.buildingAssetId.trim();
    }
    if (part.buildingMeters?.width && part.buildingMeters.depth) {
      out.buildingMeters = { ...part.buildingMeters };
    }
    if (part.buildingStatus === "building" || part.buildingStatus === "ready" || part.buildingStatus === "failed") {
      out.buildingStatus = part.buildingStatus;
    }
    if ("logoPose" in part) {
      if (part.logoPose === null || part.logoPose === undefined) {
        delete out.logoPose;
      } else {
        const pose = parseLogoPose(part.logoPose);
        if (pose) out.logoPose = pose;
      }
    }
  }
  return out;
}

export function profileOf(spec: BuildingSpec | undefined, buildingId?: string): CompanyProfile {
  const building = buildingId ? WORLD_BUILDINGS.find((b) => b.id === buildingId) : undefined;
  const company = buildingId ? companyForBuilding(buildingId) : spec?.companyId ? COMPANIES[spec.companyId] : undefined;
  return mergeProfile(
    company ? profileFromCompany(company.id) : undefined,
    buildingId ? BUILDING_PROFILES[buildingId] : undefined,
    building?.purpose
      ? { name: building.name, description: building.purpose, does: company?.does ?? building.purpose }
      : building
        ? { name: building.name }
        : undefined,
    spec?.profile,
  );
}

export function defaultClaimProfile(useName?: string): CompanyProfile {
  return {
    name: useName ? useName : "Your company",
    logo: "",
    website: "",
    does: "A new house on claimed land.",
    description: "You just claimed this lot. Write who you are — name, trade, and a line for the people who knock.",
    founder: "",
    team: "",
    visitorMessage: "We just moved in. Come say hello.",
  };
}

export function loadStoredProfiles(): Record<string, CompanyProfile> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, Partial<CompanyProfile>>;
    const out: Record<string, CompanyProfile> = {};
    for (const [id, p] of Object.entries(parsed ?? {})) {
      if (!p || typeof p !== "object") continue;
      out[id] = mergeProfile(p);
    }
    return out;
  } catch {
    return {};
  }
}

export function saveStoredProfiles(map: Record<string, CompanyProfile>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* ephemeral filesystem / quota */
  }
}

export function profilesFromSpecs(specs: Record<string, BuildingSpec>) {
  const out: Record<string, CompanyProfile> = {};
  for (const [id, spec] of Object.entries(specs)) {
    if (spec.profile) out[id] = mergeProfile(spec.profile);
  }
  return out;
}

export function applyStoredProfiles(
  specs: Record<string, BuildingSpec>,
  stored: Record<string, CompanyProfile>,
): Record<string, BuildingSpec> {
  const next = { ...specs };
  for (const [id, profile] of Object.entries(stored)) {
    const spec = next[id];
    if (spec) next[id] = { ...spec, profile: mergeProfile(spec.profile, profile) };
  }
  return next;
}

/** Building used for interior / enter. World buildings first; claimed lots get a stand-in from the plot. */
export function occupiedBuilding(id: string, spec?: BuildingSpec): Building | undefined {
  const listed = WORLD_BUILDINGS.find((b) => b.id === id);
  if (listed) return listed;
  const p = getPlot(id);
  if (!p) return undefined;
  const profile = profileOf(spec, id);
  return {
    id,
    name: profile.name || p.groupLabel || "Building",
    kind: "office",
    style: "office",
    districtId: p.districtId,
    origin: { x: p.x, y: p.y },
    size: { x: p.w, y: p.h },
    height: spec?.height ?? 40,
    roof: spec?.materials.roof ?? "#3f4654",
    wall: spec?.materials.wall ?? "#d4dbe4",
    wallDark: spec?.materials.wallDark ?? "#6a7b96",
    accent: spec?.materials.accent ?? "#ed712e",
    sign: spec?.signage.text,
    purpose: profile.does,
    assetId: spec?.packId ?? `claim.${id}`,
    stations: [{ id: `${id}-desk`, name: "Desk", x: p.x + p.w / 2, y: p.y + p.h / 2 }],
  };
}
