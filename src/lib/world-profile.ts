/** Geographic identity. Future worlds pick a real city; this one is a stylised estuary city. */

export type WorldProfile = {
  id: string;
  name: string;
  inspiredBy: string;
  region: "Earth";
  lat: number;
  lng: number;
  water: "estuary" | "river" | "harbour" | "inland";
  blurb: string;
};

export const ACTIVE_WORLD: WorldProfile = {
  id: "northshore",
  name: "Northshore",
  inspiredBy: "a northern English estuary city — canal, mill, and shore",
  region: "Earth",
  lat: 53.4808,
  lng: -2.2426,
  water: "estuary",
  blurb: "Stylised, not a map. Geography is a seed, not a satellite.",
};

export const LOCATION_PRESETS: WorldProfile[] = [
  ACTIVE_WORLD,
  {
    id: "london",
    name: "Thames Reach",
    inspiredBy: "London",
    region: "Earth",
    lat: 51.5074,
    lng: -0.1278,
    water: "river",
    blurb: "Future pack: a river city with a dense core.",
  },
  {
    id: "newyork",
    name: "Hudson Lot",
    inspiredBy: "New York",
    region: "Earth",
    lat: 40.7128,
    lng: -74.006,
    water: "harbour",
    blurb: "Future pack: harbour grid and towers.",
  },
  {
    id: "lagos",
    name: "Lagoon Edge",
    inspiredBy: "Lagos",
    region: "Earth",
    lat: 6.5244,
    lng: 3.3792,
    water: "harbour",
    blurb: "Future pack: lagoon, denser streets.",
  },
  {
    id: "sanfrancisco",
    name: "Bay Fold",
    inspiredBy: "San Francisco",
    region: "Earth",
    lat: 37.7749,
    lng: -122.4194,
    water: "harbour",
    blurb: "Future pack: hills and a bay.",
  },
];
