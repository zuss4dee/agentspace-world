import { CORE, DISTRICTS, GRID, ROAD_XS, ROAD_YS, TERRAIN, WORLD_BUILDINGS, buildingAt } from "./campus";
import { hash2 } from "./noise";
import type { Building, BuildingKind, BuildingStyle, District } from "./types";

export type CityLot = Building;

const NAMES: Record<string, string[]> = {
  executive: ["Board Annex", "Chair House", "Atlas Brief", "North Desk", "Crown Glass"],
  tech: ["Relay Bay", "Kernel Shed", "Patchworks", "Uptime Hall", "Stack Lane", "Bit Yard"],
  creative: ["Ink Loft", "Cut Room", "Type House", "Reel Dock", "Palette Row"],
  research: ["Quiet Rack", "Helix Annex", "Sample Hall", "Proof Lab", "Field Notes"],
  finance: ["Ledger Annex", "Clearing House", "Runway Desk", "Vault Row", "Audit Court"],
  operations: ["Dispatch Bay", "Route Shed", "Spare Yard", "Dock Office", "Shift House"],
  residential: ["Row House", "Porch Flat", "Canal Cottage", "Ridge Walk", "Garden Stair"],
  public: ["Corner Cafe", "Reading Room", "Plaza Kiosk", "Bath House", "Green Shelter"],
};

const STYLES: Record<string, { style: BuildingStyle; kind: BuildingKind; wall: string; wallDark: string; roof: string; accent: string; h: [number, number] }> = {
  executive: { style: "hq", kind: "office", wall: "#c5d0e0", wallDark: "#6d7c92", roof: "#2e3a4d", accent: "#ed712e", h: [52, 110] },
  tech: { style: "office", kind: "office", wall: "#b7c9c4", wallDark: "#4f6d68", roof: "#2a3d3a", accent: "#34d399", h: [36, 88] },
  creative: { style: "studio", kind: "studio", wall: "#e2b7c4", wallDark: "#8d5a6c", roof: "#4a3038", accent: "#fb7185", h: [28, 62] },
  research: { style: "lab", kind: "lab", wall: "#d5e4ee", wallDark: "#5d7386", roof: "#334155", accent: "#38bdf8", h: [40, 78] },
  finance: { style: "office", kind: "office", wall: "#9eb0d0", wallDark: "#4a5f82", roof: "#243044", accent: "#60a5fa", h: [48, 96] },
  operations: { style: "workshop", kind: "workshop", wall: "#cbb892", wallDark: "#7a6a48", roof: "#4a4030", accent: "#d97706", h: [24, 48] },
  residential: { style: "house", kind: "home", wall: "#edd8c4", wallDark: "#b08968", roof: "#6b3a28", accent: "#f59e0b", h: [22, 40] },
  public: { style: "cafe", kind: "cafe", wall: "#f0c8a8", wallDark: "#b07850", roof: "#5c3a28", accent: "#fbbf24", h: [22, 38] },
  campus: { style: "hall", kind: "hall", wall: "#d8c8b0", wallDark: "#8a7a62", roof: "#4a3c30", accent: "#c4a574", h: [30, 54] },
};

function isRoad(x: number, y: number) {
  return ROAD_XS.includes(x) || ROAD_YS.includes(y);
}

function occupied(x: number, y: number, w: number, d: number, lots: CityLot[]) {
  for (let iy = y; iy < y + d; iy++) {
    for (let ix = x; ix < x + w; ix++) {
      if (ix < 0 || iy < 0 || ix >= GRID || iy >= GRID) return true;
      const tile = TERRAIN[iy]![ix];
      if (tile === "water" || tile === "park") return true;
      if (isRoad(ix, iy)) return true;
      if (buildingAt(WORLD_BUILDINGS, ix + 0.2, iy + 0.2)) return true;
    }
  }
  return lots.some(
    (b) => x < b.origin.x + b.size.x && x + w > b.origin.x && y < b.origin.y + b.size.y && y + d > b.origin.y,
  );
}

function lotName(theme: string, i: number) {
  const list = NAMES[theme] ?? NAMES.public!;
  return `${list[i % list.length]} ${String.fromCharCode(65 + (i % 12))}`;
}

export function generateCityLots(): CityLot[] {
  const lots: CityLot[] = [];
  let n = 0;
  for (const d of DISTRICTS) {
    if (d.origin.x + d.size.x <= CORE && d.origin.y + d.size.y <= CORE) continue;
    const theme = d.theme ?? "public";
    const look = STYLES[theme] ?? STYLES.public!;
    const step = theme === "residential" ? 3 : theme === "executive" || theme === "finance" ? 4 : 3;
    for (let y = d.origin.y + 1; y < d.origin.y + d.size.y - 2; y += step) {
      for (let x = d.origin.x + 1; x < d.origin.x + d.size.x - 2; x += step) {
        if (x < CORE && y < CORE) continue;
        const hsh = hash2(x * 1.7, y * 2.1);
        if (hsh < 0.22) continue;
        const w = theme === "residential" ? 2 : 2 + (hsh > 0.78 ? 1 : 0);
        const depth = theme === "operations" ? 2 + (hsh > 0.6 ? 1 : 0) : 2;
        if (occupied(x, y, w, depth, lots)) continue;
        const height = look.h[0] + Math.floor(hsh * (look.h[1] - look.h[0]));
        const id = `lot-${d.id}-${n}`;
        lots.push({
          id,
          name: lotName(theme, n),
          kind: look.kind,
          style: look.style,
          districtId: d.id,
          origin: { x, y },
          size: { x: w, y: depth },
          height,
          roof: look.roof,
          wall: look.wall,
          wallDark: look.wallDark,
          accent: look.accent,
          purpose: d.blurb,
          procedural: true,
          assetId: `pack.northshore.lot.${theme}.${id}`,
          stations: [],
        });
        n++;
      }
    }
  }
  return lots;
}

export const CITY_LOTS = generateCityLots();

export const ALL_BUILDINGS: Building[] = [...WORLD_BUILDINGS, ...CITY_LOTS];

export function buildingAnywhere(x: number, y: number) {
  return buildingAt(ALL_BUILDINGS, x, y);
}

export const LANDMARKS = WORLD_BUILDINGS.map((b) => ({
  id: b.id,
  name: b.name,
  x: b.origin.x + b.size.x / 2,
  y: b.origin.y + b.size.y / 2,
  districtId: b.districtId,
}));

export function outerTreeSpots() {
  const spots: { x: number; y: number; pine: boolean }[] = [];
  for (const d of DISTRICTS) {
    if (d.theme !== "public" && d.theme !== "residential" && d.id !== "southpark" && d.id !== "parklands" && d.id !== "meadow") {
      continue;
    }
    for (let y = d.origin.y; y < d.origin.y + d.size.y; y += 2) {
      for (let x = d.origin.x; x < d.origin.x + d.size.x; x += 2) {
        if (x < CORE && y < CORE) continue;
        const h = hash2(x + 3, y + 9);
        if (h < 0.55) continue;
        if (isRoad(x, y)) continue;
        spots.push({ x: x + 0.3 + h * 0.4, y: y + 0.25 + hash2(y, x) * 0.4, pine: h > 0.82 });
      }
    }
  }
  return spots;
}

export const OUTER_TREES = outerTreeSpots();

export function extraTraffic() {
  const cars: { axis: "x" | "y"; lane: number; phase: number; speed: number; color: string }[] = [];
  const colors = ["#d9574a", "#4d7cbe", "#ece7dc", "#e3b341", "#3d8b6e", "#8b6bc6", "#334155", "#c45c4a"];
  ROAD_XS.filter((x) => x >= CORE).forEach((lane, i) => {
    cars.push({ axis: "y", lane, phase: (i * 0.17) % 1, speed: 0.28 + (i % 5) * 0.04, color: colors[i % colors.length]! });
  });
  ROAD_YS.filter((y) => y >= CORE).forEach((lane, i) => {
    cars.push({ axis: "x", lane, phase: (i * 0.23) % 1, speed: 0.26 + (i % 4) * 0.05, color: colors[(i + 3) % colors.length]! });
  });
  return cars;
}

export function extraLamps() {
  const lamps: { x: number; y: number }[] = [];
  for (const rx of ROAD_XS) {
    if (rx < CORE) continue;
    for (let y = 4; y < GRID; y += 6) {
      lamps.push({ x: rx + 0.7, y: y + 0.4 });
    }
  }
  return lamps;
}

export function districtTheme(d: District) {
  return d.theme ?? "campus";
}
