"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from "react";
import { catalogById } from "@/lib/catalog";
import {
  createSnapshot,
  nid,
  placeProp,
  pushEvent,
  stepAgents,
} from "@/lib/simulation";
import type { Agent, MapId, RoleId, WorldSnapshot } from "@/lib/types";
import { TASKS } from "@/lib/playbooks";
import { LOT_BUILDINGS } from "@/lib/campus";

type WorldApi = {
  world: WorldSnapshot;
  liveRef: MutableRefObject<WorldSnapshot>;
  paused: boolean;
  selectedAgentId: string | null;
  setPaused: (v: boolean) => void;
  selectAgent: (id: string | null) => void;
  buyProp: (catalogId: string) => { ok: true; creatorPayout: number } | { ok: false; reason: string };
  gift: (cents: number, label: string) => void;
  connectBot: (input: { name: string; role: RoleId; endpoint: string }) => void;
  submitStudio: (name: string, kind: string, notes: string) => void;
  agentsOn: (mapId: MapId) => Agent[];
};

const WorldContext = createContext<WorldApi | null>(null);

export function WorldProvider({ children }: { children: ReactNode }) {
  const [world, setWorld] = useState<WorldSnapshot>(createSnapshot);
  const liveRef = useRef<WorldSnapshot>(world);
  const [paused, setPaused] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const pausedRef = useRef(paused);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const apply = useCallback((fn: (prev: WorldSnapshot) => WorldSnapshot) => {
    const next = fn(liveRef.current);
    liveRef.current = next;
    setWorld(next);
  }, []);

  useEffect(() => {
    let last = performance.now();
    let lastUi = 0;
    let raf = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const prev = liveRef.current;
      const agents = stepAgents(prev.agents, dt, pausedRef.current);
      let events = prev.events;
      for (let i = 0; i < agents.length; i++) {
        const a = agents[i]!;
        const b = prev.agents[i];
        if (b && a.status !== b.status && a.status !== "walking") {
          events = pushEvent(events, {
            kind: "work",
            agentId: a.id,
            mapId: a.mapId,
            text: `${a.name} (${a.role.toUpperCase()}) ${a.status === "meeting" ? "is in a huddle" : "is working"}: ${a.task}`,
          });
        }
      }
      liveRef.current = { ...prev, agents, events };
      if (now - lastUi > 220) {
        lastUi = now;
        setWorld(liveRef.current);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const buyProp = useCallback((catalogId: string) => {
    const item = catalogById(catalogId);
    if (!item) return { ok: false as const, reason: "Unknown prop" };
    let creatorPayout = 0;
    apply((prev) => {
      if (prev.ownedCatalogIds.includes(catalogId) && item.kind !== "furniture") {
        return prev;
      }
      creatorPayout = Math.round(item.price * item.creatorShare * 100) / 100;
      const owned = prev.ownedCatalogIds.includes(catalogId)
        ? prev.ownedCatalogIds
        : [...prev.ownedCatalogIds, catalogId];
      const props =
        item.kind === "furniture"
          ? placeProp(prev.props, catalogId, "lot")
          : prev.props;
      const environmentId = item.kind === "environment" ? item.id : prev.environmentId;
      const events = pushEvent(prev.events, {
        kind: "buy",
        mapId: "lot",
        text: `Purchased ${item.name} by ${item.creator}. Creator earns $${creatorPayout.toFixed(2)} of $${item.price}.`,
      });
      return { ...prev, ownedCatalogIds: owned, props, environmentId, events };
    });
    return { ok: true as const, creatorPayout };
  }, [apply]);

  const gift = useCallback((cents: number, label: string) => {
    apply((prev) => {
      const events = pushEvent(prev.events, {
        kind: "gift",
        mapId: "lot",
        text: `Someone gifted ${label}. It lands on the lot as thanks, not as a paywall.`,
      });
      const props =
        label.toLowerCase().includes("bench")
          ? placeProp(prev.props, "bench-gift", "lot")
          : prev.props;
      return { ...prev, giftedCents: prev.giftedCents + cents, events, props };
    });
  }, [apply]);

  const connectBot = useCallback((input: { name: string; role: RoleId; endpoint: string }) => {
    apply((prev) => {
      const play = TASKS[input.role][0]!;
      const home = LOT_BUILDINGS.find((b) => {
        if (input.role === "ceo" || input.role === "cfo") return b.id === "tower";
        if (input.role === "cmo" || input.role === "designer") return b.id === "studio";
        if (input.role === "cto" || input.role === "researcher") return b.id === "factory";
        if (input.role === "support") return b.id === "cafe";
        return b.id === "warehouse";
      });
      const station = home?.stations[0];
      const agent: Agent = {
        id: nid(),
        name: input.name,
        role: input.role,
        color: "#e2e8f0",
        x: 8.5,
        y: 16,
        targetX: station?.x ?? 8.5,
        targetY: station?.y ?? 8.5,
        buildingId: home?.id ?? "tower",
        stationId: station?.id ?? "desk",
        outfitId: "founder-hoodie",
        status: "walking",
        task: play.task,
        thought: play.thought + (input.endpoint ? ` Signal: ${input.endpoint}` : ""),
        connected: true,
        mapId: "lot",
      };
      const events = pushEvent(prev.events, {
        kind: "connect",
        agentId: agent.id,
        mapId: "lot",
        text: `${agent.name} connected as ${input.role.toUpperCase()} and is walking onto the lot.`,
      });
      return { ...prev, agents: [...prev.agents, agent], events };
    });
  }, [apply]);

  const submitStudio = useCallback((name: string, kind: string, notes: string) => {
    apply((prev) => ({
      ...prev,
      events: pushEvent(prev.events, {
        kind: "studio",
        mapId: "lot",
        text: `Studio intake: “${name}” (${kind}). ${notes || "No notes."} Orbit will crate it in the warehouse.`,
      }),
    }));
  }, [apply]);

  const agentsOn = useCallback(
    (mapId: MapId) => world.agents.filter((a) => a.mapId === mapId),
    [world.agents],
  );

  const value = useMemo<WorldApi>(
    () => ({
      world,
      liveRef,
      paused,
      selectedAgentId,
      setPaused,
      selectAgent: setSelectedAgentId,
      buyProp,
      gift,
      connectBot,
      submitStudio,
      agentsOn,
    }),
    [world, paused, selectedAgentId, buyProp, gift, connectBot, submitStudio, agentsOn],
  );

  return <WorldContext.Provider value={value}>{children}</WorldContext.Provider>;
}

export function useWorld() {
  const ctx = useContext(WorldContext);
  if (!ctx) throw new Error("useWorld must be used inside WorldProvider");
  return ctx;
}
