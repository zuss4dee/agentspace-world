import type { RoleId } from "./types";

export const BUILDING_CREW_STORAGE_KEY = "agentspace.building-crew.v1";

export type BuildingCrewMember = {
  id: string;
  name: string;
  role: RoleId;
  color: string;
  liveAgentId?: string;
  endpoint?: string;
  addedAt: number;
};

export type BuildingCrewMap = Record<string, BuildingCrewMember[]>;

const EMPTY: BuildingCrewMap = {};

function hashSeed(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const CREW_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
];

export function crewColorFor(name: string, seed = 0) {
  return CREW_COLORS[(hashSeed(name) + seed) % CREW_COLORS.length]!;
}

export function loadBuildingCrew(): BuildingCrewMap {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(BUILDING_CREW_STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as BuildingCrewMap;
    if (!parsed || typeof parsed !== "object") return EMPTY;
    const out: BuildingCrewMap = {};
    for (const [plotId, rows] of Object.entries(parsed)) {
      if (!Array.isArray(rows)) continue;
      out[plotId] = rows.filter(
        (row): row is BuildingCrewMember =>
          Boolean(row && typeof row === "object" && typeof row.id === "string" && typeof row.name === "string"),
      );
    }
    return out;
  } catch {
    return EMPTY;
  }
}

export function saveBuildingCrew(map: BuildingCrewMap) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(BUILDING_CREW_STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* quota */
  }
}

export function crewForPlot(map: BuildingCrewMap, plotId: string) {
  return map[plotId] ?? [];
}

export function addCrewMember(
  map: BuildingCrewMap,
  plotId: string,
  input: { name: string; role: RoleId; liveAgentId?: string; endpoint?: string; color?: string },
): BuildingCrewMap {
  const list = [...(map[plotId] ?? [])];
  const member: BuildingCrewMember = {
    id: `crew-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    name: input.name.trim(),
    role: input.role,
    color: input.color ?? crewColorFor(input.name, list.length),
    liveAgentId: input.liveAgentId,
    endpoint: input.endpoint,
    addedAt: Date.now(),
  };
  return { ...map, [plotId]: [...list, member] };
}

/** Tile coords for crew standing inside a building footprint. */
export function crewTilePosition(
  fp: { x: number; y: number; w: number; h: number },
  index: number,
  total: number,
) {
  const cols = Math.max(1, Math.ceil(Math.sqrt(Math.max(total, 1))));
  const rows = Math.ceil(total / cols);
  const col = index % cols;
  const row = Math.floor(index / cols);
  const padX = fp.w * 0.18;
  const padY = fp.h * 0.18;
  const innerW = Math.max(0.4, fp.w - padX * 2);
  const innerH = Math.max(0.4, fp.h - padY * 2);
  const stepX = cols > 1 ? innerW / (cols - 1) : 0;
  const stepY = rows > 1 ? innerH / (rows - 1) : 0;
  return {
    x: fp.x + padX + col * stepX,
    y: fp.y + padY + row * stepY,
  };
}

export const PLOT_POI_PREFIX = "plot:";

export function plotPoiId(plotId: string) {
  return `${PLOT_POI_PREFIX}${plotId}`;
}

export function parsePlotPoiId(poi: string | undefined) {
  if (!poi?.startsWith(PLOT_POI_PREFIX)) return null;
  return poi.slice(PLOT_POI_PREFIX.length);
}
