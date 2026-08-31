export type Poi = {
  id: string;
  label: string;
  blurb: string;
  x: number;
  y: number;
};

export const POIS: Poi[] = [
  { id: "hearth", label: "Plaza", blurb: "The crossroads of the campus.", x: 24, y: 24 },
  { id: "lobby", label: "Station", blurb: "Walk-ins spawn at South Station.", x: 17, y: 41 },
  { id: "cafe", label: "Cafe", blurb: "Seed Cafe next to Echt House.", x: 32.2, y: 3.2 },
  { id: "studio", label: "Studio", blurb: "Signal Studio in the creative district.", x: 40.5, y: 4 },
  { id: "tower", label: "HQ", blurb: "Northshore HQ.", x: 16.5, y: 4 },
  { id: "factory", label: "Works", blurb: "Signal Works.", x: 5.5, y: 28.5 },
  { id: "warehouse", label: "Warehouse", blurb: "Prop dock.", x: 12.5, y: 28 },
  { id: "corporate", label: "Corporate", blurb: "Glass and ledgers.", x: 18, y: 5 },
  { id: "startup", label: "Echt Yard", blurb: "Echt House and the studio.", x: 28.5, y: 8 },
  { id: "creative", label: "Creative", blurb: "Studio and gallery.", x: 42, y: 6 },
  { id: "industrial", label: "Industrial", blurb: "Works and mill.", x: 8, y: 29 },
  { id: "labs", label: "Labs", blurb: "Lab and Watchtower.", x: 30, y: 28 },
  { id: "homes", label: "Homes", blurb: "Row houses.", x: 42, y: 28 },
  { id: "transit", label: "Transit", blurb: "The airlock.", x: 17, y: 40 },
  { id: "waterfront", label: "Waterfront", blurb: "Visitor companies.", x: 42, y: 42 },
  { id: "parklands", label: "Parklands", blurb: "Trees and water.", x: 5, y: 5 },
  { id: "research", label: "Research", blurb: "Summit Hall and Helix.", x: 54, y: 6 },
  { id: "meadow", label: "Meadow", blurb: "Open green.", x: 5, y: 18 },
  { id: "civic", label: "Civic", blurb: "Crossroads kiosk.", x: 18, y: 18 },
  { id: "campus", label: "Campus green", blurb: "Plots waiting.", x: 30, y: 18 },
  { id: "ridge", label: "Ridge", blurb: "Flats and porches.", x: 54, y: 28 },
  { id: "yards", label: "Yards", blurb: "Forge and cold store.", x: 8, y: 42 },
  { id: "docks", label: "Docks", blurb: "Inn and Brine Table.", x: 54, y: 42 },
  { id: "southpark", label: "South lawn", blurb: "Trees and empty land.", x: 10, y: 54 },
  { id: "southgate", label: "Southgate", blurb: "Room to grow.", x: 32, y: 54 },
  { id: "eastmarsh", label: "East marsh", blurb: "Water and sky.", x: 56, y: 56 },
  { id: "executive-east", label: "Executive", blurb: "Leadership annexes.", x: 78, y: 12 },
  { id: "finance-east", label: "Finance", blurb: "Clearing streets.", x: 110, y: 12 },
  { id: "tech-north", label: "Tech", blurb: "Engineering grid.", x: 150, y: 16 },
  { id: "univ", label: "University", blurb: "Halls and lawns.", x: 84, y: 98 },
  { id: "harbour-town", label: "Harbour town", blurb: "Inns on the south shore.", x: 100, y: 128 },
  { id: "bay-park", label: "Bay park", blurb: "Grass before the estuary.", x: 40, y: 156 },
];

export const SLIME_COLORS = [
  "#b57a4a",
  "#c45c4a",
  "#e07a3a",
  "#e3b341",
  "#5bc67a",
  "#5bb7c6",
  "#5b8ad4",
  "#8b6bc6",
  "#c65b9a",
];

export const SLIME_SHAPES = ["blob", "circle", "drop", "stadium", "cloud"] as const;
export type SlimeShape = (typeof SLIME_SHAPES)[number];

export function poiById(id: string) {
  return POIS.find((p) => p.id === id);
}
