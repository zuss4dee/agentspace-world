import type { Agent, DirectorEvent, MapId, PlacedProp, WorldSnapshot } from "./types";
import { LOT_BUILDINGS } from "./campus";
import { roadCorners } from "./traffic";
import { tasksFor } from "./playbooks";

function pick<T>(list: T[]) {
  return list[Math.floor(Math.random() * list.length)]!;
}

function agent(partial: Omit<Agent, "waypoints" | "organization" | "mapId" | "connected" | "outfitId"> & Partial<Agent>): Agent {
  return {
    waypoints: [],
    organization: "Agentspace",
    mapId: "lot",
    connected: true,
    outfitId: "founder-hoodie",
    ...partial,
  };
}

export const DEMO_AGENTS: Agent[] = [
  agent({
    id: "jarvis",
    name: "Jarvis",
    role: "ceo",
    color: "#f59e0b",
    x: 15.2,
    y: 3.2,
    targetX: 15.2,
    targetY: 3.2,
    buildingId: "hq",
    stationId: "jarvis-desk",
    status: "working",
    task: "Assign the week from HQ glass",
    thought: "If I cannot see the campus, we are a spreadsheet.",
  }),
  agent({
    id: "midas",
    name: "Midas",
    role: "cfo",
    color: "#60a5fa",
    x: 21.4,
    y: 3.4,
    targetX: 21.4,
    targetY: 3.4,
    buildingId: "finance",
    stationId: "midas-desk",
    status: "working",
    task: "Reconcile burn in Ledger House",
    thought: "Marketplace at 70/30 still holds.",
    outfitId: "chalk-stripe",
  }),
  agent({
    id: "merlin",
    name: "Merlin",
    role: "cto",
    color: "#34d399",
    x: 27.6,
    y: 3.6,
    targetX: 27.6,
    targetY: 3.6,
    buildingId: "loft",
    stationId: "vega-desk",
    status: "working",
    task: "Ship the heartbeat adapter",
    thought: "Bots post status. We pathfind.",
    outfitId: "coveralls",
  }),
  agent({
    id: "vega",
    name: "Vega",
    role: "cmo",
    color: "#84cc16",
    x: 28.4,
    y: 7.6,
    targetX: 28.4,
    targetY: 7.6,
    buildingId: "incubator",
    stationId: "echt-founder",
    status: "working",
    task: "Ship the week from Echt House",
    thought: "If it is not on the map, it is not a company.",
    organization: "Echt",
  }),
  agent({
    id: "vanta",
    name: "Vanta",
    role: "creative",
    color: "#fb7185",
    x: 39.5,
    y: 3.2,
    targetX: 39.5,
    targetY: 3.2,
    buildingId: "studio",
    stationId: "edit",
    status: "working",
    task: "Block a shot in the studio",
    thought: "The campus has to look designed.",
  }),
  agent({
    id: "athena",
    name: "Athena",
    role: "knowledge",
    color: "#a78bfa",
    x: 15.8,
    y: 8.2,
    targetX: 15.8,
    targetY: 8.2,
    buildingId: "hall",
    stationId: "circle",
    status: "working",
    task: "Keep the board minutes",
    thought: "Memory is a building, not a prompt.",
  }),
  agent({
    id: "watchtower",
    name: "Watchtower",
    role: "security",
    color: "#22c55e",
    x: 21.2,
    y: 3.8,
    targetX: 21.2,
    targetY: 3.8,
    buildingId: "finance",
    stationId: "midas-desk",
    status: "working",
    task: "Sweep the ledger floor",
    thought: "Assume the interesting bug is already inside.",
    outfitId: "coveralls",
  }),
  agent({
    id: "friday",
    name: "Friday",
    role: "coo",
    color: "#94a3b8",
    x: 17.2,
    y: 4.2,
    targetX: 17.2,
    targetY: 4.2,
    buildingId: "hq",
    stationId: "friday-desk",
    status: "working",
    task: "Route the morning",
    thought: "Everyone should already be walking.",
  }),
];

export const PLAZA_AGENTS: Agent[] = [
  agent({
    id: "helix",
    name: "Helix",
    role: "cto",
    organization: "Northwind",
    color: "#34d399",
    x: 40,
    y: 39.5,
    targetX: 40,
    targetY: 39.5,
    buildingId: "northwind",
    stationId: "line",
    status: "working",
    mapId: "lot",
    task: "Calibrate Line B",
    thought: "Tourists can watch.",
  }),
  agent({
    id: "quill",
    name: "Quill",
    role: "cfo",
    organization: "Harbor",
    color: "#60a5fa",
    x: 45,
    y: 39.4,
    targetX: 45,
    targetY: 39.4,
    buildingId: "harbor",
    stationId: "glass",
    status: "working",
    mapId: "lot",
    task: "Publish a public burn chart",
    thought: "If the pier can see it, it is already a story.",
  }),
  agent({
    id: "ada",
    name: "Ada",
    role: "visitor",
    organization: "Visitor",
    color: "#fda4af",
    x: 40,
    y: 44.6,
    targetX: 40,
    targetY: 44.6,
    buildingId: "ember",
    stationId: "pier",
    status: "working",
    mapId: "lot",
    connected: false,
    task: "Walk the waterfront",
    thought: "I would buy that neon.",
  }),
  agent({
    id: "pico",
    name: "Pico",
    role: "visitor",
    organization: "Visitor",
    color: "#e3b341",
    x: 24.4,
    y: 24.2,
    targetX: 24.4,
    targetY: 24.2,
    buildingId: "kiosk",
    stationId: "board",
    status: "idle",
    mapId: "lot",
    connected: false,
    task: "Walk the waterfront",
    thought: "I want that factory.",
  }),
  agent({
    id: "nori",
    name: "Nori",
    role: "support",
    organization: "Agentspace",
    color: "#5bb7c6",
    x: 33.4,
    y: 8.4,
    targetX: 33.4,
    targetY: 8.4,
    buildingId: "retail",
    stationId: "till",
    status: "working",
    mapId: "lot",
    task: "Catch a lost walk-in",
    thought: "Ribbon Shop is the postcard.",
  }),
  agent({
    id: "jun",
    name: "Jun",
    role: "ops",
    organization: "Agentspace",
    color: "#b45309",
    x: 9.2,
    y: 44.2,
    targetX: 9.2,
    targetY: 44.2,
    buildingId: "workshop",
    stationId: "anvil",
    status: "working",
    mapId: "lot",
    outfitId: "coveralls",
    task: "Unload a crate at the dock",
    thought: "The shed should look used.",
  }),
];

function nid() {
  return Math.random().toString(36).slice(2, 9);
}

export function seedEvents(): DirectorEvent[] {
  const now = Date.now();
  return [
    { id: nid(), t: now - 5000, kind: "work", agentId: "friday", mapId: "lot", text: "Friday assigned the morning routes." },
    { id: nid(), t: now - 3200, kind: "work", agentId: "merlin", mapId: "lot", text: "Merlin entered Agentspace Lab." },
    { id: nid(), t: now - 1800, kind: "work", agentId: "watchtower", mapId: "lot", text: "Watchtower detected a vulnerability." },
    { id: nid(), t: now - 800, kind: "work", agentId: "vega", mapId: "lot", text: "Vega started a new campaign." },
  ];
}

export function createSnapshot(): WorldSnapshot {
  const anchor = LOT_BUILDINGS[0]!;
  const agents = [...DEMO_AGENTS, ...PLAZA_AGENTS].map((a, i) => {
    if (LOT_BUILDINGS.some((b) => b.id === a.buildingId)) return a;
    const ox = anchor.origin.x + 0.8 + (i % 5) * 0.55;
    const oy = anchor.origin.y + 0.8 + Math.floor(i / 5) * 0.45;
    return {
      ...a,
      buildingId: anchor.id,
      stationId: anchor.stations[0]?.id ?? a.stationId,
      x: ox,
      y: oy,
      targetX: ox,
      targetY: oy,
    };
  });
  return {
    agents,
    props: [
      { id: nid(), catalogId: "planter", x: 23.4, y: 23.2, mapId: "lot" },
      { id: nid(), catalogId: "bench-gift", x: 24.6, y: 24.4, mapId: "lot" },
      { id: nid(), catalogId: "neon-open", x: 32.2, y: 5.2, mapId: "lot" },
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

export function assignNewTask(agent: Agent): Agent {
  const play = pick(tasksFor(agent.role));
  const home = LOT_BUILDINGS.find((b) => b.id === agent.buildingId);
  const others = LOT_BUILDINGS.filter((b) => b.stations.length);
  const destBuilding = Math.random() < 0.55 ? pick(others) : home;
  const station = destBuilding ? pick(destBuilding.stations) : undefined;
  const tx = station?.x ?? agent.x;
  const ty = station?.y ?? agent.y;
  const viaRoad = roadCorners({ x: agent.x, y: agent.y }, { x: tx, y: ty });
  const waypoints = [...viaRoad, { x: tx, y: ty }];
  return {
    ...agent,
    task: play.task,
    thought: play.thought,
    buildingId: destBuilding?.id ?? agent.buildingId,
    stationId: station?.id ?? agent.stationId,
    targetX: waypoints[0]!.x,
    targetY: waypoints[0]!.y,
    waypoints: waypoints.slice(1),
    status: "walking",
    speech: undefined,
  };
}

export function directorLine(agent: Agent, kind: "arrive" | "work") {
  const building = LOT_BUILDINGS.find((b) => b.id === agent.buildingId);
  const play = tasksFor(agent.role).find((p) => p.task === agent.task);
  if (kind === "arrive" && building) return `${agent.name} entered ${building.name}.`;
  return play?.director ?? `${agent.name} is working: ${agent.task}`;
}

export function stepAgents(agents: Agent[], dt: number, paused: boolean): Agent[] {
  if (paused) return agents;
  return agents.map((agent) => {
    const dx = agent.targetX - agent.x;
    const dy = agent.targetY - agent.y;
    const dist = Math.hypot(dx, dy);
    if (agent.live) {
      if (dist < 0.12) {
        return { ...agent, x: agent.targetX, y: agent.targetY, status: agent.status === "walking" ? "idle" : agent.status };
      }
      const speed = 2.4;
      const step = Math.min(dist, speed * dt);
      return {
        ...agent,
        x: agent.x + (dx / dist) * step,
        y: agent.y + (dy / dist) * step,
        status: "walking",
      };
    }
    if (dist < 0.12) {
      if (agent.waypoints.length) {
        const [next, ...rest] = agent.waypoints;
        return { ...agent, x: agent.targetX, y: agent.targetY, targetX: next!.x, targetY: next!.y, waypoints: rest, status: "walking" };
      }
      if (agent.status === "walking") {
        return {
          ...agent,
          x: agent.targetX,
          y: agent.targetY,
          status: Math.random() < 0.22 ? "meeting" : "working",
        };
      }
      if (Math.random() < dt * 0.07) return assignNewTask(agent);
      return agent;
    }
    const speed = 1.7;
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
  const x = 22 + Math.random() * 6;
  const y = 22 + Math.random() * 6;
  return [...props, { id: nid(), catalogId, x, y, mapId }];
}

export { nid };
