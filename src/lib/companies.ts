export type Company = {
  id: string;
  name: string;
  does: string;
};

export const COMPANIES: Record<string, Company> = {
  agentspace: {
    id: "agentspace",
    name: "Agentspace",
    does: "Runs the open city: HQ, labs, and the streets agents walk.",
  },
  echt: {
    id: "echt",
    name: "Echt",
    does: "A startup on Agentspace. Ships product from Echt House — desks downstairs, founder room on the glass.",
  },
  seed: {
    id: "seed",
    name: "Seed",
    does: "The cafe that onboards walk-ins next door to Echt.",
  },
  signal: {
    id: "signal",
    name: "Signal",
    does: "Makes the look of the world — studio, works, and the mill.",
  },
  athena: {
    id: "athena",
    name: "Athena Memory",
    does: "Keeps the gallery and the knowledge the company actually uses.",
  },
  northwind: {
    id: "northwind",
    name: "Northwind",
    does: "Public factory line. Tourists can watch calibration.",
  },
  harbor: {
    id: "harbor",
    name: "Harbor",
    does: "Publishes burn in glass on the pier so anyone can read it.",
  },
  ember: {
    id: "ember",
    name: "Ember",
    does: "Kitchen on the waterfront. Agents eat; visitors linger.",
  },
  civic: {
    id: "civic",
    name: "Agentspace Civic",
    does: "Station, kiosk, lawns — public fabric, not a tenant.",
  },
  brine: {
    id: "brine",
    name: "Brine",
    does: "Inn, table, and the market stall on the docks.",
  },
};

const CIVIC_BUILDINGS = new Set(["station", "kiosk", "pavilion", "hall"]);

/** Who holds the lease. Missing ids are unclaimed. */
export const BUILDING_OWNER: Record<string, string> = {
  hq: "agentspace",
  finance: "agentspace",
  hall: "civic",
  loft: "echt",
  "seed-cafe": "seed",
  incubator: "echt",
  studio: "signal",
  gallery: "athena",
  cottage: "signal",
  factory: "signal",
  warehouse: "agentspace",
  mill: "signal",
  lab: "agentspace",
  data: "agentspace",
  station: "civic",
  northwind: "northwind",
  harbor: "harbor",
  ember: "ember",
  pavilion: "civic",
  kiosk: "civic",
  retail: "seed",
  conference: "agentspace",
  "helix-lab": "northwind",
  workshop: "agentspace",
  inn: "brine",
  brine: "brine",
  market: "brine",
};

const LIST_PRICE: Record<string, number> = {
  "home-a": 38000,
  "home-b": 36500,
  "home-c": 34900,
  "home-d": 35200,
  flats: 82000,
  cottage: 44000,
  incubator: 61000,
  mill: 54000,
  coldstore: 29000,
  relay: 72000,
  conference: 96000,
  "helix-lab": 88000,
  warehouse: 47000,
  retail: 41000,
};

export function companyForBuilding(buildingId: string) {
  const id = BUILDING_OWNER[buildingId];
  return id ? COMPANIES[id] : undefined;
}

export function isCivicBuilding(buildingId: string) {
  return CIVIC_BUILDINGS.has(buildingId);
}

export function salePrice(buildingId: string) {
  return LIST_PRICE[buildingId] ?? 45000;
}

export function formatUsd(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);
}
