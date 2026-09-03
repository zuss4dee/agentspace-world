/**
 * Staged city authoring.
 * Silicon City archetypes (nova / corner / loft) are published — production GLBs on.
 */
export const AUTHORING_STEP = 2 as const;

/** When false, the runtime does not generate procedural building meshes on world buildings. */
export const BUILDINGS_ENABLED = false;

/**
 * Old R3F procedural BuildingFromSpec previews on claimed lots.
 * Off — claimed lots render published Silicon City GLBs instead.
 */
export const CLAIMED_LOT_PREVIEW_ENABLED = false;

/** Load Blender-authored Silicon City building GLBs on the map. */
export const PRODUCTION_GLB_ENABLED = true;

/** Render published Silicon City GLBs on claimed company lots. */
export const CLAIMED_BUILDING_GLB_ENABLED = true;
