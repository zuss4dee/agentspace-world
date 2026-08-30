import { assetId } from "./assets";
import { DISTRICTS, GRID, ROAD_XS, ROAD_YS, TERRAIN, WORLD_BUILDINGS, buildingAt } from "./campus";
import { hash2 } from "./noise";
import type { Scenery, TileKind } from "./types";

function occupied(x: number, y: number) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  if (ix < 0 || iy < 0 || ix >= GRID || iy >= GRID) return true;
  const tile = TERRAIN[iy]![ix]!;
  if (tile === "water" || tile === "road") return true;
  return Boolean(buildingAt(WORLD_BUILDINGS, x, y));
}

function push(list: Scenery[], item: Omit<Scenery, "id" | "assetId"> & { slug: string; id?: string }) {
  const { slug, ...rest } = item;
  list.push({
    id: item.id ?? `${item.kind}-${list.length}`,
    assetId: assetId(item.kind, slug),
    ...rest,
  });
}

const TREE_SLUGS = ["cedar", "maple", "oak", "pine", "willow"] as const;

export function makeScenery(): Scenery[] {
  const items: Scenery[] = [];

  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const tile: TileKind = TERRAIN[y]![x]!;
      const h = hash2(x, y);
      if ((tile === "park" || tile === "grass") && h > 0.62 && !buildingAt(WORLD_BUILDINGS, x + 0.4, y + 0.35)) {
        if (tile === "grass" && h < 0.78) continue;
        const slug = TREE_SLUGS[Math.floor(hash2(x * 3.1, y * 1.7) * TREE_SLUGS.length)]!;
        push(items, { kind: "tree", slug, x: x + 0.25 + h * 0.5, y: y + 0.2 + hash2(y, x) * 0.45 });
      }
      if (tile === "park" && h > 0.35 && h < 0.5 && !occupied(x + 0.5, y + 0.5)) {
        push(items, { kind: "bush", slug: h > 0.42 ? "round-bush" : "low-bush", x: x + 0.5, y: y + 0.55 });
      }
      if (tile === "park" && h > 0.18 && h < 0.26) {
        push(items, { kind: "flower", slug: "meadow", x: x + 0.4, y: y + 0.5, color: h > 0.22 ? "#f472b6" : "#fbbf24" });
      }
    }
  }

  for (let x = 14; x <= 22; x++) {
    if (!occupied(x + 0.2, 1.4)) push(items, { kind: "hedge", slug: "box-hedge", x: x + 0.2, y: 1.35, w: 0.8 });
  }
  for (let y = 26; y <= 34; y++) {
    if (TERRAIN[y]![1] === "water") continue;
    push(items, { kind: "fence", slug: "yard-fence", x: 0.55, y: y + 0.2, w: 0.2, h: 0.7 });
  }

  for (const rx of ROAD_XS) {
    for (let y = 2; y < GRID; y += 4) {
      if (TERRAIN[y]![rx] !== "road") continue;
      push(items, { kind: "lamp", slug: "street-lamp", x: rx + 0.72, y: y + 0.5 });
    }
  }
  for (const ry of ROAD_YS) {
    for (let x = 4; x < GRID; x += 5) {
      if (TERRAIN[ry]![x] !== "road") continue;
      if (items.some((s) => s.kind === "lamp" && Math.hypot(s.x - x, s.y - (ry + 0.4)) < 1.2)) continue;
      push(items, { kind: "lamp", slug: "street-lamp", x: x + 0.5, y: ry + 0.72 });
    }
  }

  const benchSpots = [
    [23.2, 22.4],
    [25.4, 23.2],
    [22.6, 25.1],
    [8.2, 4.2],
    [4.6, 7.4],
    [28.4, 16.2],
    [40.4, 10.2],
    [16.4, 40.6],
    [41.2, 42.2],
    [7.4, 52.2],
    [51.4, 20.4],
    [32.6, 5.6],
  ] as const;
  for (const [x, y] of benchSpots) {
    if (!occupied(x, y)) push(items, { kind: "bench", slug: "plaza-bench", x, y });
  }

  const planterSpots = [
    [13.4, 3.4],
    [18.6, 7.4],
    [26.4, 3.2],
    [33.4, 5.4],
    [38.4, 6.4],
    [25.4, 26.4],
    [50.4, 24.4],
    [14.5, 37.5],
    [16.2, 2.6],
    [51.2, 37.4],
  ] as const;
  for (const [x, y] of planterSpots) {
    if (!occupied(x, y)) push(items, { kind: "planter", slug: "bowl-planter", x, y });
  }

  let carI = 0;
  for (const rx of ROAD_XS) {
    for (let y = 9; y < GRID - 4; y += 14) {
      if (TERRAIN[y]![rx] !== "road") continue;
      if (ROAD_YS.includes(y)) continue;
      push(items, {
        kind: "car",
        slug: carI % 2 === 0 ? "hatch" : "van",
        x: rx + 0.18,
        y: y + 0.25,
        color: carI % 3 === 0 ? "#c45c4a" : carI % 3 === 1 ? "#5b8ad4" : "#e8e4dc",
      });
      carI++;
    }
  }

  const plots: [number, number, number, number, string][] = [
    [14, 14, 4, 3, "plot-civic"],
    [27, 15, 4, 3, "plot-campus"],
    [50, 20, 4, 3, "plot-research"],
    [8, 50, 3, 3, "plot-yards"],
    [28, 50, 4, 3, "plot-south"],
    [40, 14, 3, 3, "plot-creative"],
  ];
  for (const [x, y, w, h, slug] of plots) {
    if (buildingAt(WORLD_BUILDINGS, x + 1, y + 1)) continue;
    push(items, { kind: "plot", slug, x, y, w, h });
  }

  for (const d of DISTRICTS) {
    const x = d.origin.x + 0.8;
    const y = d.origin.y + 0.8;
    if (occupied(x, y)) continue;
    push(items, { kind: "sign", slug: `district-${d.id}`, x, y, color: "#f3efe6" });
  }

  return items;
}

export const SCENERY = makeScenery();
export const TREES = SCENERY.filter((s) => s.kind === "tree").map((s) => ({ x: s.x, y: s.y }));

export type TrafficCar = {
  axis: "x" | "y";
  lane: number;
  phase: number;
  speed: number;
  color: string;
};

export const TRAFFIC: TrafficCar[] = [
  { axis: "y", lane: 24, phase: 0.1, speed: 0.42, color: "#d9574a" },
  { axis: "y", lane: 12, phase: 0.4, speed: 0.33, color: "#4d7cbe" },
  { axis: "y", lane: 36, phase: 0.7, speed: 0.38, color: "#ece7dc" },
  { axis: "x", lane: 24, phase: 0.2, speed: 0.36, color: "#e3b341" },
  { axis: "x", lane: 36, phase: 0.55, speed: 0.29, color: "#3d8b6e" },
  { axis: "x", lane: 12, phase: 0.85, speed: 0.4, color: "#8b6bc6" },
  { axis: "y", lane: 48, phase: 0.15, speed: 0.31, color: "#c45c4a" },
  { axis: "x", lane: 48, phase: 0.62, speed: 0.34, color: "#334155" },
];
