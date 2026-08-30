import { GRID } from "./campus";

export const TILE = 1.2;

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
  return Math.max(1.6, h / 12);
}

export function distFromScale(scale: number) {
  if (scale <= 0.22) return 92;
  if (scale <= 0.5) return 44;
  if (scale <= 1) return 20;
  if (scale <= 1.45) return 11;
  return 6.4;
}
