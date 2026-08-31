import { GRID } from "./campus";

export const TILE = 1.2;
export const WORLD_SPAN = GRID * TILE;

export function wx(gridX: number) {
  return (gridX - GRID / 2) * TILE;
}

export function wz(gridY: number) {
  return (gridY - GRID / 2) * TILE;
}

export function fromWorld(x: number, z: number) {
  return { x: x / TILE + GRID / 2, y: z / TILE + GRID / 2 };
}

export function buildingHeight(h: number) {
  return Math.max(1.2, h / 16);
}

export const MAX_VIEW_DIST = 24;
export const MIN_VIEW_DIST = 5.2;
/** Pull-back used by the Whole city button — most of the 64×64 campus, not the empty fringe. */
export const OVERVIEW_DIST = 52;
export const ZOOM_IN = 0.9;
export const ZOOM_OUT = 1.1;
const SCALE_MIN = 0.42;
const SCALE_MAX = 2.2;

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
