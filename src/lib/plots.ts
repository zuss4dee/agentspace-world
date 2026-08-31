import { DISTRICTS, GRID, ROAD_XS, ROAD_YS, TERRAIN, WORLD_BUILDINGS, ANCHOR_BUILDING_ID } from "./campus";

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
  groupLabel: string;
};

const ZONE_PRICE: Record<PlotZone, number> = {
  ultimate: 400,
  downtown: 999,
  midtown: 399,
  uptown: 79,
  outskirts: 29,
};

function zoneFor(districtId: string): PlotZone {
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

function coversAnchor(ax: number, ay: number, aw: number, ah: number, x: number, y: number, w: number, h: number) {
  return x < ax + aw && x + w > ax && y < ay + ah && y + h > ay;
}

function packFrom(used: boolean[][], x0: number, y0: number, maxW: number, maxH: number) {
  if (used[y0]![x0] || blocked(x0, y0)) return null;
  let w = 1;
  while (x0 + w < GRID && w < maxW && !used[y0]![x0 + w] && !blocked(x0 + w, y0)) w++;
  let h = 1;
  grow: while (y0 + h < GRID && h < maxH) {
    for (let x = x0; x < x0 + w; x++) {
      if (used[y0 + h]![x] || blocked(x, y0 + h)) break grow;
    }
    h++;
  }
  if (w < 3 || h < 3) return null;
  return { w, h };
}

export function makePlots(): Plot[] {
  const plots: Plot[] = [];
  const anchor = WORLD_BUILDINGS.find((b) => b.id === ANCHOR_BUILDING_ID)!;
  const used: boolean[][] = Array.from({ length: GRID }, () => Array.from({ length: GRID }, () => false));

  plots.push({
    id: `plot-b-${anchor.id}`,
    x: anchor.origin.x,
    y: anchor.origin.y,
    w: anchor.size.x,
    h: anchor.size.y,
    kind: "owned",
    districtId: anchor.districtId,
    buildingId: anchor.id,
    price: ZONE_PRICE.downtown,
    zone: "downtown",
    groupLabel: "Echt House",
  });
  for (let y = anchor.origin.y; y < anchor.origin.y + anchor.size.y; y++) {
    for (let x = anchor.origin.x; x < anchor.origin.x + anchor.size.x; x++) used[y]![x] = true;
  }

  const lotN: Record<string, number> = {};
  for (const d of DISTRICTS) {
    for (let y = d.origin.y; y < d.origin.y + d.size.y; y++) {
      for (let x = d.origin.x; x < d.origin.x + d.size.x; x++) {
        const pack = packFrom(used, x, y, 6, 6);
        if (!pack) continue;
        if (coversAnchor(anchor.origin.x, anchor.origin.y, anchor.size.x, anchor.size.y, x, y, pack.w, pack.h)) continue;
        const n = (lotN[d.id] = (lotN[d.id] ?? 0) + 1);
        const zone = zoneFor(d.id);
        plots.push({
          id: `land-${d.id}-${n}`,
          x,
          y,
          w: pack.w,
          h: pack.h,
          kind: "sale",
          districtId: d.id,
          price: ZONE_PRICE[zone],
          zone,
          groupLabel: `${d.label} · Lot ${n}`,
        });
        for (let yy = y; yy < y + pack.h; yy++) {
          for (let xx = x; xx < x + pack.w; xx++) used[yy]![xx] = true;
        }
      }
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

/** One tile on the map is an 8 m square — enough for a room or a loading bay. */
export const TILE_METERS = 8;

export type LandUse = {
  id: string;
  name: string;
  minW: number;
  minH: number;
  blurb: string;
};

export const LAND_USES: LandUse[] = [
  { id: "kiosk", name: "Kiosk / stall", minW: 3, minH: 3, blurb: "Street stall, gatehouse, or newsbox." },
  { id: "house", name: "House / loft", minW: 3, minH: 3, blurb: "A founder loft or row house." },
  { id: "shop", name: "Shop / cafe", minW: 3, minH: 3, blurb: "Ground-floor shop with a door on the street." },
  { id: "studio", name: "Studio", minW: 4, minH: 3, blurb: "Workshop, gallery, or cut room." },
  { id: "office", name: "Office", minW: 4, minH: 3, blurb: "A two-to-four storey office for a team." },
  { id: "warehouse", name: "Warehouse / works", minW: 5, minH: 4, blurb: "Shed, loading yard, and racking." },
  { id: "lab", name: "Lab", minW: 5, minH: 4, blurb: "Quiet research stack or conference glass." },
  { id: "hq", name: "HQ / tower", minW: 5, minH: 4, blurb: "A landmark office that reads from the plaza." },
];

export function usesForPlot(p: Plot) {
  return LAND_USES.filter((u) => p.w >= u.minW && p.h >= u.minH);
}

export function plotArea(p: Plot) {
  const tiles = p.w * p.h;
  return {
    tiles,
    meters: tiles * TILE_METERS * TILE_METERS,
    footprint: `${p.w} × ${p.h}`,
  };
}

export function districtForPlot(p: Plot) {
  return DISTRICTS.find((d) => d.id === p.districtId);
}
