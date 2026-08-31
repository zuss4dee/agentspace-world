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
  placeProp,
  pushEvent,
  stepAgents,
} from "@/lib/simulation";
import { LOT_BUILDINGS } from "@/lib/campus";
import { ALL_BUILDINGS } from "@/lib/city-gen";
import { PLOTS } from "@/lib/plots";
import { poiById } from "@/lib/pois";
import type { Agent, MapId, RoleId, Vec2, WorldSnapshot } from "@/lib/types";

type WorldApi = {
  world: WorldSnapshot;
  liveRef: MutableRefObject<WorldSnapshot>;
  paused: boolean;
  selectedAgentId: string | null;
  selectedBuildingId: string | null;
  selectedPlotId: string | null;
  selectedDistrictId: string | null;
  setPaused: (v: boolean) => void;
  selectAgent: (id: string | null) => void;
  selectBuilding: (id: string | null) => void;
  selectPlot: (id: string | null) => void;
  selectDistrict: (id: string | null) => void;
  focusBuilding: (id: string) => void;
  buyProp: (catalogId: string) => { ok: true; creatorPayout: number } | { ok: false; reason: string };
  gift: (cents: number, label: string) => void;
  connectBot: (input: {
    name: string;
    role: RoleId;
    endpoint?: string;
    onlineFor?: string;
    idleExtend?: string;
  }) => Promise<{ ok: true; agentId: string } | { ok: false; reason: string }>;
  submitStudio: (name: string, kind: string, notes: string) => void;
  agentsOn: (mapId: MapId) => Agent[];
  link: "connecting" | "live" | "offline";
  cameraFocus: Vec2 | null;
  focusPoi: (id: string) => void;
  focusCoord: (x: number, y: number, scale?: number) => void;
  followAgent: boolean;
  setFollowAgent: (v: boolean) => void;
  cameraScale: number;
  setCameraScale: (n: number) => void;
  cameraTick: number;
  mapOverview: boolean;
  showCityOverview: () => void;
  setMapOverview: (v: boolean) => void;
  topView: boolean;
  toggleTopView: () => void;
  setTopView: (v: boolean) => void;
  interiorId: string | null;
  enterBuilding: (id: string) => void;
  exitInterior: () => void;
  claimedPlotIds: string[];
  claimPlot: (id: string) => boolean;
  beaconBidCents: number;
  placeBeaconBid: (cents: number) => void;
  beaconOpen: boolean;
  setBeaconOpen: (v: boolean) => void;
};

const WorldContext = createContext<WorldApi | null>(null);

export function WorldProvider({ children }: { children: ReactNode }) {
  const [world, setWorld] = useState<WorldSnapshot>(createSnapshot);
  const liveRef = useRef<WorldSnapshot>(world);
  const [paused, setPaused] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [selectedPlotId, setSelectedPlotId] = useState<string | null>(null);
  const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>(null);
  const [link, setLink] = useState<"connecting" | "live" | "offline">("connecting");
  const [cameraFocus, setCameraFocus] = useState<Vec2 | null>({ x: 28.5, y: 8 });
  const [followAgent, setFollowAgent] = useState(false);
  const [cameraScale, setCameraScaleState] = useState(0.72);
  const [cameraTick, setCameraTick] = useState(0);
  const [interiorId, setInteriorId] = useState<string | null>(null);
  const [claimedPlotIds, setClaimedPlotIds] = useState<string[]>([]);
  const [beaconBidCents, setBeaconBidCents] = useState(0);
  const [beaconOpen, setBeaconOpen] = useState(false);
  const [mapOverview, setMapOverview] = useState(false);
  const [topView, setTopView] = useState(false);
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
          const liveAgents: Agent[] = data.agents.map((a) => {
            const old = prev.agents.find((p) => p.id === a.id && p.live);
            return {
              id: a.id,
              name: a.name,
              role: "visitor" as const,
              color: a.color,
              shape: a.shape,
              x: old ? old.x : a.x,
              y: old ? old.y : a.z,
              targetX: a.x,
              targetY: a.z,
              buildingId: a.poi,
              stationId: a.poi,
              organization: "Grok Bot",
              waypoints: [],
              outfitId: "visitor-lanyard",
              status: a.sitting ? "idle" : "walking",
              task: a.thought,
              thought: a.thought,
              speech: a.speech,
              live: true,
              poi: a.poi,
              connected: true,
              mapId: "lot" as const,
            };
          });
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

  const selectAgent = useCallback((id: string | null) => {
    setSelectedAgentId(id);
    if (id) {
      setSelectedBuildingId(null);
      setSelectedPlotId(null);
    }
  }, []);

  const selectBuilding = useCallback((id: string | null) => {
    setSelectedBuildingId(id);
    if (id) {
      setSelectedAgentId(null);
      setFollowAgent(false);
      const p = PLOTS.find((item) => item.buildingId === id);
      setSelectedPlotId(p?.id ?? null);
    } else {
      setSelectedPlotId(null);
    }
  }, []);

  const selectPlot = useCallback((id: string | null) => {
    setSelectedPlotId(id);
    if (!id) {
      setSelectedBuildingId(null);
      return;
    }
    const p = PLOTS.find((item) => item.id === id);
    setSelectedAgentId(null);
    setFollowAgent(false);
    setSelectedBuildingId(p?.buildingId ?? null);
    if (p) setSelectedDistrictId(p.districtId);
  }, []);

  const selectDistrict = useCallback((id: string | null) => {
    setSelectedDistrictId(id);
  }, []);

  const setCameraScale = useCallback((n: number) => {
    setMapOverview(false);
    setCameraScaleState(Math.min(2.2, Math.max(0.42, n)));
    setCameraTick((t) => t + 1);
  }, []);

  const focusBuilding = useCallback((id: string) => {
    const b = ALL_BUILDINGS.find((item) => item.id === id);
    if (!b) return;
    setMapOverview(false);
    setCameraFocus({ x: b.origin.x + b.size.x / 2, y: b.origin.y + b.size.y / 2 });
    setCameraScaleState(1.12);
    setCameraTick((t) => t + 1);
  }, []);

  const enterBuilding = useCallback((id: string) => {
    const b = ALL_BUILDINGS.find((item) => item.id === id) ?? LOT_BUILDINGS.find((item) => item.id === id);
    if (!b) return;
    setInteriorId(id);
    setTopView(false);
    setSelectedBuildingId(id);
    setSelectedAgentId(null);
    setFollowAgent(false);
    setMapOverview(false);
    setCameraFocus({ x: b.origin.x + b.size.x / 2, y: b.origin.y + b.size.y / 2 });
    setCameraScaleState(1.85);
    setCameraTick((t) => t + 1);
  }, []);

  const exitInterior = useCallback(() => {
    setInteriorId(null);
    setCameraScaleState(1.05);
    setCameraTick((t) => t + 1);
  }, []);

  const claimPlot = useCallback((id: string) => {
    const p = PLOTS.find((item) => item.id === id);
    if (!p || p.kind !== "sale") return false;
    setClaimedPlotIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    return true;
  }, []);

  const placeBeaconBid = useCallback((cents: number) => {
    setBeaconBidCents(cents);
  }, []);

  const focusPoi = useCallback((id: string) => {
    const poi = poiById(id);
    if (!poi) return;
    setMapOverview(false);
    setTopView(false);
    setCameraFocus({ x: poi.x, y: poi.y });
    setCameraScaleState(id === "hearth" ? 0.55 : 0.72);
    setCameraTick((t) => t + 1);
  }, []);

  const connectBot = useCallback(async (input: {
    name: string;
    role: RoleId;
    endpoint?: string;
    onlineFor?: string;
    idleExtend?: string;
  }) => {
    try {
      const res = await fetch("/v1/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: input.name,
          online_for: input.onlineFor ?? "24h",
          idle_extend: input.idleExtend ?? "2h",
        }),
      });
      if (!res.ok) return { ok: false as const, reason: "Airlock refused the session." };
      const data = (await res.json()) as { token: string; agent_id: string };
      const auth = { Authorization: `Bearer ${data.token}`, "Content-Type": "application/json" };
      const dest = input.role === "visitor" ? "hearth" : "startup";
      await fetch("/v1/me/go", {
        method: "POST",
        headers: auth,
        body: JSON.stringify({ poi: dest }),
      });
      const line = input.endpoint
        ? `South Station hissed. ${input.name} is on the map. Signal ${input.endpoint}.`
        : `South Station hissed. ${input.name} walked in as a Grok Bot.`;
      await fetch("/v1/me/speak", {
        method: "POST",
        headers: auth,
        body: JSON.stringify({ text: line }),
      });
      focusPoi(dest === "hearth" ? "hearth" : "startup");
      return { ok: true as const, agentId: data.agent_id };
    } catch {
      return { ok: false as const, reason: "Could not reach the airlock." };
    }
  }, [focusPoi]);

  const focusCoord = useCallback((x: number, y: number, scale = 1.05) => {
    setMapOverview(false);
    setCameraFocus({ x, y });
    setCameraScaleState(scale);
    setCameraTick((t) => t + 1);
  }, []);

  const showCityOverview = useCallback(() => {
    setFollowAgent(false);
    setMapOverview(true);
    setCameraFocus({ x: 32, y: 32 });
    setCameraTick((t) => t + 1);
  }, []);

  const toggleTopView = useCallback(() => {
    setTopView((v) => !v);
    setCameraTick((t) => t + 1);
  }, []);

  const value = useMemo<WorldApi>(
    () => ({
      world,
      liveRef,
      paused,
      selectedAgentId,
      selectedBuildingId,
      selectedPlotId,
      selectedDistrictId,
      setPaused,
      selectAgent,
      selectBuilding,
      selectPlot,
      selectDistrict,
      focusBuilding,
      buyProp,
      gift,
      connectBot,
      submitStudio,
      agentsOn,
      link,
      cameraFocus,
      focusPoi,
      focusCoord,
      followAgent,
      setFollowAgent,
      cameraScale,
      setCameraScale,
      cameraTick,
      mapOverview,
      showCityOverview,
      setMapOverview,
      topView,
      toggleTopView,
      setTopView,
      interiorId,
      enterBuilding,
      exitInterior,
      claimedPlotIds,
      claimPlot,
      beaconBidCents,
      placeBeaconBid,
      beaconOpen,
      setBeaconOpen,
    }),
    [
      world,
      paused,
      selectedAgentId,
      selectedBuildingId,
      selectedPlotId,
      selectedDistrictId,
      selectAgent,
      selectBuilding,
      selectPlot,
      selectDistrict,
      focusBuilding,
      buyProp,
      gift,
      connectBot,
      submitStudio,
      agentsOn,
      link,
      cameraFocus,
      focusPoi,
      focusCoord,
      followAgent,
      cameraScale,
      cameraTick,
      mapOverview,
      showCityOverview,
      topView,
      toggleTopView,
      interiorId,
      enterBuilding,
      exitInterior,
      claimedPlotIds,
      claimPlot,
      beaconBidCents,
      placeBeaconBid,
      beaconOpen,
    ],
  );

  return <WorldContext.Provider value={value}>{children}</WorldContext.Provider>;
}

export function useWorld() {
  const ctx = useContext(WorldContext);
  if (!ctx) throw new Error("useWorld must be used inside WorldProvider");
  return ctx;
}
