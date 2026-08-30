import { DISTRICTS, GRID, ROAD_XS, ROAD_YS, TERRAIN, WORLD_BUILDINGS, districtAt } from "./campus";
import { isCivicBuilding } from "./companies";

export type PlotKind = "sale" | "owned" | "park" | "civic";
export type PlotZone = "ultimate" | "downtown" | "midtown" | "uptown" | "outskirts";

export type Plot = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  kind: PlotKind;
  districtId: string;
  buildingId?: string;
  price: number;
  zone: PlotZone;
};

const ZONE_PRICE: Record<PlotZone, number> = {
  ultimate: 400,
  downtown: 999,
  midtown: 399,
  uptown: 79,
  outskirts: 29,
};

function zoneFor(districtId: string, buildingId?: string): PlotZone {
  if (buildingId === "hq") return "ultimate";
  const d = DISTRICTS.find((item) => item.id === districtId);
  const t = d?.theme;
  if (t === "executive" || t === "tech" || t === "finance" || t === "campus") return "downtown";
  if (t === "operations" || t === "research") return "midtown";
  if (t === "creative" || t === "residential") return "uptown";
  return "outskirts";
}

function blocked(x: number, y: number) {
  if (x < 0 || y < 0 || x >= GRID || y >= GRID) return true;
  const t = TERRAIN[y]![x]!;
  return t === "road" || t === "water" || ROAD_XS.includes(x) || ROAD_YS.includes(y);
}

export function makePlots(): Plot[] {
  const plots: Plot[] = [];
  const claimed = new Set<string>();
  const key = (x: number, y: number) => `${x},${y}`;

  for (const b of WORLD_BUILDINGS) {
    const civic = isCivicBuilding(b.id);
    const zone = zoneFor(b.districtId, b.id);
    plots.push({
      id: `plot-b-${b.id}`,
      x: b.origin.x,
      y: b.origin.y,
      w: b.size.x,
      h: b.size.y,
      kind: civic ? "civic" : "owned",
      districtId: b.districtId,
      buildingId: b.id,
      price: ZONE_PRICE[zone],
      zone,
    });
    for (let y = b.origin.y; y < b.origin.y + b.size.y; y++) {
      for (let x = b.origin.x; x < b.origin.x + b.size.x; x++) claimed.add(key(x, y));
    }
  }

  for (let y = 1; y < GRID - 1; y += 2) {
    for (let x = 1; x < GRID - 1; x += 2) {
      if (claimed.has(key(x, y)) || claimed.has(key(x + 1, y)) || claimed.has(key(x, y + 1))) continue;
      if (blocked(x, y) || blocked(x + 1, y) || blocked(x, y + 1) || blocked(x + 1, y + 1)) continue;
      const tiles = [TERRAIN[y]![x], TERRAIN[y]![x + 1], TERRAIN[y + 1]![x], TERRAIN[y + 1]![x + 1]];
      const park = tiles.filter((t) => t === "park").length >= 2;
      const d = districtAt(x + 0.5, y + 0.5);
      const zone = zoneFor(d?.id ?? "southpark");
      const kind: PlotKind = park ? "park" : "sale";
      plots.push({
        id: `plot-${x}-${y}`,
        x,
        y,
        w: 2,
        h: 2,
        kind,
        districtId: d?.id ?? "southpark",
        price: ZONE_PRICE[zone],
        zone,
      });
      claimed.add(key(x, y));
      claimed.add(key(x + 1, y));
      claimed.add(key(x, y + 1));
      claimed.add(key(x + 1, y + 1));
    }
  }
  return plots;
}

export const PLOTS = makePlots();

export function plotAt(x: number, y: number) {
  return PLOTS.find((p) => x >= p.x && y >= p.y && x < p.x + p.w && y < p.y + p.h);
}

export function plotsForSale(claimed: Iterable<string> = []) {
  const skip = new Set(claimed);
  return PLOTS.filter((p) => p.kind === "sale" && !skip.has(p.id));
}

export const PLOT_BANDS = [
  { id: "downtown" as const, label: "Downtown", blurb: "Prime city-center visibility." },
  { id: "midtown" as const, label: "Midtown", blurb: "A balanced location for growing brands." },
  { id: "uptown" as const, label: "Uptown", blurb: "A growing neighbourhood with room to rise." },
  { id: "outskirts" as const, label: "Outskirts", blurb: "An accessible way to join the city." },
];
