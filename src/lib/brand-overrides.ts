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
  stripe: {
    companyId: "stripe",
    companyName: "Stripe",
    website: "https://stripe.com",
    hosts: ["stripe.com"],
    colourRoles: {
      primary: "#635bff",
      secondary: "#0a2540",
      accent: "#00d924",
      background: "#ffffff",
      foreground: "#0a2540",
      logo: ["#635bff", "#0a2540", "#ffffff"],
    },
    primaryColours: ["#635bff", "#0a2540", "#00d924"],
    secondaryColours: ["#ffffff", "#80e9ff"],
    visualStyle: "precise financial infrastructure, blurple, deep navy, cool white",
    industry: "finance",
    personality: ["precise", "premium", "technical"],
    logo: {
      wordmark: "STRIPE",
      imageUrl: "https://images.stripeassets.com/fzn2n1nzq965/4vVgZi0ZMoEzOhkcv7EVwK/8cce6fdcf2733b2ec8e99548908847ed/favicon.png?w=180&h=180",
    },
  },
  grove: {
    companyId: "grove",
    companyName: "Grove Collaborative",
    website: "https://www.grove.co",
    hosts: ["grove.co"],
    colourRoles: {
      primary: "#033b4c",
      secondary: "#4dac72",
      accent: "#4dac72",
      background: "#f4f1ea",
      foreground: "#033b4c",
      logo: ["#033b4c", "#4dac72", "#f4f1ea"],
    },
    primaryColours: ["#033b4c", "#4dac72", "#d4d3cd"],
    secondaryColours: ["#f4f1ea", "#ffffff"],
    visualStyle: "warm retail campus, deep teal, leaf green, cream",
    industry: "retail",
    personality: ["calm", "organic", "friendly"],
    logo: {
      wordmark: "GROVE",
      imageUrl: "https://www.grove.co/cdn/shop/files/Green-Rewards-Logo-Left-Light.svg?v=1761682829",
    },
  },
  linear: {
    companyId: "linear",
    companyName: "Linear",
    website: "https://linear.app",
    hosts: ["linear.app"],
    colourRoles: {
      primary: "#5e6ad2",
      secondary: "#08090a",
      accent: "#5e6ad2",
      background: "#08090a",
      foreground: "#ffffff",
      logo: ["#5e6ad2", "#ffffff", "#08090a"],
    },
    primaryColours: ["#5e6ad2", "#08090a", "#ffffff"],
    secondaryColours: ["#dfd1ff", "#9c9da1"],
    visualStyle: "dark product studio, indigo, near-black, pale lilac",
    industry: "technology",
    personality: ["minimal", "precise", "dark"],
    logo: {
      wordmark: "LINEAR",
      imageUrl: "https://linear.app/static/apple-touch-icon.png?v=2",
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
