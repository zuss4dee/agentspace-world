/**
 * City → lot → building footprint.
 * Lots keep their stored size. Buildings must sit in the private interior of the lot
 * (no roads, sidewalks, or neighbouring lots).
 */
import { GRID, ROAD_XS, ROAD_YS, TERRAIN, WORLD_BUILDINGS } from "./campus";
import { TILE, wx, wz } from "./coords";
import { placementMetersForAssetId } from "./building-gltf";
import type { Building } from "./types";

export type TileRect = { x: number; y: number; w: number; h: number };

/** Extra inset (tiles) when a lot edge abuts public right-of-way. */
export const ROW_EDGE_CLEARANCE = 0.12;

export function isPublicRightOfWay(ix: number, iy: number) {
  if (ix < 0 || iy < 0 || ix >= GRID || iy >= GRID) return true;
  const t = TERRAIN[iy]![ix];
  return t === "road" || t === "sidewalk" || ROAD_XS.includes(ix) || ROAD_YS.includes(iy);
}

export function rectHitsRightOfWay(x: number, y: number, w: number, h: number) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.ceil(x + w - 1e-6);
  const y1 = Math.ceil(y + h - 1e-6);
  for (let iy = y0; iy < y1; iy++) {
    for (let ix = x0; ix < x1; ix++) {
      if (isPublicRightOfWay(ix, iy)) return true;
    }
  }
  return false;
}

function rowCountInCol(rect: TileRect, ix: number) {
  let n = 0;
  for (let iy = rect.y; iy < rect.y + rect.h; iy++) if (isPublicRightOfWay(ix, iy)) n++;
  return n;
}

function rowCountInRow(rect: TileRect, iy: number) {
  let n = 0;
  for (let ix = rect.x; ix < rect.x + rect.w; ix++) if (isPublicRightOfWay(ix, iy)) n++;
  return n;
}

/** Largest inner tile rectangle with no public-right-of-way tiles. */
export function privateTileFootprint(lot: TileRect): TileRect | null {
  let rect: TileRect = { ...lot };
  for (let guard = 0; guard < 64; guard++) {
    if (rect.w < 1 || rect.h < 1) return null;
    if (!rectHitsRightOfWay(rect.x, rect.y, rect.w, rect.h)) return rect;
    const west = rowCountInCol(rect, rect.x);
    const east = rowCountInCol(rect, rect.x + rect.w - 1);
    const north = rowCountInRow(rect, rect.y);
    const south = rowCountInRow(rect, rect.y + rect.h - 1);
    const worst = Math.max(west, east, north, south);
    if (worst === 0) return rect;
    if (west === worst && rect.w > 1) {
      rect = { ...rect, x: rect.x + 1, w: rect.w - 1 };
    } else if (east === worst && rect.w > 1) {
      rect = { ...rect, w: rect.w - 1 };
    } else if (north === worst && rect.h > 1) {
      rect = { ...rect, y: rect.y + 1, h: rect.h - 1 };
    } else if (south === worst && rect.h > 1) {
      rect = { ...rect, h: rect.h - 1 };
    } else {
      return null;
    }
  }
  return null;
}

function abutsRightOfWay(inner: TileRect, dx: number, dy: number) {
  if (dy === 0) {
    const ix = dx < 0 ? inner.x - 1 : inner.x + inner.w;
    for (let iy = inner.y; iy < inner.y + inner.h; iy++) if (isPublicRightOfWay(ix, iy)) return true;
    return false;
  }
  const iy = dy < 0 ? inner.y - 1 : inner.y + inner.h;
  for (let ix = inner.x; ix < inner.x + inner.w; ix++) if (isPublicRightOfWay(ix, iy)) return true;
  return false;
}

export type LotFootprint = {
  tiles: TileRect;
  cx: number;
  cz: number;
  w: number;
  d: number;
};

/** Building rectangle inside a lot. Lot data is unchanged. */
export function lotBuildingFootprint(lot: TileRect): LotFootprint | null {
  const inner = privateTileFootprint(lot);
  if (!inner) return null;
  let x = inner.x;
  let y = inner.y;
  let w = inner.w;
  let h = inner.h;
  const inset = ROW_EDGE_CLEARANCE;
  if (abutsRightOfWay(inner, -1, 0)) {
    x += inset;
    w -= inset;
  }
  if (abutsRightOfWay(inner, 1, 0)) w -= inset;
  if (abutsRightOfWay(inner, 0, -1)) {
    y += inset;
    h -= inset;
  }
  if (abutsRightOfWay(inner, 0, 1)) h -= inset;
  if (w < 0.5 || h < 0.5) return null;
  const tiles = { x, y, w, h };
  return {
    tiles,
    cx: wx(x + w / 2),
    cz: wz(y + h / 2),
    w: w * TILE,
    d: h * TILE,
  };
}

export function fitMeshInFootprint(fp: LotFootprint, meshMeters: { w: number; d: number }, fill = 1) {
  const targetW = fp.w * fill;
  const targetD = fp.d * fill;
  const scale = Math.min(targetW / meshMeters.w, targetD / meshMeters.d);
  return { cx: fp.cx, cz: fp.cz, scale, w: meshMeters.w * scale, d: meshMeters.d * scale };
}

export function buildingLotRect(b: Building): TileRect {
  return { x: b.origin.x, y: b.origin.y, w: b.size.x, h: b.size.y };
}

export function authoredBuildingPlacement(b: Building) {
  const fp = lotBuildingFootprint(buildingLotRect(b));
  if (!fp) return null;
  const meshMeters = placementMetersForAssetId(b.assetId);
  if (!meshMeters) return null;
  return { ...fitMeshInFootprint(fp, meshMeters), footprint: fp };
}

export function claimedBuildingPlacement(
  fp: LotFootprint,
  meshMeters: { w: number; d: number } | undefined,
  fill = 0.96,
) {
  if (!meshMeters?.w || !meshMeters.d) return null;
  return { ...fitMeshInFootprint(fp, meshMeters, fill), footprint: fp };
}

/** Tile-grid building footprint from the claim wizard → lot placement for a GLB. */
export function claimedBuildingPlacementFromPlot(
  fp: { x: number; y: number; w: number; h: number },
  meshMeters: { w: number; d: number } | undefined,
  fill = 0.96,
) {
  const lot: LotFootprint = {
    tiles: { x: fp.x, y: fp.y, w: fp.w, h: fp.h },
    cx: wx(fp.x + fp.w / 2),
    cz: wz(fp.y + fp.h / 2),
    w: fp.w * TILE,
    d: fp.h * TILE,
  };
  return claimedBuildingPlacement(lot, meshMeters, fill);
}

export function isOccupiedPlot(p: { kind: string; buildingId?: string }) {
  return p.kind === "owned" || Boolean(p.buildingId);
}

export function occupiedPlotIds(plots: { id: string; kind: string; buildingId?: string }[]) {
  return new Set(plots.filter(isOccupiedPlot).map((p) => p.id));
}

function rectsOverlap(a: TileRect, b: TileRect) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export type FootprintIssue = {
  id: string;
  kind: "row-in-lot" | "unconstrained-hits-row" | "constrained-hits-row" | "neighbor-overlap" | "no-private-footprint";
  detail: string;
};

export function auditOccupiedBuildings(): { occupied: number; issues: FootprintIssue[] } {
  const issues: FootprintIssue[] = [];
  const rects = WORLD_BUILDINGS.map((b) => ({ b, r: buildingLotRect(b) }));
  for (const { b, r } of rects) {
    const rowTiles: string[] = [];
    for (let iy = r.y; iy < r.y + r.h; iy++) {
      for (let ix = r.x; ix < r.x + r.w; ix++) {
        if (isPublicRightOfWay(ix, iy)) rowTiles.push(`${ix},${iy}:${TERRAIN[iy]?.[ix]}`);
      }
    }
    if (rowTiles.length) {
      issues.push({ id: b.id, kind: "row-in-lot", detail: rowTiles.join("; ") });
    }
    if (rectHitsRightOfWay(r.x, r.y, r.w, r.h)) {
      issues.push({ id: b.id, kind: "unconstrained-hits-row", detail: `lot ${r.w}×${r.h} at ${r.x},${r.y}` });
    }
    const fp = lotBuildingFootprint(r);
    if (!fp) {
      issues.push({ id: b.id, kind: "no-private-footprint", detail: "could not inset out of right-of-way" });
    } else if (rectHitsRightOfWay(fp.tiles.x, fp.tiles.y, fp.tiles.w, fp.tiles.h)) {
      issues.push({
        id: b.id,
        kind: "constrained-hits-row",
        detail: `inner ${fp.tiles.w}×${fp.tiles.h} at ${fp.tiles.x},${fp.tiles.y}`,
      });
    }
  }
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i]!;
      const c = rects[j]!;
      if (rectsOverlap(a.r, c.r)) {
        issues.push({
          id: `${a.b.id}+${c.b.id}`,
          kind: "neighbor-overlap",
          detail: "lot rectangles overlap",
        });
      }
      const af = lotBuildingFootprint(a.r);
      const cf = lotBuildingFootprint(c.r);
      if (af && cf && rectsOverlap(af.tiles, cf.tiles)) {
        issues.push({
          id: `${a.b.id}+${c.b.id}`,
          kind: "neighbor-overlap",
          detail: "constrained building footprints overlap",
        });
      }
    }
  }
  return { occupied: WORLD_BUILDINGS.length, issues };
}
