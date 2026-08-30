import type { Building, District, TileKind } from "./types";

export const GRID = 64;
export const ROAD_XS = [6, 12, 24, 36, 48, 58];
export const ROAD_YS = [6, 12, 24, 36, 48, 58];

export const DISTRICTS: District[] = [
  { id: "parklands", label: "Parklands", blurb: "Lawns, water, and a pavilion.", origin: { x: 0, y: 0 }, size: { x: 11, y: 11 } },
  { id: "corporate", label: "Corporate", blurb: "HQ, ledgers, landscaped plazas.", origin: { x: 13, y: 0 }, size: { x: 11, y: 11 } },
  { id: "startup", label: "Startup row", blurb: "Lofts, cafes, hot desks.", origin: { x: 25, y: 0 }, size: { x: 11, y: 11 } },
  { id: "creative", label: "Creative", blurb: "Studios, galleries, odd roofs.", origin: { x: 37, y: 0 }, size: { x: 11, y: 23 } },
  { id: "research", label: "Research", blurb: "Labs, conference glass, quiet racks.", origin: { x: 49, y: 0 }, size: { x: 15, y: 23 } },
  { id: "meadow", label: "Meadow", blurb: "Open green between park and works.", origin: { x: 0, y: 13 }, size: { x: 11, y: 11 } },
  { id: "civic", label: "Civic", blurb: "The crossroads of the campus.", origin: { x: 13, y: 13 }, size: { x: 11, y: 11 } },
  { id: "campus", label: "Campus green", blurb: "Paths and empty plots to grow into.", origin: { x: 25, y: 13 }, size: { x: 11, y: 11 } },
  { id: "industrial", label: "Industrial", blurb: "Works, docks, and loading yards.", origin: { x: 0, y: 25 }, size: { x: 23, y: 11 } },
  { id: "labs", label: "Labs", blurb: "Northshore Lab and Watchtower.", origin: { x: 25, y: 25 }, size: { x: 11, y: 11 } },
  { id: "homes", label: "Homes", blurb: "Row houses and porches.", origin: { x: 37, y: 25 }, size: { x: 11, y: 11 } },
  { id: "ridge", label: "Ridge", blurb: "Apartments and room to build.", origin: { x: 49, y: 25 }, size: { x: 15, y: 11 } },
  { id: "yards", label: "Yards", blurb: "Workshops south of the mill.", origin: { x: 0, y: 37 }, size: { x: 12, y: 11 } },
  { id: "transit", label: "Transit", blurb: "Walk-ins spawn at the station.", origin: { x: 13, y: 37 }, size: { x: 11, y: 11 } },
  { id: "waterfront", label: "Waterfront", blurb: "Visitor companies on the pier.", origin: { x: 37, y: 37 }, size: { x: 11, y: 11 } },
  { id: "docks", label: "Docks", blurb: "Inn, restaurant, and harbor light.", origin: { x: 49, y: 37 }, size: { x: 15, y: 11 } },
  { id: "southpark", label: "South lawn", blurb: "Trees and empty land.", origin: { x: 0, y: 49 }, size: { x: 23, y: 15 } },
  { id: "southgate", label: "Southgate", blurb: "More roads, more room.", origin: { x: 25, y: 49 }, size: { x: 23, y: 15 } },
  { id: "eastmarsh", label: "East marsh", blurb: "Water, reeds, and sky.", origin: { x: 49, y: 49 }, size: { x: 15, y: 15 } },
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

export const WORLD_BUILDINGS: Building[] = [
  footprint("hq", "Northshore HQ", {
    kind: "office",
    style: "hq",
    districtId: "corporate",
    origin: { x: 14, y: 2 },
    size: { x: 5, y: 4 },
    height: 92,
    roof: "#3d4a63",
    wall: "#9eb0c9",
    wallDark: "#6a7b96",
    accent: "#ed712e",
    sign: "HQ",
    desks: [
      ["jarvis-desk", "Jarvis desk", 1.2, 1.2],
      ["friday-desk", "Ops desk", 3.4, 2.2],
      ["board", "Board glass", 2.4, 0.6],
    ],
  }),
  footprint("finance", "Ledger House", {
    kind: "office",
    style: "office",
    districtId: "corporate",
    origin: { x: 20, y: 2 },
    size: { x: 3, y: 3 },
    height: 58,
    roof: "#2f3d55",
    wall: "#9aafd4",
    wallDark: "#5c7394",
    accent: "#60a5fa",
    sign: "LEDGER",
    desks: [["midas-desk", "Midas desk", 1.4, 1.4]],
  }),
  footprint("hall", "Board Hall", {
    kind: "hall",
    style: "hall",
    districtId: "corporate",
    origin: { x: 14, y: 7 },
    size: { x: 4, y: 3 },
    height: 44,
    roof: "#5c4634",
    wall: "#d4c4a8",
    wallDark: "#9a8668",
    accent: "#c4a574",
    desks: [["circle", "Round table", 2, 1.4]],
  }),
  footprint("loft", "Seed Loft", {
    kind: "office",
    style: "office",
    districtId: "startup",
    origin: { x: 26, y: 2 },
    size: { x: 4, y: 3 },
    height: 48,
    roof: "#4a5340",
    wall: "#c4d4a8",
    wallDark: "#7a8d5c",
    accent: "#84cc16",
    sign: "SEED",
    desks: [["vega-desk", "Campaign desk", 1.6, 1.3]],
  }),
  footprint("seed-cafe", "Seed Cafe", {
    kind: "cafe",
    style: "cafe",
    districtId: "startup",
    origin: { x: 31, y: 2 },
    size: { x: 3, y: 3 },
    height: 34,
    roof: "#6b3a28",
    wall: "#e8b48a",
    wallDark: "#b06a40",
    accent: "#f59e0b",
    sign: "CAFE",
    desks: [
      ["bar", "Bar", 1.2, 1],
      ["booth", "Booth", 2, 2],
    ],
  }),
  footprint("incubator", "Incubator", {
    kind: "office",
    style: "office",
    districtId: "startup",
    origin: { x: 26, y: 6 },
    size: { x: 5, y: 4 },
    height: 40,
    roof: "#355c4a",
    wall: "#8fc4a8",
    wallDark: "#4f8d6e",
    accent: "#34d399",
    desks: [["hotdesk", "Hot desk", 2.4, 2]],
  }),
  footprint("studio", "Signal Studio", {
    kind: "studio",
    style: "studio",
    districtId: "creative",
    origin: { x: 38, y: 2 },
    size: { x: 5, y: 4 },
    height: 50,
    roof: "#6b3d55",
    wall: "#d4a0b5",
    wallDark: "#9a6a7e",
    accent: "#f472b6",
    sign: "STUDIO",
    desks: [
      ["edit", "Edit bay", 1.5, 1.2],
      ["mood", "Mood wall", 3.5, 2.4],
    ],
  }),
  footprint("gallery", "Athena Gallery", {
    kind: "shop",
    style: "gallery",
    districtId: "creative",
    origin: { x: 44, y: 2 },
    size: { x: 4, y: 3 },
    height: 42,
    roof: "#3f4450",
    wall: "#c5cbd4",
    wallDark: "#7a8290",
    accent: "#a78bfa",
    sign: "ATHENA",
    desks: [["stacks", "Stacks", 2, 1.4]],
  }),
  footprint("cottage", "Vanta Cottage", {
    kind: "home",
    style: "house",
    districtId: "creative",
    origin: { x: 38, y: 8 },
    size: { x: 3, y: 3 },
    height: 36,
    roof: "#7a3030",
    wall: "#e8d4c0",
    wallDark: "#b08970",
    accent: "#fb7185",
    desks: [["easel", "Easel", 1.4, 1.4]],
  }),
  footprint("factory", "Signal Works", {
    kind: "factory",
    style: "factory",
    districtId: "industrial",
    origin: { x: 2, y: 26 },
    size: { x: 7, y: 5 },
    height: 46,
    roof: "#4a5340",
    wall: "#c4b48f",
    wallDark: "#8d7f5c",
    accent: "#b45309",
    sign: "WORKS",
    desks: [
      ["line-a", "Line A", 2, 2],
      ["line-b", "Line B", 4.5, 3],
    ],
  }),
  footprint("warehouse", "Prop Warehouse", {
    kind: "warehouse",
    style: "warehouse",
    districtId: "industrial",
    origin: { x: 10, y: 26 },
    size: { x: 5, y: 4 },
    height: 38,
    roof: "#3f4450",
    wall: "#9aa3b5",
    wallDark: "#6d7484",
    accent: "#94a3b8",
    sign: "DOCK",
    desks: [["dock", "Receiving", 2.4, 2]],
  }),
  footprint("mill", "Parts Mill", {
    kind: "factory",
    style: "factory",
    districtId: "industrial",
    origin: { x: 2, y: 32 },
    size: { x: 4, y: 3 },
    height: 36,
    roof: "#5c5340",
    wall: "#b8a078",
    wallDark: "#8a734c",
    accent: "#d6b37a",
    desks: [["press", "Press", 2, 1.4]],
  }),
  footprint("lab", "Northshore Lab", {
    kind: "lab",
    style: "lab",
    districtId: "labs",
    origin: { x: 26, y: 26 },
    size: { x: 5, y: 4 },
    height: 52,
    roof: "#dfe6ee",
    wall: "#e8eef4",
    wallDark: "#9aa8b8",
    accent: "#38bdf8",
    sign: "LAB",
    desks: [
      ["bench", "Merlin bench", 1.6, 1.6],
      ["scope", "Scope", 3.4, 2.4],
    ],
  }),
  footprint("data", "Watchtower", {
    kind: "data",
    style: "data",
    districtId: "labs",
    origin: { x: 32, y: 26 },
    size: { x: 3, y: 5 },
    height: 64,
    roof: "#1e293b",
    wall: "#475569",
    wallDark: "#334155",
    accent: "#22c55e",
    sign: "WT",
    desks: [["rack", "Quiet rack", 1.4, 2.2]],
  }),
  footprint("home-a", "Row House A", {
    kind: "home",
    style: "house",
    districtId: "homes",
    origin: { x: 38, y: 26 },
    size: { x: 3, y: 3 },
    height: 34,
    roof: "#5c3d2e",
    wall: "#f0dcc4",
    wallDark: "#c4a888",
    accent: "#d97706",
    desks: [["kitchen", "Kitchen", 1.4, 1.4]],
  }),
  footprint("home-b", "Row House B", {
    kind: "home",
    style: "house",
    districtId: "homes",
    origin: { x: 42, y: 26 },
    size: { x: 3, y: 3 },
    height: 34,
    roof: "#3d4a3a",
    wall: "#dce8d0",
    wallDark: "#8aa078",
    accent: "#65a30d",
    desks: [["porch", "Porch", 1.4, 1.4]],
  }),
  footprint("station", "South Station", {
    kind: "station",
    style: "station",
    districtId: "transit",
    origin: { x: 14, y: 38 },
    size: { x: 6, y: 4 },
    height: 40,
    roof: "#2f3d4a",
    wall: "#8aa0b4",
    wallDark: "#5c7384",
    accent: "#ed712e",
    sign: "IN",
    desks: [
      ["gate", "Airlock gate", 3, 3.2],
      ["bench", "Platform", 1.5, 1.5],
    ],
  }),
  footprint("northwind", "Northwind", {
    kind: "factory",
    style: "factory",
    districtId: "waterfront",
    origin: { x: 38, y: 38 },
    size: { x: 4, y: 3 },
    height: 48,
    roof: "#355c4a",
    wall: "#8fc4a8",
    wallDark: "#4f8d6e",
    accent: "#34d399",
    desks: [["line", "Line B", 2, 1.5]],
  }),
  footprint("harbor", "Harbor Ledger", {
    kind: "office",
    style: "office",
    districtId: "waterfront",
    origin: { x: 43, y: 38 },
    size: { x: 4, y: 3 },
    height: 56,
    roof: "#2f3d55",
    wall: "#9aafd4",
    wallDark: "#5c7394",
    accent: "#60a5fa",
    desks: [["glass", "Public glass", 2, 1.4]],
  }),
  footprint("ember", "Ember Kitchen", {
    kind: "cafe",
    style: "cafe",
    districtId: "waterfront",
    origin: { x: 38, y: 43 },
    size: { x: 4, y: 3 },
    height: 32,
    roof: "#6b3a28",
    wall: "#e8b48a",
    wallDark: "#b06a40",
    accent: "#f59e0b",
    desks: [["pier", "Pier seats", 2, 1.6]],
  }),
  footprint("pavilion", "Lawn Pavilion", {
    kind: "pavilion",
    style: "pavilion",
    districtId: "parklands",
    origin: { x: 7, y: 2 },
    size: { x: 3, y: 3 },
    height: 28,
    roof: "#6b5340",
    wall: "#e8d4b0",
    wallDark: "#b08968",
    accent: "#c4a574",
    sign: "LAWN",
    desks: [["shade", "Shade bench", 1.4, 1.4]],
  }),
  footprint("kiosk", "Crossroads Kiosk", {
    kind: "shop",
    style: "pavilion",
    districtId: "civic",
    origin: { x: 20, y: 20 },
    size: { x: 3, y: 3 },
    height: 26,
    roof: "#3d4a3a",
    wall: "#d4e0c8",
    wallDark: "#7a8d6a",
    accent: "#65a30d",
    sign: "MAP",
    desks: [["board", "Wayfinding", 1.4, 1.4]],
  }),
  footprint("retail", "Ribbon Shop", {
    kind: "retail",
    style: "retail",
    districtId: "startup",
    origin: { x: 32, y: 7 },
    size: { x: 3, y: 3 },
    height: 36,
    roof: "#7a3038",
    wall: "#f0c4c8",
    wallDark: "#c47880",
    accent: "#fb7185",
    sign: "RIBBON",
    desks: [["till", "Till", 1.4, 1.5]],
  }),
  footprint("conference", "Summit Hall", {
    kind: "conference",
    style: "conference",
    districtId: "research",
    origin: { x: 50, y: 2 },
    size: { x: 6, y: 4 },
    height: 42,
    roof: "#dfe6ee",
    wall: "#c5d4e4",
    wallDark: "#7a92a8",
    accent: "#38bdf8",
    sign: "SUMMIT",
    desks: [
      ["stage", "Stage", 3, 1.2],
      ["floor", "Floor", 3, 2.6],
    ],
  }),
  footprint("helix-lab", "Helix Annex", {
    kind: "lab",
    style: "lab",
    districtId: "research",
    origin: { x: 59, y: 2 },
    size: { x: 4, y: 4 },
    height: 48,
    roof: "#e8f4f0",
    wall: "#b8ddd4",
    wallDark: "#6aa090",
    accent: "#2dd4bf",
    sign: "HELIX",
    desks: [["clean", "Clean room", 2, 2]],
  }),
  footprint("relay", "Relay Stack", {
    kind: "data",
    style: "data",
    districtId: "research",
    origin: { x: 50, y: 13 },
    size: { x: 3, y: 6 },
    height: 78,
    roof: "#1e293b",
    wall: "#334155",
    wallDark: "#1e293b",
    accent: "#22d3ee",
    sign: "RX",
    desks: [["core", "Core", 1.4, 3]],
  }),
  footprint("workshop", "Forge Shed", {
    kind: "workshop",
    style: "workshop",
    districtId: "yards",
    origin: { x: 8, y: 43 },
    size: { x: 3, y: 3 },
    height: 34,
    roof: "#5c4030",
    wall: "#c4a060",
    wallDark: "#8a6a38",
    accent: "#f59e0b",
    sign: "FORGE",
    desks: [["anvil", "Bench", 2, 2]],
  }),
  footprint("coldstore", "Cold Store", {
    kind: "warehouse",
    style: "warehouse",
    districtId: "yards",
    origin: { x: 7, y: 38 },
    size: { x: 4, y: 4 },
    height: 40,
    roof: "#3f4a55",
    wall: "#8a9aaa",
    wallDark: "#5c6a78",
    accent: "#94a3b8",
    sign: "COLD",
    desks: [["bay", "Bay 2", 2, 2]],
  }),
  footprint("flats", "Ridge Flats", {
    kind: "apartment",
    style: "apartment",
    districtId: "ridge",
    origin: { x: 50, y: 26 },
    size: { x: 4, y: 5 },
    height: 70,
    roof: "#4a3d4a",
    wall: "#e8d0c4",
    wallDark: "#b08980",
    accent: "#fb923c",
    sign: "FLATS",
    desks: [
      ["a1", "Flat A", 1.2, 1.4],
      ["a2", "Flat B", 2.6, 3.2],
    ],
  }),
  footprint("home-c", "Row House C", {
    kind: "home",
    style: "house",
    districtId: "ridge",
    origin: { x: 55, y: 26 },
    size: { x: 3, y: 3 },
    height: 34,
    roof: "#4a3040",
    wall: "#f0e4d4",
    wallDark: "#b8a090",
    accent: "#e11d48",
    desks: [["nook", "Nook", 1.4, 1.4]],
  }),
  footprint("home-d", "Row House D", {
    kind: "home",
    style: "house",
    districtId: "ridge",
    origin: { x: 55, y: 31 },
    size: { x: 3, y: 3 },
    height: 36,
    roof: "#3d4a55",
    wall: "#d4dce8",
    wallDark: "#8896a8",
    accent: "#64748b",
    desks: [["study", "Study", 1.4, 1.4]],
  }),
  footprint("inn", "Northshore Inn", {
    kind: "hotel",
    style: "hotel",
    districtId: "docks",
    origin: { x: 50, y: 38 },
    size: { x: 5, y: 4 },
    height: 86,
    roof: "#3d2a28",
    wall: "#e8c4a8",
    wallDark: "#b07a60",
    accent: "#f43f5e",
    sign: "INN",
    desks: [
      ["lobby-desk", "Front desk", 2.4, 1.2],
      ["suite", "Suite", 3.4, 2.6],
    ],
  }),
  footprint("brine", "Brine Table", {
    kind: "restaurant",
    style: "restaurant",
    districtId: "docks",
    origin: { x: 59, y: 38 },
    size: { x: 4, y: 3 },
    height: 32,
    roof: "#2f3d3a",
    wall: "#a8d4c8",
    wallDark: "#5c8d80",
    accent: "#14b8a6",
    sign: "BRINE",
    desks: [["terrace", "Terrace", 2, 1.6]],
  }),
  footprint("market", "Pier Market", {
    kind: "retail",
    style: "retail",
    districtId: "docks",
    origin: { x: 50, y: 44 },
    size: { x: 4, y: 3 },
    height: 30,
    roof: "#5c4630",
    wall: "#f0dcb0",
    wallDark: "#b89a68",
    accent: "#f59e0b",
    sign: "MARKET",
    desks: [["stall", "Stall", 2, 1.5]],
  }),
];

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

export function makeTerrain(): TileKind[][] {
  const tiles: TileKind[][] = [];
  for (let y = 0; y < GRID; y++) {
    const row: TileKind[] = [];
    for (let x = 0; x < GRID; x++) {
      let kind: TileKind = "grass";
      if (x <= 3 && y >= 4 && y <= 46) kind = "water";
      if (x <= 5 && y >= 16 && y <= 22) kind = "water";
      if (x >= 54 && y >= 52) kind = "water";
      if (x >= 61 && y >= 46 && y <= 63) kind = "water";
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
      if (kind === "grass" && (x + y * 3) % 19 === 0) kind = "dirt";
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
      ];
      for (const [nx, ny] of neighbors) {
        if (nx < 0 || ny < 0 || nx >= GRID || ny >= GRID) continue;
        const t = tiles[ny]![nx]!;
        if (t === "grass" || t === "park" || t === "dirt" || t === "sidewalk") tiles[ny]![nx] = "sand";
      }
    }
  }
  return tiles;
}

export const TERRAIN = makeTerrain();

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
