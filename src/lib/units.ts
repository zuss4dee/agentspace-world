/**
 * Canonical world space is **pixels**.
 * One Three.js unit = one pixel. Layout, lots, camera distance, and area all use px.
 *
 * 1 tile = 32 px = 26 ft. Square footage is derived from pixel size, not a separate grid.
 */
export const TILE_PX = 32;
export const TILE_FEET = 26;
export const TILE_METERS = 8;

/** Three.js unit that used to be 1.2 for one tile. Used only to lift leftover mesh heights. */
const LEGACY_TILE = 1.2;
export const PX_SCALE = TILE_PX / LEGACY_TILE;

export const PX_PER_FOOT = TILE_PX / TILE_FEET;
export const FOOT_PER_PX = TILE_FEET / TILE_PX;

export function tilesToPx(tiles: number) {
  return tiles * TILE_PX;
}

export function pxToTiles(px: number) {
  return px / TILE_PX;
}

export function pxToFeet(px: number) {
  return px * FOOT_PER_PX;
}

export function feetToPx(ft: number) {
  return ft * PX_PER_FOOT;
}

export function rectPx(wTiles: number, hTiles: number) {
  return { w: wTiles * TILE_PX, h: hTiles * TILE_PX, area: wTiles * hTiles * TILE_PX * TILE_PX };
}

export function sqFtFromPx(wPx: number, hPx: number) {
  return pxToFeet(wPx) * pxToFeet(hPx);
}

export function tilesToSqFt(w: number, h: number) {
  return sqFtFromPx(w * TILE_PX, h * TILE_PX);
}

export function formatSqFt(n: number) {
  return `${Math.round(n).toLocaleString()} sq ft`;
}

export function formatPx(n: number) {
  return `${Math.round(n).toLocaleString()} px`;
}

/** Degrees → radians for camera / facing. */
export function deg(d: number) {
  return (d * Math.PI) / 180;
}

export function rad(r: number) {
  return (r * 180) / Math.PI;
}

/** Lift a pre-pixel world length (when TILE was 1.2) into pixels. */
export function h(legacyWorld: number) {
  return legacyWorld * PX_SCALE;
}
