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
    color: "hsl(43 96% 62%)",
    glow: "hsl(272 90% 62% / 0.45)",
    bg: "hsl(272 40% 10%)",
    border: "hsl(43 96% 56% / 0.38)",
    imgGradient: "linear-gradient(180deg, hsl(272 40% 12%) 0%, hsl(224 32% 6%) 100%)",
  },
  downtown: {
    label: "Downtown",
    price: "$999",
    priceRaw: 999,
    description: "Prime location in the city center with maximum visibility and foot traffic.",
    color: "hsl(43 96% 56%)",
    glow: "hsl(43 96% 56% / 0.45)",
    bg: "hsl(43 40% 10%)",
    border: "hsl(43 96% 56% / 0.2)",
    imgGradient: "linear-gradient(180deg, hsl(43 40% 8%) 0%, hsl(43 40% 4%) 100%)",
  },
  midtown: {
    label: "Midtown",
    price: "$399",
    priceRaw: 399,
    description: "A balanced location for growing brands.",
    color: "hsl(220 80% 70%)",
    glow: "hsl(220 70% 50% / 0.45)",
    bg: "hsl(220 40% 10%)",
    border: "hsl(220 60% 50% / 0.2)",
    imgGradient: "linear-gradient(180deg, hsl(220 40% 8%) 0%, hsl(220 40% 5%) 100%)",
  },
  uptown: {
    label: "Uptown",
    price: "$79",
    priceRaw: 79,
    description: "A growing neighbourhood with room to rise.",
    color: "hsl(160 60% 55%)",
    glow: "hsl(160 60% 45% / 0.45)",
    bg: "hsl(160 40% 8%)",
    border: "hsl(160 60% 45% / 0.2)",
    imgGradient: "linear-gradient(180deg, hsl(160 40% 7%) 0%, hsl(160 40% 4%) 100%)",
  },
  outskirts: {
    label: "Outskirts",
    price: "$29",
    priceRaw: 29,
    description: "Budget-friendly plots on the edge — perfect to start.",
    color: "hsl(30 80% 70%)",
    glow: "hsl(30 70% 50% / 0.45)",
    bg: "hsl(30 40% 10%)",
    border: "hsl(30 70% 50% / 0.2)",
    imgGradient: "linear-gradient(180deg, hsl(30 40% 8%) 0%, hsl(30 40% 5%) 100%)",
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
