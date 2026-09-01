/**
 * Dump Agentspace campus/plots/scenery into scripts/blender/world_contract.json.
 * Run: npx --yes tsx scripts/blender/dump-world-contract.ts
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DISTRICTS, GRID, ROAD_XS, ROAD_YS, TERRAIN, WORLD_BUILDINGS } from "../../src/lib/campus";
import { CITY_PLOTS, LAND_CELL, LAND_COLS, LAND_ORIGIN, LAND_ROWS, landBounds } from "../../src/lib/plots";
import { makeScenery } from "../../src/lib/scenery";
import { CARRIAGE_TILES, CURB_TILES, WALK_TILES } from "../../src/lib/traffic";
import { TILE_PX } from "../../src/lib/units";

const root = dirname(fileURLToPath(import.meta.url));

function wx(g: number) {
  return (g - GRID / 2) * TILE_PX;
}
function wz(g: number) {
  return (g - GRID / 2) * TILE_PX;
}

const scenery = makeScenery();
const contract = {
  stage: 1,
  source: "src/lib/campus.ts + coords + traffic + plots + scenery",
  grid: GRID,
  tile: TILE_PX,
  worldSpan: GRID * TILE_PX,
  origin: { grid: { x: GRID / 2, y: GRID / 2 }, world: { x: 0, y: 0, z: 0 } },
  axes: { blenderXY: "three.js XZ", blenderZ: "up", gltfExport: "Y-up" },
  roadXs: ROAD_XS,
  roadYs: ROAD_YS,
  carriageTiles: CARRIAGE_TILES,
  walkTiles: WALK_TILES,
  curbTiles: CURB_TILES,
  land: {
    origin: LAND_ORIGIN,
    cell: LAND_CELL,
    cols: LAND_COLS,
    rows: LAND_ROWS,
    bounds: landBounds(),
  },
  districts: DISTRICTS.map((d) => ({
    id: d.id,
    label: d.label,
    origin: d.origin,
    size: d.size,
    theme: d.theme,
    centerWorld: { x: wx(d.origin.x + d.size.x / 2), y: wz(d.origin.y + d.size.y / 2) },
  })),
  lots: CITY_PLOTS.map((p) => ({
    id: p.id,
    kind: p.kind,
    districtId: p.districtId,
    buildingId: p.buildingId ?? null,
    groupLabel: p.groupLabel,
    grid: { x: p.x, y: p.y, w: p.w, h: p.h },
    world: {
      x: wx(p.x + p.w / 2),
      y: wz(p.y + p.h / 2),
      w: p.w * TILE_PX,
      d: p.h * TILE_PX,
    },
  })),
  buildingFootprints: WORLD_BUILDINGS.map((b) => ({
    id: b.id,
    name: b.name,
    assetId: b.assetId,
    origin: b.origin,
    size: b.size,
    note: "Lot footprint only in STEP 1 — no building mesh",
  })),
  terrainRows: TERRAIN.map((row) => row.join(",")),
  scenery: scenery
    .filter((s) => s.kind === "tree" || s.kind === "lamp" || s.kind === "bench" || s.kind === "planter" || s.kind === "sign" || s.kind === "hedge" || s.kind === "bush")
    .map((s) => ({
      id: s.id,
      kind: s.kind,
      assetId: s.assetId,
      x: s.x,
      y: s.y,
      world: { x: wx(s.x), y: wz(s.y) },
    })),
};

const out = join(root, "world_contract.json");
writeFileSync(out, JSON.stringify(contract, null, 2));
console.log("wrote", out, "lots", contract.lots.length, "scenery", contract.scenery.length);
