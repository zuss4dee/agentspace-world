import type { AdImageFrame, CompanyProfile } from "./building-spec";
import { letterMark, normalizeWebsiteUrl } from "./company-profile";

export const CLAIM_BOILERPLATE_DOES = "A new house on claimed land.";
export const CLAIM_BOILERPLATE_DESC =
  "You just claimed this lot. Write who you are — name, trade, and a line for the people who knock.";

export const AD_DESCRIPTION_MAX = 400;

export const AD_IMAGE_FRAME_LABELS: Record<AdImageFrame, string> = {
  landscape: "Landscape (16:9)",
  square: "Square (1:1)",
  portrait: "Portrait (4:5)",
};

/** Keep user-authored copy exactly as typed; only trim to detect emptiness. */
function userText(raw: string | undefined | null): string | null {
  if (typeof raw !== "string") return null;
  return raw.trim() ? raw : null;
}

export function adCompanyName(profile: CompanyProfile): string {
  return userText(profile.name) ?? userText(profile.brand?.companyName) ?? "Company";
}

export function adLogoUrl(profile: CompanyProfile): string {
  const fromProfile = userText(profile.logo);
  if (fromProfile) return fromProfile;
  return userText(profile.brand?.logo?.imageUrl) ?? "";
}

export function adHeadline(profile: CompanyProfile): string {
  const explicit = userText(profile.adHeadline);
  if (explicit) return explicit;

  const name = adCompanyName(profile);
  const desc = userText(profile.description);
  const descShows = desc && desc !== CLAIM_BOILERPLATE_DESC ? desc : "";
  const tagline = userText(profile.brand?.tagline) ?? "";

  if (tagline && tagline !== descShows) {
    return tagline.length > 120 ? `${tagline.slice(0, 117)}…` : tagline;
  }
  const does = userText(profile.does);
  if (does && does !== CLAIM_BOILERPLATE_DOES && does !== descShows && does !== tagline) {
    return does.length > 120 ? `${does.slice(0, 117)}…` : does;
  }
  return name;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

export function adDescription(profile: CompanyProfile): string | null {
  const desc = userText(profile.description);
  if (desc && desc !== CLAIM_BOILERPLATE_DESC) return truncate(desc, AD_DESCRIPTION_MAX);
  const does = userText(profile.does);
  const headline = adHeadline(profile);
  if (does && does !== CLAIM_BOILERPLATE_DOES && does !== headline) {
    return truncate(does, AD_DESCRIPTION_MAX);
  }
  const msg = userText(profile.visitorMessage);
  if (msg) return truncate(msg, AD_DESCRIPTION_MAX);
  return null;
}

export function adCreativeUrl(profile: CompanyProfile): string | null {
  const img = userText(profile.adImage);
  if (img) return img;
  const avatar = profile.brand?.avatars?.find((u) => userText(u));
  return avatar ? userText(avatar) : null;
}

export function adImageFrame(profile: CompanyProfile): AdImageFrame {
  const frame = profile.adImageFrame;
  return frame === "square" || frame === "portrait" ? frame : "landscape";
}

export function adLabels(profile: CompanyProfile): string[] {
  const labels: string[] = [];
  const seen = new Set<string>();

  const add = (raw: string) => {
    const label = userText(raw);
    if (!label) return;
    const key = label.toLowerCase();
    if (seen.has(key) || labels.length >= 3) return;
    seen.add(key);
    labels.push(label);
  };

  for (const keyword of profile.brand?.styleKeywords ?? []) add(keyword);
  for (const trait of profile.brand?.personality ?? []) add(trait);

  const industry = userText(profile.brand?.industry);
  if (industry && industry !== "general") {
    add(industry.replace(/\b\w/g, (c) => c.toUpperCase()));
  }

  return labels;
}

export function adCtaLabel(profile: CompanyProfile): string {
  const custom = userText(profile.ctaLabel);
  if (custom) return custom;
  return `Explore ${adCompanyName(profile)}`;
}

export function adCtaUrl(profile: CompanyProfile): string | null {
  return normalizeWebsiteUrl(profile.ctaUrl ?? "");
}

export function adLetterMark(profile: CompanyProfile): string {
  return letterMark(adCompanyName(profile));
}

export function brandCssVars(palette: string[]): Record<string, string> {
  const primary = palette[0] ?? "#111";
  const rgb = hexToRgb(primary);
  return {
    "--brand-primary": primary,
    "--brand-glow": rgb ? `rgba(${rgb.r},${rgb.g},${rgb.b},0.25)` : "rgba(17,17,17,0.15)",
  };
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1]!, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
