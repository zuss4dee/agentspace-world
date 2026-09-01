/**
 * Patch per-asset building metadata from publish/build measurements.
 * Usage:
 *   echo '{"assetId":"...","localMeters":{"w":48,"d":32,"h":30}}' | npx tsx scripts/sync-building-meters.ts
 *   npx tsx scripts/sync-building-meters.ts path/to/asset.glb pack.agentspace.building.echt.02
 */
import fs from "node:fs";
import path from "node:path";

const REPO = path.resolve(import.meta.dirname, "..");
const METERS_TS = path.join(REPO, "src/lib/building-meters.ts");
const META_TS = path.join(REPO, "src/lib/building-asset-meta.ts");

type Payload = {
  assetId: string;
  localMeters: { w: number; d: number; h: number };
  buildingId?: string;
  brandId?: string;
};

function readStdin(): string {
  try {
    return fs.readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function escRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function upsertMeters(assetId: string, m: { w: number; d: number; h: number }) {
  let src = fs.readFileSync(METERS_TS, "utf8");
  const entry = `  ${JSON.stringify(assetId)}: {
    width: ${m.w},
    depth: ${m.d},
    height: ${m.h},
  },`;
  const re = new RegExp(`  ${escRe(JSON.stringify(assetId))}: \\{[\\s\\S]*?\\},`);
  if (re.test(src)) src = src.replace(re, entry);
  else {
    src = src.replace(
      /export const BUILDING_METERS_BY_ASSET_ID: Record<string, BuildingFootprintMeters> = \{/,
      `export const BUILDING_METERS_BY_ASSET_ID: Record<string, BuildingFootprintMeters> = {\n${entry}`,
    );
  }
  fs.writeFileSync(METERS_TS, src);
}

function upsertMeta(assetId: string, m: { w: number; d: number; h: number }, buildingId?: string, brandId?: string) {
  let src = fs.readFileSync(META_TS, "utf8");
  const block = `  ${JSON.stringify(assetId)}: {
    buildingId: ${buildingId ? JSON.stringify(buildingId) : "undefined"},
    brandId: ${brandId ? JSON.stringify(brandId) : "undefined"},
    footprintMeters: { width: ${m.w}, depth: ${m.d} },
    heightMeters: ${m.h},
  },`;
  const re = new RegExp(`  ${escRe(JSON.stringify(assetId))}: \\{[\\s\\S]*?\\},`);
  if (re.test(src)) src = src.replace(re, block);
  else {
    src = src.replace(
      /export const BUILDING_ASSET_META: Record<string, BuildingAssetMeta> = \{/,
      `export const BUILDING_ASSET_META: Record<string, BuildingAssetMeta> = {\n${block}`,
    );
  }
  fs.writeFileSync(META_TS, src);
}

function measureGlb(glbPath: string) {
  const buf = fs.readFileSync(glbPath);
  const len = buf.readUInt32LE(12);
  const json = JSON.parse(buf.toString("utf8", 20, 20 + len)) as {
    accessors?: { min?: number[]; max?: number[] }[];
    meshes?: { primitives: { attributes: { POSITION: number } }[] }[];
  };
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const mesh of json.meshes ?? []) {
    for (const p of mesh.primitives ?? []) {
      const pos = json.accessors?.[p.attributes.POSITION];
      if (!pos?.min || !pos.max) continue;
      for (let i = 0; i < 3; i++) {
        min[i] = Math.min(min[i]!, pos.min[i]!);
        max[i] = Math.max(max[i]!, pos.max[i]!);
      }
    }
  }
  return {
    w: Math.round((max[0]! - min[0]!) * 100) / 100,
    d: Math.round((max[2]! - min[2]!) * 100) / 100,
    h: Math.round((max[1]! - min[1]!) * 100) / 100,
  };
}

async function main() {
  const payloads: Payload[] = [];
  const raw = readStdin().trim();
  if (raw) payloads.push(JSON.parse(raw) as Payload);
  const argPath = process.argv[2];
  const argAsset = process.argv[3];
  if (argPath && argAsset && fs.existsSync(argPath)) {
    payloads.push({ assetId: argAsset, localMeters: measureGlb(argPath) });
  }
  for (const p of payloads) {
    if (!p.assetId || !p.localMeters) continue;
    upsertMeters(p.assetId, p.localMeters);
    upsertMeta(p.assetId, p.localMeters, p.buildingId, p.brandId);
    console.log("synced", p.assetId, p.localMeters);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
