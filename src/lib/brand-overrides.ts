/**
 * Verified brand specs for authored-world companies.
 * Applied after website extraction — never hallucinate; only correct known tenants.
 */
import type { BrandColourRoles, BrandProfile } from "./brand-profile";

export type VerifiedBrandOverride = Partial<BrandProfile> & {
  colourRoles?: BrandColourRoles;
  /** Match hostnames (without www) that should receive this override. */
  hosts?: string[];
};

export const VERIFIED_BRAND_OVERRIDES: Record<string, VerifiedBrandOverride> = {
  echt: {
    companyId: "echt",
    companyName: "Echt",
    website: "https://www.useecht.com",
    hosts: ["useecht.com", "echt.studio"],
    colourRoles: {
      primary: "#22a94f",
      secondary: "#cdd6d1",
      accent: "#22c55e",
      background: "#f4f6f5",
      foreground: "#0f1211",
      logo: ["#22a94f", "#5fd98a", "#0d6b2c", "#f4f6f5", "#0f1211"],
    },
    primaryColours: ["#22a94f", "#22c55e", "#0f1211"],
    secondaryColours: ["#f4f6f5", "#cdd6d1", "#5a6a54"],
    visualStyle: "quiet contemporary studio, white plaster, olive green, dark metal",
    industry: "design / operations software",
    personality: ["precise", "calm", "editorial"],
    logo: {
      wordmark: "ECHT",
      assetPath: "public/assets/brands/echt/logo.svg",
      imageUrl: "https://www.useecht.com/icon.svg",
    },
  },
};

export function verifiedOverrideFor(companyId: string, hostname?: string): VerifiedBrandOverride | undefined {
  const byId = VERIFIED_BRAND_OVERRIDES[companyId.toLowerCase()];
  if (byId) return byId;
  if (!hostname) return undefined;
  const host = hostname.replace(/^www\./i, "").toLowerCase();
  return Object.values(VERIFIED_BRAND_OVERRIDES).find((o) => o.hosts?.some((h) => h === host));
}

export function applyVerifiedOverride(profile: BrandProfile, override: VerifiedBrandOverride): BrandProfile {
  const { hosts: _hosts, colourRoles, ...rest } = override;
  return {
    ...profile,
    ...rest,
    logo: { ...profile.logo, ...(rest.logo ?? {}) },
    typography: { ...profile.typography, ...(rest.typography ?? {}) },
    ...(colourRoles ? { colourRoles } : {}),
    primaryColours: rest.primaryColours?.length ? rest.primaryColours : profile.primaryColours,
    secondaryColours: rest.secondaryColours?.length ? rest.secondaryColours : profile.secondaryColours,
    derivedFrom: profile.derivedFrom
      ? { ...profile.derivedFrom, confidence: Math.max(profile.derivedFrom.confidence, 0.92) }
      : profile.derivedFrom,
  };
}
