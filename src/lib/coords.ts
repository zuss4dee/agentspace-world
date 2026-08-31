import { GRID } from "./campus";
import { TILE_PX, h, deg } from "./units";

/** One street tile, in world pixels. */
export const TILE = TILE_PX;
export const WORLD_SPAN = GRID * TILE_PX;

export function wx(gridX: number) {
  return (gridX - GRID / 2) * TILE_PX;
}

export function wz(gridY: number) {
  return (gridY - GRID / 2) * TILE_PX;
}

export function fromWorld(x: number, z: number) {
  return { x: x / TILE_PX + GRID / 2, y: z / TILE_PX + GRID / 2 };
}

export function buildingHeight(campusH: number) {
  return Math.max(TILE_PX * 0.45, (campusH / 16) * (TILE_PX / 1.2));
}

/** Camera distance in pixels (was ~4.3–28 tiles). */
export const MIN_VIEW_DIST = 5.2 * (TILE_PX / 1.2);
export const MAX_VIEW_DIST = 34 * (TILE_PX / 1.2);
export const OVERVIEW_DIST = 52 * (TILE_PX / 1.2);
export const ZOOM_IN = 0.9;
export const ZOOM_OUT = 1.1;
const SCALE_MIN = 0.42;
const SCALE_MAX = 2.2;

export { h, deg, TILE_PX };

/** Higher scale = closer camera. Linear so + and − move the same amount. */
export function distFromScale(scale: number) {
  const t = (THREE_CLAMP(scale, SCALE_MIN, SCALE_MAX) - SCALE_MIN) / (SCALE_MAX - SCALE_MIN);
  return MAX_VIEW_DIST + t * (MIN_VIEW_DIST - MAX_VIEW_DIST);
}

export function scaleFromDist(dist: number, cap = MAX_VIEW_DIST) {
  const t = (THREE_CLAMP(dist, MIN_VIEW_DIST, cap) - MAX_VIEW_DIST) / (MIN_VIEW_DIST - MAX_VIEW_DIST);
  return SCALE_MIN + THREE_CLAMP(t, 0, 1) * (SCALE_MAX - SCALE_MIN);
}

function THREE_CLAMP(n: number, a: number, b: number) {
  return Math.min(b, Math.max(a, n));
}
