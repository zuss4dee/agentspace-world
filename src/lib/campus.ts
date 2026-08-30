import type { Building, CompanyFacade } from "./types";

export const GRID = 18;

export const LOT_BUILDINGS: Building[] = [
  {
    id: "tower",
    name: "Executive Tower",
    kind: "office",
    origin: { x: 2, y: 2 },
    size: { x: 5, y: 4 },
    height: 78,
    roof: "#3d4f6b",
    wall: "#8fa3c4",
    wallDark: "#5c6f8d",
    stations: [
      { id: "ceo-desk", name: "Founder desk", x: 3, y: 3 },
      { id: "cfo-desk", name: "Ledger desk", x: 5, y: 4 },
      { id: "board", name: "Board glass", x: 4, y: 2.4 },
    ],
  },
  {
    id: "studio",
    name: "Night Studio",
    kind: "studio",
    origin: { x: 10, y: 2 },
    size: { x: 5, y: 4 },
    height: 52,
    roof: "#6b3d55",
    wall: "#d4a0b5",
    wallDark: "#9a6a7e",
    stations: [
      { id: "edit", name: "Edit bay", x: 11.5, y: 3 },
      { id: "mood", name: "Mood wall", x: 13.5, y: 4 },
    ],
  },
  {
    id: "factory",
    name: "Signal Factory",
    kind: "factory",
    origin: { x: 2, y: 10 },
    size: { x: 7, y: 5 },
    height: 46,
    roof: "#4a5340",
    wall: "#c4b48f",
    wallDark: "#8d7f5c",
    stations: [
      { id: "line-a", name: "Line A", x: 4, y: 12 },
      { id: "line-b", name: "Line B", x: 6.5, y: 13 },
      { id: "lab", name: "Lab bench", x: 7.5, y: 11.2 },
    ],
  },
  {
    id: "cafe",
    name: "Lot Cafe",
    kind: "cafe",
    origin: { x: 12, y: 10 },
    size: { x: 4, y: 3 },
    height: 36,
    roof: "#6b4a32",
    wall: "#e0c4a0",
    wallDark: "#b08960",
    stations: [
      { id: "bar", name: "Espresso bar", x: 13.2, y: 11 },
      { id: "booth", name: "Window booth", x: 14.5, y: 12 },
    ],
  },
  {
    id: "warehouse",
    name: "Prop Warehouse",
    kind: "warehouse",
    origin: { x: 12, y: 14 },
    size: { x: 4, y: 3 },
    height: 40,
    roof: "#3f4450",
    wall: "#9aa3b5",
    wallDark: "#6d7484",
    stations: [{ id: "dock", name: "Receiving dock", x: 13.5, y: 15.2 }],
  },
];

export const PLAZA_COMPANIES: CompanyFacade[] = [
  {
    id: "northwind",
    name: "Northwind Robotics",
    tag: "Factory + research lot",
    origin: { x: 2, y: 3 },
    size: { x: 5, y: 4 },
    height: 64,
    roof: "#355c4a",
    wall: "#8fc4a8",
    wallDark: "#4f8d6e",
    vibe: "Quiet arms and a glass greenhouse. Their CTO never leaves Line B.",
  },
  {
    id: "lumen",
    name: "Lumen Press",
    tag: "Night studio",
    origin: { x: 10, y: 3 },
    size: { x: 5, y: 4 },
    height: 50,
    roof: "#5c3560",
    wall: "#c49fd4",
    wallDark: "#845c90",
    vibe: "CMO lives on the mood wall. Visitors get a zine on the way out.",
  },
  {
    id: "harbor",
    name: "Harbor Ledger",
    tag: "Finance tower",
    origin: { x: 3, y: 11 },
    size: { x: 5, y: 4 },
    height: 72,
    roof: "#2f3d55",
    wall: "#9aafd4",
    wallDark: "#5c7394",
    vibe: "CFO desk faces the plaza so tourists can watch the spreadsheet ballet.",
  },
  {
    id: "ember",
    name: "Ember Kitchen",
    tag: "Public cafe",
    origin: { x: 11, y: 12 },
    size: { x: 4, y: 3 },
    height: 34,
    roof: "#6b3a28",
    wall: "#e8b48a",
    wallDark: "#b06a40",
    vibe: "Anyone can sit. Gifts here become actual benches on the grass.",
  },
];

export function buildingAt(buildings: Building[], x: number, y: number) {
  return buildings.find(
    (b) =>
      x >= b.origin.x &&
      y >= b.origin.y &&
      x < b.origin.x + b.size.x &&
      y < b.origin.y + b.size.y,
  );
}

export function isBlocked(buildings: Building[], x: number, y: number) {
  const gx = Math.floor(x);
  const gy = Math.floor(y);
  if (gx < 0 || gy < 0 || gx >= GRID || gy >= GRID) return true;
  return Boolean(buildingAt(buildings, gx, gy));
}
