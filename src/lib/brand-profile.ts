import type { BuildingSpec, CompanyProfile } from "./building-spec";

/**
 * Shared brand contract consumed by the Blender company-building generator
 * (`scripts/blender/build_company_from_brand.py -- --brand <file>`). Keys are camelCase
 * and must stay in sync with the Blender side.
 */
export type CompanyTier = "enterprise" | "smb" | "startup";

export const COMPANY_TIERS: CompanyTier[] = ["enterprise", "smb", "startup"];

export const TIER_LABELS: Record<CompanyTier, string> = {
  enterprise: "Big business",
  smb: "Small business",
  startup: "Startup",
};

export const STYLE_KEYWORDS = [
  "minimal",
  "dark",
  "light",
  "playful",
  "bold",
  "tech",
  "industrial",
  "luxury",
  "creative",
  "finance",
  "warm",
  "calm",
  "retail",
  "health",
] as const;

export type StyleKeyword = (typeof STYLE_KEYWORDS)[number];

export type BrandProfile = {
  companyId: string;
  companyName: string;
  website?: string;
  tier: CompanyTier;
  logo: { wordmark: string; assetPath?: string | null; imageUrl?: string | null };
  /** #rrggbb, ordered by prominence. */
  primaryColours: string[];
  secondaryColours: string[];
  typography: { display: string; body: string };
  visualStyle: string;
  industry: string;
  personality: string[];
  styleKeywords: string[];
  /** og/twitter/apple-touch image urls, max 4. */
  avatars: string[];
  animations: { hasMotion: boolean; keyframes: number; libraries: string[] };
  derivedFrom?: { url: string; fetchedAt: string; confidence: number };
};

/** What `/v1/brand/derive` returns: always a full profile, plus `error` when the fetch failed. */
export type DerivedBrandProfile = BrandProfile & { error?: string };

export type TierSignals = {
  /** Number of `<a>` tags on the page — large sites lean enterprise. */
  linkCount?: number;
  /** Number of `<script>` tags. */
  scriptCount?: number;
  /** Visible word count. */
  wordCount?: number;
  hasMotion?: boolean;
};

export function isCompanyTier(v: unknown): v is CompanyTier {
  return v === "enterprise" || v === "smb" || v === "startup";
}

export function isStyleKeyword(v: unknown): v is StyleKeyword {
  return typeof v === "string" && (STYLE_KEYWORDS as readonly string[]).includes(v);
}

const WORDMARK_ALLOWED = /[^A-Z0-9&\-.'+]/g;

/** Uppercase A–Z 0–9 & - . ' +, max 8 chars; first word preferred. */
export function sanitizeWordmark(name: string): string {
  const upper = name.trim().toUpperCase();
  if (!upper) return "CO";
  const first = upper.split(/\s+/)[0]?.replace(WORDMARK_ALLOWED, "") ?? "";
  if (first.length >= 2) return first.slice(0, 8);
  const whole = upper.replace(WORDMARK_ALLOWED, "");
  return (whole || first || "CO").slice(0, 8) || "CO";
}

const ENTERPRISE_TERMS: Array<[RegExp, number]> = [
  [/\benterprise\b/g, 2],
  [/\bfortune\s*500\b/g, 3],
  [/\bglobal\b/g, 1],
  [/\boffices\b/g, 1],
  [/\binvestor\s+relations\b/g, 3],
  [/\bcareers?\b/g, 1],
  [/\bcompliance\b/g, 1],
  [/\bsoc\s*2\b/g, 1],
  [/\bfortune\s*100\b/g, 3],
  [/\bnasdaq\b|\bnyse\b/g, 3],
];

const STARTUP_TERMS: Array<[RegExp, number]> = [
  [/\bstartups?\b/g, 2],
  [/\bwe'?re\s+hiring\b|\bwe\s+are\s+hiring\b/g, 2],
  [/\bwaitlist\b|\bwait\s+list\b/g, 2],
  [/\bbeta\b/g, 1],
  [/\bseed\b/g, 1],
  [/\bseries\s+a\b/g, 2],
  [/\byc\b|\by\s*combinator\b/g, 2],
  [/\bbacked\s+by\b/g, 1],
  [/\bearly\s+access\b/g, 1],
];

function scoreTerms(text: string, terms: Array<[RegExp, number]>) {
  let score = 0;
  for (const [re, weight] of terms) {
    const hits = text.match(re)?.length ?? 0;
    // Cap each term so one repeated word cannot dominate.
    score += Math.min(hits, 4) * weight;
  }
  return score;
}

/** Keyword heuristics on visible text + meta description → company tier. */
export function tierHint(text: string, signals: TierSignals = {}): CompanyTier {
  const lower = text.toLowerCase();
  let enterprise = scoreTerms(lower, ENTERPRISE_TERMS);
  let startup = scoreTerms(lower, STARTUP_TERMS);

  const links = signals.linkCount ?? 0;
  const scripts = signals.scriptCount ?? 0;
  const words = signals.wordCount ?? 0;
  if (links > 120) enterprise += 2;
  else if (links > 60) enterprise += 1;
  if (scripts > 25) enterprise += 1;
  if (words > 2500) enterprise += 1;
  if (links > 0 && links < 25 && words > 0 && words < 600) startup += 1;
  if (signals.hasMotion && links < 40) startup += 1;

  if (enterprise >= 4 && enterprise > startup) return "enterprise";
  if (startup >= 3 && startup >= enterprise) return "startup";
  return "smb";
}

export function hostSlug(hostname: string): string {
  const bare = hostname.replace(/^www\./i, "").toLowerCase();
  const label = bare.split(".")[0] ?? bare;
  return label.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "company";
}

export function nameFromHost(hostname: string): string {
  const slug = hostSlug(hostname);
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w[0]!.toUpperCase() + w.slice(1))
    .join(" ");
}

export const HEX_COLOUR = /^#[0-9a-f]{6}$/i;

export function cleanPalette(input: unknown, max = 6): string[] {
  if (!Array.isArray(input)) return [];
  const out: string[] = [];
  for (const v of input) {
    if (typeof v !== "string") continue;
    const hex = v.trim().toLowerCase();
    if (!HEX_COLOUR.test(hex) || out.includes(hex)) continue;
    out.push(hex);
    if (out.length >= max) break;
  }
  return out;
}

function isHttpUrl(v: string | undefined | null): v is string {
  return typeof v === "string" && /^https?:\/\//i.test(v.trim());
}

function websiteHref(raw: string | undefined): string | undefined {
  const trimmed = raw?.trim();
  if (!trimmed) return undefined;
  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : undefined;
  } catch {
    return undefined;
  }
}

export function emptyBrandProfile(companyId: string, companyName: string): BrandProfile {
  return {
    companyId,
    companyName,
    tier: "smb",
    logo: { wordmark: sanitizeWordmark(companyName), assetPath: null, imageUrl: null },
    primaryColours: [],
    secondaryColours: [],
    typography: { display: "Inter", body: "Inter" },
    visualStyle: "clean contemporary",
    industry: "general",
    personality: [],
    styleKeywords: [],
    avatars: [],
    animations: { hasMotion: false, keyframes: 0, libraries: [] },
  };
}

/**
 * Build the Blender-facing BrandProfile from the CompanyProfile the user confirmed in
 * the claim wizard. `profile.palette` / `profile.tier` win over anything cached in
 * `profile.brand` (they are what the user edited); `overrides` win over both.
 */
export function brandProfileFromCompanyProfile(
  plotId: string,
  profile: CompanyProfile,
  overrides?: Partial<BrandProfile>,
): BrandProfile {
  const brand = profile.brand ?? {};
  const name = profile.name.trim() || brand.companyName?.trim() || "Your company";
  const base = emptyBrandProfile(plotId.replace(/[^a-z0-9._-]+/gi, "-").toLowerCase(), name);

  const palette = cleanPalette(profile.palette);
  const primary = palette.length ? palette.slice(0, 3) : cleanPalette(brand.primaryColours, 3);
  const secondary = palette.length ? palette.slice(3, 6) : cleanPalette(brand.secondaryColours, 3);

  const logoUrl = isHttpUrl(profile.logo) ? profile.logo.trim() : isHttpUrl(brand.logo?.imageUrl) ? brand.logo!.imageUrl! : null;
  const website = websiteHref(profile.website) ?? websiteHref(brand.website);

  const out: BrandProfile = {
    ...base,
    ...(website ? { website } : {}),
    tier: profile.tier ?? (isCompanyTier(brand.tier) ? brand.tier : base.tier),
    logo: {
      wordmark: sanitizeWordmark(name),
      assetPath: brand.logo?.assetPath ?? null,
      imageUrl: logoUrl,
    },
    primaryColours: primary,
    secondaryColours: secondary,
    typography: {
      display: brand.typography?.display?.trim() || base.typography.display,
      body: brand.typography?.body?.trim() || base.typography.body,
    },
    visualStyle: brand.visualStyle?.trim() || base.visualStyle,
    industry: brand.industry?.trim() || base.industry,
    personality: Array.isArray(brand.personality) ? brand.personality.filter((p) => typeof p === "string") : [],
    styleKeywords: Array.isArray(brand.styleKeywords) ? brand.styleKeywords.filter(isStyleKeyword) : [],
    avatars: Array.isArray(brand.avatars) ? brand.avatars.filter(isHttpUrl).slice(0, 4) : [],
    animations: {
      hasMotion: Boolean(brand.animations?.hasMotion),
      keyframes: Math.max(0, Math.floor(brand.animations?.keyframes ?? 0)),
      libraries: Array.isArray(brand.animations?.libraries) ? brand.animations.libraries : [],
    },
    ...(brand.derivedFrom ? { derivedFrom: brand.derivedFrom } : {}),
  };
  return overrides ? { ...out, ...overrides } : out;
}

export function brandProfileFileName(profile: Pick<BrandProfile, "companyId">): string {
  return `brand.${profile.companyId}.json`;
}

/** Trigger a browser download of the brand JSON. No-op outside the browser. */
export function downloadBrandProfile(profile: BrandProfile) {
  if (typeof document === "undefined") return;
  const blob = new Blob([JSON.stringify(profile, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = brandProfileFileName(profile);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** First palette colour, if the tenant pulled one from their website. */
export function brandAccentOf(profile: CompanyProfile | undefined): string | undefined {
  return cleanPalette(profile?.palette, 1)[0];
}

/** Preview on the map: brand colour drives the accent + sign so a claimed lot reads as the tenant. */
export function withBrandAccent(spec: BuildingSpec): BuildingSpec {
  const accent = brandAccentOf(spec.profile);
  if (!accent || (spec.materials.accent === accent && spec.signage.color === accent)) return spec;
  return {
    ...spec,
    materials: { ...spec.materials, accent },
    signage: { ...spec.signage, color: accent },
  };
}
