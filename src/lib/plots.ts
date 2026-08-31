import { DISTRICTS, GRID, ROAD_XS, ROAD_YS, TERRAIN, WORLD_BUILDINGS, districtAt } from "./campus";
import { hash2 } from "./noise";
import { TILE_FEET, TILE_METERS, TILE_PX, formatSqFt, measureTiles, tilesToSqFt } from "./units";

export { TILE_FEET, TILE_METERS, TILE_PX, formatSqFt, measureTiles, tilesToSqFt };

export type PlotKind = "sale" | "owned" | "park" | "civic";
export type PlotZone = "ultimate" | "downtown" | "midtown" | "uptown" | "outskirts";
export type TileRect = { x: number; y: number; w: number; h: number };

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
/** Smallest claimable land slice (tiles). Matches irregular-lot carve min edge. */
export const MIN_LOT_EDGE = 3;
/** Campus-scale pads can be bought as a portion instead of the whole field. */
export const PORTION_AREA = 36;

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

function isOwnableGreen(x: number, y: number) {
  if (x < 0 || y < 0 || x >= GRID || y >= GRID) return false;
  const t = TERRAIN[y]![x]!;
  return t === "grass" || t === "park" || t === "dirt" || t === "lot";
}

function bandSpans(roads: number[], n: number) {
  const cuts = [...new Set([-1, ...roads, n])].sort((a, b) => a - b);
  const out: { x: number; w: number }[] = [];
  for (let i = 0; i < cuts.length - 1; i++) {
    const x0 = cuts[i]! + 1;
    const x1 = cuts[i + 1]!;
    if (x1 > x0) out.push({ x: x0, w: x1 - x0 });
  }
  return out;
}

function makeCityPlots(): Plot[] {
  const plots: Plot[] = [];
  const used: boolean[][] = Array.from({ length: GRID }, () => Array.from({ length: GRID }, () => false));

  for (const b of WORLD_BUILDINGS) {
    const zone = zoneFor(b.districtId);
    plots.push({
      id: `plot-b-${b.id}`,
      x: b.origin.x,
      y: b.origin.y,
      w: b.size.x,
      h: b.size.y,
      kind: "owned",
      districtId: b.districtId,
      buildingId: b.id,
      price: ZONE_PRICE[zone],
      zone,
      groupLabel: b.name,
    });
    for (let y = b.origin.y; y < b.origin.y + b.size.y; y++) {
      for (let x = b.origin.x; x < b.origin.x + b.size.x; x++) {
        if (x >= 0 && y >= 0 && x < GRID && y < GRID) used[y]![x] = true;
      }
    }
  }

  const lotN: Record<string, number> = {};
  for (const xb of bandSpans(ROAD_XS, GRID)) {
    for (const yb of bandSpans(ROAD_YS, GRID)) {
      let minX = GRID;
      let minY = GRID;
      let maxX = -1;
      let maxY = -1;
      let green = 0;
      let cells = 0;
      for (let y = yb.x; y < yb.x + yb.w; y++) {
        for (let x = xb.x; x < xb.x + xb.w; x++) {
          cells++;
          if (used[y]![x] || blocked(x, y) || !isOwnableGreen(x, y)) continue;
          green++;
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
      if (green < 9 || maxX < minX) continue;
      const box = { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
      const built = WORLD_BUILDINGS.some((b) =>
        box.x < b.origin.x + b.size.x &&
        box.x + box.w > b.origin.x &&
        box.y < b.origin.y + b.size.y &&
        box.y + box.h > b.origin.y,
      );
      if (built) continue;
      if (green / Math.max(1, cells) < 0.28) continue;
      const d = districtAt(box.x + box.w / 2, box.y + box.h / 2) ?? DISTRICTS[0]!;
      const area = box.w * box.h;
      const roll = hash2(box.x * 2.17, box.y * 3.41 + box.w);
      const asPark =
        d.id !== "campus" &&
        (d.id === "parklands" ||
          d.id === "meadow" ||
          d.id === "southpark" ||
          d.id === "eastmarsh" ||
          (d.theme === "public" && area >= 36 && roll > 0.38));
      if (asPark) {
        stampLot(plots, used, lotN, box, "park");
        continue;
      }
      const keepWhole =
        d.id === "campus" || (area >= 64 && Math.min(box.w, box.h) >= 8 && roll > 0.84);
      if (keepWhole) {
        stampLot(plots, used, lotN, box, "sale");
        continue;
      }
      const parts: { x: number; y: number; w: number; h: number }[] = [];
      carveRects(box, 0, parts);
      for (const part of parts) stampLot(plots, used, lotN, part, "sale");
    }
  }
  return plots;
}

type GreenBox = { x: number; y: number; w: number; h: number };

function stampLot(
  plots: Plot[],
  used: boolean[][],
  lotN: Record<string, number>,
  box: GreenBox,
  kind: PlotKind,
) {
  const d = districtAt(box.x + box.w / 2, box.y + box.h / 2) ?? DISTRICTS[0]!;
  const n = (lotN[d.id] = (lotN[d.id] ?? 0) + 1);
  const zone = zoneFor(d.id);
  const price = Math.max(ZONE_PRICE[zone], Math.round((ZONE_PRICE[zone] * (box.w * box.h)) / 36));
  plots.push({
    id: kind === "park" ? `park-${d.id}-${n}` : `land-${d.id}-${n}`,
    x: box.x,
    y: box.y,
    w: box.w,
    h: box.h,
    kind,
    districtId: d.id,
    price: kind === "park" ? 0 : price,
    zone,
    groupLabel:
      kind === "park"
        ? `${d.label} park`
        : n === 1
          ? d.label
          : `${d.label} · Lot ${n}`,
  });
  for (let y = box.y; y < box.y + box.h; y++) {
    for (let x = box.x; x < box.x + box.w; x++) {
      if (x >= 0 && y >= 0 && x < GRID && y < GRID) used[y]![x] = true;
    }
  }
}

/** Split a road-bounded green AABB into mixed rectangles — not a grid of similar squares. */
function carveRects(box: GreenBox, depth: number, out: GreenBox[]) {
  const area = box.w * box.h;
  const roll = hash2(box.x * 1.91 + depth * 4.3, box.y * 2.73 + box.w * 0.31);
  const minEdge = 3;
  const short = Math.min(box.w, box.h);
  const long0 = Math.max(box.w, box.h);
  const skinny = short <= 4 && long0 >= short + 3;
  const stop =
    box.w < minEdge ||
    box.h < minEdge ||
    depth >= 3 ||
    skinny ||
    (depth >= 1 && roll > 0.34) ||
    (area <= 18 && depth >= 1) ||
    (short < 6 && long0 < 7 && depth >= 1);
  if (stop) {
    if (box.w >= minEdge && box.h >= minEdge) out.push(box);
    return;
  }
  const splitX = box.w > box.h + 1 || (box.w >= box.h && roll > 0.4);
  const long = splitX ? box.w : box.h;
  if (long < minEdge * 2) {
    out.push(box);
    return;
  }
  const cuts = [
    3,
    3,
    4,
    5,
    Math.max(minEdge, Math.floor(long * 0.28)),
    Math.max(minEdge, Math.floor(long * 0.38)),
    Math.max(minEdge, Math.floor(long * 0.65)),
  ].filter((c) => c >= minEdge && long - c >= minEdge);
  let cut = cuts[Math.floor(hash2(box.x + depth * 8.1, box.y * 5.3) * cuts.length)] ?? minEdge;
  cut = Math.max(minEdge, Math.min(long - minEdge, cut));
  if (splitX) {
    carveRects({ x: box.x, y: box.y, w: cut, h: box.h }, depth + 1, out);
    carveRects({ x: box.x + cut, y: box.y, w: box.w - cut, h: box.h }, depth + 1, out);
  } else {
    carveRects({ x: box.x, y: box.y, w: box.w, h: cut }, depth + 1, out);
    carveRects({ x: box.x, y: box.y + cut, w: box.w, h: box.h - cut }, depth + 1, out);
  }
}

export const CITY_PLOTS = makeCityPlots();
/** City lots only. The 100k field is addressed by index — do not materialize it. */
export const PLOTS = CITY_PLOTS;

const SALE_AABBS = CITY_PLOTS.filter((p) => p.kind === "sale").map((p) => ({
  x: p.x,
  y: p.y,
  w: p.w,
  h: p.h,
}));

/** True if a world sample sits on (or within `pad` tiles of) a sale-lot AABB. */
export function hitsSaleLot(gx: number, gy: number, pad = 0) {
  for (const p of SALE_AABBS) {
    if (gx >= p.x - pad && gx < p.x + p.w + pad && gy >= p.y - pad && gy < p.y + p.h + pad) return true;
  }
  return false;
}

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

/** Claim ids for a sub-rect look like `land-campus-1~10:12:4:4`. */
export function parseSliceId(id: string): { baseId: string; slice?: TileRect } {
  const at = id.lastIndexOf("~");
  if (at <= 0) return { baseId: id };
  const parts = id.slice(at + 1).split(":").map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n))) return { baseId: id };
  const [x, y, w, h] = parts as [number, number, number, number];
  return { baseId: id.slice(0, at), slice: { x, y, w, h } };
}

export function basePlotId(id: string) {
  return parseSliceId(id).baseId;
}

export function makeSliceId(baseId: string, slice: TileRect) {
  return `${baseId}~${slice.x}:${slice.y}:${slice.w}:${slice.h}`;
}

export function rectsEqual(a: TileRect, b: TileRect) {
  return a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;
}

export function slicePrice(base: Plot, slice: TileRect) {
  const all = Math.max(1, base.w * base.h);
  const part = Math.max(1, slice.w * slice.h);
  return Math.max(1, Math.round((base.price * part) / all));
}

export function withLand(base: Plot, slice: TileRect, id = base.id): Plot {
  return {
    ...base,
    id,
    x: slice.x,
    y: slice.y,
    w: slice.w,
    h: slice.h,
    price: rectsEqual(slice, base) ? base.price : slicePrice(base, slice),
    groupLabel: rectsEqual(slice, base) ? base.groupLabel : `${base.groupLabel} · ${slice.w}×${slice.h}`,
  };
}

export function plotRect(p: TileRect): TileRect {
  return { x: p.x, y: p.y, w: p.w, h: p.h };
}

function getBasePlot(id: string): Plot | undefined {
  const i = latticeIndex(id);
  if (i >= 0) return latticePlot(i);
  return CITY_PLOTS.find((p) => p.id === id);
}

export function getPlot(id: string | null | undefined): Plot | undefined {
  if (!id) return undefined;
  const parsed = parseSliceId(id);
  const base = getBasePlot(parsed.baseId);
  if (!base) return undefined;
  if (!parsed.slice) return base;
  return withLand(base, parsed.slice, id);
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

export function claimedCoversPlot(plotId: string, claimed: Iterable<string>) {
  for (const id of claimed) {
    if (id === plotId) return true;
    const parsed = parseSliceId(id);
    if (parsed.baseId === plotId && !parsed.slice) return true;
  }
  return false;
}

export function subtractRect(a: TileRect, b: TileRect): TileRect[] {
  if (!rectsOverlap(a, b)) return [a];
  const yTop = Math.max(a.y, b.y);
  const yBot = Math.min(a.y + a.h, b.y + b.h);
  const xL = Math.max(a.x, b.x);
  const xR = Math.min(a.x + a.w, b.x + b.w);
  const out: TileRect[] = [];
  if (a.y < yTop) out.push({ x: a.x, y: a.y, w: a.w, h: yTop - a.y });
  if (yBot < a.y + a.h) out.push({ x: a.x, y: yBot, w: a.w, h: a.y + a.h - yBot });
  if (yBot > yTop && a.x < xL) out.push({ x: a.x, y: yTop, w: xL - a.x, h: yBot - yTop });
  if (yBot > yTop && xR < a.x + a.w) out.push({ x: xR, y: yTop, w: a.x + a.w - xR, h: yBot - yTop });
  return out.filter((r) => r.w > 0 && r.h > 0);
}

export function remainingRects(p: Plot, claimed: Iterable<string>): TileRect[] {
  if (claimedCoversPlot(p.id, claimed)) return [];
  let rects: TileRect[] = [plotRect(p)];
  for (const id of claimed) {
    const parsed = parseSliceId(id);
    if (parsed.baseId !== p.id && id !== p.id) continue;
    const hole = parsed.slice ?? getPlot(id);
    if (!hole) continue;
    rects = rects.flatMap((r) => subtractRect(r, hole));
  }
  return rects;
}

export function listingOpen(p: Plot, claimed: Iterable<string>) {
  return p.kind === "sale" && remainingRects(p, claimed).length > 0;
}

export function plotsForSale(claimed: Iterable<string> = []) {
  return CITY_PLOTS.filter((p) => listingOpen(p, claimed));
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
    if (!listingOpen(p, skip)) continue;
    if (zone !== "all" && p.zone !== zone) continue;
    out.push(p);
    if (out.length >= limit) return out;
  }
  for (let i = 0; i < LAND_COUNT && out.length < limit; i++) {
    const p = latticePlot(i);
    if (!listingOpen(p, skip)) continue;
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

export const MAX_EXPAND = 4;
export const MAX_LOT_EDGE = 16;

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

export function usesForPlot(p: Plot, _extra = 0) {
  return LAND_USES.filter((u) => p.w >= u.minW && p.h >= u.minH);
}

/** Land allocation — the green pad. Extra grows the building, not the lot. */
export function expandedRect(p: Plot, _extra = 0) {
  return { x: p.x, y: p.y, w: p.w, h: p.h };
}

export function expandPrice(p: Plot, _extra = 0) {
  return p.price;
}

export function isLotMultiModifier(e: {
  shiftKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  nativeEvent?: { shiftKey?: boolean; ctrlKey?: boolean; metaKey?: boolean };
}) {
  const n = e.nativeEvent ?? e;
  return Boolean(n.shiftKey || n.ctrlKey || n.metaKey);
}

export function canSlicePlot(p: Plot) {
  return p.kind === "sale" && p.w * p.h >= PORTION_AREA && Math.min(p.w, p.h) >= 6;
}

export function clampSlice(plot: Plot, slice: TileRect): TileRect {
  const w = Math.max(MIN_LOT_EDGE, Math.min(slice.w, plot.w));
  const h = Math.max(MIN_LOT_EDGE, Math.min(slice.h, plot.h));
  const x = Math.max(plot.x, Math.min(plot.x + plot.w - w, slice.x));
  const y = Math.max(plot.y, Math.min(plot.y + plot.h - h, slice.y));
  return { x, y, w, h };
}

export function resizeSlice(plot: Plot, slice: TileRect, delta: number): TileRect {
  let { x, y, w, h } = clampSlice(plot, slice);
  if (delta > 0) {
    if (x + w < plot.x + plot.w) w += 1;
    else if (y + h < plot.y + plot.h) h += 1;
    else if (x > plot.x) {
      x -= 1;
      w += 1;
    } else if (y > plot.y) {
      y -= 1;
      h += 1;
    }
  } else if (delta < 0) {
    if (w > h && w > MIN_LOT_EDGE) w -= 1;
    else if (h > MIN_LOT_EDGE) h -= 1;
    else if (w > MIN_LOT_EDGE) w -= 1;
  }
  return clampSlice(plot, { x, y, w, h });
}

export function portionChoices(p: Plot): { id: string; label: string; slice: TileRect }[] {
  const full = plotRect(p);
  const out: { id: string; label: string; slice: TileRect }[] = [{ id: "full", label: "Full pad", slice: full }];
  if (!canSlicePlot(p)) return out;
  const splitX = p.w >= p.h;
  if (splitX) {
    const w1 = Math.max(MIN_LOT_EDGE, Math.floor(p.w / 2));
    const w2 = p.w - w1;
    if (w2 >= MIN_LOT_EDGE) {
      out.push({ id: "half-a", label: "West half", slice: { x: p.x, y: p.y, w: w1, h: p.h } });
      out.push({ id: "half-b", label: "East half", slice: { x: p.x + w1, y: p.y, w: w2, h: p.h } });
    }
  } else {
    const h1 = Math.max(MIN_LOT_EDGE, Math.floor(p.h / 2));
    const h2 = p.h - h1;
    if (h2 >= MIN_LOT_EDGE) {
      out.push({ id: "half-a", label: "North half", slice: { x: p.x, y: p.y, w: p.w, h: h1 } });
      out.push({ id: "half-b", label: "South half", slice: { x: p.x, y: p.y + h1, w: p.w, h: h2 } });
    }
  }
  const qw = Math.max(MIN_LOT_EDGE, Math.floor(p.w / 2));
  const qh = Math.max(MIN_LOT_EDGE, Math.floor(p.h / 2));
  if (p.w >= MIN_LOT_EDGE * 2 && p.h >= MIN_LOT_EDGE * 2) {
    out.push({ id: "q-nw", label: "NW quarter", slice: { x: p.x, y: p.y, w: qw, h: qh } });
    out.push({ id: "q-ne", label: "NE quarter", slice: { x: p.x + p.w - qw, y: p.y, w: qw, h: qh } });
    out.push({ id: "q-sw", label: "SW quarter", slice: { x: p.x, y: p.y + p.h - qh, w: qw, h: qh } });
    out.push({ id: "q-se", label: "SE quarter", slice: { x: p.x + p.w - qw, y: p.y + p.h - qh, w: qw, h: qh } });
  }
  return out;
}

export function claimIdFor(base: Plot, slice: TileRect) {
  if (rectsEqual(slice, base)) return base.id;
  return makeSliceId(basePlotId(base.id), slice);
}

export function workingLand(base: Plot, slice: TileRect | null | undefined): Plot {
  const land = slice ? clampSlice(base, slice) : plotRect(base);
  const id = claimIdFor(base, land);
  return withLand(base, land, id);
}

/** Length of the shared fence between two AABBs. 0 if they only touch a corner or sit apart. */
export function sharedEdgeLength(a: TileRect, b: TileRect) {
  const v = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  const hSpan = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const side = a.x + a.w === b.x || b.x + b.w === a.x;
  const cap = a.y + a.h === b.y || b.y + b.h === a.y;
  if (side && v > 0) return v;
  if (cap && hSpan > 0) return hSpan;
  return 0;
}

export function adjoiningSalePlots(plot: Plot, skip: Iterable<string> = []): Plot[] {
  const blockedIds = new Set<string>();
  for (const id of skip) {
    blockedIds.add(id);
    blockedIds.add(basePlotId(id));
  }
  blockedIds.add(plot.id);
  blockedIds.add(basePlotId(plot.id));
  const hits: { p: Plot; edge: number }[] = [];
  const consider = (cand: Plot) => {
    if (cand.kind !== "sale") return;
    if (blockedIds.has(cand.id) || blockedIds.has(basePlotId(cand.id))) return;
    const edge = sharedEdgeLength(plot, cand);
    if (edge <= 0) return;
    hits.push({ p: cand, edge });
    blockedIds.add(cand.id);
  };
  for (const cand of CITY_PLOTS) consider(cand);
  const li = latticeIndex(basePlotId(plot.id));
  if (li >= 0) {
    const col = li % LAND_COLS;
    const row = Math.floor(li / LAND_COLS);
    for (const [dc, dr] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const c = col + dc;
      const r = row + dr;
      if (c < 0 || r < 0 || c >= LAND_COLS || r >= LAND_ROWS) continue;
      consider(latticePlot(r * LAND_COLS + c));
    }
  } else {
    const samples = [
      { x: plot.x - 0.5, y: plot.y + plot.h / 2 },
      { x: plot.x + plot.w + 0.5, y: plot.y + plot.h / 2 },
      { x: plot.x + plot.w / 2, y: plot.y - 0.5 },
      { x: plot.x + plot.w / 2, y: plot.y + plot.h + 0.5 },
    ];
    for (const s of samples) {
      const n = plotAt(s.x, s.y);
      if (n) consider(n);
    }
  }
  hits.sort((a, b) => b.edge - a.edge || b.p.w * b.p.h - a.p.w * a.p.h);
  return hits.map((row) => row.p);
}

export function bestAdjoiningSale(plot: Plot, skip: Iterable<string> = []) {
  return adjoiningSalePlots(plot, skip)[0];
}

export type ClaimIssue = "cap" | "overlap" | "closed" | null;

export function claimIssueFor(
  lands: Plot[],
  claimedIds: string[],
  extras: Record<string, number> = {},
): ClaimIssue {
  if (lands.length === 0) return "closed";
  if (claimedIds.length + lands.length > MAX_CLAIMS) return "cap";
  const occupied = coverageOfClaims(claimedIds, extras);
  for (const land of lands) {
    if (land.kind !== "sale") return "closed";
    const parent = getBasePlot(basePlotId(land.id));
    if (claimedIds.includes(land.id)) return "closed";
    if (parent && claimedCoversPlot(parent.id, claimedIds) && rectsEqual(land, parent)) return "closed";
    if (expandBlocked(land, extras[land.id] ?? 0, occupied)) return "overlap";
    occupied.add(land.id);
  }
  return null;
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

export function coverageOfClaims(ids: string[], _extras: Record<string, number>, skipId?: string) {
  const set = new Set<string>();
  for (const id of ids) {
    if (id === skipId) continue;
    set.add(id);
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
    if (!rectsOverlap(r, { x: b.origin.x, y: b.origin.y, w: b.size.x, h: b.size.y })) continue;
    if (p.buildingId === b.id) continue;
    return true;
  }
  for (const id of occupied) {
    if (id === p.id) continue;
    const other = getPlot(id);
    if (other && rectsOverlap(r, other)) return true;
  }
  for (const other of CITY_PLOTS) {
    if (other.id === p.id || other.id === basePlotId(p.id)) continue;
    if (!rectsOverlap(r, other)) continue;
    if (other.kind === "owned" || occupied.has(other.id) || claimedCoversPlot(other.id, occupied)) return true;
  }
  for (const id of idsUnderRect(r)) {
    if (id === p.id || id === basePlotId(p.id)) continue;
    if (occupied.has(id) || claimedCoversPlot(id, occupied)) return true;
  }
  return false;
}

export type LotPlace = { ox: number; oy: number };

export const PLACE_ANCHORS = [
  { id: "nw", label: "NW", hint: "North-west corner", fx: 0, fy: 0 },
  { id: "n", label: "N", hint: "North edge", fx: 0.5, fy: 0 },
  { id: "ne", label: "NE", hint: "North-east corner", fx: 1, fy: 0 },
  { id: "w", label: "W", hint: "West edge", fx: 0, fy: 0.5 },
  { id: "c", label: "Mid", hint: "Middle of the lot", fx: 0.5, fy: 0.5 },
  { id: "e", label: "E", hint: "East edge", fx: 1, fy: 0.5 },
  { id: "sw", label: "SW", hint: "South-west corner", fx: 0, fy: 1 },
  { id: "s", label: "S", hint: "South edge", fx: 0.5, fy: 1 },
  { id: "se", label: "SE", hint: "South-east corner", fx: 1, fy: 1 },
] as const;

export type PlaceAnchorId = (typeof PLACE_ANCHORS)[number]["id"];

export function clampLotPlace(landW: number, landH: number, bw: number, bh: number, place: LotPlace): LotPlace {
  const maxX = Math.max(0, landW - bw);
  const maxY = Math.max(0, landH - bh);
  return {
    ox: Math.max(0, Math.min(maxX, Math.floor(place.ox))),
    oy: Math.max(0, Math.min(maxY, Math.floor(place.oy))),
  };
}

export function centerPlace(landW: number, landH: number, bw: number, bh: number): LotPlace {
  return clampLotPlace(landW, landH, bw, bh, {
    ox: Math.floor((landW - bw) / 2),
    oy: Math.floor((landH - bh) / 2),
  });
}

export function placeFromAnchor(
  landW: number,
  landH: number,
  bw: number,
  bh: number,
  fx: number,
  fy: number,
): LotPlace {
  const maxX = Math.max(0, landW - bw);
  const maxY = Math.max(0, landH - bh);
  return { ox: Math.round(fx * maxX), oy: Math.round(fy * maxY) };
}

export function placeAtCell(landW: number, landH: number, bw: number, bh: number, col: number, row: number): LotPlace {
  return clampLotPlace(landW, landH, bw, bh, {
    ox: col - Math.floor(bw / 2),
    oy: row - Math.floor(bh / 2),
  });
}

export function matchingAnchor(place: LotPlace, landW: number, landH: number, bw: number, bh: number): PlaceAnchorId | null {
  for (const a of PLACE_ANCHORS) {
    const p = placeFromAnchor(landW, landH, bw, bh, a.fx, a.fy);
    if (p.ox === place.ox && p.oy === place.oy) return a.id;
  }
  return null;
}

export function footprintHitsRoad(x: number, y: number, w: number, h: number) {
  for (let iy = y; iy < y + h; iy++) {
    for (let ix = x; ix < x + w; ix++) {
      if (ix >= 0 && iy >= 0 && ix < GRID && iy < GRID && blocked(ix, iy)) return true;
    }
  }
  return false;
}

/**
 * Type minW×minH is the default (centered). Extra adds tiles east/south from (ox,oy),
 * never past the lot fence or onto road tiles.
 */
export function growSize(p: Plot, use: LandUse, extra: number, place: LotPlace) {
  if (p.w < use.minW || p.h < use.minH) return null;
  const bw = use.minW;
  const bh = use.minH;
  const pos = clampLotPlace(p.w, p.h, bw, bh, place);
  let w = Math.min(bw + Math.max(0, Math.floor(extra)), p.w - pos.ox);
  let h = Math.min(bh + Math.max(0, Math.floor(extra)), p.h - pos.oy);
  while ((w > bw || h > bh) && footprintHitsRoad(p.x + pos.ox, p.y + pos.oy, w, h)) {
    if (w > bw) w--;
    else if (h > bh) h--;
    else break;
  }
  return { w, h, ox: pos.ox, oy: pos.oy };
}

/** Default pad is type min; extra is width/depth inside the lot from current place. */
export function maxOfficeFootprint(landW: number, landH: number, use: LandUse) {
  return { w: Math.min(landW, use.minW), h: Math.min(landH, use.minH) };
}

export function buildingSize(p: Plot, use: LandUse, extra = 0, place?: LotPlace) {
  const grown = growSize(p, use, extra, place ?? centerPlace(p.w, p.h, use.minW, use.minH));
  return grown ? { w: grown.w, h: grown.h } : null;
}

export function footprintFillsLot(landW: number, landH: number, bw: number, bh: number) {
  return bw >= landW && bh >= landH;
}

export function fitPlace(p: Plot, use: LandUse, extra: number, place: LotPlace): LotPlace {
  const grown = growSize(p, use, extra, place);
  if (!grown) return place;
  return { ox: grown.ox, oy: grown.oy };
}

export function buildingFootprint(p: Plot, use: LandUse, extra = 0, place?: LotPlace) {
  const grown = growSize(p, use, extra, place ?? centerPlace(p.w, p.h, use.minW, use.minH));
  if (!grown) return null;
  return {
    x: p.x + grown.ox,
    y: p.y + grown.oy,
    w: grown.w,
    h: grown.h,
    height: use.height,
    ox: grown.ox,
    oy: grown.oy,
  };
}

export function maxExpandFor(p: Plot, _occupied: Set<string> = new Set(), use?: LandUse, place?: LotPlace) {
  const u = use ?? LAND_USES.find((item) => item.id === "office") ?? LAND_USES[0]!;
  if (p.w < u.minW || p.h < u.minH) return 0;
  const pos = clampLotPlace(p.w, p.h, u.minW, u.minH, place ?? centerPlace(p.w, p.h, u.minW, u.minH));
  const roomW = Math.max(0, p.w - pos.ox - u.minW);
  const roomH = Math.max(0, p.h - pos.oy - u.minH);
  let extra = Math.max(roomW, roomH);
  while (extra > 0) {
    const size = growSize(p, u, extra, pos);
    if (size && !footprintHitsRoad(p.x + size.ox, p.y + size.oy, size.w, size.h)) return extra;
    extra--;
  }
  return 0;
}

export function plotArea(p: Plot) {
  const m = measureTiles(p.w, p.h);
  return {
    tiles: p.w * p.h,
    sqft: m.sqft,
    px: m.px,
    meters: p.w * p.h * TILE_METERS * TILE_METERS,
    footprint: `${p.w} × ${p.h}`,
    frontFt: p.w * TILE_FEET,
    deepFt: p.h * TILE_FEET,
    frontPx: m.px.w,
    deepPx: m.px.h,
    text: m.text,
  };
}

export function footprintBlocks(
  claimedIds: string[],
  extras: Record<string, number>,
  places: Record<string, LotPlace>,
  uses: Record<string, string>,
  preview: { id: string; extra: number; useId: string; place: LotPlace } | null,
) {
  const rects: { x: number; y: number; w: number; h: number }[] = WORLD_BUILDINGS.map((b) => ({
    x: b.origin.x,
    y: b.origin.y,
    w: b.size.x,
    h: b.size.y,
  }));
  for (const id of claimedIds) {
    const p = getPlot(id);
    if (!p) continue;
    const use = LAND_USES.find((u) => u.id === uses[id]) ?? LAND_USES[0]!;
    const fp = buildingFootprint(p, use, extras[id] ?? 0, places[id]);
    if (fp) rects.push({ x: fp.x, y: fp.y, w: fp.w, h: fp.h });
  }
  if (preview && !claimedIds.includes(preview.id)) {
    const p = getPlot(preview.id);
    if (p?.kind === "sale") {
      const use = LAND_USES.find((u) => u.id === preview.useId) ?? LAND_USES[0]!;
      const fp = buildingFootprint(p, use, preview.extra, preview.place);
      if (fp) rects.push({ x: fp.x, y: fp.y, w: fp.w, h: fp.h });
    }
  }
  return rects;
}

export function nudgeOffBuilding(
  x: number,
  y: number,
  rects: { x: number; y: number; w: number; h: number }[],
) {
  const hits = (px: number, py: number) =>
    rects.some((r) => px >= r.x && px < r.x + r.w && py >= r.y && py < r.y + r.h);
  if (!hits(x, y)) return { x, y };
  const hit = rects.find((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);
  if (!hit) return { x, y };
  const around = [
    { x: hit.x - 0.55, y },
    { x: hit.x + hit.w + 0.55, y },
    { x, y: hit.y - 0.55 },
    { x, y: hit.y + hit.h + 0.55 },
    { x: hit.x - 0.55, y: hit.y - 0.55 },
    { x: hit.x + hit.w + 0.55, y: hit.y - 0.55 },
    { x: hit.x - 0.55, y: hit.y + hit.h + 0.55 },
    { x: hit.x + hit.w + 0.55, y: hit.y + hit.h + 0.55 },
  ];
  around.sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y));
  for (const c of around) {
    const ix = Math.floor(c.x);
    const iy = Math.floor(c.y);
    if (ix < 0 || iy < 0 || ix >= GRID || iy >= GRID) continue;
    const t = TERRAIN[iy]![ix]!;
    if (t === "road" || t === "water") continue;
    if (!hits(c.x, c.y)) return c;
  }
  return null;
}

export function pointInRect(x: number, y: number, r: { x: number; y: number; w: number; h: number }) {
  return x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
}

export function plotNoise(id: string, salt = 0) {
  let n = salt * 19.13;
  for (let i = 0; i < id.length; i++) n += id.charCodeAt(i) * (i + 1) * 0.173;
  return hash2(n, n * 1.37 + salt * 4.9);
}

/** Sparse–lush yard density from plot id. 0.12 (few) … 1 (lush). */
export function lotTreeDensity(id: string) {
  const r = plotNoise(id, 3);
  if (r < 0.18) return 0.14;
  if (r < 0.42) return 0.32;
  if (r < 0.68) return 0.58;
  if (r < 0.86) return 0.82;
  return 1;
}

/** Trees around a claimed footprint — edges/yard, never inside the volume. */
export function yardTreeSpots(plotId: string, fp: { x: number; y: number; w: number; h: number }) {
  const dens = lotTreeDensity(plotId);
  const perim = 2 * (fp.w + fp.h);
  const count = Math.max(2, Math.round(2 + dens * perim * 0.7));
  const spots: { x: number; y: number; pine: boolean }[] = [];
  const inset = 0.68;
  for (let i = 0; i < count; i++) {
    const u = (i + plotNoise(plotId, i + 11)) / count;
    const d = (u % 1) * perim;
    let x: number;
    let y: number;
    if (d < fp.w) {
      x = fp.x + d;
      y = fp.y - inset;
    } else if (d < fp.w + fp.h) {
      x = fp.x + fp.w + inset;
      y = fp.y + (d - fp.w);
    } else if (d < fp.w * 2 + fp.h) {
      x = fp.x + fp.w - (d - fp.w - fp.h);
      y = fp.y + fp.h + inset;
    } else {
      x = fp.x - inset;
      y = fp.y + fp.h - (d - fp.w * 2 - fp.h);
    }
    x += (plotNoise(plotId, i + 40) - 0.5) * 0.4;
    y += (plotNoise(plotId, i + 80) - 0.5) * 0.4;
    spots.push({ x, y, pine: plotNoise(plotId, i + 120) > 0.62 });
  }
  return spots;
}

export function districtForPlot(p: Plot) {
  if (p.districtId === "field") {
    return { id: "field", label: "South field", blurb: "Open sale land south of the campus — 100,000 lots at opening." };
  }
  return DISTRICTS.find((d) => d.id === p.districtId);
}
