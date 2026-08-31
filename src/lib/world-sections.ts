import { MIN_VIEW_DIST, MAX_VIEW_DIST, TILE, wx, wz } from "./coords";

export type WorldSectionId = "starter" | "tech" | "creative" | "business" | "public";

export type WorldSection = {
  id: WorldSectionId;
  label: string;
  blurb: string;
  locked: boolean;
  /** Grid rectangle for camera / click tests. May extend past the playable campus. */
  origin: { x: number; y: number };
  size: { x: number; y: number };
};

/** Section 1 is the existing Northshore campus (64×64). Locked chapters sit just beyond it. */
export const SECTION_ONE = { x: 0, y: 0, w: 64, h: 64 };

export const WORLD_SECTIONS: WorldSection[] = [
  {
    id: "starter",
    label: "Starter City",
    blurb: "Northshore — the open neighbourhood.",
    locked: false,
    origin: { x: 0, y: 0 },
    size: { x: 64, y: 64 },
  },
  {
    id: "tech",
    label: "Tech District",
    blurb: "Engineering, racks, and quiet labs.",
    locked: true,
    origin: { x: 64, y: 0 },
    size: { x: 22, y: 32 },
  },
  {
    id: "creative",
    label: "Creative District",
    blurb: "Studios and cut rooms, not opened yet.",
    locked: true,
    origin: { x: 64, y: 32 },
    size: { x: 22, y: 32 },
  },
  {
    id: "business",
    label: "Business District",
    blurb: "Towers and ledgers still under wrap.",
    locked: true,
    origin: { x: 0, y: 64 },
    size: { x: 32, y: 22 },
  },
  {
    id: "public",
    label: "Public District",
    blurb: "Parks and halls for a later chapter.",
    locked: true,
    origin: { x: 32, y: 64 },
    size: { x: 54, y: 22 },
  },
];

export function sectionAt(x: number, y: number) {
  return [...WORLD_SECTIONS].reverse().find(
    (s) => x >= s.origin.x && y >= s.origin.y && x < s.origin.x + s.size.x && y < s.origin.y + s.size.y,
  );
}

export function cameraPanLimits(viewDist = MIN_VIEW_DIST, overview = false) {
  const t = Math.min(1, Math.max(0, (viewDist - MIN_VIEW_DIST) / (MAX_VIEW_DIST - MIN_VIEW_DIST)));
  const inset = overview ? 2.2 * TILE : (1.5 + t * 8) * TILE;
  return {
    minX: wx(SECTION_ONE.x) + inset,
    maxX: wx(SECTION_ONE.x + SECTION_ONE.w) - inset,
    minZ: wz(SECTION_ONE.y) + inset,
    maxZ: wz(SECTION_ONE.y + SECTION_ONE.h) - inset,
  };
}
