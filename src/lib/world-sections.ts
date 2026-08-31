import { MIN_VIEW_DIST, MAX_VIEW_DIST, TILE, wx, wz } from "./coords";
import { landBounds } from "./plots";

export type GridRect = { x0: number; y0: number; x1: number; y1: number };

/** Tiles of ocean / park / lake around the playable AABB — visible, not for travel. */
export const SCENERY_MARGIN = 42;
/** Extra water + cloud ring so the far mesh never reads as a hard map border. */
export const HORIZON_PAD = 170;

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

/** Section 1 is the existing Agentspace campus (64×64). Locked chapters sit just beyond it. */
export const SECTION_ONE = { x: 0, y: 0, w: 64, h: 64 };

export const WORLD_SECTIONS: WorldSection[] = [
  {
    id: "starter",
    label: "Starter City",
    blurb: "Agentspace — the open neighbourhood.",
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

/** City campus plus the south field — the land you can own and travel. */
export function playableBounds(): GridRect {
  const land = landBounds();
  return {
    x0: Math.min(SECTION_ONE.x, land.x0),
    y0: Math.min(SECTION_ONE.y, land.y0),
    x1: Math.max(SECTION_ONE.x + SECTION_ONE.w, land.x1),
    y1: Math.max(SECTION_ONE.y + SECTION_ONE.h, land.y1),
  };
}

/** Parks, lakes, and shoreline around the section (seen from the rim, not walked). */
export function sceneryBounds(): GridRect {
  const p = playableBounds();
  return {
    x0: p.x0 - SCENERY_MARGIN,
    y0: p.y0 - SCENERY_MARGIN,
    x1: p.x1 + SCENERY_MARGIN,
    y1: p.y1 + SCENERY_MARGIN,
  };
}

/** Low-detail water and cloud bank past the scenery rim. */
export function horizonBounds(): GridRect {
  const s = sceneryBounds();
  return {
    x0: s.x0 - HORIZON_PAD,
    y0: s.y0 - HORIZON_PAD,
    x1: s.x1 + HORIZON_PAD,
    y1: s.y1 + HORIZON_PAD,
  };
}

export function worldRectCenterSpan(r: GridRect) {
  return {
    cx: wx((r.x0 + r.x1) / 2),
    cz: wz((r.y0 + r.y1) / 2),
    w: (r.x1 - r.x0) * TILE,
    d: (r.y1 - r.y0) * TILE,
  };
}

/** Positive inside the rect (distance to nearest edge), negative outside. */
export function signedRectDist(gx: number, gy: number, r: GridRect) {
  const inside = gx >= r.x0 && gx <= r.x1 && gy >= r.y0 && gy <= r.y1;
  if (inside) {
    return Math.min(gx - r.x0, r.x1 - gx, gy - r.y0, r.y1 - gy);
  }
  const dx = gx < r.x0 ? r.x0 - gx : gx > r.x1 ? gx - r.x1 : 0;
  const dy = gy < r.y0 ? r.y0 - gy : gy > r.y1 ? gy - r.y1 : 0;
  return -Math.hypot(dx, dy);
}

function worldAabb(r: GridRect, inset: number) {
  return {
    minX: wx(r.x0) + inset,
    maxX: wx(r.x1) - inset,
    minZ: wz(r.y0) + inset,
    maxZ: wz(r.y1) - inset,
  };
}

/** Look-at / walk target stays on the playable section (shoreline still in view). */
export function cameraPanLimits(viewDist = MIN_VIEW_DIST, overview = false) {
  const t = Math.min(1, Math.max(0, (viewDist - MIN_VIEW_DIST) / (MAX_VIEW_DIST - MIN_VIEW_DIST)));
  const inset = overview ? 1.15 * TILE : (0.85 + t * 3.2) * TILE;
  return worldAabb(playableBounds(), inset);
}

/** Camera body may hover the park/ocean rim, not past the cloud bank. */
export function cameraFlyLimits(viewDist = MIN_VIEW_DIST, overview = false) {
  const t = Math.min(1, Math.max(0, (viewDist - MIN_VIEW_DIST) / (MAX_VIEW_DIST - MIN_VIEW_DIST)));
  const inset = overview ? 6 * TILE : (4 + t * 10) * TILE;
  return worldAabb(sceneryBounds(), inset);
}
