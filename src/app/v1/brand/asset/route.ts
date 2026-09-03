import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    width: Math.round((max[0]! - min[0]!) * 100) / 100,
    depth: Math.round((max[2]! - min[2]!) * 100) / 100,
    height: Math.round((max[1]! - min[1]!) * 100) / 100,
  };
}

/** GET /v1/brand/asset?assetId=pack.agentspace.building.… — whether a published HQ GLB exists. */
export async function GET(request: Request) {
  const assetId = new URL(request.url).searchParams.get("assetId")?.trim() ?? "";
  if (!assetId.startsWith("pack.agentspace.building.")) {
    return NextResponse.json({ ok: false, error: "invalid assetId" }, { status: 400 });
  }
  const glbPath = path.join(process.cwd(), "public/assets/gltf/buildings", `${assetId}.glb`);
  if (!fs.existsSync(glbPath) || fs.statSync(glbPath).size < 32) {
    return NextResponse.json({ ok: false, exists: false, assetId }, { headers: { "cache-control": "no-store" } });
  }
  return NextResponse.json(
    {
      ok: true,
      exists: true,
      assetId,
      url: `/assets/gltf/buildings/${assetId}.glb`,
      buildingMeters: measureGlb(glbPath),
    },
    { headers: { "cache-control": "no-store" } },
  );
}
