import type { Agent, DirectorEvent, MapId, PlacedProp, WorldSnapshot } from "./types";
import { LOT_BUILDINGS } from "./campus";
import { TASKS } from "./playbooks";

function pick<T>(list: T[]) {
  return list[Math.floor(Math.random() * list.length)]!;
}

export const DEMO_AGENTS: Agent[] = [
  {
    id: "nova",
    name: "Nova",
    role: "ceo",
    color: "#f59e0b",
    x: 3.2,
    y: 3.1,
    targetX: 3.2,
    targetY: 3.1,
    buildingId: "tower",
    stationId: "ceo-desk",
    outfitId: "founder-hoodie",
    status: "working",
    task: TASKS.ceo[0]!.task,
    thought: TASKS.ceo[0]!.thought,
    connected: true,
    mapId: "lot",
  },
  {
    id: "jules",
    name: "Jules",
    role: "cfo",
    color: "#60a5fa",
    x: 5.1,
    y: 4.1,
    targetX: 5.1,
    targetY: 4.1,
    buildingId: "tower",
    stationId: "cfo-desk",
    outfitId: "chalk-stripe",
    status: "working",
    task: TASKS.cfo[0]!.task,
    thought: TASKS.cfo[0]!.thought,
    connected: true,
    mapId: "lot",
  },
  {
    id: "mira",
    name: "Mira",
    role: "cmo",
    color: "#f472b6",
    x: 11.6,
    y: 3.2,
    targetX: 11.6,
    targetY: 3.2,
    buildingId: "studio",
    stationId: "edit",
    outfitId: "founder-hoodie",
    status: "working",
    task: TASKS.cmo[0]!.task,
    thought: TASKS.cmo[0]!.thought,
    connected: true,
    mapId: "lot",
  },
  {
    id: "rex",
    name: "Rex",
    role: "cto",
    color: "#34d399",
    x: 4.1,
    y: 12.1,
    targetX: 4.1,
    targetY: 12.1,
    buildingId: "factory",
    stationId: "line-a",
    outfitId: "coveralls",
    status: "working",
    task: TASKS.cto[0]!.task,
    thought: TASKS.cto[0]!.thought,
    connected: true,
    mapId: "lot",
  },
  {
    id: "pip",
    name: "Pip",
    role: "researcher",
    color: "#a78bfa",
    x: 7.4,
    y: 11.3,
    targetX: 7.4,
    targetY: 11.3,
    buildingId: "factory",
    stationId: "lab",
    outfitId: "coveralls",
    status: "working",
    task: TASKS.researcher[0]!.task,
    thought: TASKS.researcher[0]!.thought,
    connected: true,
    mapId: "lot",
  },
  {
    id: "kit",
    name: "Kit",
    role: "designer",
    color: "#fb7185",
    x: 13.4,
    y: 4.1,
    targetX: 13.4,
    targetY: 4.1,
    buildingId: "studio",
    stationId: "mood",
    outfitId: "visitor-lanyard",
    status: "working",
    task: TASKS.designer[0]!.task,
    thought: TASKS.designer[0]!.thought,
    connected: true,
    mapId: "lot",
  },
  {
    id: "sage",
    name: "Sage",
    role: "support",
    color: "#fbbf24",
    x: 13.3,
    y: 11.1,
    targetX: 13.3,
    targetY: 11.1,
    buildingId: "cafe",
    stationId: "bar",
    outfitId: "visitor-lanyard",
    status: "working",
    task: TASKS.support[0]!.task,
    thought: TASKS.support[0]!.thought,
    connected: true,
    mapId: "lot",
  },
  {
    id: "orbit",
    name: "Orbit",
    role: "ops",
    color: "#94a3b8",
    x: 13.6,
    y: 15.1,
    targetX: 13.6,
    targetY: 15.1,
    buildingId: "warehouse",
    stationId: "dock",
    outfitId: "coveralls",
    status: "working",
    task: TASKS.ops[0]!.task,
    thought: TASKS.ops[0]!.thought,
    connected: true,
    mapId: "lot",
  },
];

export const PLAZA_AGENTS: Agent[] = [
  {
    id: "visit-1",
    name: "Ada",
    role: "visitor",
    color: "#fda4af",
    x: 8,
    y: 8,
    targetX: 12,
    targetY: 13,
    buildingId: "ember",
    stationId: "door",
    outfitId: "visitor-lanyard",
    status: "walking",
    task: TASKS.visitor[2]!.task,
    thought: TASKS.visitor[2]!.thought,
    connected: false,
    mapId: "plaza",
  },
  {
    id: "nw-cto",
    name: "Helix",
    role: "cto",
    color: "#34d399",
    x: 4,
    y: 5,
    targetX: 4,
    targetY: 5,
    buildingId: "northwind",
    stationId: "lab",
    outfitId: "coveralls",
    status: "working",
    task: "Calibrate Line B",
    thought: "Tourists can watch. They cannot copy the firmware.",
    connected: true,
    mapId: "plaza",
  },
  {
    id: "harbor-cfo",
    name: "Quill",
    role: "cfo",
    color: "#60a5fa",
    x: 5,
    y: 12.5,
    targetX: 5,
    targetY: 12.5,
    buildingId: "harbor",
    stationId: "desk",
    outfitId: "chalk-stripe",
    status: "working",
    task: "Publish a public burn chart",
    thought: "If the Plaza can see it, it is already a story.",
    connected: true,
    mapId: "plaza",
  },
  {
    id: "lumen-cmo",
    name: "Vesper",
    role: "cmo",
    color: "#f472b6",
    x: 12,
    y: 4.5,
    targetX: 12,
    targetY: 4.5,
    buildingId: "lumen",
    stationId: "wall",
    outfitId: "founder-hoodie",
    status: "working",
    task: "Hang tonight's zine",
    thought: "Leave one on the cafe counter.",
    connected: true,
    mapId: "plaza",
  },
];

function nid() {
  return Math.random().toString(36).slice(2, 9);
}

export function seedEvents(): DirectorEvent[] {
  const now = Date.now();
  return [
    {
      id: nid(),
      t: now - 4000,
      kind: "work",
      agentId: "nova",
      mapId: "lot",
      text: "Nova opened the Lot. The crew is already on stations.",
    },
    {
      id: nid(),
      t: now - 2000,
      kind: "work",
      agentId: "jules",
      mapId: "lot",
      text: "Jules is reconciling August burn at the ledger desk.",
    },
    {
      id: nid(),
      t: now - 3000,
      kind: "plaza",
      agentId: "visit-1",
      mapId: "plaza",
      text: "Ada sat at Ember Kitchen. The zine rack is full.",
    },
    {
      id: nid(),
      t: now - 1000,
      kind: "plaza",
      agentId: "harbor-cfo",
      mapId: "plaza",
      text: "Quill posted Harbor Ledger’s public burn chart on the glass.",
    },
  ];
}

export function createSnapshot(): WorldSnapshot {
  return {
    agents: [...DEMO_AGENTS, ...PLAZA_AGENTS],
    props: [
      { id: nid(), catalogId: "planter", x: 8.5, y: 8.2, mapId: "lot" },
      { id: nid(), catalogId: "bench-gift", x: 9.2, y: 9.4, mapId: "lot" },
    ],
    events: seedEvents(),
    ownedCatalogIds: ["planter", "bench-gift", "founder-hoodie"],
    environmentId: "last-light",
    giftedCents: 0,
  };
}

export function pushEvent(
  events: DirectorEvent[],
  partial: Omit<DirectorEvent, "id" | "t"> & { t?: number },
): DirectorEvent[] {
  const next: DirectorEvent = {
    id: nid(),
    t: partial.t ?? Date.now(),
    ...partial,
  };
  return [next, ...events].slice(0, 80);
}

function pathAround(agent: Agent, tx: number, ty: number) {
  // Simple steer: if a building blocks the straight line, detour via a path tile (row 8 / col 8)
  const midX = 8.5;
  const midY = 8.5;
  const crossingBuilding = LOT_BUILDINGS.some((b) => {
    const minx = Math.min(agent.x, tx);
    const maxx = Math.max(agent.x, tx);
    const miny = Math.min(agent.y, ty);
    const maxy = Math.max(agent.y, ty);
    const bx = b.origin.x + b.size.x / 2;
    const by = b.origin.y + b.size.y / 2;
    return bx >= minx && bx <= maxx && by >= miny && by <= maxy;
  });
  if (crossingBuilding) {
    return { x: midX, y: midY };
  }
  return { x: tx, y: ty };
}

export function assignNewTask(agent: Agent): Agent {
  const play = pick(TASKS[agent.role]);
  const building = LOT_BUILDINGS.find((b) => b.id === agent.buildingId);
  const others = LOT_BUILDINGS.filter((b) => b.stations.length);
  const goOut = Math.random() < 0.35 && agent.mapId === "lot";
  const destBuilding = goOut ? pick(others) : building;
  const station = destBuilding ? pick(destBuilding.stations) : undefined;
  const tx = station?.x ?? agent.x;
  const ty = station?.y ?? agent.y;
  const via = pathAround(agent, tx, ty);
  return {
    ...agent,
    task: play.task,
    thought: play.thought,
    buildingId: destBuilding?.id ?? agent.buildingId,
    stationId: station?.id ?? agent.stationId,
    targetX: via.x,
    targetY: via.y,
    status: "walking",
  };
}

export function stepAgents(agents: Agent[], dt: number, paused: boolean): Agent[] {
  if (paused) return agents;
  return agents.map((agent) => {
    const dx = agent.targetX - agent.x;
    const dy = agent.targetY - agent.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.08) {
      if (agent.status === "walking") {
        // Arrive at waypoint — if not at station, continue
        const building = LOT_BUILDINGS.find((b) => b.id === agent.buildingId);
        const station = building?.stations.find((s) => s.id === agent.stationId);
        if (station && (Math.hypot(station.x - agent.x, station.y - agent.y) > 0.2)) {
          return { ...agent, targetX: station.x, targetY: station.y, status: "walking" };
        }
        return { ...agent, x: agent.targetX, y: agent.targetY, status: Math.random() < 0.2 ? "meeting" : "working" };
      }
      if (Math.random() < dt * 0.12) {
        return assignNewTask(agent);
      }
      return agent;
    }
    const speed = agent.status === "walking" ? 1.35 : 0.9;
    const step = Math.min(dist, speed * dt);
    return {
      ...agent,
      x: agent.x + (dx / dist) * step,
      y: agent.y + (dy / dist) * step,
      status: "walking",
    };
  });
}

export function placeProp(props: PlacedProp[], catalogId: string, mapId: MapId): PlacedProp[] {
  const x = 7 + Math.random() * 4;
  const y = 7 + Math.random() * 3;
  return [...props, { id: nid(), catalogId, x, y, mapId }];
}

export { nid };
