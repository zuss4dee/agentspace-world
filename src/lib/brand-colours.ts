/**
 * Semantic brand colour extraction — website CSS/HTML → role-based palette.
 * UI / status / demo-mock colours are down-ranked; logo marks and CSS vars win.
 */

export type BrandColourRoles = {
  /** Main brand chromatic (facade accent, signage mass). */
  primary: string;
  /** Supporting brand hue or muted companion. */
  secondary: string;
  /** Highlights — ticks, glow strips, small accents. */
  accent: string;
  /** Page / canvas / plaster base. */
  background: string;
  /** Text / dark metal / window frames. */
  foreground: string;
  /** Colours sampled from the official logo mark (SVG). */
  logo: string[];
};

export type Hsl = { h: number; s: number; l: number };

export type Rgb = { r: number; g: number; b: number };

const COLOUR_TOKEN = /#[0-9a-f]{3,8}\b|(?:rgba?|hsla?)\([^)]*\)/gi;

const HEX_COLOUR = /^#[0-9a-f]{6}$/i;

/** Known Tailwind / shadcn UI semantics — not company brand. */
const UI_HEX_DENY = new Set(
  [
    "#1447e6",
    "#2563eb",
    "#3b82f6",
    "#60a5fa",
    "#90c5ff",
    "#1d4ed8",
    "#dc2626",
    "#ef4444",
    "#d70011",
    "#8f1d17",
    "#b91c1c",
    "#f87171",
    "#ea580c",
    "#f97316",
    "#ff8c00",
    "#fb923c",
    "#eab308",
    "#facc15",
  ].map((h) => h.toLowerCase()),
);

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

export function toHex({ r, g, b }: Rgb): string {
  const c = (n: number) => Math.round(clamp01(n / 255) * 255).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

export function rgbToHsl({ r, g, b }: Rgb): Hsl {
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

/** Parse a CSS colour token → rgb + alpha. */
export function parseColour(token: string): { rgb: Rgb; alpha: number } | null {
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

type ScoredHit = { hex: string; hsl: Hsl; weight: number; tag: string };

function addHit(map: Map<string, ScoredHit>, token: string, weight: number, tag: string) {
  const parsed = parseColour(token);
  if (!parsed || parsed.alpha < 0.35) return;
  const hex = toHex(parsed.rgb).toLowerCase();
  const hsl = rgbToHsl(parsed.rgb);
  const prev = map.get(hex);
  if (prev) {
    prev.weight += weight;
    if (weight > prev.weight * 0.4) prev.tag = tag;
  } else map.set(hex, { hex, hsl, weight, tag });
}

function collectTokens(css: string, boost = 1, tag = "generic"): Map<string, ScoredHit> {
  const out = new Map<string, ScoredHit>();
  COLOUR_TOKEN.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = COLOUR_TOKEN.exec(css))) addHit(out, m[0], boost, tag);
  return out;
}

function mergeHits(target: Map<string, ScoredHit>, source: Map<string, ScoredHit>) {
  for (const [hex, hit] of source) {
    const prev = target.get(hex);
    if (prev) prev.weight += hit.weight;
    else target.set(hex, { ...hit });
  }
}

function isNeutral(hsl: Hsl): boolean {
  return hsl.s < 0.12 || hsl.l <= 0.08 || hsl.l >= 0.95;
}

function isBrandGreen(hsl: Hsl): boolean {
  return hsl.h >= 95 && hsl.h <= 165 && hsl.s >= 0.25;
}

/** Heuristic UI/status chroma (Tailwind blues, reds, oranges). */
export function isUiSemanticChroma(hsl: Hsl, hex: string): boolean {
  if (UI_HEX_DENY.has(hex.toLowerCase())) return true;
  const { h, s, l } = hsl;
  if (s < 0.35) return false;
  if (h >= 205 && h <= 250 && s > 0.45) return true;
  if ((h <= 18 || h >= 340) && s > 0.45 && l > 0.22 && l < 0.58) return true;
  if (h >= 22 && h <= 48 && s > 0.65) return true;
  return false;
}

function extractBrandMarkColours(html: string): Map<string, ScoredHit> {
  const out = new Map<string, ScoredHit>();
  const markRe =
    /<(?:svg|rect|circle|ellipse|path|g)\b[^>]*(?:class="[^"]*(?:mark|logo|brand|echt|eye)[^"]*"|id="[^"]*(?:mark|logo|brand|echt|eye)[^"]*")[^>]*>/gi;
  if (markRe.test(html)) {
    for (const m of html.matchAll(/(?:fill|stroke|stop-color)\s*=\s*["'](#[^"']+)["']/gi)) {
      addHit(out, m[1]!, 4, "brand-mark");
    }
  }
  for (const m of html.matchAll(/stop-color\s*=\s*["'](#[^"']+)["']/gi)) {
    addHit(out, m[1]!, 3.5, "logo-gradient");
  }
  for (const m of html.matchAll(/class="[^"]*(?:v2-mark|v2-btn--primary|echt-eye)[^"]*"[^>]*(?:fill|stroke)?[^>]*(?:fill|stroke)\s*=\s*["'](#[^"']+)["']/gi)) {
    addHit(out, m[1]!, 5, "brand-component");
  }
  return out;
}

function extractCssVarBrandColours(css: string): Map<string, ScoredHit> {
  const out = new Map<string, ScoredHit>();
  const re =
    /--([a-z0-9-]*(?:brand|primary|accent|green|foreground|background|surface|echt)[a-z0-9-]*)\s*:\s*([^;}]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css))) {
    const name = m[1]!.toLowerCase();
    const tokens = m[2]!.match(COLOUR_TOKEN) ?? [];
    const boost = name.includes("background") || name.includes("surface") ? 4 : 6;
    const tag = name.includes("background") ? "css-bg" : name.includes("foreground") ? "css-fg" : "css-brand";
    for (const tok of tokens) addHit(out, tok, boost, tag);
  }
  return out;
}

function extractRootBackgrounds(css: string, html: string): Map<string, ScoredHit> {
  const out = new Map<string, ScoredHit>();
  const blockRe = /(?:^|[}\s,])(?:html|body|:root)\s*(?:,[^{]*)?\{([^}]*)\}/gi;
  let m: RegExpExecArray | null;
  while ((m = blockRe.exec(css))) {
    const decl = /background(?:-color)?\s*:\s*([^;}]+)/i.exec(m[1]!);
    if (!decl) continue;
    for (const tok of decl[1]!.match(COLOUR_TOKEN) ?? []) addHit(out, tok, 5, "root-bg");
  }
  const bodyStyle = [...html.matchAll(/\sstyle\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)]
    .map((x) => x[1] ?? x[2] ?? "")
    .join(";");
  for (const tok of bodyStyle.match(COLOUR_TOKEN) ?? []) addHit(out, tok, 3, "inline-bg");
  return out;
}

function extractPrimaryButtonColours(css: string): Map<string, ScoredHit> {
  const out = new Map<string, ScoredHit>();
  const blockRe = /[^{}]*(?:btn--primary|button-primary|\.primary)[^{]*\{([^}]*)\}/gi;
  let m: RegExpExecArray | null;
  while ((m = blockRe.exec(css))) {
    for (const prop of ["background", "background-color", "border-color", "color"]) {
      const decl = new RegExp(`${prop}\\s*:\\s*([^;}]+)`, "i").exec(m[1]!);
      if (!decl) continue;
      for (const tok of decl[1]!.match(COLOUR_TOKEN) ?? []) addHit(out, tok, 4.5, "btn-primary");
    }
  }
  return out;
}

/** Down-rank colours that only appear in embedded product mock / demo UI blocks. */
function penalizeDemoUiColours(css: string, hits: Map<string, ScoredHit>) {
  const demoBlocks: string[] = [];
  const demoRe = /\.(?:es-|cs-|demo-|mock-)[^{]*\{[^}]*\}/gi;
  let m: RegExpExecArray | null;
  while ((m = demoRe.exec(css))) demoBlocks.push(m[0]);
  if (!demoBlocks.length) return;
  const demoColours = new Map<string, number>();
  for (const block of demoBlocks) {
    for (const tok of block.match(COLOUR_TOKEN) ?? []) {
      const parsed = parseColour(tok);
      if (!parsed) continue;
      const hex = toHex(parsed.rgb).toLowerCase();
      demoColours.set(hex, (demoColours.get(hex) ?? 0) + 1);
    }
  }
  for (const [hex, hit] of hits) {
    if (!demoColours.has(hex)) continue;
    if (hit.tag === "brand-mark" || hit.tag === "logo-gradient" || hit.tag === "css-brand") continue;
    hit.weight *= 0.25;
  }
}

function applyUiPenalty(hits: Map<string, ScoredHit>) {
  for (const hit of hits.values()) {
    if (hit.tag === "brand-mark" || hit.tag === "logo-gradient" || hit.tag === "css-brand" || hit.tag === "btn-primary")
      continue;
    if (isUiSemanticChroma(hit.hsl, hit.hex)) hit.weight *= 0.08;
    else if (isUiSemanticChroma(hit.hsl, hit.hex) === false && hit.tag === "generic") {
      /* keep */
    }
  }
}

function pickBest(
  hits: Map<string, ScoredHit>,
  pred: (h: ScoredHit) => boolean,
  exclude = new Set<string>(),
): ScoredHit | null {
  const candidates = [...hits.values()].filter((h) => pred(h) && !exclude.has(h.hex));
  candidates.sort((a, b) => b.weight - a.weight);
  return candidates[0] ?? null;
}

function nearestBrandGreen(hits: Map<string, ScoredHit>, exclude: Set<string>): ScoredHit | null {
  const chroma = [...hits.values()].filter((h) => !exclude.has(h.hex) && !isNeutral(h.hsl) && !isUiSemanticChroma(h.hsl, h.hex));
  chroma.sort((a, b) => {
    const aGreen = isBrandGreen(a.hsl) ? a.weight * 2 : a.weight * 0.3;
    const bGreen = isBrandGreen(b.hsl) ? b.weight * 2 : b.weight * 0.3;
    return bGreen - aGreen;
  });
  return chroma[0] ?? null;
}

export function buildColourRolesFromSources(input: {
  html: string;
  css: string;
  themeColour?: string;
}): { roles: BrandColourRoles; hits: Map<string, ScoredHit> } {
  const hits = collectTokens(input.css, 1, "generic");
  mergeHits(hits, extractBrandMarkColours(input.html));
  mergeHits(hits, extractCssVarBrandColours(input.css));
  mergeHits(hits, extractRootBackgrounds(input.css, input.html));
  mergeHits(hits, extractPrimaryButtonColours(input.css));
  if (input.themeColour) mergeHits(hits, collectTokens(input.themeColour, 6, "theme-meta"));
  penalizeDemoUiColours(input.css, hits);
  applyUiPenalty(hits);

  const used = new Set<string>();

  const background =
    pickBest(hits, (h) => isNeutral(h.hsl) && h.hsl.l >= 0.88, used)?.hex ??
    pickBest(hits, (h) => isNeutral(h.hsl) && h.hsl.l >= 0.75, used)?.hex ??
    "#f4f6f5";
  used.add(background);

  const foreground =
    pickBest(hits, (h) => isNeutral(h.hsl) && h.hsl.l <= 0.22, used)?.hex ??
    pickBest(hits, (h) => isNeutral(h.hsl) && h.hsl.l <= 0.35, used)?.hex ??
    "#0f1211";
  used.add(foreground);

  const primary =
    nearestBrandGreen(hits, used)?.hex ??
    pickBest(hits, (h) => !isNeutral(h.hsl) && !isUiSemanticChroma(h.hsl, h.hex), used)?.hex ??
    "#22a94f";
  used.add(primary);

  const accent =
    pickBest(hits, (h) => isBrandGreen(h.hsl) && h.hex !== primary, used)?.hex ??
    pickBest(hits, (h) => !isNeutral(h.hsl) && h.hsl.l > rgbToHsl(parseColour(primary)!.rgb).l, used)?.hex ??
    primary;
  used.add(accent);

  const secondary =
    pickBest(hits, (h) => isNeutral(h.hsl) && h.hsl.l > 0.55 && h.hsl.l < 0.85, used)?.hex ??
    pickBest(hits, (h) => isBrandGreen(h.hsl) && h.hex !== primary && h.hex !== accent, used)?.hex ??
    "#cdd6d1";
  used.add(secondary);

  const logoHits = [...hits.values()]
    .filter((h) => h.tag === "brand-mark" || h.tag === "logo-gradient" || h.tag === "brand-component")
    .sort((a, b) => b.weight - a.weight)
    .map((h) => h.hex);
  const logo = [...new Set(logoHits)].slice(0, 6);

  return {
    roles: { primary, secondary, accent, background, foreground, logo },
    hits,
  };
}

export function paletteFromRoles(roles: BrandColourRoles): { primaryColours: string[]; secondaryColours: string[] } {
  const primaryColours = [roles.primary, roles.accent, roles.secondary].filter(
    (h, i, arr) => HEX_COLOUR.test(h) && arr.indexOf(h) === i,
  );
  const secondaryColours = [roles.background, roles.foreground].filter(
    (h, i, arr) => HEX_COLOUR.test(h) && arr.indexOf(h) === i && !primaryColours.includes(h),
  );
  return { primaryColours, secondaryColours };
}

export function normalizeHex(hex: string): string | null {
  const parsed = parseColour(hex);
  return parsed ? toHex(parsed.rgb).toLowerCase() : null;
}
