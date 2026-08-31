import { LOT_BUILDINGS } from "./campus";
import { BUILDING_OWNER, COMPANIES } from "./companies";
import { PLOTS, type Plot, type PlotZone } from "./plots";

export const ZONE_TABLE: {
  zone: string;
  key: PlotZone;
  dot: string;
  priceLabel: string;
}[] = [
  { zone: "The Beacon", key: "ultimate", dot: "ns-dot ns-dot-ultimate", priceLabel: "Live bid" },
  { zone: "Downtown", key: "downtown", dot: "ns-dot ns-dot-downtown", priceLabel: "$999" },
  { zone: "Midtown", key: "midtown", dot: "ns-dot ns-dot-midtown", priceLabel: "$399" },
  { zone: "Uptown", key: "uptown", dot: "ns-dot ns-dot-uptown", priceLabel: "$79" },
  { zone: "Outskirts", key: "outskirts", dot: "ns-dot ns-dot-outskirts", priceLabel: "$29" },
];

export const ZONE_THEME: Record<
  PlotZone,
  {
    label: string;
    price: string;
    priceRaw: number;
    description: string;
    color: string;
    glow: string;
    bg: string;
    border: string;
    imgGradient: string;
  }
> = {
  ultimate: {
    label: "The Beacon",
    price: "$400",
    priceRaw: 400,
    description: "The city’s singular landmark plot, ringed by public lawn.",
    color: "#111",
    glow: "#111",
    bg: "#fff",
    border: "#111",
    imgGradient: "repeating-linear-gradient(-12deg, #fff, #fff 10px, #f3f3f3 10px, #f3f3f3 20px)",
  },
  downtown: {
    label: "Downtown",
    price: "$999",
    priceRaw: 999,
    description: "Prime location in the city center with maximum visibility and foot traffic.",
    color: "#111",
    glow: "#111",
    bg: "#fff",
    border: "#111",
    imgGradient: "repeating-linear-gradient(-12deg, #fff, #fff 10px, #f3f3f3 10px, #f3f3f3 20px)",
  },
  midtown: {
    label: "Midtown",
    price: "$399",
    priceRaw: 399,
    description: "A balanced location for growing brands.",
    color: "#111",
    glow: "#111",
    bg: "#fff",
    border: "#111",
    imgGradient: "repeating-linear-gradient(-12deg, #fff, #fff 10px, #eee 10px, #eee 20px)",
  },
  uptown: {
    label: "Uptown",
    price: "$79",
    priceRaw: 79,
    description: "A growing neighbourhood with room to rise.",
    color: "#111",
    glow: "#111",
    bg: "#fff",
    border: "#111",
    imgGradient: "repeating-linear-gradient(-12deg, #fff, #fff 10px, #e8e8e8 10px, #e8e8e8 20px)",
  },
  outskirts: {
    label: "Outskirts",
    price: "$29",
    priceRaw: 29,
    description: "Budget-friendly plots on the edge — perfect to start.",
    color: "#111",
    glow: "#111",
    bg: "#fff",
    border: "#111",
    imgGradient: "repeating-linear-gradient(-12deg, #fff, #fff 10px, #f7f7f7 10px, #f7f7f7 20px)",
  },
};

export const BEACON_NEXT_BID = 400;

export type ShopActivity = {
  id: string;
  brandName: string;
  zone: PlotZone;
  acquiredAt: number;
  plotId: string;
  websiteUrl?: string;
};

const HOURS = 3600_000;

export function shopActivity(): ShopActivity[] {
  const owned = PLOTS.filter((p) => p.kind === "owned" && p.buildingId);
  return owned.slice(0, 6).map((p, i) => {
    const b = LOT_BUILDINGS.find((item) => item.id === p.buildingId);
    const ownerId = p.buildingId ? BUILDING_OWNER[p.buildingId] : undefined;
    const brand = ownerId ? COMPANIES[ownerId]?.name : b?.name;
    return {
      id: p.id,
      brandName: brand ?? b?.name ?? "Northshore",
      zone: p.zone,
      acquiredAt: Date.now() - [19, 23, 28, 31, 34, 40][i]! * HOURS,
      plotId: p.id,
      websiteUrl: "/how",
    };
  });
}

export function relativePurchase(ts: number) {
  const m = Math.max(0, Math.floor((Date.now() - ts) / 60_000));
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
}

export function zoneCount(zone: PlotZone, claimed: Set<string>) {
  if (zone === "ultimate") return 0;
  return PLOTS.filter((p) => p.zone === zone && p.kind === "sale" && !claimed.has(p.id)).length;
}

export function sampleSalePlot(zone: PlotZone, claimed: Set<string>): Plot | undefined {
  return PLOTS.find((p) => p.zone === zone && p.kind === "sale" && !claimed.has(p.id));
}

export function beaconPlot() {
  return PLOTS.find((p) => p.zone === "ultimate") ?? PLOTS.find((p) => p.buildingId === "hq");
}

export type DirectoryEntry = {
  id: string;
  name: string;
  tagline: string;
  zone: PlotZone;
  buildingName: string;
  plotId: string;
};

export function directoryEntries(): DirectoryEntry[] {
  const seen = new Set<string>();
  const list: DirectoryEntry[] = [];
  for (const p of PLOTS) {
    if (p.kind !== "owned" || !p.buildingId) continue;
    const ownerId = BUILDING_OWNER[p.buildingId];
    if (!ownerId || ownerId === "civic" || seen.has(ownerId)) continue;
    seen.add(ownerId);
    const company = COMPANIES[ownerId];
    const b = LOT_BUILDINGS.find((item) => item.id === p.buildingId);
    if (!company || !b) continue;
    list.push({
      id: ownerId,
      name: company.name,
      tagline: company.does,
      zone: p.zone,
      buildingName: b.name,
      plotId: p.id,
    });
  }
  return list;
}
