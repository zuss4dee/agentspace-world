import type { LotPlace } from "./plots";

export const CLAIMS_STORAGE_KEY = "agentspace.claimed-lots.v1";
/** Bump to force every browser to wipe claims/profiles once (clean sale city). */
export const CLAIM_SESSION_EPOCH_KEY = "agentspace.claim-session.epoch";
export const CLAIM_SESSION_EPOCH = "3-clean-sale";

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

/**
 * One-shot migration: wipe stale claims/profiles when the epoch changes.
 * Returns true if storage was cleared.
 */
export function migrateClaimSessionIfNeeded(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.localStorage.getItem(CLAIM_SESSION_EPOCH_KEY) === CLAIM_SESSION_EPOCH) return false;
    clearClaimSessionStorage();
    window.localStorage.setItem(CLAIM_SESSION_EPOCH_KEY, CLAIM_SESSION_EPOCH);
    return true;
  } catch {
    return false;
  }
}

export function loadStoredClaims(): StoredClaims {
  if (typeof window === "undefined") return EMPTY;
  try {
    migrateClaimSessionIfNeeded();
    const raw = window.localStorage.getItem(CLAIMS_STORAGE_KEY);
    // Missing key → empty city (do not resurrect claims from old profiles).
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<StoredClaims>;
    return {
      claimedPlotIds: Array.isArray(parsed.claimedPlotIds)
        ? parsed.claimedPlotIds.filter((id) => typeof id === "string")
        : [],
      claimedExtras: parsed.claimedExtras && typeof parsed.claimedExtras === "object" ? parsed.claimedExtras : {},
      claimedPlaces: parsed.claimedPlaces && typeof parsed.claimedPlaces === "object" ? parsed.claimedPlaces : {},
      claimedUses: parsed.claimedUses && typeof parsed.claimedUses === "object" ? parsed.claimedUses : {},
    };
  } catch {
    return EMPTY;
  }
}

/** Wipe claim / profile / crew session data so the city is all for sale. */
export function clearClaimSessionStorage() {
  if (typeof window === "undefined") return;
  try {
    const doomed: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (!k?.startsWith("agentspace.")) continue;
      // Keep the epoch key so we do not wipe in a loop within the same page load.
      if (k === CLAIM_SESSION_EPOCH_KEY) continue;
      doomed.push(k);
    }
    for (const k of doomed) window.localStorage.removeItem(k);
    window.localStorage.setItem(CLAIMS_STORAGE_KEY, JSON.stringify(EMPTY));
    window.localStorage.setItem("agentspace.building-profiles.v1", "{}");
    window.localStorage.setItem("agentspace.building-crew.v1", "{}");
  } catch {
    /* private mode */
  }
}

export function saveStoredClaims(data: StoredClaims) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CLAIMS_STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* quota / private mode */
  }
}
