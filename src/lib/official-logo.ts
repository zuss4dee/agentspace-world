import fs from "node:fs";
import path from "node:path";
import { slugifyCompany } from "@/lib/brand-profile";

const EXT_BY_TYPE: Record<string, string> = {
  "image/svg+xml": ".svg",
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/webp": ".webp",
};

function extFromUrl(url: string): string {
  try {
    const clean = new URL(url).pathname.toLowerCase();
    if (clean.endsWith(".svg")) return ".svg";
    if (clean.endsWith(".png")) return ".png";
    if (clean.endsWith(".jpg") || clean.endsWith(".jpeg")) return ".jpg";
    if (clean.endsWith(".webp")) return ".webp";
  } catch {
    /* ignore */
  }
  return "";
}

function extFromDataUrl(dataUrl: string): string {
  const m = /^data:(image\/[a-zA-Z0-9.+-]+);/.exec(dataUrl);
  return m ? (EXT_BY_TYPE[m[1]!.toLowerCase()] ?? ".png") : ".png";
}

/** Persist an official logo beside the company brand folder. Never invents a mark. */
export async function persistOfficialLogo(
  companyId: string,
  source: { imageUrl?: string | null; assetPath?: string | null },
  repo = process.cwd(),
): Promise<string | null> {
  const slug = slugifyCompany(companyId);
  const destDir = path.join(repo, "public/assets/brands", slug);
  const existing = [".svg", ".png", ".jpg", ".jpeg"].find((ext) =>
    fs.existsSync(path.join(destDir, `logo${ext}`)),
  );
  if (existing) return path.join("public/assets/brands", slug, `logo${existing}`);

  if (source.assetPath) {
    const abs = path.isAbsolute(source.assetPath)
      ? source.assetPath
      : path.join(repo, source.assetPath);
    if (fs.existsSync(abs) && fs.statSync(abs).size > 16) {
      return path.relative(repo, abs);
    }
  }

  const url = source.imageUrl?.trim() ?? "";
  if (!url) return null;
  fs.mkdirSync(destDir, { recursive: true });

  if (url.startsWith("data:image/")) {
    const comma = url.indexOf(",");
    if (comma < 0) return null;
    const buf = Buffer.from(url.slice(comma + 1), "base64");
    if (buf.length < 16) return null;
    const ext = extFromDataUrl(url);
    const dest = path.join(destDir, `logo${ext}`);
    fs.writeFileSync(dest, buf);
    return path.join("public/assets/brands", slug, `logo${ext}`);
  }

  if (!/^https?:\/\//i.test(url)) return null;
  try {
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) return null;
    const type = (res.headers.get("content-type") ?? "").split(";")[0]!.trim().toLowerCase();
    const ext = EXT_BY_TYPE[type] || extFromUrl(url) || ".png";
    if (![".svg", ".png", ".jpg", ".jpeg", ".webp"].includes(ext)) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 16) return null;
    const dest = path.join(destDir, `logo${ext}`);
    fs.writeFileSync(dest, buf);
    return path.join("public/assets/brands", slug, `logo${ext}`);
  } catch {
    return null;
  }
}

export function officialLogoPublicUrl(companyId: string, repo = process.cwd()): string | null {
  const slug = slugifyCompany(companyId);
  const destDir = path.join(repo, "public/assets/brands", slug);
  const existing = [".svg", ".png", ".jpg", ".jpeg"].find((ext) =>
    fs.existsSync(path.join(destDir, `logo${ext}`)),
  );
  return existing ? `/assets/brands/${slug}/logo${existing}` : null;
}
