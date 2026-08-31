/**
 * Agentspace is built in chapters.
 *
 * WORLD (Earth / Agentspace)
 * └── CITY
 *     ├── Section 1 Starter City     ← open, this vertical slice
 *     ├── Section 2 Tech District    ← locked
 *     ├── Section 3 Creative District← locked
 *     ├── Section 4 Business District← locked
 *     └── Section 5 Public District  ← locked
 *
 * Inside an unlocked section:
 *   DISTRICTS → STREETS → BUILDINGS → LANDMARKS → AGENTS
 */
export const WORLD_SCOPE = {
  planet: "Earth",
  region: "Estuary",
  city: "Agentspace",
  openSection: "starter",
} as const;
