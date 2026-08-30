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
  return Math.max(1.35, h / 14);
}

/** Camera distance for HUD zoom chips. Far is still closer than “see the whole board”. */
export function distFromScale(scale: number) {
  if (scale <= 0.16) return 118;
  if (scale <= 0.28) return 72;
  if (scale <= 0.5) return 42;
  if (scale <= 1) return 22;
  if (scale <= 1.45) return 12;
  return 6.2;
}
