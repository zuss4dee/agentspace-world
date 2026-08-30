import type { Building, District, TileKind } from "./types";

export const GRID = 50;
export const ROAD_XS = [12, 24, 36];
export const ROAD_YS = [12, 24, 36];

export const DISTRICTS: District[] = [
  { id: "parklands", label: "Parklands", blurb: "Trees, water, and a quiet lawn.", origin: { x: 0, y: 0 }, size: { x: 11, y: 11 } },
  { id: "corporate", label: "Corporate", blurb: "HQ, finance, the board hall.", origin: { x: 13, y: 0 }, size: { x: 11, y: 11 } },
  { id: "startup", label: "Startup row", blurb: "Lofts, a seed cafe, an incubator.", origin: { x: 25, y: 0 }, size: { x: 11, y: 11 } },
  { id: "creative", label: "Creative", blurb: "Studio, gallery, cottages.", origin: { x: 37, y: 0 }, size: { x: 13, y: 23 } },
  { id: "industrial", label: "Industrial", blurb: "Factory floor and warehouses.", origin: { x: 0, y: 25 }, size: { x: 23, y: 11 } },
  { id: "labs", label: "Labs", blurb: "Research and the quiet racks.", origin: { x: 25, y: 25 }, size: { x: 11, y: 11 } },
  { id: "homes", label: "Homes", blurb: "Where the crew actually sleeps.", origin: { x: 37, y: 25 }, size: { x: 13, y: 11 } },
  { id: "transit", label: "Transit", blurb: "Walk-ins spawn at the station.", origin: { x: 13, y: 37 }, size: { x: 11, y: 13 } },
  { id: "waterfront", label: "Waterfront", blurb: "Visitor companies and the pier cafe.", origin: { x: 37, y: 37 }, size: { x: 13, y: 13 } },
];

function footprint(id: string, name: string, extra: Omit<Building, "id" | "name" | "stations"> & { desks: [string, string, number, number][] }): Building {
  const { desks, ...rest } = extra;
  const stations = desks.map(([sid, sname, dx, dy]) => ({
    id: sid,
    name: sname,
    x: extra.origin.x + dx,
    y: extra.origin.y + dy,
  }));
  return { id, name, stations, ...rest };
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

export function makeTerrain(): TileKind[][] {
  const tiles: TileKind[][] = [];
  for (let y = 0; y < GRID; y++) {
    const row: TileKind[] = [];
    for (let x = 0; x < GRID; x++) {
      let kind: TileKind = "grass";
      if (x <= 4 && y >= 8 && y <= 42) kind = "water";
      if (x <= 5 && y >= 18 && y <= 22) kind = "water";
      if (x >= 46 && y >= 40) kind = "water";
      if (x >= 1 && x <= 9 && y >= 1 && y <= 9 && kind !== "water") kind = "park";
      if (x >= 43 && x <= 48 && y >= 8 && y <= 14) kind = "park";
      if ((x >= 22 && x <= 26 && y >= 22 && y <= 26) || (x === 24 || y === 24) && x > 10 && y > 10) {
        if (!isRoad(x, y) && kind !== "water") kind = "plaza";
      }
      if (isRoad(x, y) && kind !== "water") kind = "road";
      if (kind === "grass" && ((x + y * 3) % 17 === 0)) kind = "dirt";
      row.push(kind);
    }
    tiles.push(row);
  }
  return tiles;
}

export const TERRAIN = makeTerrain();

export const TREES: { x: number; y: number }[] = [];
for (let y = 1; y < 10; y++) {
  for (let x = 1; x < 10; x++) {
    if ((x * 5 + y * 3) % 4 === 0 && TERRAIN[y]![x] === "park") TREES.push({ x: x + 0.4, y: y + 0.35 });
  }
}
for (let i = 0; i < 18; i++) {
  TREES.push({ x: 43 + (i % 5) * 0.9, y: 8 + Math.floor(i / 5) * 1.1 });
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
