export type RoleId =
  | "ceo"
  | "cfo"
  | "cmo"
  | "cto"
  | "researcher"
  | "designer"
  | "support"
  | "ops"
  | "visitor"
  | "security"
  | "knowledge"
  | "coo"
  | "creative";

export type AgentStatus = "idle" | "walking" | "working" | "meeting";

export type BuildingKind =
  | "office"
  | "factory"
  | "studio"
  | "cafe"
  | "warehouse"
  | "lab"
  | "home"
  | "shop"
  | "park"
  | "station"
  | "data"
  | "hall"
  | "hotel"
  | "workshop"
  | "restaurant"
  | "retail"
  | "apartment"
  | "pavilion"
  | "conference";

export type BuildingStyle =
  | "hq"
  | "office"
  | "factory"
  | "warehouse"
  | "cafe"
  | "studio"
  | "lab"
  | "house"
  | "shop"
  | "data"
  | "station"
  | "hall"
  | "gallery"
  | "hotel"
  | "restaurant"
  | "workshop"
  | "retail"
  | "apartment"
  | "pavilion"
  | "conference";

export type TileKind = "grass" | "dirt" | "road" | "water" | "sand" | "plaza" | "park" | "sidewalk" | "lot";

export type SceneryKind = "tree" | "lamp" | "bench" | "car" | "planter" | "fence" | "plot" | "sign";

export type Scenery = {
  id: string;
  assetId: string;
  kind: SceneryKind;
  x: number;
  y: number;
  color?: string;
  w?: number;
  h?: number;
};

export type CatalogKind =
  | "building"
  | "furniture"
  | "environment"
  | "outfit"
  | "decoration"
  | "character"
  | "vehicle";

export type MapId = "lot" | "plaza";

export type Vec2 = { x: number; y: number };

export type District = {
  id: string;
  label: string;
  blurb: string;
  origin: Vec2;
  size: Vec2;
};

export type Building = {
  id: string;
  name: string;
  kind: BuildingKind;
  style: BuildingStyle;
  districtId: string;
  origin: Vec2;
  size: Vec2;
  height: number;
  roof: string;
  wall: string;
  wallDark: string;
  accent: string;
  sign?: string;
  assetId: string;
  stations: { id: string; name: string; x: number; y: number }[];
};

export type Agent = {
  id: string;
  name: string;
  role: RoleId;
  organization: string;
  color: string;
  shape?: "blob" | "circle" | "drop" | "stadium" | "cloud";
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  waypoints: Vec2[];
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
  assetKey?: string;
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
  style?: BuildingStyle;
};

export type WorldSnapshot = {
  agents: Agent[];
  props: PlacedProp[];
  events: DirectorEvent[];
  ownedCatalogIds: string[];
  environmentId: string;
  giftedCents: number;
};
