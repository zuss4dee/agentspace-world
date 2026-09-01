/**
 * Track B — Blender → public/assets/gltf publish CLI.
 * Talks to the running Blender MCP addon on BLENDER_HOST:BLENDER_PORT.
 * Does not author geometry. Does not overwrite agentspace-world.blend/.glb.
 */
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "../..");
const BLENDER_ROOT = path.join(REPO, "scripts/blender");
const GLTF = path.join(REPO, "public/assets/gltf");
const MANIFEST = path.join(BLENDER_ROOT, "publish-manifest.json");
const PACK_TS = path.join(REPO, "src/lib/pack-gltf.ts");
const REG_TS = path.join(REPO, "src/lib/asset-registry.ts");
const BUILDING_META_TS = path.join(REPO, "src/lib/building-asset-meta.ts");
const WORLD_TS = path.join(REPO, "src/lib/world-gltf.ts");
const MASTER_GLB = "agentspace-world.glb";
const MASTER_BLEND = "agentspace-world.blend";
const MARKER = "ASW_PUBLISH_JSON:";
const HOST = process.env.BLENDER_HOST || "127.0.0.1";
const PORT = Number(process.env.BLENDER_PORT || 9876);

function parseArgs(argv) {
  const out = { asset: [], world: false, changed: false, force: false, skipBuild: false, worldName: "agentspace-world-published.glb" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--asset") out.asset.push(argv[++i]);
    else if (a === "--world") out.world = true;
    else if (a === "--changed") out.changed = true;
    else if (a === "--force") out.force = true;
    else if (a === "--skip-build") out.skipBuild = true;
    else if (a === "--world-name") out.worldName = argv[++i];
  }
  if (!out.asset.length && !out.world) out.changed = true;
  return out;
}

function receiveJson(socket) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const timer = setTimeout(() => reject(new Error("timeout waiting for Blender")), 180000);
    socket.on("data", (c) => {
      chunks.push(c);
      const buf = Buffer.concat(chunks);
      try {
        resolve(JSON.parse(buf.toString("utf8")));
        clearTimeout(timer);
      } catch {
        /* incomplete */
      }
    });
    socket.on("error", reject);
    socket.on("end", () => reject(new Error("Blender closed the connection")));
  });
}

function blenderCommand(type, params = {}) {
  return new Promise((resolve, reject) => {
    const socket = net.connect({ host: HOST, port: PORT });
    socket.setTimeout(180000);
    socket.once("connect", () => {
      socket.write(JSON.stringify({ type, params }));
    });
    receiveJson(socket)
      .then((res) => {
        socket.destroy();
        if (res.status === "error") reject(new Error(res.message || "Blender error"));
        else resolve(res.result ?? res);
      })
      .catch(reject);
  });
}

function execBlender(code) {
  return blenderCommand("execute_code", { code }).then((r) => {
    const text = typeof r === "string" ? r : r?.result ?? "";
    const idx = String(text).lastIndexOf(MARKER);
    if (idx < 0) throw new Error(`Blender did not return publish JSON.\n${String(text).slice(-800)}`);
    return JSON.parse(String(text).slice(idx + MARKER.length));
  });
}

function blenderPrelude() {
  const root = BLENDER_ROOT.replace(/\\/g, "/");
  return `import importlib, sys
from pathlib import Path
ROOT = Path(${JSON.stringify(root)})
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
for m in ['agentspace.export_pack','agentspace.publish_runtime','export_world']:
    if m in sys.modules:
        importlib.reload(sys.modules[m])
`;
}

function loadManifest() {
  if (!fs.existsSync(MANIFEST)) return { assets: {}, world: null };
  return JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
}

function saveManifest(m) {
  fs.writeFileSync(MANIFEST, JSON.stringify(m, null, 2) + "\n");
}

function compatible(prev, cur, force) {
  if (!prev) return { ok: true, reason: "new" };
  if (prev.assetId !== cur.assetId) return { ok: false, reason: "assetId mismatch" };
  const oldC = new Set(prev.componentIds || []);
  const newC = new Set(cur.componentIds || []);
  const removed = [...oldC].filter((c) => !newC.has(c));
  if (removed.length && !force) return { ok: false, reason: `removed components: ${removed.slice(0, 6).join(", ")}` };
  if (prev.signature === cur.signature) return { ok: true, reason: "unchanged" };
  return { ok: true, reason: "updated" };
}

function bumpPackRegistry(exported) {
  if (!exported.length) return false;
  let src = fs.readFileSync(PACK_TS, "utf8");
  let changed = false;
  for (const a of exported) {
    const stamp =
      a.path && fs.existsSync(a.path)
        ? createHash("sha1").update(fs.readFileSync(a.path)).digest("hex").slice(0, 16)
        : a.signature || createHash("sha1").update(String(a.bytes)).digest("hex").slice(0, 8);
    const url = `${a.url.split("?")[0]}?v=${stamp}`;
    const line = `  ${JSON.stringify(a.assetId)}: ${JSON.stringify(url)},`;
    const re = new RegExp(`  ${JSON.stringify(a.assetId)}: "[^"]+",`);
    if (re.test(src)) {
      src = src.replace(re, line);
      changed = true;
    } else {
      src = src.replace("} as const;", `${line}\n} as const;`);
      changed = true;
    }
  }
  if (changed) fs.writeFileSync(PACK_TS, src);
  return changed;
}

function loadBuildingAssetMeta() {
  try {
    const out = execSync(
      `npx --yes tsx -e "import { BUILDING_ASSET_META } from './src/lib/building-asset-meta.ts'; process.stdout.write(JSON.stringify(BUILDING_ASSET_META));"`,
      { cwd: REPO, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] },
    );
    return JSON.parse(out.trim() || "{}");
  } catch {
    return {};
  }
}

function writeAssetRegistry(exported, inspect) {
  if (!exported.length) return false;
  const buildingMeta = loadBuildingAssetMeta();
  const records = (inspect.assets || []).map((a) => {
    const meta = buildingMeta[a.assetId];
    const row = {
      assetId: a.assetId,
      kind: a.kind,
      folder: a.folder,
      url: `/assets/gltf/${a.folder}/${a.assetId}.glb`,
      componentIds: a.componentIds,
    };
    if (meta) {
      if (meta.buildingId) row.buildingId = meta.buildingId;
      if (meta.brandId) row.brandId = meta.brandId;
      if (meta.footprintMeters) row.footprintMeters = meta.footprintMeters;
      if (meta.heightMeters != null) row.heightMeters = meta.heightMeters;
    }
    return row;
  });
  const published = exported.map((a) => a.assetId);
  const body = `/**
 * AssetId-based registry for Blender-published GLBs.
 * PACK_GLTF is the runtime URL map used by R3F.
 */
export type AssetRecord = {
  assetId: string;
  kind: string;
  folder: string;
  url: string;
  componentIds?: string[];
  brandId?: string;
  buildingId?: string;
  footprintMeters?: { width: number; depth: number };
  heightMeters?: number;
};

export const LAST_PUBLISHED_ASSET_IDS = ${JSON.stringify(published, null, 2)} as const;

export const ASSET_CATALOG: AssetRecord[] = ${JSON.stringify(records, null, 2)};
`;
  fs.writeFileSync(REG_TS, body);
}

function bumpWorldBinding(worldName, signature) {
  let src = fs.readFileSync(WORLD_TS, "utf8");
  const next = `export const AUTHORED_WORLD_GLB = "/assets/gltf/${worldName}?v=${signature}";`;
  src = src.replace(/export const AUTHORED_WORLD_GLB = "[^"]+";/, next);
  fs.writeFileSync(WORLD_TS, src);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.worldName === MASTER_GLB) throw new Error("refusing to overwrite the original master world GLB");

  const inspect = await execBlender(
    blenderPrelude() +
      `from agentspace.publish_runtime import inspect_scene, MARKER
import json
print(MARKER + json.dumps(inspect_scene()))
`,
  );

  const blend = inspect.blend || "";
  if (path.basename(blend) === MASTER_BLEND) {
    /* publishing from an open master is allowed; we still never write that file */
  }

  const manifest = loadManifest();
  const byId = Object.fromEntries((inspect.assets || []).map((a) => [a.assetId, a]));
  let targets = [...args.asset];
  if (args.changed) {
    for (const a of inspect.assets || []) {
      const prev = manifest.assets?.[a.assetId];
      if (prev && prev.signature !== a.signature) targets.push(a.assetId);
    }
  }
  targets = [...new Set(targets)];

  const blocked = [];
  const toExport = [];
  for (const aid of targets) {
    const cur = byId[aid];
    if (!cur) {
      blocked.push({ assetId: aid, error: "not in Blender scene" });
      continue;
    }
    const gate = compatible(manifest.assets?.[aid], cur, args.force);
    if (!gate.ok) blocked.push({ assetId: aid, error: gate.reason });
    else if (gate.reason === "unchanged" && !args.asset.includes(aid)) continue;
    else toExport.push(aid);
  }

  const worldDirty = manifest.world && manifest.world.signature !== inspect.world?.signature;
  if (worldDirty && !args.world) {
    blocked.push({ assetId: "agentspace.world", error: "environment signature changed; pass --world to publish it" });
  }

  let result = { exported: [], failed: blocked, world: null };
  if (toExport.length || args.world) {
    result = await execBlender(
      blenderPrelude() +
        `from agentspace.publish_runtime import run_publish
run_publish(${JSON.stringify(toExport)}, world=${args.world ? "True" : "False"}, world_name=${JSON.stringify(args.worldName)}, force=${args.force ? "True" : "False"})
`,
    );
  }

  const exported = result.exported || [];
  const registryUpdated = bumpPackRegistry(exported);
  for (const a of exported) {
    if (!a.assetId?.startsWith("pack.agentspace.building")) continue;
    try {
      const meta = loadBuildingAssetMeta()[a.assetId] || {};
      const meters = a.localMeters;
      if (!meters?.w || !meters?.d) continue;
      const payload = {
        assetId: a.assetId,
        localMeters: { w: meters.w, d: meters.d, h: meters.h ?? meters.w },
        buildingId: meta.buildingId,
        brandId: meta.brandId,
      };
      execSync(`npx --yes tsx scripts/sync-building-meters.ts`, {
        cwd: REPO,
        input: JSON.stringify(payload),
        stdio: ["pipe", "pipe", "pipe"],
      });
    } catch (e) {
      console.warn("building meters sync skipped for", a.assetId, e.message || e);
    }
  }
  /* Sync first so ASSET_CATALOG receives the measured metadata for new HQs. */
  writeAssetRegistry(exported, inspect);
  let websiteUpdated = registryUpdated;
  if (args.world && result.world) {
    bumpWorldBinding(args.worldName, result.world.signature || "pub");
    websiteUpdated = true;
  }

  manifest.blend = inspect.blend;
  manifest.world = inspect.world;
  manifest.assets = manifest.assets || {};
  for (const a of exported) {
    const cur = byId[a.assetId];
    if (cur) manifest.assets[a.assetId] = { assetId: a.assetId, signature: a.signature, componentIds: a.componentIds, folder: a.folder };
  }
  saveManifest(manifest);

  let build = "skipped";
  if (!args.skipBuild) {
    try {
      execSync("npx tsc --noEmit", { cwd: REPO, stdio: "pipe" });
      execSync("npm run build", { cwd: REPO, stdio: "pipe" });
      build = "pass";
    } catch (e) {
      build = "fail";
      const msg = e.stdout?.toString?.() || e.stderr?.toString?.() || e.message;
      console.error(msg.slice(-4000));
    }
  }

  const glbs = exported.map((a) => a.path);
  if (result.world?.path) glbs.push(result.world.path);
  const runtimeUrls = exported.map((a) => `http://127.0.0.1:43141${a.url.split("?")[0]}`);
  if (args.world) runtimeUrls.push("http://127.0.0.1:43141/");

  let loadOk = true;
  for (const file of glbs) {
    if (!fs.existsSync(file) || fs.statSync(file).size < 32) loadOk = false;
  }
  for (const url of runtimeUrls) {
    try {
      execSync(`curl -sfI ${JSON.stringify(url)}`, { stdio: "pipe" });
    } catch {
      loadOk = false;
    }
  }

  const validation = inspect.worldValidation?.ok && !(result.failed || []).length && loadOk && blocked.every((b) => b.assetId === "agentspace.world" && !args.world);

  const report = {
    AUTHORING_SOURCE: inspect.blend,
    ASSETS_DETECTED: inspect.assetCount,
    ASSETS_CHANGED: toExport,
    GLBS_EXPORTED: glbs,
    REGISTRY_UPDATED: registryUpdated || exported.length ? "yes" : "no",
    WEBSITE_UPDATED: websiteUpdated ? "yes" : "no",
    BUILD: build,
    RUNTIME_URL: runtimeUrls[0] || "http://127.0.0.1:43141/",
    VALIDATION: inspect.worldValidation?.ok && !(result.failed || []).filter((f) => f.assetId !== "agentspace.world").length && loadOk ? "pass" : "fail",
    FAILED: [...blocked, ...(result.failed || [])],
    WORLD_DIRTY: Boolean(worldDirty),
  };

  console.log(`
AUTHORING SOURCE:
${report.AUTHORING_SOURCE}

ASSETS DETECTED:
${report.ASSETS_DETECTED}

ASSETS CHANGED:
${(report.ASSETS_CHANGED || []).join("\n") || "(none)"}

GLBs EXPORTED:
${(report.GLBS_EXPORTED || []).join("\n") || "(none)"}

REGISTRY UPDATED:
${report.REGISTRY_UPDATED}

WEBSITE UPDATED:
${report.WEBSITE_UPDATED}

BUILD:
${report.BUILD}

RUNTIME URL:
${report.RUNTIME_URL}

VALIDATION:
${report.VALIDATION}
`);
  if (report.FAILED?.length) console.log("FAILED:\n" + JSON.stringify(report.FAILED, null, 2));
  if (report.VALIDATION === "fail" || build === "fail") process.exit(1);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
