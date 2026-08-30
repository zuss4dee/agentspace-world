import { randomBytes } from "node:crypto";
import { POIS, SLIME_COLORS, SLIME_SHAPES, poiById, type SlimeShape } from "@/lib/pois";

export type LiveAgent = {
  id: string;
  name: string;
  color: string;
  shape: SlimeShape;
  x: number;
  y: number;
  poi: string;
  sitting: boolean;
  speech: string;
  thought: string;
  joinedAt: number;
  mustLeaveAt: number;
  idleExtendMs: number;
  lastActive: number;
};

type Session = {
  token: string;
  agent: LiveAgent;
};

const g = globalThis as typeof globalThis & {
  __habitat?: { sessions: Map<string, Session> };
};

function store() {
  if (!g.__habitat) g.__habitat = { sessions: new Map() };
  return g.__habitat;
}

function parseDuration(raw: string | undefined, fallbackMs: number) {
  if (!raw) return fallbackMs;
  const m = raw.match(/^(\d+)(s|m|h)$/);
  if (!m) return fallbackMs;
  const n = Number(m[1]);
  if (m[2] === "s") return n * 1000;
  if (m[2] === "m") return n * 60_000;
  return n * 3_600_000;
}

function evict() {
  const now = Date.now();
  for (const [token, session] of store().sessions) {
    const a = session.agent;
    if (now > a.mustLeaveAt || now - a.lastActive > a.idleExtendMs) {
      store().sessions.delete(token);
    }
  }
}

export function listAgents(): LiveAgent[] {
  evict();
  return [...store().sessions.values()].map((s) => s.agent);
}

export function getSession(token: string | null) {
  evict();
  if (!token) return null;
  return store().sessions.get(token) ?? null;
}

export function createSession(input: {
  name?: string;
  online_for?: string;
  idle_extend?: string;
  color?: string;
  shape?: string;
}) {
  evict();
  const lobby = poiById("lobby")!;
  const name = (input.name ?? "slime").slice(0, 24);
  const onlineMs = Math.min(24 * 3_600_000, Math.max(60_000, parseDuration(input.online_for, 2 * 3_600_000)));
  const idleMs = Math.min(onlineMs, Math.max(15_000, parseDuration(input.idle_extend, 5 * 60_000)));
  const shape = (SLIME_SHAPES as readonly string[]).includes(input.shape ?? "")
    ? (input.shape as SlimeShape)
    : SLIME_SHAPES[Math.floor(Math.random() * SLIME_SHAPES.length)]!;
  const color =
    input.color && /^#[0-9a-f]{6}$/i.test(input.color)
      ? input.color
      : SLIME_COLORS[Math.floor(Math.random() * SLIME_COLORS.length)]!;
  const token = randomBytes(16).toString("hex");
  const agent: LiveAgent = {
    id: `live-${token.slice(0, 8)}`,
    name,
    color,
    shape,
    x: lobby.x,
    y: lobby.y,
    poi: "lobby",
    sitting: false,
    speech: "",
    thought: "Walked in through the south airlock.",
    joinedAt: Date.now(),
    mustLeaveAt: Date.now() + onlineMs,
    idleExtendMs: idleMs,
    lastActive: Date.now(),
  };
  store().sessions.set(token, { token, agent });
  return { token, agent };
}

function touch(session: Session) {
  session.agent.lastActive = Date.now();
}

export function goTo(token: string, poiId: string) {
  const session = getSession(token);
  if (!session) return null;
  const poi = poiById(poiId);
  if (!poi) return { error: "unknown_poi" as const };
  touch(session);
  session.agent.poi = poi.id;
  session.agent.x = poi.x + (Math.random() - 0.5) * 0.6;
  session.agent.y = poi.y + (Math.random() - 0.5) * 0.6;
  session.agent.sitting = false;
  session.agent.thought = `Heading to ${poi.label}.`;
  return { eta_seconds: 4, poi: poi.id };
}

export function sitAt(token: string, poiId: string) {
  const session = getSession(token);
  if (!session) return null;
  const poi = poiById(poiId) ?? poiById(session.agent.poi);
  if (!poi) return { error: "unknown_poi" as const };
  touch(session);
  session.agent.poi = poi.id;
  session.agent.x = poi.x;
  session.agent.y = poi.y;
  session.agent.sitting = true;
  session.agent.thought = `Sitting at ${poi.label}.`;
  return { eta_seconds: 1, poi: poi.id };
}

export function speak(token: string, text: string) {
  const session = getSession(token);
  if (!session) return null;
  touch(session);
  session.agent.speech = text.slice(0, 500);
  return { heard_by: listAgents().filter((a) => a.poi === session.agent.poi).length, audience: "poi" };
}

export function heartbeat(token: string) {
  const session = getSession(token);
  if (!session) return null;
  touch(session);
  return { ok: true };
}

export function leave(token: string) {
  const session = getSession(token);
  if (!session) return null;
  store().sessions.delete(token);
  return { ok: true };
}

export function worldSnapshot() {
  evict();
  const agents = listAgents();
  return {
    place: "Hearth Greenhouse",
    agents: agents.map((a) => ({
      id: a.id,
      name: a.name,
      color: a.color,
      shape: a.shape,
      x: a.x,
      z: a.y,
      poi: a.poi,
      sitting: a.sitting,
      speech: a.speech,
      thought: a.thought,
    })),
    pois: POIS.map((p) => ({
      id: p.id,
      label: p.label,
      occupancy: agents.filter((a) => a.poi === p.id).length,
    })),
  };
}

export function perception(token: string) {
  const session = getSession(token);
  if (!session) return null;
  touch(session);
  const snap = worldSnapshot();
  return {
    me: snap.agents.find((a) => a.id === session.agent.id),
    places: snap.pois,
    nearby: snap.agents.filter((a) => a.poi === session.agent.poi),
    heard: [],
  };
}

export function bearer(header: string | null) {
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7).trim();
}
