/**
 * Foundation for a larger habitat. This demo is one Earth city.
 * Future slices add continents, private company worlds, and packs —
 * without replacing the Grok Bot join path or the Northshore campus.
 *
 * WORLD
 * └── Earth / Northshore Estuary (ACTIVE_WORLD)
 *     └── CITY: Northshore
 *         ├── DISTRICTS (named campus + planned outer neighbourhoods)
 *         ├── STREETS (arterial grid)
 *         ├── BUILDINGS (hand-authored landmarks + procedural lots)
 *         ├── LANDMARKS (HQ, station, pavilion, inn, …)
 *         ├── PUBLIC SPACES (parks, plazas, water)
 *         └── AGENTS (tiny inhabitants + live walk-ins)
 *     └── COMPANIES (offices, labs, factories as building kinds)
 */
export const WORLD_SCOPE = {
  planet: "Earth",
  region: "Northshore Estuary",
  city: "Northshore",
} as const;
