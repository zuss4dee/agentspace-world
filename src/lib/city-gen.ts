import { WORLD_BUILDINGS, buildingAt } from "./campus";
import type { Building } from "./types";

/** Procedural sprawl is retired. Section 1 is hand-authored. */
export const CITY_LOTS: Building[] = [];
export const ALL_BUILDINGS: Building[] = WORLD_BUILDINGS;
export const OUTER_TREES: { x: number; y: number; pine: boolean }[] = [];

export function buildingAnywhere(x: number, y: number) {
  return buildingAt(ALL_BUILDINGS, x, y);
}

export function extraTraffic(): { axis: "x" | "y"; lane: number; phase: number; speed: number; color: string }[] {
  return [];
}

export function extraLamps(): { x: number; y: number }[] {
  return [];
}
