/**
 * Build a Silicon City company HQ in the open Blender session, then publish its GLB.
 * Talks to the Blender MCP addon on BLENDER_HOST:BLENDER_PORT (same as publish.mjs).
 */
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "../..");
const BLENDER_ROOT = path.join(REPO, "scripts/blender");
const GLB_DIR = path.join(REPO, "public/assets/gltf/buildings");
const HOST = process.env.BLENDER_HOST || "127.0.0.1";
const PORT = Number(process.env.BLENDER_PORT || 9876);
const BUILD_MARKER = "ASW_BUILD_JSON:";

function parseArgs(argv) {
  const out = {
    brand: "",
    assetId: "",
    publishOnly: false,
    rootLocal: "260,200,0",
    plotId: "",
    plotGrid: "",
    company: "",
    website: "",
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--brand") out.brand = argv[++i] ?? "";
    else if (a === "--asset-id") out.assetId = argv[++i] ?? "";
    else if (a === "--publish-only") out.publishOnly = true;
    else if (a === "--root-local") out.rootLocal = argv[++i] ?? out.rootLocal;
    else if (a === "--plot-id" || a === "--plot") out.plotId = argv[++i] ?? "";
    else if (a === "--plot-grid") out.plotGrid = argv[++i] ?? "";
    else if (a === "--company") out.company = argv[++i] ?? "";
    else if (a === "--website") out.website = argv[++i] ?? "";
  }
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
    return String(text);
  });
}

function blenderPrelude() {
  const root = BLENDER_ROOT.replace(/\\/g, "/");
  return `import importlib, sys
from pathlib import Path
ROOT = Path(${JSON.stringify(root)})
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
for m in [
    'agentspace.vehicle_scale',
    'agentspace.mini_city_style',
    'agentspace.siliconcity.props',
    'agentspace.plot_envelope',
    'agentspace.uniqueness_registry',
    'agentspace.param_rng',
    'agentspace.brand_profile',
    'agentspace.spec_compiler',
    'agentspace.building_recipes',
    'agentspace.building_recipes_procedural',
    'agentspace.building_composition',
    'agentspace.company_building',
]:
    if m in sys.modules:
        importlib.reload(sys.modules[m])
`;
}

function parseBuildReport(text) {
  const idx = text.lastIndexOf(BUILD_MARKER);
  if (idx < 0) throw new Error(`Blender did not return build JSON.\n${text.slice(-800)}`);
  return JSON.parse(text.slice(idx + BUILD_MARKER.length));
}

function measureGlb(glbPath) {
  const out = execFileSync("npx", ["--yes", "tsx", "-e", `
import fs from "node:fs";
const buf = fs.readFileSync(${JSON.stringify(glbPath)});
const len = buf.readUInt32LE(12);
const json = JSON.parse(buf.toString("utf8", 20, 20 + len));
const min = [Infinity, Infinity, Infinity];
const max = [-Infinity, -Infinity, -Infinity];
for (const mesh of json.meshes ?? []) {
  for (const p of mesh.primitives ?? []) {
    const pos = json.accessors?.[p.attributes.POSITION];
    if (!pos?.min || !pos.max) continue;
    for (let i = 0; i < 3; i++) {
      min[i] = Math.min(min[i], pos.min[i]);
      max[i] = Math.max(max[i], pos.max[i]);
    }
  }
}
process.stdout.write(JSON.stringify({
  w: Math.round((max[0] - min[0]) * 100) / 100,
  d: Math.round((max[2] - min[2]) * 100) / 100,
  h: Math.round((max[1] - min[1]) * 100) / 100,
}));
`], { cwd: REPO, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  return JSON.parse(out.trim());
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.brand && args.company) {
    const brandsDir = path.join(BLENDER_ROOT, "brands");
    fs.mkdirSync(brandsDir, { recursive: true });
    const slug = args.company.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "company";
    args.brand = path.join(brandsDir, `cli-${slug}.json`);
    const brand = {
      companyId: slug,
      companyName: args.company.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      website: args.website || undefined,
      tier: "startup",
      logo: { wordmark: args.company.slice(0, 8).toUpperCase() },
      primaryColours: [],
      secondaryColours: [],
      industry: "general",
    };
    fs.writeFileSync(args.brand, JSON.stringify(brand, null, 2) + "\n");
  }
  if (!args.brand) throw new Error("pass --brand path/to/brand.json (or --company <id>)");
  const brandPath = path.resolve(args.brand);
  if (!fs.existsSync(brandPath)) throw new Error(`brand file not found: ${brandPath}`);

  let report = null;
  if (!args.publishOnly) {
    const brandPy = brandPath.replace(/\\/g, "/");
    const text = await execBlender(
      blenderPrelude() +
        `from agentspace.brand_profile import load_brand_profile, build_spec_from_profile
from agentspace.company_building import build_company_building
import json
profile = load_brand_profile(${JSON.stringify(brandPy)})
spec = build_spec_from_profile(
    profile,
    asset_id=${args.assetId ? JSON.stringify(args.assetId) : "None"},
    root_local=tuple(float(x.strip()) for x in ${JSON.stringify(args.rootLocal)}.split(",")),
    plot_id=${args.plotId ? JSON.stringify(args.plotId) : "None"},
    plot_grid=(lambda g: {"x": float(g[0]), "y": float(g[1]), "w": float(g[2]), "h": float(g[3])} if g else None)(
        [p.strip() for p in ${JSON.stringify(args.plotGrid)}.split(",") if p.strip()] or None
    ),
)
report = build_company_building(spec.brand, spec)
report["grammar"] = spec.recipe
report["structuralFingerprint"] = spec.recipe_params.get("structuralFingerprint")
report["plotId"] = spec.parcel_id
print(${JSON.stringify(BUILD_MARKER)} + json.dumps(report, default=str))
`,
    );
    report = parseBuildReport(text);
  }

  const assetId = args.assetId || report?.assetId;
  if (!assetId) throw new Error("could not determine assetId");

  const glbPath = path.join(GLB_DIR, `${assetId}.glb`);
  let publishError = "";
  try {
    execFileSync(
      process.execPath,
      [path.join(BLENDER_ROOT, "publish.mjs"), "--asset", assetId, "--skip-build", "--force"],
      { cwd: REPO, stdio: ["ignore", "pipe", "pipe"], encoding: "utf8" },
    );
  } catch (e) {
    // publish.mjs exits 1 when world signature is dirty even after a successful GLB export.
    publishError = String(e.stderr || e.stdout || e.message || e);
  }

  if (!fs.existsSync(glbPath) || fs.statSync(glbPath).size < 32) {
    throw new Error(publishError || `publish finished but GLB missing: ${glbPath}`);
  }

  const localMeters = report?.localMeters ?? measureGlb(glbPath);
  const payload = {
    ok: true,
    assetId,
    url: `/assets/gltf/buildings/${assetId}.glb`,
    localMeters,
    archetype: report?.grammar ?? report?.recipe ?? null,
    uniquenessKey: report?.structuralFingerprint ?? report?.uniquenessKey ?? null,
    ...(publishError ? { publishWarning: publishError.slice(-400) } : {}),
  };
  process.stdout.write(JSON.stringify(payload));
}

main().catch((e) => {
  process.stderr.write(String(e.message || e) + "\n");
  process.stdout.write(JSON.stringify({ ok: false, error: String(e.message || e) }));
  process.exit(1);
});
