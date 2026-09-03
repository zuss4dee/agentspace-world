import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { NextResponse } from "next/server";
import { defaultBuildingAssetId, type BrandProfile } from "@/lib/brand-profile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BuildBody = {
  plotId?: string;
  brand?: BrandProfile;
  publishOnly?: boolean;
  /** Force a Blender rebuild even if the GLB is already on disk. */
  forceRebuild?: boolean;
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
  return {
    width: Math.round((max[0]! - min[0]!) * 100) / 100,
    depth: Math.round((max[2]! - min[2]!) * 100) / 100,
    height: Math.round((max[1]! - min[1]!) * 100) / 100,
  };
}

/** POST /v1/brand/build — generate HQ in Blender, publish GLB, return asset metadata. */
export async function POST(request: Request) {
  let body: BuildBody;
  try {
    body = (await request.json()) as BuildBody;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON body" }, { status: 400 });
  }

  const brand = body.brand;
  const plotId = body.plotId?.trim();
  if (!brand?.companyId || !brand.companyName) {
    return NextResponse.json({ ok: false, error: "brand.companyId and brand.companyName are required" }, { status: 400 });
  }

  const repo = process.cwd();
  const assetId = defaultBuildingAssetId(brand);
  const glbPath = path.join(repo, "public/assets/gltf/buildings", `${assetId}.glb`);

  // Fast path: GLB already published (common after a hung UI retry).
  if (!body.forceRebuild && fs.existsSync(glbPath) && fs.statSync(glbPath).size > 32) {
    const buildingMeters = measureGlb(glbPath);
    return NextResponse.json(
      {
        ok: true,
        plotId,
        assetId,
        url: `/assets/gltf/buildings/${assetId}.glb`,
        buildingMeters,
        reused: true,
      },
      { headers: { "cache-control": "no-store" } },
    );
  }

  const brandsDir = path.join(repo, "scripts/blender/brands");
  fs.mkdirSync(brandsDir, { recursive: true });
  const slug = assetId.replace("pack.agentspace.building.", "").replace(".01", "");
  const brandPath = path.join(brandsDir, `claim-${slug}.json`);
  fs.writeFileSync(brandPath, JSON.stringify(brand, null, 2) + "\n");

  const script = path.join(repo, "scripts/blender/build-company.mjs");
  const args = ["--brand", brandPath, "--asset-id", assetId];
  if (body.publishOnly) args.push("--publish-only");

  try {
    const raw = execFileSync(process.execPath, [script, ...args], {
      cwd: repo,
      encoding: "utf8",
      timeout: 240000,
      env: { ...process.env },
    });
    const lastLine = raw.trim().split("\n").pop() ?? "";
    const result = JSON.parse(lastLine) as {
      ok: boolean;
      assetId?: string;
      url?: string;
      localMeters?: { w: number; d: number; h: number; z0?: number };
      error?: string;
    };
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error ?? "build failed" }, { status: 502 });
    }
    const meters = result.localMeters;
    return NextResponse.json(
      {
        ok: true,
        plotId,
        assetId: result.assetId ?? assetId,
        url: result.url ?? `/assets/gltf/buildings/${assetId}.glb`,
        buildingMeters: meters
          ? { width: meters.w, depth: meters.d, height: meters.h ?? meters.w }
          : undefined,
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (e) {
    const err = e as {
      message?: string;
      stderr?: string | Buffer;
      stdout?: string | Buffer;
      status?: number;
    };
    const stderr = typeof err.stderr === "string" ? err.stderr : err.stderr?.toString?.() ?? "";
    const stdout = typeof err.stdout === "string" ? err.stdout : err.stdout?.toString?.() ?? "";
    let parsedError = "";
    for (const line of `${stdout}\n${stderr}`.split("\n").reverse()) {
      const t = line.trim();
      if (!t.startsWith("{")) continue;
      try {
        const j = JSON.parse(t) as { error?: string };
        if (j.error) {
          parsedError = j.error;
          break;
        }
      } catch {
        /* not json */
      }
    }
    const detail = [parsedError, err.message, stderr, stdout].filter(Boolean).join("\n").slice(-1200);
    return NextResponse.json(
      {
        ok: false,
        error: parsedError || "Blender build failed — is Blender open with the MCP addon connected?",
        detail,
      },
      { status: 502 },
    );
  }
}
