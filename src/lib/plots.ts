import { DISTRICTS, GRID, ROAD_XS, ROAD_YS, TERRAIN, WORLD_BUILDINGS, ANCHOR_BUILDING_ID } from "./campus";
import { hash2 } from "./noise";

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

/** Lots one spectator can hold in a session. */
export const MAX_CLAIMS = 10;

/** Opening inventory. */
export const SALE_STOCK = 100_000;

/** South of the locked chapters. 250 × 400 cells = 100,000 pads. */
export const LAND_ORIGIN = { x: 0, y: 90 };
export const LAND_CELL = 6;
export const LAND_COLS = 250;
export const LAND_ROWS = 400;
export const LAND_COUNT = LAND_COLS * LAND_ROWS;

export function landBounds() {
  return {
    x0: LAND_ORIGIN.x,
    y0: LAND_ORIGIN.y,
    x1: LAND_ORIGIN.x + LAND_COLS * LAND_CELL,
    y1: LAND_ORIGIN.y + LAND_ROWS * LAND_CELL,
  };
}

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

function makeCityPlots(): Plot[] {
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

export const CITY_PLOTS = makeCityPlots();
/** City lots only. The 100k field is addressed by index — do not materialize it. */
export const PLOTS = CITY_PLOTS;

function latticeZone(row: number): PlotZone {
  if (row < 40) return "downtown";
  if (row < 120) return "midtown";
  if (row < 240) return "uptown";
  return "outskirts";
}

function latticeSize(col: number, row: number) {
  const r = hash2(col * 1.7, row * 2.3);
  if (r > 0.9) return { w: 5, h: 4 };
  if (r > 0.72) return { w: 4, h: 4 };
  if (r > 0.48) return { w: 4, h: 3 };
  return { w: 3, h: 3 };
}

export function latticeIndex(id: string) {
  if (!id.startsWith("l-")) return -1;
  const n = Number(id.slice(2));
  return Number.isInteger(n) && n >= 0 && n < LAND_COUNT ? n : -1;
}

export function latticePlot(i: number): Plot {
  const col = i % LAND_COLS;
  const row = Math.floor(i / LAND_COLS);
  const size = latticeSize(col, row);
  const zone = latticeZone(row);
  const x = LAND_ORIGIN.x + col * LAND_CELL;
  const y = LAND_ORIGIN.y + row * LAND_CELL;
  return {
    id: `l-${i}`,
    x,
    y,
    w: size.w,
    h: size.h,
    kind: "sale",
    districtId: "field",
    price: ZONE_PRICE[zone],
    zone,
    groupLabel: `South field · Lot ${i + 1}`,
  };
}

export function getPlot(id: string | null | undefined): Plot | undefined {
  if (!id) return undefined;
  const i = latticeIndex(id);
  if (i >= 0) return latticePlot(i);
  return CITY_PLOTS.find((p) => p.id === id);
}

export function plotAt(x: number, y: number) {
  const city = CITY_PLOTS.find((p) => x >= p.x && y >= p.y && x < p.x + p.w && y < p.y + p.h);
  if (city) return city;
  const b = landBounds();
  if (x < b.x0 || y < b.y0 || x >= b.x1 || y >= b.y1) return undefined;
  const col = Math.floor((x - LAND_ORIGIN.x) / LAND_CELL);
  const row = Math.floor((y - LAND_ORIGIN.y) / LAND_CELL);
  if (col < 0 || row < 0 || col >= LAND_COLS || row >= LAND_ROWS) return undefined;
  const p = latticePlot(row * LAND_COLS + col);
  if (x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h) return p;
  return undefined;
}

export function plotsForSale(claimed: Iterable<string> = []) {
  const skip = new Set(claimed);
  return CITY_PLOTS.filter((p) => p.kind === "sale" && !skip.has(p.id));
}

export function openSaleCount(claimed: Iterable<string> = []) {
  const skip = new Set(claimed);
  let taken = 0;
  for (const id of skip) {
    const p = getPlot(id);
    if (p?.kind === "sale") taken++;
  }
  return SALE_STOCK - taken;
}

export function listSalePlots(
  claimed: Iterable<string>,
  zone: PlotZone | "all",
  limit = 40,
  occupied?: Set<string>,
) {
  const skip = new Set(claimed);
  if (occupied) for (const id of occupied) skip.add(id);
  const out: Plot[] = [];
  for (const p of CITY_PLOTS) {
    if (p.kind !== "sale" || skip.has(p.id)) continue;
    if (zone !== "all" && p.zone !== zone) continue;
    out.push(p);
    if (out.length >= limit) return out;
  }
  for (let i = 0; i < LAND_COUNT && out.length < limit; i++) {
    const p = latticePlot(i);
    if (skip.has(p.id)) continue;
    if (zone !== "all" && p.zone !== zone) continue;
    out.push(p);
  }
  return out;
}

export const PLOT_BANDS = [
  { id: "downtown" as const, label: "Downtown", blurb: "Prime city-center visibility." },
  { id: "midtown" as const, label: "Midtown", blurb: "A balanced location for growing brands." },
  { id: "uptown" as const, label: "Uptown", blurb: "A growing neighbourhood with room to rise." },
  { id: "outskirts" as const, label: "Outskirts", blurb: "An accessible way to join the city." },
];

export const TILE_METERS = 8;

/** Extra tiles you may add onto a lot (grows east and south). */
export const MAX_EXPAND = 4;
/** No lot may grow past this edge, even with expand. */
export const MAX_LOT_EDGE = 12;

export type LandUse = {
  id: string;
  name: string;
  minW: number;
  minH: number;
  blurb: string;
  height: number;
};

export const LAND_USES: LandUse[] = [
  { id: "kiosk", name: "Kiosk / stall", minW: 3, minH: 3, blurb: "Street stall, gatehouse, or newsbox.", height: 1.15 },
  { id: "house", name: "House / loft", minW: 3, minH: 3, blurb: "A founder loft or row house.", height: 2.2 },
  { id: "shop", name: "Shop / cafe", minW: 3, minH: 3, blurb: "Ground-floor shop with a door on the street.", height: 2.05 },
  { id: "studio", name: "Studio", minW: 4, minH: 3, blurb: "Workshop, gallery, or cut room.", height: 2.7 },
  { id: "office", name: "Office", minW: 4, minH: 3, blurb: "A two-to-four storey office for a team.", height: 4.4 },
  { id: "warehouse", name: "Warehouse / works", minW: 5, minH: 4, blurb: "Shed, loading yard, and racking.", height: 3.1 },
  { id: "lab", name: "Lab", minW: 5, minH: 4, blurb: "Quiet research stack or conference glass.", height: 4.2 },
  { id: "hq", name: "HQ / tower", minW: 5, minH: 4, blurb: "A landmark office that reads from the plaza.", height: 6.4 },
];

export function usesForPlot(p: Plot, extra = 0) {
  const r = expandedRect(p, extra);
  return LAND_USES.filter((u) => r.w >= u.minW && r.h >= u.minH);
}

export function expandedRect(p: Plot, extra: number) {
  const e = Math.max(0, Math.min(MAX_EXPAND, Math.floor(extra)));
  return {
    x: p.x,
    y: p.y,
    w: Math.min(MAX_LOT_EDGE, p.w + e),
    h: Math.min(MAX_LOT_EDGE, p.h + e),
  };
}

export function expandPrice(p: Plot, extra: number) {
  const r = expandedRect(p, extra);
  const base = Math.max(1, p.w * p.h);
  return Math.round(p.price * ((r.w * r.h) / base));
}

function rectsOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function idsUnderRect(r: { x: number; y: number; w: number; h: number }) {
  const ids: string[] = [];
  for (const p of CITY_PLOTS) {
    if (p.kind === "sale" && rectsOverlap(r, p)) ids.push(p.id);
  }
  const b = landBounds();
  const x0 = Math.max(r.x, b.x0);
  const y0 = Math.max(r.y, b.y0);
  const x1 = Math.min(r.x + r.w, b.x1);
  const y1 = Math.min(r.y + r.h, b.y1);
  if (x1 > x0 && y1 > y0) {
    const c0 = Math.floor((x0 - LAND_ORIGIN.x) / LAND_CELL);
    const r0 = Math.floor((y0 - LAND_ORIGIN.y) / LAND_CELL);
    const c1 = Math.ceil((x1 - LAND_ORIGIN.x) / LAND_CELL);
    const r1 = Math.ceil((y1 - LAND_ORIGIN.y) / LAND_CELL);
    for (let row = r0; row < r1; row++) {
      for (let col = c0; col < c1; col++) {
        if (col < 0 || row < 0 || col >= LAND_COLS || row >= LAND_ROWS) continue;
        ids.push(`l-${row * LAND_COLS + col}`);
      }
    }
  }
  return ids;
}

export function coverageOfClaims(ids: string[], extras: Record<string, number>, skipId?: string) {
  const set = new Set<string>();
  for (const id of ids) {
    if (id === skipId) continue;
    const p = getPlot(id);
    if (!p) continue;
    for (const covered of idsUnderRect(expandedRect(p, extras[id] ?? 0))) set.add(covered);
  }
  return set;
}

export function expandBlocked(p: Plot, extra: number, occupied: Set<string>) {
  const r = expandedRect(p, extra);
  for (let y = r.y; y < r.y + r.h; y++) {
    for (let x = r.x; x < r.x + r.w; x++) {
      if (y >= GRID && y < LAND_ORIGIN.y) return true;
      if (x >= 0 && y >= 0 && x < GRID && y < GRID && blocked(x, y)) return true;
    }
  }
  for (const b of WORLD_BUILDINGS) {
    if (b.id === ANCHOR_BUILDING_ID && rectsOverlap(r, { x: b.origin.x, y: b.origin.y, w: b.size.x, h: b.size.y })) {
      if (!(p.x === b.origin.x && p.y === b.origin.y)) return true;
    }
  }
  for (const other of CITY_PLOTS) {
    if (other.id === p.id) continue;
    if (!rectsOverlap(r, other)) continue;
    if (other.kind === "owned" || occupied.has(other.id)) return true;
  }
  for (const id of idsUnderRect(r)) {
    if (id === p.id) continue;
    if (occupied.has(id)) return true;
  }
  return false;
}

export function maxExpandFor(p: Plot, occupied: Set<string>) {
  const growCap = Math.max(0, Math.min(MAX_EXPAND, MAX_LOT_EDGE - p.w, MAX_LOT_EDGE - p.h));
  for (let e = growCap; e >= 0; e--) {
    if (!expandBlocked(p, e, occupied)) return e;
  }
  return 0;
}

export function buildingFootprint(p: Plot, use: LandUse, extra = 0) {
  const r = expandedRect(p, extra);
  if (r.w < use.minW || r.h < use.minH) return null;
  return { x: r.x, y: r.y, w: Math.min(r.w, use.minW), h: Math.min(r.h, use.minH), height: use.height };
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
  if (p.districtId === "field") {
    return { id: "field", label: "South field", blurb: "Open sale land south of the campus — 100,000 lots at opening." };
  }
  return DISTRICTS.find((d) => d.id === p.districtId);
}
