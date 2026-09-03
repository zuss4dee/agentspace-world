import { withBrandAccent } from "@/lib/brand-profile";
import type { CompanyTier } from "@/lib/brand-profile";
import { specFromUse } from "@/lib/building-ai";
import { buildingMetersForAssetId } from "@/lib/building-meters";
import type { BuildingSpec, CompanyProfile } from "@/lib/building-spec";
import { h } from "@/lib/coords";
import { buildingFootprint, getPlot, LAND_USES } from "@/lib/plots";

/**
 * Seeded tenants whose Silicon City gallery GLBs occupy live CITY_PLOTS.
 * ClaimedMarks loads them the same way a finished claim does.
 * Not user-owned: they survive claim-session wipes and cannot be bought.
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
  tier: CompanyTier;
};

export const GENERATED_OCCUPANCY: readonly GeneratedOccupant[] = [
  {
    plotId: "land-corporate-1",
    companyId: "spark",
    companyName: "Spark AI",
    assetId: "pack.agentspace.building.gallery.spark.01",
    website: "",
    industry: "ai",
    palette: ["#e64980", "#f06595", "#15aabf"],
    logo: "",
    does: "Consumer AI with a corner shop HQ.",
    description: "A two-storey shop block and corner rotunda on Corporate Lot 1.",
    visitorMessage: "The awning is up. Come in.",
    adHeadline: "AI on the corner",
    tier: "smb",
  },
  {
    plotId: "land-research-5",
    companyId: "nova",
    companyName: "Nova Systems",
    assetId: "pack.agentspace.building.gallery.nova.01",
    website: "",
    industry: "software",
    palette: ["#3b5bdb", "#748ffc", "#ff6b6b"],
    logo: "",
    does: "Enterprise software from a stepped headquarters.",
    description: "L-podium and stacked tower with white fins, facing Research.",
    visitorMessage: "The plaza doors are open.",
    adHeadline: "Systems at scale",
    tier: "enterprise",
  },
  {
    plotId: "land-creative-2",
    companyId: "loft",
    companyName: "Loft Labs",
    assetId: "pack.agentspace.building.gallery.loft.01",
    website: "",
    industry: "creative",
    palette: ["#0ca678", "#38d9a9", "#fab005"],
    logo: "",
    does: "Creative tools from a converted warehouse loft.",
    description: "Barrel-vaulted workshop and a cantilevered glass studio on Creative.",
    visitorMessage: "The loading door is open. Drop in.",
    adHeadline: "Make it in the loft",
    tier: "startup",
  },
  {
    plotId: "land-creative-5",
    companyId: "orbit",
    companyName: "Orbit Labs",
    assetId: "pack.agentspace.building.gallery.orbit.01",
    website: "",
    industry: "saas",
    palette: ["#7048e8", "#9775fa", "#ff922b"],
    logo: "",
    does: "SaaS from a courtyard campus.",
    description: "U-shaped mixed-height wings around a planted court.",
    visitorMessage: "Cut through the court.",
    adHeadline: "In orbit",
    tier: "enterprise",
  },
  {
    plotId: "land-creative-3",
    companyId: "corner",
    companyName: "Corner Cafe",
    assetId: "pack.agentspace.building.gallery.corner.01",
    website: "",
    industry: "food",
    palette: ["#e8590c", "#ff922b", "#212529"],
    logo: "",
    does: "Neighbourhood cafe with a long shop front.",
    description: "A wide two-storey strip and a taller end pavilion on Creative.",
    visitorMessage: "Tables out front. Come sit.",
    adHeadline: "On the corner",
    tier: "smb",
  },
  {
    plotId: "land-labs-1",
    companyId: "forge",
    companyName: "Forge Works",
    assetId: "pack.agentspace.building.gallery.forge.01",
    website: "",
    industry: "manufacturing",
    palette: ["#c2410c", "#ea580c", "#1c1917"],
    logo: "",
    does: "Hardware and works from a deep industrial hall.",
    description: "Street office head attached to a long sawtooth hall on Labs.",
    visitorMessage: "The dock is clear. Come through.",
    adHeadline: "Built in the hall",
    tier: "startup",
  },
];

export const GENERATED_OCCUPANCY_PLOT_IDS: string[] = GENERATED_OCCUPANCY.map((row) => row.plotId);

/** Previous cube occupancy lots — drop leftover session specs so they cannot reappear. */
const RETIRED_OCCUPANCY_PLOT_IDS = ["land-corporate-2", "land-campus-1", "land-civic-2"] as const;

const OCCUPANCY_SET = new Set(GENERATED_OCCUPANCY_PLOT_IDS);
const RETIRED_SET = new Set<string>(RETIRED_OCCUPANCY_PLOT_IDS);

export function occupancyHas(plotId: string | null | undefined): boolean {
  return Boolean(plotId && OCCUPANCY_SET.has(plotId));
}

export function occupancyOrRetiredHas(plotId: string | null | undefined): boolean {
  return Boolean(plotId && (OCCUPANCY_SET.has(plotId) || RETIRED_SET.has(plotId)));
}

/** Claimed ids plus generated occupancy — used to hide sale stakes and block overlap. */
export function withOccupancyIds(claimed: Iterable<string>): string[] {
  return [...new Set([...claimed, ...GENERATED_OCCUPANCY_PLOT_IDS])];
}

function occupancyProfile(row: GeneratedOccupant): CompanyProfile {
  const meters = buildingMetersForAssetId(row.assetId);
  return {
    name: row.companyName,
    logo: row.logo,
    website: row.website,
    does: row.does,
    description: row.description,
    founder: "",
    team: "",
    visitorMessage: row.visitorMessage,
    adHeadline: row.adHeadline,
    ctaLabel: `Visit ${row.companyName}`,
    ctaUrl: row.website,
    tier: row.tier,
    palette: row.palette,
    buildingAssetId: row.assetId,
    buildingMeters: meters,
    buildingStatus: "ready",
    brand: {
      companyId: row.companyId,
      companyName: row.companyName,
      website: row.website,
      tier: row.tier,
      industry: row.industry,
      primaryColours: row.palette,
      logo: {
        wordmark: row.companyName.slice(0, 8).toUpperCase(),
        imageUrl: row.logo || null,
        assetPath: null,
      },
    },
  };
}

export function occupancySpecs(): Record<string, BuildingSpec> {
  const office = LAND_USES.find((u) => u.id === "office") ?? LAND_USES[0]!;
  const out: Record<string, BuildingSpec> = {};
  for (const row of GENERATED_OCCUPANCY) {
    const plot = getPlot(row.plotId);
    if (!plot) continue;
    const fp = buildingFootprint(plot, office, 0);
    const spec = specFromUse(
      row.plotId,
      office.id,
      fp?.w ?? plot.w,
      fp?.h ?? plot.h,
      h(fp?.height ?? office.height),
      {
        wall: row.palette[2] ?? "#d4dbe4",
        roof: row.palette[1] ?? "#3f4654",
        accent: row.palette[0] ?? "#c45c3a",
      },
    );
    out[row.plotId] = withBrandAccent({
      ...spec,
      companyId: row.companyId,
      packId: row.assetId,
      signage: { text: row.companyName.slice(0, 18).toUpperCase(), color: row.palette[0]! },
      profile: occupancyProfile(row),
    });
  }
  return out;
}

export function mergeOccupancySpecs(specs: Record<string, BuildingSpec>): Record<string, BuildingSpec> {
  return { ...specs, ...occupancySpecs() };
}

export function stripOccupancySpecs(specs: Record<string, BuildingSpec>): Record<string, BuildingSpec> {
  const next = { ...specs };
  for (const id of GENERATED_OCCUPANCY_PLOT_IDS) delete next[id];
  for (const id of RETIRED_OCCUPANCY_PLOT_IDS) delete next[id];
  for (const [id, spec] of Object.entries(next)) {
    const aid = spec.profile?.buildingAssetId ?? spec.packId;
    if (typeof aid === "string" && aid.includes(".building.test.")) delete next[id];
  }
  return next;
}
