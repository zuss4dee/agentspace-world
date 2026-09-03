import type { Building, District, TileKind } from "./types";
import { fbm, hash2 } from "./noise";

export const CORE = 64;
export const GRID = 64;
export const ROAD_XS = [6, 12, 24, 36, 48, 58];
export const ROAD_YS = [6, 12, 24, 36, 48, 58];

export const DISTRICTS: District[] = [
  { id: "parklands", label: "Parklands", blurb: "Lawns, water, and a pavilion.", origin: { x: 0, y: 0 }, size: { x: 11, y: 11 }, theme: "public" },
  { id: "corporate", label: "Corporate", blurb: "HQ, ledgers, landscaped plazas.", origin: { x: 13, y: 0 }, size: { x: 11, y: 11 }, theme: "executive" },
  { id: "startup", label: "Startup", blurb: "Loft Labs and room to claim.", origin: { x: 25, y: 0 }, size: { x: 11, y: 11 }, theme: "tech" },
  { id: "creative", label: "Creative", blurb: "Studios, galleries, odd roofs.", origin: { x: 37, y: 0 }, size: { x: 11, y: 23 }, theme: "creative" },
  { id: "research", label: "Research", blurb: "Labs, conference glass, quiet racks.", origin: { x: 49, y: 0 }, size: { x: 15, y: 23 }, theme: "research" },
  { id: "meadow", label: "Meadow", blurb: "Open green between park and works.", origin: { x: 0, y: 13 }, size: { x: 11, y: 11 }, theme: "public" },
  { id: "civic", label: "Civic", blurb: "The crossroads of the campus.", origin: { x: 13, y: 13 }, size: { x: 11, y: 11 }, theme: "public" },
  { id: "campus", label: "Campus green", blurb: "Paths and empty plots to grow into.", origin: { x: 25, y: 13 }, size: { x: 11, y: 11 }, theme: "campus" },
  { id: "industrial", label: "Industrial", blurb: "Works, docks, and loading yards.", origin: { x: 0, y: 25 }, size: { x: 23, y: 11 }, theme: "operations" },
  { id: "labs", label: "Labs", blurb: "Agentspace Lab and Watchtower.", origin: { x: 25, y: 25 }, size: { x: 11, y: 11 }, theme: "research" },
  { id: "homes", label: "Homes", blurb: "Row houses and porches.", origin: { x: 37, y: 25 }, size: { x: 11, y: 11 }, theme: "residential" },
  { id: "ridge", label: "Ridge", blurb: "Apartments and room to build.", origin: { x: 49, y: 25 }, size: { x: 15, y: 11 }, theme: "residential" },
  { id: "yards", label: "Yards", blurb: "Workshops south of the mill.", origin: { x: 0, y: 37 }, size: { x: 12, y: 11 }, theme: "operations" },
  { id: "transit", label: "Transit", blurb: "Walk-ins spawn at the station.", origin: { x: 13, y: 37 }, size: { x: 11, y: 11 }, theme: "operations" },
  { id: "waterfront", label: "Waterfront", blurb: "Visitor companies on the pier.", origin: { x: 37, y: 37 }, size: { x: 11, y: 11 }, theme: "public" },
  { id: "docks", label: "Docks", blurb: "Inn, restaurant, and harbor light.", origin: { x: 49, y: 37 }, size: { x: 15, y: 11 }, theme: "public" },
  { id: "southpark", label: "South lawn", blurb: "Trees and empty land.", origin: { x: 0, y: 49 }, size: { x: 23, y: 15 }, theme: "public" },
  { id: "southgate", label: "Southgate", blurb: "More roads, more room.", origin: { x: 25, y: 49 }, size: { x: 23, y: 15 }, theme: "residential" },
  { id: "eastmarsh", label: "East marsh", blurb: "Water, reeds, and sky.", origin: { x: 49, y: 49 }, size: { x: 15, y: 15 }, theme: "public" },
];

function footprint(
  id: string,
  name: string,
  extra: Omit<Building, "id" | "name" | "stations" | "assetId"> & {
    desks: [string, string, number, number][];
    assetId?: string;
  },
): Building {
  const { desks, assetId: aid, ...rest } = extra;
  const stations = desks.map(([sid, sname, dx, dy]) => ({
    id: sid,
    name: sname,
    x: extra.origin.x + dx,
    y: extra.origin.y + dy,
  }));
  return {
    id,
    name,
    stations,
    assetId: aid ?? `pack.northshore.building.${extra.style}.${id}`,
    ...rest,
  };
}

/**
 * Authored world buildings on the map.
 * Empty while testing claim → Build HQ from a clean city (packs stay in Blender / public GLBs).
 */
export const WORLD_BUILDINGS: Building[] = [];

export const ANCHOR_BUILDING_ID = "loft";
export const LOT_BUILDINGS = WORLD_BUILDINGS;

export const PLAZA_COMPANIES = WORLD_BUILDINGS.filter((b) => b.districtId === "waterfront").map((b) => ({
  id: b.id,
  name: b.name,
  tag: b.districtId,
  origin: b.origin,
  size: b.size,
  roof: b.roof,
  wall: b.wall,
  wallDark: b.wallDark,
  height: b.height,
  vibe: b.sign ?? b.name,
  style: b.style,
}));

function isRoad(x: number, y: number) {
  return ROAD_XS.includes(x) || ROAD_YS.includes(y);
}

function adjacentToRoad(x: number, y: number) {
  return ROAD_XS.some((rx) => Math.abs(x - rx) === 1) || ROAD_YS.some((ry) => Math.abs(y - ry) === 1);
}

function organicWater(x: number, y: number) {
  if (isRoad(x, y)) return false;
  const n = fbm(x * 0.11, y * 0.1);
  const west = x + n * 2.6 < 3.5 && y > 2 && y < 47;
  const inlet = x + n * 1.8 < 6.4 && y > 14 && y < 24;
  const marsh = x > 50 && y > 47 && (x - 50) * 0.32 + (y - 47) * 0.26 + n * 2.5 > 3.1;
  const harbor = x > 58 && y > 43 && n + (x - 58) * 0.18 + (y - 46) * 0.08 > 0.42;
  return west || inlet || marsh || harbor;
}

export function makeTerrain(): TileKind[][] {
  const tiles: TileKind[][] = [];
  for (let y = 0; y < GRID; y++) {
    const row: TileKind[] = [];
    for (let x = 0; x < GRID; x++) {
      let kind: TileKind = "grass";
      if (organicWater(x, y)) kind = "water";
      if (x >= 1 && x <= 10 && y >= 1 && y <= 10 && kind !== "water") kind = "park";
      if (x >= 1 && x <= 10 && y >= 14 && y <= 22 && kind !== "water") kind = "park";
      if (x >= 2 && x <= 20 && y >= 50 && y <= 62 && kind !== "water") kind = "park";
      if (x >= 38 && x <= 46 && y >= 8 && y <= 14) kind = "park";
      if (x >= 26 && x <= 34 && y >= 14 && y <= 22 && !isRoad(x, y)) kind = "park";
      if ((x >= 22 && x <= 26 && y >= 22 && y <= 26) || ((x === 24 || y === 24) && x > 10 && y > 10 && x < 48 && y < 48)) {
        if (!isRoad(x, y) && kind !== "water") kind = "plaza";
      }
      if (x >= 50 && x <= 54 && y >= 14 && y <= 18 && !isRoad(x, y)) kind = "lot";
      if (x >= 14 && x <= 18 && y >= 14 && y <= 17 && !isRoad(x, y)) kind = "lot";
      if (x >= 2 && x <= 5 && y >= 44 && y <= 46 && kind !== "water") kind = "lot";
      if (isRoad(x, y) && kind !== "water") kind = "road";
      if (kind === "grass" && adjacentToRoad(x, y) && !isRoad(x, y)) kind = "sidewalk";
      if (kind === "grass" && hash2(x * 0.9, y * 1.1) > 0.86) kind = "dirt";
      row.push(kind);
    }
    tiles.push(row);
  }
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      if (tiles[y]![x] !== "water") continue;
      const neighbors = [
        [x + 1, y],
        [x - 1, y],
        [x, y + 1],
        [x, y - 1],
        [x + 1, y + 1],
        [x - 1, y - 1],
      ];
      for (const [nx, ny] of neighbors) {
        if (nx < 0 || ny < 0 || nx >= GRID || ny >= GRID) continue;
        const t = tiles[ny]![nx]!;
        if (t === "grass" || t === "park" || t === "dirt") tiles[ny]![nx] = "sand";
      }
    }
  }
  return tiles;
}

export const TERRAIN = makeTerrain();

export function groundZ(x: number, y: number) {
  const ix = Math.max(0, Math.min(GRID - 1, Math.floor(x)));
  const iy = Math.max(0, Math.min(GRID - 1, Math.floor(y)));
  const kind = TERRAIN[iy]![ix]!;
  const n = fbm(x * 0.08, y * 0.08);
  if (kind === "water") return -6.5 + n * 1.6;
  if (kind === "sand") return -1.4 + n * 0.6;
  if (kind === "road") return 0.28;
  if (kind === "sidewalk") return 0.72;
  if (kind === "plaza") return 1.7;
  if (kind === "lot") return 0.7;
  if (kind === "park") return 2.4 + n * 5.2;
  if (kind === "dirt") return 0.5 + n * 2.2;
  return 1.1 + n * 3.8;
}

export function buildingAt(buildings: Building[], x: number, y: number) {
  return buildings.find(
    (b) =>
      x >= b.origin.x &&
      y >= b.origin.y &&
      x < b.origin.x + b.size.x &&
      y < b.origin.y + b.size.y,
  );
}

export function nearestRoad(x: number, y: number) {
  let best = { x: ROAD_XS[1]!, y };
  let bestD = 999;
  for (const rx of ROAD_XS) {
    const d = Math.abs(x - rx);
    if (d < bestD) {
      bestD = d;
      best = { x: rx, y };
    }
  }
  for (const ry of ROAD_YS) {
    const d = Math.abs(y - ry);
    if (d < bestD) {
      bestD = d;
      best = { x, y: ry };
    }
  }
  return best;
}

export function districtAt(x: number, y: number) {
  return DISTRICTS.find(
    (d) => x >= d.origin.x && y >= d.origin.y && x < d.origin.x + d.size.x && y < d.origin.y + d.size.y,
  );
}
