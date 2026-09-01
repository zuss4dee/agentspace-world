/**
 * Staged city authoring.
 * Environment phase: procedural buildings, production GLBs, and authored env overlay stay off.
 */
export const AUTHORING_STEP = 1 as const;

/** When false, the runtime does not generate procedural building meshes on world buildings. */
export const BUILDINGS_ENABLED = false;

/** Always show procedural preview on user-claimed lots (independent of BUILDINGS_ENABLED). */
export const CLAIMED_LOT_PREVIEW_ENABLED = true;

/** Load Blender-authored building GLBs keyed in BUILDING_GLB_BY_ASSET_ID. Off during environment phase. */
export const PRODUCTION_GLB_ENABLED = false;
