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
  directorLine,
  nid,
  placeProp,
  pushEvent,
  stepAgents,
} from "@/lib/simulation";
import { tasksFor } from "@/lib/playbooks";
import { LOT_BUILDINGS } from "@/lib/campus";
import { poiById } from "@/lib/pois";
import type { Agent, MapId, RoleId, Vec2, WorldSnapshot } from "@/lib/types";

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
  link: "connecting" | "live" | "offline";
  cameraFocus: Vec2 | null;
  focusPoi: (id: string) => void;
  followAgent: boolean;
  setFollowAgent: (v: boolean) => void;
  cameraScale: number;
  setCameraScale: (n: number) => void;
};

const WorldContext = createContext<WorldApi | null>(null);

export function WorldProvider({ children }: { children: ReactNode }) {
  const [world, setWorld] = useState<WorldSnapshot>(createSnapshot);
  const liveRef = useRef<WorldSnapshot>(world);
  const [paused, setPaused] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [link, setLink] = useState<"connecting" | "live" | "offline">("connecting");
  const [cameraFocus, setCameraFocus] = useState<Vec2 | null>({ x: 24, y: 22 });
  const [followAgent, setFollowAgent] = useState(false);
  const [cameraScale, setCameraScale] = useState(0.34);
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
        if (b && a.status !== b.status && a.status !== "walking" && !a.live) {
          events = pushEvent(events, {
            kind: "work",
            agentId: a.id,
            mapId: a.mapId,
            text: directorLine(a, b.status === "walking" ? "arrive" : "work"),
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

  useEffect(() => {
    let stop = false;
    const tick = async () => {
      try {
        const res = await fetch("/v1/world", { cache: "no-store" });
        if (!res.ok) throw new Error("world");
        const data = (await res.json()) as {
          agents: {
            id: string;
            name: string;
            color: string;
            shape: Agent["shape"];
            x: number;
            z: number;
            poi: string;
            sitting: boolean;
            speech: string;
            thought: string;
          }[];
        };
        if (stop) return;
        setLink("live");
        apply((prev) => {
          const npcs = prev.agents.filter((a) => !a.live);
          const liveAgents: Agent[] = data.agents.map((a) => ({
            id: a.id,
            name: a.name,
            role: "visitor",
            color: a.color,
            shape: a.shape,
            x: a.x,
            y: a.z,
            targetX: a.x,
            targetY: a.z,
            buildingId: a.poi,
            stationId: a.poi,
            organization: "Walk-in",
            waypoints: [],
            outfitId: "visitor-lanyard",
            status: a.sitting ? "idle" : "walking",
            task: a.thought,
            thought: a.thought,
            speech: a.speech,
            live: true,
            poi: a.poi,
            connected: true,
            mapId: "lot",
          }));
          let events = prev.events;
          for (const incoming of liveAgents) {
            if (!prev.agents.some((p) => p.id === incoming.id)) {
              events = pushEvent(events, {
                kind: "connect",
                agentId: incoming.id,
                mapId: "lot",
                text: `AIRLOCK — ${incoming.name} walked in at South Station.`,
              });
            }
          }
          return { ...prev, agents: [...npcs, ...liveAgents], events };
        });
      } catch {
        if (!stop) setLink("offline");
      }
    };
    void tick();
    const id = window.setInterval(() => void tick(), 1500);
    return () => {
      stop = true;
      window.clearInterval(id);
    };
  }, [apply]);

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
      const play = tasksFor(input.role)[0]!;
      const home = LOT_BUILDINGS.find((b) => {
        if (input.role === "ceo" || input.role === "coo") return b.id === "hq";
        if (input.role === "cfo") return b.id === "finance";
        if (input.role === "cmo") return b.id === "loft";
        if (input.role === "creative" || input.role === "designer") return b.id === "studio";
        if (input.role === "cto" || input.role === "researcher") return b.id === "lab";
        if (input.role === "security") return b.id === "data";
        if (input.role === "knowledge") return b.id === "gallery";
        if (input.role === "support") return b.id === "seed-cafe";
        return b.id === "warehouse";
      });
      const station = home?.stations[0];
      const spawn = poiById("lobby")!;
      const agent: Agent = {
        id: nid(),
        name: input.name,
        role: input.role,
        organization: "Northshore",
        color: "#e2e8f0",
        x: spawn.x,
        y: spawn.y,
        targetX: station?.x ?? spawn.x,
        targetY: station?.y ?? spawn.y,
        waypoints: [],
        buildingId: home?.id ?? "hq",
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
        text: `${agent.name} connected as ${input.role} and is walking in from South Station.`,
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

  const focusPoi = useCallback((id: string) => {
    const poi = poiById(id);
    if (!poi) return;
    setCameraFocus({ x: poi.x, y: poi.y });
    if (id === "hearth") setCameraScale(0.32);
    else setCameraScale(0.88);
  }, []);

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
      link,
      cameraFocus,
      focusPoi,
      followAgent,
      setFollowAgent,
      cameraScale,
      setCameraScale,
    }),
    [world, paused, selectedAgentId, buyProp, gift, connectBot, submitStudio, agentsOn, link, cameraFocus, focusPoi, followAgent, cameraScale],
  );

  return <WorldContext.Provider value={value}>{children}</WorldContext.Provider>;
}

export function useWorld() {
  const ctx = useContext(WorldContext);
  if (!ctx) throw new Error("useWorld must be used inside WorldProvider");
  return ctx;
}
