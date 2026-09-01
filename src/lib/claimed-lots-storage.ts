import type { LotPlace } from "./plots";
import { getPlot } from "./plots";
import { DISTRICT_SPECS } from "./district-specs";
import { WORLD_BUILDINGS } from "./campus";
import { loadStoredProfiles } from "./company-profile";

export const CLAIMS_STORAGE_KEY = "agentspace.claimed-lots.v1";

export type StoredClaims = {
  claimedPlotIds: string[];
  claimedExtras: Record<string, number>;
  claimedPlaces: Record<string, LotPlace>;
  claimedUses: Record<string, string>;
};

const EMPTY: StoredClaims = {
  claimedPlotIds: [],
  claimedExtras: {},
  claimedPlaces: {},
  claimedUses: {},
};

const RESERVED_PLOT_IDS = new Set([
  ...WORLD_BUILDINGS.map((b) => b.id),
  ...Object.keys(DISTRICT_SPECS),
]);

export function loadStoredClaims(): StoredClaims {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(CLAIMS_STORAGE_KEY);
    if (!raw) return inferClaimsFromProfiles();
    const parsed = JSON.parse(raw) as Partial<StoredClaims>;
    const stored: StoredClaims = {
      claimedPlotIds: Array.isArray(parsed.claimedPlotIds) ? parsed.claimedPlotIds.filter((id) => typeof id === "string") : [],
      claimedExtras: parsed.claimedExtras && typeof parsed.claimedExtras === "object" ? parsed.claimedExtras : {},
      claimedPlaces: parsed.claimedPlaces && typeof parsed.claimedPlaces === "object" ? parsed.claimedPlaces : {},
      claimedUses: parsed.claimedUses && typeof parsed.claimedUses === "object" ? parsed.claimedUses : {},
    };
    if (stored.claimedPlotIds.length > 0) return stored;
    return inferClaimsFromProfiles(stored);
  } catch {
    return inferClaimsFromProfiles();
  }
}

/** Recover claims from saved company profiles (pre-persistence wizard sessions). */
function inferClaimsFromProfiles(base: StoredClaims = EMPTY): StoredClaims {
  const profiles = loadStoredProfiles();
  const inferred = Object.keys(profiles).filter(
    (id) => !RESERVED_PLOT_IDS.has(id) && Boolean(getPlot(id)),
  );
  if (inferred.length === 0) return base;
  return {
    ...base,
    claimedPlotIds: inferred,
    claimedUses: {
      ...base.claimedUses,
      ...Object.fromEntries(inferred.map((id) => [id, base.claimedUses[id] ?? "office"])),
    },
  };
}

export function saveStoredClaims(data: StoredClaims) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CLAIMS_STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* quota / private mode */
  }
}
