import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { BUILDING_ASSET_META } from "@/lib/building-asset-meta";
import { BUILDING_METERS_BY_ASSET_ID } from "@/lib/building-meters";
import {
  fitFootprintToEnvelope,
  hqLibraryLabel,
  isHqLibraryExcluded,
  plotUsableEnvelope,
  type HqLibraryBuilding,
} from "@/lib/hq-library";
import { expandedRect, getPlot } from "@/lib/plots";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MetaFile = {
  qualityGate?: { ok?: boolean };
  companyAdAssetId?: string | null;
  localMeters?: { w?: number; d?: number; h?: number };
};

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
  if (!Number.isFinite(min[0]) || !Number.isFinite(max[0])) return null;
  return {
    width: Math.round((max[0]! - min[0]!) * 1000) / 1000,
    depth: Math.round((max[2]! - min[2]!) * 1000) / 1000,
    height: Math.round((max[1]! - min[1]!) * 1000) / 1000,
  };
}

function readMeta(dir: string, assetId: string): MetaFile | null {
  const metaPath = path.join(dir, `${assetId}.meta.json`);
  if (!fs.existsSync(metaPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(metaPath, "utf8")) as MetaFile;
  } catch {
    return null;
  }
}

function metersFor(assetId: string, glbPath: string, meta: MetaFile | null) {
  const fromTable = BUILDING_METERS_BY_ASSET_ID[assetId];
  if (fromTable) return fromTable;
  const fromAsset = BUILDING_ASSET_META[assetId];
  if (fromAsset) {
    return {
      width: fromAsset.footprintMeters.width,
      depth: fromAsset.footprintMeters.depth,
      height: fromAsset.heightMeters,
    };
  }
  if (meta?.localMeters?.w && meta.localMeters.d) {
    return {
      width: meta.localMeters.w,
      depth: meta.localMeters.d,
      height: meta.localMeters.h ?? 0,
    };
  }
  return measureGlb(glbPath);
}

/** GET /v1/brand/library?plotId= — published HQs that fit the lot envelope. */
export async function GET(request: Request) {
  const plotId = new URL(request.url).searchParams.get("plotId")?.trim() ?? "";
  const plot = plotId ? getPlot(plotId) : undefined;
  if (!plot) {
    return NextResponse.json({ ok: false, error: "unknown plot" }, { status: 400 });
  }

  const grown = expandedRect(plot);
  const envelope = plotUsableEnvelope(grown.w, grown.h);
  const dir = path.join(process.cwd(), "public/assets/gltf/buildings");
  const buildings: HqLibraryBuilding[] = [];
  let catalogCount = 0;

  if (fs.existsSync(dir)) {
    for (const name of fs.readdirSync(dir)) {
      if (!name.startsWith("pack.agentspace.building.") || !name.endsWith(".glb")) continue;
      const assetId = name.slice(0, -".glb".length);
      if (isHqLibraryExcluded(assetId)) continue;
      const glbPath = path.join(dir, name);
      if (fs.statSync(glbPath).size < 32) continue;
      const meta = readMeta(dir, assetId);
      if (meta?.qualityGate && meta.qualityGate.ok !== true) continue;
      catalogCount += 1;
      const buildingMeters = metersFor(assetId, glbPath, meta);
      if (!buildingMeters?.width || !buildingMeters.depth) continue;
      const fit = fitFootprintToEnvelope(
        buildingMeters.width,
        buildingMeters.depth,
        envelope.usableW,
        envelope.usableD,
      );
      if (!fit) continue;
      const ad = meta?.companyAdAssetId?.trim();
      buildings.push({
        assetId,
        label: hqLibraryLabel(assetId),
        url: `/assets/gltf/buildings/${name}`,
        buildingMeters,
        ...(ad ? { companyAdAssetId: ad } : {}),
        yaw: fit.yaw,
        rotated: fit.yaw === 90,
      });
    }
  }

  buildings.sort((a, b) => a.label.localeCompare(b.label) || a.assetId.localeCompare(b.assetId));

  return NextResponse.json(
    {
      ok: true,
      plotId,
      envelope,
      catalogCount,
      buildings,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
