export type RoleId =
  | "ceo"
  | "cfo"
  | "cmo"
  | "cto"
  | "researcher"
  | "designer"
  | "support"
  | "ops"
  | "visitor";

export type AgentStatus = "idle" | "walking" | "working" | "meeting";

export type BuildingKind = "office" | "factory" | "studio" | "cafe" | "warehouse";

export type CatalogKind = "building" | "furniture" | "environment" | "outfit";

export type MapId = "lot" | "plaza";

export type Vec2 = { x: number; y: number };

export type Building = {
  id: string;
  name: string;
  kind: BuildingKind;
  origin: Vec2;
  size: Vec2;
  height: number;
  roof: string;
  wall: string;
  wallDark: string;
  stations: { id: string; name: string; x: number; y: number }[];
};

export type Agent = {
  id: string;
  name: string;
  role: RoleId;
  color: string;
  shape?: "blob" | "circle" | "drop" | "stadium" | "cloud";
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  buildingId: string;
  stationId: string;
  outfitId: string;
  status: AgentStatus;
  task: string;
  thought: string;
  speech?: string;
  live?: boolean;
  poi?: string;
  connected: boolean;
  mapId: MapId;
};

export type PlacedProp = {
  id: string;
  catalogId: string;
  x: number;
  y: number;
  mapId: MapId;
};

export type CatalogItem = {
  id: string;
  name: string;
  kind: CatalogKind;
  price: number;
  creator: string;
  creatorShare: number;
  blurb: string;
  glyph: string;
  color: string;
};

export type DirectorEvent = {
  id: string;
  t: number;
  agentId?: string;
  kind: "work" | "move" | "buy" | "gift" | "connect" | "plaza" | "studio";
  text: string;
  mapId: MapId;
};

export type CompanyFacade = {
  id: string;
  name: string;
  tag: string;
  origin: Vec2;
  size: Vec2;
  roof: string;
  wall: string;
  wallDark: string;
  height: number;
  vibe: string;
};

export type WorldSnapshot = {
  agents: Agent[];
  props: PlacedProp[];
  events: DirectorEvent[];
  ownedCatalogIds: string[];
  environmentId: string;
  giftedCents: number;
};
