import { assetId } from "./assets";
import { DISTRICTS, GRID, ROAD_XS, ROAD_YS, TERRAIN, WORLD_BUILDINGS, buildingAt } from "./campus";
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

export function makeScenery(): Scenery[] {
  const items: Scenery[] = [];

  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const tile: TileKind = TERRAIN[y]![x]!;
      if (tile === "park" && (x * 5 + y * 3) % 5 === 0 && !buildingAt(WORLD_BUILDINGS, x + 0.4, y + 0.35)) {
        push(items, { kind: "tree", slug: (x + y) % 2 === 0 ? "cedar" : "maple", x: x + 0.4, y: y + 0.35 });
      }
    }
  }

  for (const rx of ROAD_XS) {
    for (let y = 2; y < GRID; y += 4) {
      if (TERRAIN[y]![rx] !== "road") continue;
      const ox = rx + 0.42;
      const oy = y + 0.5;
      if (!occupied(rx + 1, y) || TERRAIN[y]![Math.min(GRID - 1, rx + 1)] === "sidewalk") {
        push(items, { kind: "lamp", slug: "street-lamp", x: ox, y: oy });
      }
    }
  }
  for (const ry of ROAD_YS) {
    for (let x = 4; x < GRID; x += 5) {
      if (TERRAIN[ry]![x] !== "road") continue;
      if (items.some((s) => s.kind === "lamp" && Math.hypot(s.x - x, s.y - (ry + 0.4)) < 1.2)) continue;
      push(items, { kind: "lamp", slug: "street-lamp", x: x + 0.5, y: ry + 0.38 });
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
  ] as const;
  for (const [x, y] of planterSpots) {
    if (!occupied(x, y)) push(items, { kind: "planter", slug: "bowl-planter", x, y });
  }

  let carI = 0;
  for (const rx of ROAD_XS) {
    for (let y = 8; y < GRID - 4; y += 11) {
      if (TERRAIN[y]![rx] !== "road") continue;
      if (ROAD_YS.includes(y)) continue;
      push(items, { kind: "car", slug: carI % 2 === 0 ? "hatch" : "van", x: rx + 0.15, y: y + 0.2, color: carI % 3 === 0 ? "#c45c4a" : carI % 3 === 1 ? "#5b8ad4" : "#e3b341" });
      carI++;
    }
  }

  for (let y = 26; y <= 34; y++) {
    if (TERRAIN[y]![1] === "water") continue;
    push(items, { kind: "fence", slug: "yard-fence", x: 0.55, y: y + 0.2, w: 0.2, h: 0.7 });
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
