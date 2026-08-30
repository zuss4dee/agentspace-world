/** Modular catalog keys. Creators will later ship packs that replace these. */

export const WORLD_PACK = "pack.northshore";

export function assetId(kind: string, slug: string) {
  return `${WORLD_PACK}.${kind}.${slug}`;
}
