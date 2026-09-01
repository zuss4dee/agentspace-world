/**
 * Blender-authored environment for one district.
 * Coordinates must match campus.ts / world_contract.json.
 * Startup (Echt Yard) plus the bounding roads at x=24,36 and y=6,12.
 */
export const AUTHORED_ENV_ENABLED = false;

export const AUTHORED_ENV_ASSET_ID = "agentspace.env.startup";

export const AUTHORED_ENV_GLB = "/assets/gltf/agentspace.env.startup.glb?v=env-5";

/** Inclusive grid tile bounds. Do not change without updating the Blender builder. */
export const AUTHORED_ENV_BOUNDS = {
  x0: 24,
  y0: 0,
  x1: 36,
  y1: 12,
} as const;

export function inAuthoredEnv(gx: number, gy: number) {
  if (!AUTHORED_ENV_ENABLED) return false;
  const { x0, y0, x1, y1 } = AUTHORED_ENV_BOUNDS;
  return gx >= x0 && gx <= x1 + 1 && gy >= y0 && gy <= y1 + 1;
}

export function plotInAuthoredEnv(x: number, y: number, w: number, h: number) {
  if (!AUTHORED_ENV_ENABLED) return false;
  const { x0, y0, x1, y1 } = AUTHORED_ENV_BOUNDS;
  return x < x1 + 1 && x + w > x0 && y < y1 + 1 && y + h > y0;
}
