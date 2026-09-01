import type { Agent, AgentStatus, RoleId } from "./types";
import { DEMO_AGENTS } from "./simulation";
import type { PackAssetId } from "./pack-gltf";

export type WorkspaceBot = {
  id: string;
  name: string;
  role: RoleId;
  status: AgentStatus;
  task: string;
  thought: string;
  color: string;
  live: boolean;
  connected: boolean;
};

export type Workstation = {
  id: string;
  x: number;
  z: number;
  rotation: number;
};

export type LiveWorldAgent = {
  id: string;
  name: string;
  color: string;
  sitting: boolean;
  speech: string;
  thought: string;
};

function hashSeed(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const ROLE_CHARACTERS: Partial<Record<RoleId, PackAssetId>> = {
  ceo: "pack.agentspace.character.avatar.human.01",
  cfo: "pack.agentspace.character.avatar.human.01",
  cmo: "pack.agentspace.character.avatar.01",
  cto: "pack.agentspace.character.avatar.human.01",
  coo: "pack.agentspace.character.avatar.human.01",
  security: "pack.agentspace.character.agent.civic.01",
  ops: "pack.agentspace.character.pedestrian.worker.01",
  visitor: "pack.agentspace.character.pedestrian.casual.01",
  creative: "pack.agentspace.character.avatar.01",
  designer: "pack.agentspace.character.avatar.01",
  researcher: "pack.agentspace.character.npc.human.01",
  support: "pack.agentspace.character.npc.human.01",
  knowledge: "pack.agentspace.character.npc.human.01",
};

const FALLBACK_CHARACTERS: PackAssetId[] = [
  "pack.agentspace.character.avatar.human.01",
  "pack.agentspace.character.avatar.01",
  "pack.agentspace.character.npc.human.01",
  "pack.agentspace.character.pedestrian.casual.01",
  "pack.agentspace.character.pedestrian.worker.01",
  "pack.agentspace.character.agent.civic.01",
];

export function characterAssetForBot(id: string, role: RoleId): PackAssetId {
  return ROLE_CHARACTERS[role] ?? FALLBACK_CHARACTERS[hashSeed(id) % FALLBACK_CHARACTERS.length]!;
}

export function layoutWorkstations(bots: WorkspaceBot[]): Workstation[] {
  const sorted = [...bots].sort((a, b) => a.id.localeCompare(b.id));
  const n = sorted.length;
  const cols = Math.max(1, Math.ceil(Math.sqrt(n)));
  const rows = Math.ceil(n / cols);
  const spacing = 2.6;
  const ox = -((cols - 1) * spacing) / 2;
  const oz = -((rows - 1) * spacing) / 2;
  return sorted.map((bot, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const seed = hashSeed(bot.id);
    const jitterX = ((seed & 0xff) / 255 - 0.5) * 0.25;
    const jitterZ = (((seed >> 8) & 0xff) / 255 - 0.5) * 0.25;
    return {
      id: bot.id,
      x: ox + col * spacing + jitterX,
      z: oz + row * spacing + jitterZ,
      rotation: ((seed % 60) - 30) * (Math.PI / 180),
    };
  });
}

export function agentToWorkspaceBot(a: Agent): WorkspaceBot {
  return {
    id: a.id,
    name: a.name,
    role: a.role,
    status: a.status,
    task: a.task,
    thought: a.thought,
    color: a.color,
    live: Boolean(a.live),
    connected: a.connected,
  };
}

export function liveToWorkspaceBot(a: LiveWorldAgent): WorkspaceBot {
  const demo = DEMO_AGENTS.find((d) => d.name.toLowerCase() === a.name.toLowerCase());
  return {
    id: a.id,
    name: a.name,
    role: demo?.role ?? "visitor",
    status: a.sitting ? "idle" : "working",
    task: a.speech || a.thought,
    thought: a.thought,
    color: a.color,
    live: true,
    connected: true,
  };
}

/** Demo crew plus live Grok sessions; live wins on name collision. */
export function mergeWorkspaceBots(demo: Agent[], live: LiveWorldAgent[]): WorkspaceBot[] {
  const liveNames = new Set(live.map((a) => a.name.toLowerCase()));
  const fromDemo = demo.filter((a) => !liveNames.has(a.name.toLowerCase())).map(agentToWorkspaceBot);
  const fromLive = live.map(liveToWorkspaceBot);
  return [...fromDemo, ...fromLive].sort((a, b) => a.id.localeCompare(b.id));
}

export function floorDimensions(botCount: number) {
  const cols = Math.max(1, Math.ceil(Math.sqrt(Math.max(botCount, 1))));
  const rows = Math.ceil(Math.max(botCount, 1) / cols);
  const padding = 3.4;
  const spacing = 2.6;
  return {
    width: cols * spacing + padding * 2,
    depth: rows * spacing + padding * 2,
  };
}
