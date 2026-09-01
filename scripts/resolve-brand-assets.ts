/**
 * Persist an explicit official logo asset and its provenance.
 *
 * This resolver deliberately does not scrape or infer a logo from a website.
 * Pass --logo or --logo-url after a human has selected the official asset.
 *
 *   npm run brand:resolve -- --company acme --logo ./acme.svg \
 *     --source-url https://acme.example/brand/acme.svg
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

function arg(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function required(name: string) {
  const value = arg(name);
  if (!value) throw new Error(`missing ${name}`);
  return value;
}

function extensionFor(source: string, contentType = "") {
  const ext = path.extname(new URL(source, "file:///").pathname).toLowerCase();
  if ([".svg", ".png", ".jpg", ".jpeg"].includes(ext)) return ext;
  if (contentType.includes("svg")) return ".svg";
  if (contentType.includes("png")) return ".png";
  if (contentType.includes("jpeg")) return ".jpg";
  throw new Error("logo must be SVG, PNG, JPG, or JPEG");
}

function svgAspect(raw: string) {
  const viewBox = raw.match(/viewBox\s*=\s*["']\s*[-\d.]+\s+[-\d.]+\s+([\d.]+)\s+([\d.]+)/i);
  if (viewBox) return Number(viewBox[1]) / Number(viewBox[2]);
  const width = raw.match(/width\s*=\s*["']\s*([\d.]+)/i);
  const height = raw.match(/height\s*=\s*["']\s*([\d.]+)/i);
  return width && height ? Number(width[1]) / Number(height[1]) : undefined;
}

function pngAspect(buffer: Buffer) {
  if (buffer.length < 24 || buffer.readUInt32BE(0) !== 0x89504e47) return undefined;
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  return height ? width / height : undefined;
}

async function main() {
  const companyId = required("--company").toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
  const localLogo = arg("--logo");
  const remoteLogo = arg("--logo-url");
  if (localLogo && remoteLogo) throw new Error("use only one of --logo or --logo-url");
  const outDir = path.resolve(arg("--out") || `public/assets/brands/${companyId}`);
  fs.mkdirSync(outDir, { recursive: true });

  let bytes: Buffer;
  let sourceUrl = arg("--source-url") || "";
  let contentType = "";
  let sourceName = localLogo || remoteLogo || "";
  if (localLogo) {
    bytes = fs.readFileSync(path.resolve(localLogo));
  } else if (remoteLogo) {
    const response = await fetch(remoteLogo);
    if (!response.ok) throw new Error(`logo download failed: ${response.status}`);
    bytes = Buffer.from(await response.arrayBuffer());
    sourceUrl = remoteLogo;
    contentType = response.headers.get("content-type") || "";
  } else {
    const fallback = {
      companyId,
      sourceUrl: arg("--website") || "",
      fetchedAt: "",
      sha256: "",
      format: null,
      aspectRatio: null,
      provenance: "wordmark_fallback",
    };
    fs.writeFileSync(path.join(outDir, "manifest.json"), `${JSON.stringify(fallback, null, 2)}\n`);
    console.log(JSON.stringify(fallback));
    return;
  }

  const ext = extensionFor(sourceName, contentType);
  const target = path.join(outDir, `logo${ext}`);
  fs.writeFileSync(target, bytes);
  const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
  const raw = bytes.toString("utf8");
  const aspectRatio = ext === ".svg" ? svgAspect(raw) : ext === ".png" ? pngAspect(bytes) : undefined;
  if (!aspectRatio || !Number.isFinite(aspectRatio) || aspectRatio <= 0) {
    throw new Error("could not determine a positive logo aspect ratio");
  }
  const manifest = {
    companyId,
    sourceUrl,
    fetchedAt: new Date().toISOString(),
    sha256,
    format: ext.slice(1),
    aspectRatio: Math.round(aspectRatio * 1e6) / 1e6,
    provenance: "official",
    assetPath: path.relative(process.cwd(), target),
  };
  fs.writeFileSync(path.join(outDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(JSON.stringify(manifest));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});