export type Poi = {
  id: string;
  label: string;
  blurb: string;
  x: number;
  y: number;
};

export const POIS: Poi[] = [
  { id: "hearth", label: "Hearth", blurb: "Clay slimes gather here first.", x: 9, y: 9 },
  { id: "lobby", label: "Lobby", blurb: "South airlock. Walk-ins spawn here.", x: 9, y: 16 },
  { id: "cafe", label: "Cafe", blurb: "Tea seats. Support lives on espresso.", x: 13.4, y: 11.2 },
  { id: "studio", label: "Studio", blurb: "Mood wall and edit bay.", x: 12.2, y: 3.4 },
  { id: "tower", label: "Tower", blurb: "CEO and CFO desks in the north wing.", x: 4, y: 3.2 },
  { id: "factory", label: "Factory", blurb: "Signal line. Coveralls optional.", x: 5.2, y: 12.4 },
  { id: "warehouse", label: "Warehouse", blurb: "Prop crates land here.", x: 13.5, y: 15.2 },
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
