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

export const MAX_VIEW_DIST = 32;
export const MIN_VIEW_DIST = 4.2;

export function distFromScale(scale: number) {
  if (scale <= 0.42) return MAX_VIEW_DIST;
  if (scale <= 0.55) return 24;
  if (scale <= 1) return 16;
  if (scale <= 1.45) return 9.5;
  return MIN_VIEW_DIST;
}
