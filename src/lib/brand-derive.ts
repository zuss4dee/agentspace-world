import { isIP } from "node:net";
import { lookup } from "node:dns/promises";
import {
  STYLE_KEYWORDS,
  emptyBrandProfile,
  hostSlug,
  nameFromHost,
  tierHint,
  type DerivedBrandProfile,
  type StyleKeyword,
} from "./brand-profile";
import { buildColourRolesFromSources, paletteFromRoles } from "./brand-colours";
import { applyVerifiedOverride, verifiedOverrideFor } from "./brand-overrides";
import { normalizeWebsiteUrl } from "./company-profile";

export type { DerivedBrandProfile } from "./brand-profile";

const FETCH_TIMEOUT_MS = 6_000;
const MAX_BYTES = 1_500_000;
const MAX_STYLESHEETS = 3;
const MAX_REDIRECTS = 3;
const USER_AGENT =
  "Mozilla/5.0 (compatible; AgentspaceBrandBot/1.0; +https://agentspace.world) AppleWebKit/537.36 Chrome/124 Safari/537.36";

// ---------------------------------------------------------------------------
// SSRF guard
// ---------------------------------------------------------------------------

function privateV4(ip: string): boolean {
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => Number.isNaN(n))) return true;
  const [a, b] = p as [number, number, number, number];
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function privateV6(ip: string): boolean {
  const v = ip.toLowerCase();
  if (v === "::" || v === "::1") return true;
  if (v.startsWith("::ffff:")) {
    const tail = v.slice(7);
    return isIP(tail) === 4 ? privateV4(tail) : true;
  }
  const first = parseInt(v.split(":")[0] || "0", 16);
  // fc00::/7 unique-local, fe80::/10 link-local, ff00::/8 multicast.
  return (first & 0xfe00) === 0xfc00 || (first & 0xffc0) === 0xfe80 || (first & 0xff00) === 0xff00;
}

function privateAddress(ip: string): boolean {
  const kind = isIP(ip);
  if (kind === 4) return privateV4(ip);
  if (kind === 6) return privateV6(ip);
  return true;
}

async function assertPublicHost(url: URL): Promise<void> {
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("unsupported_protocol");
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal"))
    throw new Error("private_host");
  if (isIP(host)) {
    if (privateAddress(host)) throw new Error("private_host");
    return;
  }
  let addrs: Array<{ address: string }>;
  try {
    addrs = await lookup(host, { all: true, verbatim: true });
  } catch {
    throw new Error("dns_failed");
  }
  if (!addrs.length || addrs.some((a) => privateAddress(a.address))) throw new Error("private_host");
}

// ---------------------------------------------------------------------------
// Fetch with limits
// ---------------------------------------------------------------------------

type Fetched = { text: string; finalUrl: URL; contentType: string };

async function readLimited(res: Response): Promise<string> {
  const body = res.body;
  if (!body) return "";
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > MAX_BYTES) {
      chunks.push(value.subarray(0, value.byteLength - (total - MAX_BYTES)));
      void reader.cancel().catch(() => undefined);
      break;
    }
    chunks.push(value);
  }
  const merged = new Uint8Array(Math.min(total, MAX_BYTES));
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(merged);
}

async function fetchLimited(start: URL, accept: string): Promise<Fetched> {
  let url = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicHost(url);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(url, {
        redirect: "manual",
        signal: ctrl.signal,
        headers: {
          "user-agent": USER_AGENT,
          accept,
          "accept-language": "en-US,en;q=0.8",
        },
        cache: "no-store",
      });
    } catch (err) {
      clearTimeout(timer);
      throw new Error(ctrl.signal.aborted ? "timeout" : `fetch_failed:${(err as Error).message}`);
    }
    if (res.status >= 300 && res.status < 400) {
      clearTimeout(timer);
      const loc = res.headers.get("location");
      void res.body?.cancel().catch(() => undefined);
      if (!loc) throw new Error(`http_${res.status}`);
      url = new URL(loc, url);
      continue;
    }
    if (!res.ok) {
      clearTimeout(timer);
      void res.body?.cancel().catch(() => undefined);
      throw new Error(`http_${res.status}`);
    }
    try {
      const text = await readLimited(res);
      return { text, finalUrl: url, contentType: res.headers.get("content-type") ?? "" };
    } catch (err) {
      throw new Error(ctrl.signal.aborted ? "timeout" : `read_failed:${(err as Error).message}`);
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error("too_many_redirects");
}

// ---------------------------------------------------------------------------
// HTML helpers (regex-based; no DOM dependency)
// ---------------------------------------------------------------------------

type Attrs = Record<string, string>;

function parseAttrs(tag: string): Attrs {
  const out: Attrs = {};
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  // Skip the tag name.
  const body = tag.replace(/^<\s*[a-zA-Z][^\s/>]*/, "").replace(/\/?>$/, "");
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    const key = m[1]!.toLowerCase();
    out[key] = decodeEntities(m[2] ?? m[3] ?? m[4] ?? "");
  }
  return out;
}

function tags(html: string, name: string): Attrs[] {
  const re = new RegExp(`<${name}\\b[^>]*>`, "gi");
  const out: Attrs[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) out.push(parseAttrs(m[0]));
  return out;
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  mdash: "—",
  ndash: "–",
  hellip: "…",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  copy: "©",
  reg: "®",
  trade: "™",
};

function decodeEntities(s: string): string {
  return s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (all, ent: string) => {
    if (ent[0] === "#") {
      const code = ent[1]?.toLowerCase() === "x" ? parseInt(ent.slice(2), 16) : parseInt(ent.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : all;
    }
    return ENTITIES[ent.toLowerCase()] ?? all;
  });
}

function visibleText(html: string): string {
  return decodeEntities(
    html
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<(script|style|noscript|svg|template)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

function absolutize(raw: string | undefined, base: URL): string | null {
  if (!raw) return null;
  const v = raw.trim();
  if (!v || v.startsWith("data:") || v.startsWith("javascript:")) return null;
  try {
    const u = new URL(v, base);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.href;
  } catch {
    return null;
  }
}

function registrableDomain(host: string): string {
  const labels = host.toLowerCase().split(".");
  if (labels.length <= 2) return labels.join(".");
  // Handle two-part public suffixes such as co.uk / com.au.
  const secondLevel = labels[labels.length - 2]!;
  const take = /^(co|com|org|net|gov|ac|edu)$/.test(secondLevel) && labels[labels.length - 1]!.length === 2 ? 3 : 2;
  return labels.slice(-take).join(".");
}

/** Stylesheets on the same site, or on a CDN host that carries the brand name (e.g. b.stripecdn.com). */
function sameSiteStylesheet(sheet: URL, page: URL, slug: string): boolean {
  if (sheet.hostname === page.hostname) return true;
  if (registrableDomain(sheet.hostname) === registrableDomain(page.hostname)) return true;
  return slug.length >= 4 && sheet.hostname.toLowerCase().includes(slug);
}

type ImgCandidate = { url: string; score: number };

/** Score `<img>` logo candidates: header/nav placement and the company name beat a bare "logo" substring. */
function logoImages(html: string, base: URL, companyName: string, slug: string): ImgCandidate[] {
  const headerRanges: Array<[number, number]> = [];
  for (const m of html.matchAll(/<(header|nav)\b[^>]*>[\s\S]*?<\/\1>/gi)) headerRanges.push([m.index, m.index + m[0].length]);
  const nameKey = companyName.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const out: ImgCandidate[] = [];
  for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
    const img = parseAttrs(m[0]);
    const src = img.src ?? img["data-src"] ?? "";
    const hay = `${src} ${img.alt ?? ""} ${img.class ?? ""} ${img.id ?? ""}`.toLowerCase();
    if (!/logo/.test(hay)) continue;
    const url = absolutize(src, base);
    if (!url) continue;
    const bare = hay.replace(/[^a-z0-9]+/g, "");
    let score = 1;
    if ((nameKey.length >= 3 && bare.includes(nameKey)) || (slug.length >= 3 && bare.includes(slug))) score += 3;
    if (headerRanges.some(([s, e]) => m.index >= s && m.index < e)) score += 2;
    if (/logo/.test((img.alt ?? "").toLowerCase())) score += 1;
    if (/\.svg(\?|$)/i.test(url)) score += 1;
    // Customer/partner logo walls: many logos in one place, none of them ours.
    if (/(customer|partner|client|trusted|press|award)/.test(hay)) score -= 3;
    // Hero photography "imitating the logo" has a long caption and a big intrinsic width.
    if ((img.alt ?? "").length > 60) score -= 3;
    if (parseInt(img.width ?? "0", 10) > 600) score -= 2;
    out.push({ url, score });
  }
  return out.sort((a, b) => b.score - a.score);
}

function metaMap(html: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of tags(html, "meta")) {
    const key = (m.property ?? m.name ?? m.itemprop ?? "").toLowerCase();
    const content = m.content?.trim();
    if (key && content && !(key in out)) out[key] = content;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Colour maths
// ---------------------------------------------------------------------------

type Rgb = { r: number; g: number; b: number };
type Hsl = { h: number; s: number; l: number };

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

function toHex({ r, g, b }: Rgb): string {
  const c = (n: number) => Math.round(clamp01(n / 255) * 255).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === rr) h = ((gg - bb) / d) % 6;
  else if (max === gg) h = (bb - rr) / d + 2;
  else h = (rr - gg) / d + 4;
  h = (h * 60 + 360) % 360;
  return { h, s: clamp01(s), l };
}

function hslToRgb({ h, s, l }: Hsl): Rgb {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (h % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = l - c / 2;
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}

/** Parse a CSS colour token → rgb + alpha. Supports hex, rgb[a](), hsl[a](). */
function parseColour(token: string): { rgb: Rgb; alpha: number } | null {
  const t = token.trim().toLowerCase();
  const hex = /^#([0-9a-f]{3,8})$/.exec(t);
  if (hex) {
    const h = hex[1]!;
    if (h.length === 3 || h.length === 4) {
      const r = parseInt(h[0]! + h[0]!, 16);
      const g = parseInt(h[1]! + h[1]!, 16);
      const b = parseInt(h[2]! + h[2]!, 16);
      const a = h.length === 4 ? parseInt(h[3]! + h[3]!, 16) / 255 : 1;
      return { rgb: { r, g, b }, alpha: a };
    }
    if (h.length === 6 || h.length === 8) {
      const r = parseInt(h.slice(0, 2), 16);
      const g = parseInt(h.slice(2, 4), 16);
      const b = parseInt(h.slice(4, 6), 16);
      const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
      return { rgb: { r, g, b }, alpha: a };
    }
    return null;
  }
  const fn = /^(rgba?|hsla?)\(\s*([^)]*)\)$/.exec(t);
  if (!fn) return null;
  const kind = fn[1]!;
  const parts = fn[2]!
    .replace(/\s*\/\s*/g, " ")
    .split(/[\s,]+/)
    .filter(Boolean);
  if (parts.length < 3) return null;
  const num = (v: string, scale: number) => {
    if (v.endsWith("%")) return (parseFloat(v) / 100) * scale;
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : NaN;
  };
  const alphaRaw = parts[3];
  const alpha = alphaRaw === undefined ? 1 : alphaRaw.endsWith("%") ? parseFloat(alphaRaw) / 100 : parseFloat(alphaRaw);
  if (kind.startsWith("rgb")) {
    const r = num(parts[0]!, 255);
    const g = num(parts[1]!, 255);
    const b = num(parts[2]!, 255);
    if ([r, g, b].some((n) => Number.isNaN(n))) return null;
    return { rgb: { r, g, b }, alpha: Number.isFinite(alpha) ? alpha : 1 };
  }
  const h = parseFloat(parts[0]!.replace(/deg$/, ""));
  const s = num(parts[1]!, 1);
  const l = num(parts[2]!, 1);
  if ([h, s, l].some((n) => Number.isNaN(n))) return null;
  return { rgb: hslToRgb({ h, s: clamp01(s), l: clamp01(l) }), alpha: Number.isFinite(alpha) ? alpha : 1 };
}

const COLOUR_TOKEN = /#[0-9a-f]{3,8}\b|(?:rgba?|hsla?)\([^)]*\)/gi;

type ColourHit = { hex: string; hsl: Hsl; weight: number };

function collectColours(css: string, boost = 1): Map<string, ColourHit> {
  const out = new Map<string, ColourHit>();
  let m: RegExpExecArray | null;
  COLOUR_TOKEN.lastIndex = 0;
  while ((m = COLOUR_TOKEN.exec(css))) {
    const parsed = parseColour(m[0]);
    if (!parsed || parsed.alpha < 0.35) continue;
    const hex = toHex(parsed.rgb);
    const hsl = rgbToHsl(parsed.rgb);
    const prev = out.get(hex);
    if (prev) prev.weight += boost;
    else out.set(hex, { hex, hsl, weight: boost });
  }
  return out;
}

function mergeColourMaps(target: Map<string, ColourHit>, source: Map<string, ColourHit>) {
  for (const [hex, hit] of source) {
    const prev = target.get(hex);
    if (prev) prev.weight += hit.weight;
    else target.set(hex, { ...hit });
  }
}

function isChromatic(hsl: Hsl): boolean {
  return hsl.s >= 0.12 && hsl.l > 0.08 && hsl.l < 0.95;
}

function hueDelta(a: number, b: number) {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

type Cluster = { rep: ColourHit; weight: number };

function clusterColours(hits: ColourHit[]): Cluster[] {
  const scored = hits
    .filter((h) => isChromatic(h.hsl))
    .map((h) => ({ ...h, weight: h.weight * (0.35 + h.hsl.s) }))
    .sort((a, b) => b.weight - a.weight);
  const clusters: Cluster[] = [];
  for (const hit of scored) {
    const near = clusters.find(
      (c) =>
        hueDelta(c.rep.hsl.h, hit.hsl.h) < 14 && Math.abs(c.rep.hsl.s - hit.hsl.s) < 0.22 && Math.abs(c.rep.hsl.l - hit.hsl.l) < 0.16,
    );
    if (near) near.weight += hit.weight;
    else clusters.push({ rep: hit, weight: hit.weight });
  }
  return clusters.sort((a, b) => b.weight - a.weight);
}

// ---------------------------------------------------------------------------
// CSS analysis
// ---------------------------------------------------------------------------

const GENERIC_FONTS = new Set([
  "inherit",
  "initial",
  "unset",
  "sans-serif",
  "serif",
  "monospace",
  "cursive",
  "fantasy",
  "system-ui",
  "ui-sans-serif",
  "ui-serif",
  "ui-monospace",
  "ui-rounded",
  "emoji",
  "math",
  "fangsong",
  "-apple-system",
  "blinkmacsystemfont",
  "apple color emoji",
  "segoe ui emoji",
  "segoe ui symbol",
  "noto color emoji",
  "twemoji mozilla",
  "arial",
  "helvetica",
  "helvetica neue",
  "times new roman",
  "courier new",
]);

function fontFamilies(css: string): string[] {
  const counts = new Map<string, { name: string; n: number }>();
  const re = /font-family\s*:\s*([^;}!]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css))) {
    const raw = m[1]!;
    if (/var\(/.test(raw) && !/["']/.test(raw)) continue;
    for (const part of raw.split(",")) {
      const cleaned = part.replace(/var\([^)]*\)/g, "").replace(/["']/g, "").trim();
      if (!cleaned || cleaned.length > 40) continue;
      const key = cleaned.toLowerCase();
      if (GENERIC_FONTS.has(key) || key.startsWith("__") || /fallback/i.test(key)) continue;
      const prev = counts.get(key);
      if (prev) prev.n += 1;
      else counts.set(key, { name: cleaned, n: 1 });
    }
  }
  return [...counts.values()].sort((a, b) => b.n - a.n).map((f) => f.name);
}

const MOTION_LIBRARIES: Array<[RegExp, string]> = [
  [/gsap|greensock|scrolltrigger/i, "gsap"],
  [/framer-motion|framer\.com\/m|__framer|data-framer|motion\.dev|motion\/react/i, "framer-motion"],
  [/lottie|dotlottie|bodymovin/i, "lottie"],
  [/three(?:\.min)?\.js|\/three\/|three\.module|@react-three|threejs/i, "three"],
  [/spline\.design|@splinetool|spline-viewer/i, "spline"],
  [/rive-app|@rive-app|\.riv\b/i, "rive"],
  [/anime(?:\.min)?\.js|animejs/i, "anime"],
];

function motionLibraries(html: string, css: string): string[] {
  const scriptSrc = tags(html, "script")
    .map((s) => s.src ?? "")
    .join("\n");
  const inline = html.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");
  const haystack = `${scriptSrc}\n${inline}\n${css.slice(0, 20_000)}`;
  const found: string[] = [];
  for (const [re, name] of MOTION_LIBRARIES) if (re.test(haystack) && !found.includes(name)) found.push(name);
  return found;
}

function backgroundIsDark(css: string, themeColour: string | undefined, html: string): boolean {
  const samples: Hsl[] = [];
  const themed = themeColour ? parseColour(themeColour) : null;
  if (themed) samples.push(rgbToHsl(themed.rgb));
  const blockRe = /(?:^|[}\s,])(?:html|body|:root)\s*(?:,[^{]*)?\{([^}]*)\}/gi;
  let m: RegExpExecArray | null;
  while ((m = blockRe.exec(css))) {
    const decl = /background(?:-color)?\s*:\s*([^;}]+)/i.exec(m[1]!);
    if (!decl) continue;
    const tok = decl[1]!.match(COLOUR_TOKEN)?.[0];
    const parsed = tok ? parseColour(tok) : null;
    if (parsed) samples.push(rgbToHsl(parsed.rgb));
  }
  const bodyTag = tags(html, "body")[0] ?? {};
  const htmlTag = tags(html, "html")[0] ?? {};
  const bodyStyle = `${bodyTag.style ?? ""} ${htmlTag.style ?? ""}`;
  const inlineBg = /background(?:-color)?\s*:\s*([^;]+)/i.exec(bodyStyle)?.[1]?.match(COLOUR_TOKEN)?.[0];
  const inlineParsed = inlineBg ? parseColour(inlineBg) : null;
  if (inlineParsed) samples.push(rgbToHsl(inlineParsed.rgb));
  const classHint = /\bdark\b/i.test(`${bodyTag.class ?? ""} ${htmlTag.class ?? ""}`) || /color-scheme\s*:\s*dark\b/i.test(css);
  if (!samples.length) return classHint;
  const dark = samples.filter((s) => s.l < 0.3).length;
  return dark > samples.length / 2 || (classHint && dark > 0);
}

// ---------------------------------------------------------------------------
// Keywords / industry / personality
// ---------------------------------------------------------------------------

const INDUSTRY_TERMS: Array<[StyleKeyword, string, RegExp]> = [
  ["tech", "technology", /\b(api|apis|developers?|platform|cloud|software|sdk|infrastructure|deploy|ai|machine learning|saas|open source)\b/g],
  ["finance", "finance", /\b(payments?|bank(?:ing)?|finance|financial|invoic(?:e|ing)|billing|capital|treasury|lending|fintech|checkout)\b/g],
  ["health", "health", /\b(health(?:care)?|clinic|patients?|wellness|medical|therapy|pharma|care team|doctors?)\b/g],
  ["retail", "retail", /\b(shop|store|cart|add to bag|buy now|free shipping|new arrivals|collection|sale)\b/g],
  ["creative", "creative", /\b(design|studio|brand(?:ing)?|agency|creative|portfolio|art direction|film|photography)\b/g],
  ["industrial", "industrial", /\b(manufactur(?:e|ing)|logistics|industrial|supply chain|construction|engineering|freight|warehouse|hardware)\b/g],
  ["luxury", "luxury", /\b(luxury|bespoke|premium|exclusive|handcrafted|atelier|couture|concierge)\b/g],
];

const PERSONALITY_FOR: Partial<Record<StyleKeyword, string>> = {
  minimal: "quiet",
  dark: "serious",
  light: "open",
  playful: "friendly",
  bold: "confident",
  tech: "precise",
  industrial: "practical",
  luxury: "refined",
  creative: "expressive",
  finance: "trustworthy",
  warm: "approachable",
  calm: "measured",
  retail: "inviting",
  health: "caring",
};

function styleKeywordsFor(input: {
  text: string;
  primary: Cluster[];
  dark: boolean;
  hasMotion: boolean;
  fontCount: number;
}): { keywords: StyleKeyword[]; industry: string } {
  const lower = input.text.toLowerCase();
  const found = new Set<StyleKeyword>();
  const industryScores: Array<[string, number]> = [];
  for (const [kw, industry, re] of INDUSTRY_TERMS) {
    const hits = lower.match(re)?.length ?? 0;
    if (hits >= 3) found.add(kw);
    industryScores.push([industry, hits]);
  }
  industryScores.sort((a, b) => b[1] - a[1]);
  const industry = industryScores[0] && industryScores[0][1] >= 3 ? industryScores[0][0] : "general";

  found.add(input.dark ? "dark" : "light");

  const top = input.primary[0]?.rep.hsl;
  const distinctHues = new Set(input.primary.slice(0, 6).map((c) => Math.round(c.rep.hsl.h / 30))).size;
  if (top) {
    if (top.s > 0.72 && top.l > 0.3 && top.l < 0.7) found.add("bold");
    if ((top.h < 60 || top.h > 330) && top.s > 0.3) found.add("warm");
    else if (top.h >= 150 && top.h <= 260 && top.s < 0.7) found.add("calm");
  }
  if (distinctHues >= 4 || /\b(fun|play|joy|delight)\b/.test(lower) || /[\u{1F300}-\u{1FAFF}]/u.test(input.text)) found.add("playful");
  if (input.primary.length <= 2 && input.fontCount <= 2 && !input.hasMotion) found.add("minimal");

  const keywords = STYLE_KEYWORDS.filter((k) => found.has(k)).slice(0, 6);
  return { keywords, industry };
}

function visualStyleFor(keywords: StyleKeyword[], industry: string): string {
  const tone = keywords.filter((k) => k !== industry && k !== "tech" && k !== "finance" && k !== "health" && k !== "retail" && k !== "creative" && k !== "industrial" && k !== "luxury");
  const head = tone.slice(0, 3).join(", ");
  const trade = industry === "general" ? "contemporary" : industry;
  return head ? `${head} ${trade} brand` : `${trade} brand`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function failure(companyId: string, companyName: string, url: string | undefined, error: string): DerivedBrandProfile {
  const base = emptyBrandProfile(companyId, companyName);
  return {
    ...base,
    ...(url ? { website: url } : {}),
    derivedFrom: { url: url ?? "", fetchedAt: new Date().toISOString(), confidence: 0 },
    error,
  };
}

export async function deriveBrandProfile(rawUrl: string): Promise<DerivedBrandProfile> {
  const normalized = normalizeWebsiteUrl(rawUrl);
  if (!normalized) return failure("company", "Your company", undefined, "invalid_url");
  const start = new URL(normalized);
  const companyId = hostSlug(start.hostname);
  const fallbackName = nameFromHost(start.hostname);

  let page: Fetched;
  try {
    page = await fetchLimited(start, "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5");
  } catch (err) {
    return failure(companyId, fallbackName, normalized, (err as Error).message || "fetch_failed");
  }
  if (page.contentType && !/html|xml|text\/plain/i.test(page.contentType)) {
    return failure(companyId, fallbackName, normalized, "not_html");
  }

  const html = page.text;
  const base = page.finalUrl;
  const meta = metaMap(html);

  // --- name ---------------------------------------------------------------
  const title = decodeEntities(/<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? "").replace(/\s+/g, " ").trim();
  const titleName = title.split(/\s+[|•·—–-]\s+|\s*:\s+/)[0]?.trim() ?? "";
  const companyName = (meta["og:site_name"] || meta["application-name"] || (titleName.length <= 40 ? titleName : "") || fallbackName).trim();

  // --- logo candidates -------------------------------------------------------
  const links = tags(html, "link");
  const iconLinks = links.filter((l) => /(^|\s)(icon|apple-touch-icon|apple-touch-icon-precomposed|mask-icon)(\s|$)/i.test(l.rel ?? ""));
  const appleTouch = iconLinks.filter((l) => /apple-touch-icon/i.test(l.rel ?? "")).map((l) => absolutize(l.href, base));
  const favicons = iconLinks.filter((l) => !/apple-touch-icon/i.test(l.rel ?? "")).map((l) => absolutize(l.href, base));
  const logoImgs = logoImages(html, base, companyName, companyId);
  const strongLogo = logoImgs.find((c) => c.score >= 3)?.url;
  const weakLogo = logoImgs.find((c) => c.score >= 1)?.url;
  const ogImage = absolutize(meta["og:image"] ?? meta["og:image:url"], base);
  const logoUrl = [strongLogo, ...appleTouch, weakLogo, ogImage, ...favicons].find((v): v is string => Boolean(v)) ?? null;

  // --- avatars ---------------------------------------------------------------
  const avatars: string[] = [];
  for (const cand of [ogImage, absolutize(meta["twitter:image"] ?? meta["twitter:image:src"], base), ...appleTouch]) {
    if (cand && !avatars.includes(cand)) avatars.push(cand);
    if (avatars.length >= 4) break;
  }

  // --- CSS corpus -------------------------------------------------------------
  const inlineStyles = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1] ?? "").join("\n");
  const styleAttrs = [...html.matchAll(/\sstyle\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)].map((m) => m[1] ?? m[2] ?? "").join(";\n");
  const sheetUrls: URL[] = [];
  for (const l of links) {
    if (!/(^|\s)stylesheet(\s|$)/i.test(l.rel ?? "")) continue;
    const abs = absolutize(l.href, base);
    if (!abs) continue;
    const u = new URL(abs);
    if (!sameSiteStylesheet(u, base, companyId)) continue;
    if (sheetUrls.some((s) => s.href === u.href)) continue;
    sheetUrls.push(u);
    if (sheetUrls.length >= MAX_STYLESHEETS) break;
  }
  const sheets = await Promise.all(
    sheetUrls.map((u) => fetchLimited(u, "text/css,*/*;q=0.1").then((r) => r.text).catch(() => "")),
  );
  const fetchedSheets = sheets.filter(Boolean).length;
  const externalCss = sheets.join("\n");
  const allCss = `${inlineStyles}\n${styleAttrs}\n${externalCss}`;

  // --- colours (semantic roles, not flat scrape) --------------------------------
  const themeColour = meta["theme-color"];
  const { roles: colourRoles, hits: colourHits } = buildColourRolesFromSources({
    html,
    css: allCss,
    themeColour,
  });
  const { primaryColours, secondaryColours } = paletteFromRoles(colourRoles);
  const clusters = clusterColours([...colourHits.values()].map((h) => ({ hex: h.hex, hsl: h.hsl, weight: h.weight })));

  // --- fonts ------------------------------------------------------------------
  const fonts = fontFamilies(allCss);
  const body = fonts[0] ?? "Inter";
  const display = fonts[1] ?? body;

  // --- motion -----------------------------------------------------------------
  const keyframes = allCss.match(/@(?:-webkit-)?keyframes\b/gi)?.length ?? 0;
  const motionDecls = allCss.match(/\b(?:animation(?:-name)?|transition)\s*:/gi)?.length ?? 0;
  const libraries = motionLibraries(html, allCss);
  const hasMotion = keyframes > 0 || libraries.length > 0;

  // --- about / tagline --------------------------------------------------------
  const rawTagline = decodeEntities(
    meta["og:description"] || meta["twitter:description"] || meta.description || "",
  )
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 220);

  // --- text heuristics --------------------------------------------------------
  const text = `${visibleText(html)} ${meta.description ?? ""} ${meta["og:description"] ?? ""}`.slice(0, 200_000);
  const linkCount = html.match(/<a\b/gi)?.length ?? 0;
  const scriptCount = html.match(/<script\b/gi)?.length ?? 0;
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const tier = tierHint(text, { linkCount, scriptCount, wordCount, hasMotion });
  const dark = backgroundIsDark(allCss, themeColour, html);
  const { keywords, industry } = styleKeywordsFor({ text, primary: clusters, dark, hasMotion, fontCount: fonts.length });
  const personality = keywords.map((k) => PERSONALITY_FOR[k]).filter((p): p is string => Boolean(p)).slice(0, 4);

  // --- confidence -------------------------------------------------------------
  let confidence = 0.2;
  if (primaryColours.length >= 1) confidence += 0.2;
  if (primaryColours.length >= 3) confidence += 0.1;
  if (fonts.length) confidence += 0.15;
  if (meta["og:site_name"] || titleName) confidence += 0.1;
  if (logoUrl) confidence += 0.1;
  if (fetchedSheets > 0) confidence += 0.1;
  // Heavy transition/animation usage without @keyframes still hints at a considered site.
  if (motionDecls > 20) confidence += 0.03;
  confidence = Math.min(0.95, Math.round(confidence * 100) / 100);

  const profile: DerivedBrandProfile = {
    ...emptyBrandProfile(companyId, companyName),
    website: base.origin + (base.pathname === "/" ? "" : base.pathname),
    tier,
    logo: { wordmark: emptyBrandProfile(companyId, companyName).logo.wordmark, assetPath: null, imageUrl: logoUrl },
    ...(rawTagline ? { tagline: rawTagline } : {}),
    primaryColours,
    secondaryColours,
    colourRoles,
    typography: { display, body },
    visualStyle: visualStyleFor(keywords, industry),
    industry,
    personality,
    styleKeywords: keywords,
    avatars,
    animations: { hasMotion, keyframes, libraries },
    derivedFrom: { url: normalized, fetchedAt: new Date().toISOString(), confidence },
  };
  const verified = verifiedOverrideFor(companyId, base.hostname);
  return verified ? applyVerifiedOverride(profile, verified) : profile;
}
