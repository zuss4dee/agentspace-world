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
import { type ArchView } from "@/lib/arch-viz";
import {
  createSnapshot,
  directorLine,
  placeProp,
  pushEvent,
  stepAgents,
} from "@/lib/simulation";
import { ALL_BUILDINGS } from "@/lib/city-gen";
import {
  getPlot,
  MAX_CLAIMS,
  coverageOfClaims,
  expandBlocked,
  usesForPlot,
  PLOTS,
  LAND_USES,
  buildingSize,
  buildingFootprint,
  centerPlace,
  claimIdFor,
  plotRect,
  remainingRects,
  workingLand,
  type LotPlace,
  type TileRect,
} from "@/lib/plots";
import { poiById } from "@/lib/pois";
import { DISTRICT_SPECS } from "@/lib/district-specs";
import { gltfUrlForAssetId } from "@/lib/building-gltf";
import { WORLD_BUILDINGS } from "@/lib/campus";
import { specFromUse } from "@/lib/building-ai";
import { paletteForUse } from "@/lib/building-grammar";
import type { BuildingSpec } from "@/lib/building-spec";
import type { CompanyProfile } from "@/lib/company-profile";
import { brandProfileFromCompanyProfile, defaultBuildingAssetId, withBrandAccent } from "@/lib/brand-profile";
import {
  applyStoredProfiles,
  defaultClaimProfile,
  loadStoredProfiles,
  mergeProfile,
  occupiedBuilding,
  profilesFromSpecs,
  saveStoredProfiles,
} from "@/lib/company-profile";
import { h } from "@/lib/coords";
import { clearClaimSessionStorage, loadStoredClaims, migrateClaimSessionIfNeeded, saveStoredClaims, type StoredClaims } from "@/lib/claimed-lots-storage";
import {
  addCrewMember,
  loadBuildingCrew,
  parsePlotPoiId,
  plotPoiId,
  saveBuildingCrew,
  type BuildingCrewMap,
} from "@/lib/building-crew";
import type { Agent, MapId, RoleId, Vec2, WorldSnapshot } from "@/lib/types";

function restoreClaimSpecs(
  specs: Record<string, BuildingSpec>,
  claims: StoredClaims,
  profiles: Record<string, CompanyProfile>,
): Record<string, BuildingSpec> {
  let next = { ...specs };
  for (const id of claims.claimedPlotIds) {
    const plot = getPlot(id);
    if (!plot) continue;
    const useId = claims.claimedUses[id] ?? "office";
    const extra = claims.claimedExtras[id] ?? 0;
    const place = claims.claimedPlaces[id];
    const use = LAND_USES.find((u) => u.id === useId) ?? LAND_USES[0]!;
    const fp = buildingFootprint(plot, use, extra, place);
    if (!fp) continue;
    const pal = paletteForUse(useId);
    const profile = profiles[id]
      ? mergeProfile(defaultClaimProfile(use.name), profiles[id])
      : next[id]?.profile;
    const base =
      next[id] ?? specFromUse(id, useId, fp.w, fp.h, h(fp.height), pal);
    next[id] = withBrandAccent({
      ...base,
      ...(profile
        ? {
            profile,
            signage: profile.name
              ? { ...base.signage, text: profile.name.slice(0, 18).toUpperCase() }
              : base.signage,
          }
        : {}),
    });
  }
  return next;
}

export type StudioMode = "quick" | "customise" | "creator";
export type ClaimSetupStep = "profile" | "placement" | "build";

type WorldApi = {
  world: WorldSnapshot;
  liveRef: MutableRefObject<WorldSnapshot>;
  paused: boolean;
  selectedAgentId: string | null;
  selectedBuildingId: string | null;
  selectedPlotId: string | null;
  selectedPlotIds: string[];
  landSlice: TileRect | null;
  selectedDistrictId: string | null;
  setPaused: (v: boolean) => void;
  selectAgent: (id: string | null) => void;
  selectBuilding: (id: string | null) => void;
  selectPlot: (id: string | null, opts?: { additive?: boolean }) => void;
  selectDistrict: (id: string | null) => void;
  focusBuilding: (id: string) => void;
  buyProp: (catalogId: string) => { ok: true; creatorPayout: number } | { ok: false; reason: string };
  gift: (cents: number, label: string) => void;
  connectBot: (input: {
    name: string;
    role: RoleId;
    plotId?: string;
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
  zoomBy: (inward: boolean) => void;
  zoomPulse: { id: number; inward: boolean };
  cameraTick: number;
  archView: ArchView | null;
  setArchView: (v: ArchView | null) => void;
  sunHour: number;
  setSunHour: (h: number) => void;
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
  claimedExtras: Record<string, number>;
  claimedPlaces: Record<string, LotPlace>;
  claimedUses: Record<string, string>;
  claimPlot: (id: string, extra?: number, place?: LotPlace, useId?: string, slice?: TileRect | null) => boolean;
  claimPlots: (
    ids: string[],
    extra?: number,
    place?: LotPlace,
    useId?: string,
    slice?: TileRect | null,
  ) => { ok: boolean; count: number; reason?: string };
  setLandSlice: (s: TileRect | null) => void;
  previewUseId: string;
  setPreviewUseId: (id: string) => void;
  plotExpand: number;
  setPlotExpand: (n: number) => void;
  buildingPlace: LotPlace;
  setBuildingPlace: (p: LotPlace) => void;
  beaconBidCents: number;
  placeBeaconBid: (cents: number) => void;
  beaconOpen: boolean;
  setBeaconOpen: (v: boolean) => void;
  buildingSpecs: Record<string, BuildingSpec>;
  draftSpec: BuildingSpec | null;
  upsertBuildingSpec: (spec: BuildingSpec) => void;
  studioOpen: boolean;
  setStudioOpen: (v: boolean) => void;
  studioMode: StudioMode;
  setStudioMode: (m: StudioMode) => void;
  saveCreatorPack: (packId: string) => void;
  creatorPacks: string[];
  claimSetupId: string | null;
  claimSetupStep: ClaimSetupStep;
  openClaimSetup: (id: string, step?: ClaimSetupStep) => void;
  dismissClaimSetup: () => void;
  saveClaimBuilding: (input: {
    profile: Partial<CompanyProfile>;
    useId?: string;
    place?: LotPlace;
    extra?: number;
  }) => void;
  finishClaimSetup: (input: {
    profile: Partial<CompanyProfile>;
    useId?: string;
    place?: LotPlace;
    extra?: number;
  }) => void;
  buildingCrew: BuildingCrewMap;
  addBotToBuilding: (plotId: string, input: {
    name: string;
    role: RoleId;
    endpoint?: string;
    onlineFor?: string;
    idleExtend?: string;
  }) => Promise<{ ok: true; agentId: string } | { ok: false; reason: string }>;
};

const WorldContext = createContext<WorldApi | null>(null);

export function WorldProvider({ children }: { children: ReactNode }) {
  const [world, setWorld] = useState<WorldSnapshot>(createSnapshot);
  const liveRef = useRef<WorldSnapshot>(world);
  const [paused, setPaused] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [selectedPlotId, setSelectedPlotId] = useState<string | null>(null);
  const [selectedPlotIds, setSelectedPlotIds] = useState<string[]>([]);
  const [landSlice, setLandSlice] = useState<TileRect | null>(null);
  const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>(null);
  const [link, setLink] = useState<"connecting" | "live" | "offline">("connecting");
  const [cameraFocus, setCameraFocus] = useState<Vec2 | null>({ x: 28.5, y: 8 });
  const [followAgent, setFollowAgent] = useState(false);
  const [cameraScale, setCameraScaleState] = useState(0.72);
  const [cameraTick, setCameraTick] = useState(0);
  const [archView, setArchViewState] = useState<ArchView | null>(null);
  const [sunHour, setSunHour] = useState(15.5);
  const [zoomPulse, setZoomPulse] = useState({ id: 0, inward: true });
  const [interiorId, setInteriorId] = useState<string | null>(null);
  // SSR-safe defaults — localStorage is restored after mount to avoid hydration mismatch.
  const [claimedPlotIds, setClaimedPlotIds] = useState<string[]>([]);
  const [claimedExtras, setClaimedExtras] = useState<Record<string, number>>({});
  const [claimedPlaces, setClaimedPlaces] = useState<Record<string, LotPlace>>({});
  const [claimedUses, setClaimedUses] = useState<Record<string, string>>({});
  const [previewUseId, setPreviewUseId] = useState("office");
  const [plotExpand, setPlotExpand] = useState(0);
  const [buildingPlace, setBuildingPlace] = useState<LotPlace>({ ox: 0, oy: 0 });
  const [beaconBidCents, setBeaconBidCents] = useState(0);
  const [beaconOpen, setBeaconOpen] = useState(false);
  const [buildingSpecs, setBuildingSpecs] = useState<Record<string, BuildingSpec>>(
    () => ({ ...DISTRICT_SPECS }),
  );
  const [draftSpec, setDraftSpec] = useState<BuildingSpec | null>(null);
  const [studioOpen, setStudioOpen] = useState(false);
  const [studioMode, setStudioMode] = useState<StudioMode>("quick");
  const [creatorPacks, setCreatorPacks] = useState<string[]>([]);
  const [claimSetupId, setClaimSetupId] = useState<string | null>(null);
  const [claimSetupStep, setClaimSetupStep] = useState<ClaimSetupStep>("profile");
  const [buildingCrew, setBuildingCrew] = useState<BuildingCrewMap>({});
  const [mapOverview, setMapOverview] = useState(false);
  const [topView, setTopView] = useState(false);
  const [storageReady, setStorageReady] = useState(false);
  const pausedRef = useRef(paused);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    const fresh =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).has("fresh");
    const wiped = fresh || migrateClaimSessionIfNeeded();
    if (fresh) clearClaimSessionStorage();
    if (wiped) {
      setClaimedPlotIds([]);
      setClaimedExtras({});
      setClaimedPlaces({});
      setClaimedUses({});
      setBuildingSpecs({});
      setBuildingCrew({});
      setStorageReady(true);
      if (fresh) window.history.replaceState({}, "", window.location.pathname);
      return;
    }
    const claims = loadStoredClaims();
    const profiles = loadStoredProfiles();
    setClaimedPlotIds(claims.claimedPlotIds);
    setClaimedExtras(claims.claimedExtras);
    setClaimedPlaces(claims.claimedPlaces);
    setClaimedUses(claims.claimedUses);
    setBuildingSpecs((prev) => {
      const base = applyStoredProfiles({ ...prev }, profiles);
      return restoreClaimSpecs(base, claims, profiles);
    });
    setBuildingCrew(loadBuildingCrew());
    setStorageReady(true);
  }, []);

  /** Attach published HQ GLBs that finished in Blender but never wrote buildingAssetId (hung Build HQ). */
  useEffect(() => {
    if (!storageReady) return;
    let cancelled = false;
    const run = async () => {
      for (const id of claimedPlotIds) {
        const spec = buildingSpecs[id];
        const profile = spec?.profile;
        if (!profile?.name?.trim()) continue;
        if (profile.buildingStatus === "ready" && profile.buildingAssetId) continue;
        const brand = brandProfileFromCompanyProfile(id, profile);
        const assetId = profile.buildingAssetId ?? defaultBuildingAssetId(brand);
        try {
          const res = await fetch(`/v1/brand/asset?assetId=${encodeURIComponent(assetId)}`);
          const data = (await res.json()) as {
            ok: boolean;
            assetId?: string;
            buildingMeters?: { width: number; depth: number; height: number };
          };
          if (cancelled || !data.ok || !data.assetId) continue;
          setBuildingSpecs((prev) => {
            const cur = prev[id];
            if (!cur?.profile) return prev;
            if (cur.profile.buildingStatus === "ready" && cur.profile.buildingAssetId === data.assetId) {
              return prev;
            }
            return {
              ...prev,
              [id]: withBrandAccent({
                ...cur,
                profile: {
                  ...cur.profile,
                  buildingAssetId: data.assetId,
                  buildingMeters: data.buildingMeters ?? cur.profile.buildingMeters,
                  buildingStatus: "ready",
                },
              }),
            };
          });
        } catch {
          /* offline */
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
    // Only re-scan when claims change / storage becomes ready — not on every profile keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageReady, claimedPlotIds.join("|")]);

  useEffect(() => {
    if (!storageReady) return;
    saveStoredProfiles(profilesFromSpecs(buildingSpecs));
  }, [buildingSpecs, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    saveBuildingCrew(buildingCrew);
  }, [buildingCrew, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    saveStoredClaims({
      claimedPlotIds,
      claimedExtras,
      claimedPlaces,
      claimedUses,
    });
  }, [claimedPlotIds, claimedExtras, claimedPlaces, claimedUses, storageReady]);

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
              buildingId: parsePlotPoiId(a.poi) ?? a.poi,
              stationId: parsePlotPoiId(a.poi) ?? a.poi,
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
      setSelectedPlotIds([]);
      setLandSlice(null);
    }
  }, []);

  const selectBuilding = useCallback((id: string | null) => {
    setSelectedBuildingId(id);
    if (id) {
      setSelectedAgentId(null);
      setFollowAgent(false);
      const p = PLOTS.find((item) => item.buildingId === id);
      setSelectedPlotId(p?.id ?? null);
      setSelectedPlotIds(p ? [p.id] : []);
      setLandSlice(p ? plotRect(p) : null);
      const listed = WORLD_BUILDINGS.find((row) => row.id === id);
      if (listed && gltfUrlForAssetId(listed.assetId)) {
        setDraftSpec(null);
      } else {
        setDraftSpec((prev) => buildingSpecs[id] ?? DISTRICT_SPECS[id] ?? prev);
      }
    } else {
      setSelectedPlotId(null);
      setSelectedPlotIds([]);
      setLandSlice(null);
    }
  }, [buildingSpecs]);

  const focusPlotPreview = useCallback((id: string) => {
    const p = getPlot(id);
    setSelectedAgentId(null);
    setFollowAgent(false);
    setSelectedBuildingId(p?.kind === "owned" && p?.buildingId ? p.buildingId : null);
    setPlotExpand(0);
    if (!p) {
      setBuildingPlace({ ox: 0, oy: 0 });
      setLandSlice(null);
      return;
    }
    setSelectedDistrictId(p.districtId);
    const left = remainingRects(p, claimedPlotIds);
    const start = left.sort((a, b) => b.w * b.h - a.w * a.h)[0] ?? plotRect(p);
    setLandSlice(start);
    setPreviewUseId((cur) => {
      const land = workingLand(p, start);
      const uses = usesForPlot(land, 0);
      const nextUse = uses.some((u) => u.id === cur) ? cur : (uses[0]?.id ?? "kiosk");
      const use = LAND_USES.find((u) => u.id === nextUse) ?? LAND_USES[0]!;
      const size = buildingSize(land, use, 0);
      setBuildingPlace(size ? centerPlace(land.w, land.h, size.w, size.h) : { ox: 0, oy: 0 });
      const fp = buildingFootprint(land, use, 0, size ? centerPlace(land.w, land.h, size.w, size.h) : { ox: 0, oy: 0 });
      const bid = p.buildingId;
      const listed = bid ? WORLD_BUILDINGS.find((row) => row.id === bid) : undefined;
      if (listed && gltfUrlForAssetId(listed.assetId)) {
        setDraftSpec(null);
      } else {
        setDraftSpec(
          buildingSpecs[p.id] ??
            (bid ? buildingSpecs[bid] ?? DISTRICT_SPECS[bid] : undefined) ??
            (fp
              ? specFromUse(p.id, nextUse, fp.w, fp.h, h(fp.height), paletteForUse(nextUse))
              : null),
        );
      }
      return nextUse;
    });
  }, [claimedPlotIds, buildingSpecs]);

  const selectPlot = useCallback((id: string | null, opts?: { additive?: boolean }) => {
    if (opts?.additive && id) {
      const p = getPlot(id);
      if (!p || p.kind !== "sale") return;
      setSelectedPlotIds((prev) => {
        if (prev.includes(id)) {
          const next = prev.filter((x) => x !== id);
          const focus = next[next.length - 1] ?? null;
          setSelectedPlotId(focus);
          if (focus) focusPlotPreview(focus);
          else {
            setSelectedBuildingId(null);
            setLandSlice(null);
            setBuildingPlace({ ox: 0, oy: 0 });
          }
          return next;
        }
        setSelectedPlotId(id);
        focusPlotPreview(id);
        return [...prev, id];
      });
      return;
    }
    setSelectedPlotIds(id ? [id] : []);
    setSelectedPlotId(id);
    setPlotExpand(0);
    if (!id) {
      setSelectedBuildingId(null);
      setBuildingPlace({ ox: 0, oy: 0 });
      setLandSlice(null);
      return;
    }
    focusPlotPreview(id);
  }, [focusPlotPreview]);

  const selectDistrict = useCallback((id: string | null) => {
    setSelectedDistrictId(id);
  }, []);

  const setCameraScale = useCallback((n: number) => {
    setMapOverview(false);
    setCameraScaleState(Math.min(2.2, Math.max(0.42, n)));
    setCameraTick((t) => t + 1);
  }, []);

  const zoomBy = useCallback((inward: boolean) => {
    setZoomPulse((p) => ({ id: p.id + 1, inward }));
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
    const spec = buildingSpecs[id] ?? DISTRICT_SPECS[id];
    const b = occupiedBuilding(id, spec);
    if (!b) return;
    setInteriorId(id);
    setTopView(false);
    setSelectedBuildingId(id);
    setSelectedPlotId(null);
    setSelectedPlotIds([]);
    setLandSlice(null);
    setSelectedAgentId(null);
    setFollowAgent(false);
    setMapOverview(false);
    setCameraFocus({ x: b.origin.x + b.size.x / 2, y: b.origin.y + b.size.y / 2 });
    setCameraScaleState(1.85);
    setCameraTick((t) => t + 1);
  }, [buildingSpecs]);

  const exitInterior = useCallback(() => {
    setInteriorId(null);
    setCameraScaleState(1.05);
    setCameraTick((t) => t + 1);
  }, []);

  const claimPlots = useCallback((
    ids: string[],
    extra = 0,
    place?: LotPlace,
    useId?: string,
    slice?: TileRect | null,
  ) => {
    const unique = [...new Set(ids.filter(Boolean))];
    if (unique.length === 0) return { ok: false, count: 0, reason: "closed" };
    let occupied = coverageOfClaims(claimedPlotIds, claimedExtras);
    const pending: { id: string; extra: number; place?: LotPlace; useId?: string }[] = [];
    for (const id of unique) {
      const base = getPlot(id);
      if (!base || base.kind !== "sale") return { ok: false, count: 0, reason: "closed" };
      const useSlice = id === selectedPlotId ? (slice ?? landSlice) : plotRect(base);
      const land = workingLand(base, useSlice);
      const claimId = claimIdFor(base, plotRect(land));
      if (claimedPlotIds.includes(claimId) || pending.some((row) => row.id === claimId)) {
        return { ok: false, count: 0, reason: "closed" };
      }
      if (expandBlocked(land, id === selectedPlotId ? extra : 0, occupied)) {
        return { ok: false, count: 0, reason: "overlap" };
      }
      occupied = new Set(occupied);
      occupied.add(claimId);
      pending.push({
        id: claimId,
        extra: id === selectedPlotId ? extra : 0,
        place: id === selectedPlotId ? place : undefined,
        useId: id === selectedPlotId ? useId : undefined,
      });
    }
    if (claimedPlotIds.length + pending.length > MAX_CLAIMS) {
      return { ok: false, count: 0, reason: "cap" };
    }
    setClaimedPlotIds((prev) => {
      const next = [...prev];
      for (const row of pending) {
        if (!next.includes(row.id) && next.length < MAX_CLAIMS) next.push(row.id);
      }
      return next;
    });
    setClaimedExtras((prev) => {
      const next = { ...prev };
      for (const row of pending) next[row.id] = row.extra;
      return next;
    });
    setClaimedPlaces((prev) => {
      const next = { ...prev };
      for (const row of pending) {
        if (row.place) next[row.id] = row.place;
      }
      return next;
    });
    setClaimedUses((prev) => {
      const next = { ...prev };
      for (const row of pending) {
        if (row.useId) next[row.id] = row.useId;
      }
      return next;
    });
    setSelectedPlotIds([]);
    setSelectedPlotId(null);
    setLandSlice(null);
    const primaryClaimId = pending[0]?.id ?? null;
    setBuildingSpecs((prev) => {
      const next = { ...prev };
      for (const row of pending) {
        const id = row.id;
        const useId = row.useId ?? previewUseId;
        const pal = paletteForUse(useId);
        const base = getPlot(id);
        if (draftSpec && pending[0] && id === pending[0].id) {
          next[id] = {
            ...draftSpec,
            id,
            profile: draftSpec.profile ?? defaultClaimProfile(LAND_USES.find((u) => u.id === useId)?.name),
          };
        } else if (base) {
          const use = LAND_USES.find((u) => u.id === useId) ?? LAND_USES[0]!;
          const fp = buildingFootprint(base, use, row.extra, row.place);
          if (fp) {
            next[id] = {
              ...specFromUse(id, useId, fp.w, fp.h, h(fp.height), pal),
              profile: defaultClaimProfile(use.name),
            };
          }
        }
      }
      return next;
    });
    if (primaryClaimId) {
      setClaimSetupId(primaryClaimId);
      setClaimSetupStep("profile");
    }
    return { ok: true, count: pending.length };
  }, [claimedPlotIds, claimedExtras, selectedPlotId, landSlice, previewUseId, draftSpec]);

  const dismissClaimSetup = useCallback(() => {
    setClaimSetupId(null);
    setClaimSetupStep("profile");
  }, []);

  const openClaimSetup = useCallback((id: string, step: ClaimSetupStep = "profile") => {
    setClaimSetupId(id);
    setClaimSetupStep(step);
  }, []);

  const saveClaimBuilding = useCallback((input: {
    profile: Partial<CompanyProfile>;
    useId?: string;
    place?: LotPlace;
    extra?: number;
  }) => {
    const id = claimSetupId;
    if (!id) return;
    const plot = getPlot(id);
    const useId = input.useId ?? claimedUses[id] ?? previewUseId;
    const extra = input.extra ?? claimedExtras[id] ?? 0;
    const place = input.place ?? claimedPlaces[id];
    const use = LAND_USES.find((u) => u.id === useId) ?? LAND_USES[0]!;
    const pal = paletteForUse(useId);
    const merged = mergeProfile(defaultClaimProfile(use.name), input.profile);
    const brand = brandProfileFromCompanyProfile(id, merged);
    const palette = [...brand.primaryColours, ...brand.secondaryColours];
    const profile: CompanyProfile = {
      ...merged,
      tier: brand.tier,
      palette: palette.length ? palette : merged.palette,
      brand,
    };

    setClaimedExtras((prev) => ({ ...prev, [id]: extra }));
    if (place) setClaimedPlaces((prev) => ({ ...prev, [id]: place }));
    setClaimedUses((prev) => ({ ...prev, [id]: useId }));

    setBuildingSpecs((prev) => {
      const fp = plot ? buildingFootprint(plot, use, extra, place) : null;
      const base =
        prev[id] ??
        (fp ? specFromUse(id, useId, fp.w, fp.h, h(fp.height), pal) : undefined);
      if (!base) return prev;
      return {
        ...prev,
        [id]: withBrandAccent({
          ...base,
          profile,
          signage: profile.name
            ? { ...base.signage, text: profile.name.slice(0, 18).toUpperCase() }
            : base.signage,
        }),
      };
    });

    if (plot) {
      setMapOverview(false);
      setCameraFocus({ x: plot.x + plot.w / 2, y: plot.y + plot.h / 2 });
      setCameraScaleState(1.05);
      setCameraTick((t) => t + 1);
    }
    apply((prev) => ({
      ...prev,
      events: pushEvent(prev.events, {
        kind: "work",
        mapId: "lot",
        text: profile.buildingStatus === "ready"
          ? `${profile.name || "Your company"} HQ placed on ${plot?.groupLabel ?? "claimed land"}.`
          : `${profile.name || "Your company"} locked brand for a ${use.name.toLowerCase()} on ${plot?.groupLabel ?? "claimed land"}.`,
      }),
    }));
  }, [apply, claimSetupId, claimedExtras, claimedPlaces, claimedUses, previewUseId]);

  const finishClaimSetup = useCallback((input: {
    profile: Partial<CompanyProfile>;
    useId?: string;
    place?: LotPlace;
    extra?: number;
  }) => {
    saveClaimBuilding(input);
    dismissClaimSetup();
  }, [dismissClaimSetup, saveClaimBuilding]);

  const claimPlot = useCallback((id: string, extra = 0, place?: LotPlace, useId?: string, slice?: TileRect | null) => {
    return claimPlots([id], extra, place, useId, slice ?? landSlice).ok;
  }, [claimPlots, landSlice]);

  const placeBeaconBid = useCallback((cents: number) => {
    setBeaconBidCents(cents);
  }, []);

  const upsertBuildingSpec = useCallback((spec: BuildingSpec) => {
    setBuildingSpecs((prev) => ({ ...prev, [spec.id]: spec }));
    setDraftSpec(spec);
  }, []);

  const saveCreatorPack = useCallback((packId: string) => {
    setCreatorPacks((prev) => (prev.includes(packId) ? prev : [...prev, packId]));
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
    plotId?: string;
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
      const dest = input.plotId ? plotPoiId(input.plotId) : input.role === "visitor" ? "hearth" : "startup";
      await fetch("/v1/me/go", {
        method: "POST",
        headers: auth,
        body: JSON.stringify({ poi: dest }),
      });
      await fetch("/v1/me/sit", {
        method: "POST",
        headers: auth,
        body: JSON.stringify({ poi: dest }),
      });
      const plot = input.plotId ? getPlot(input.plotId) : null;
      const line = input.plotId && plot
        ? `${input.name} checked in at ${plot.groupLabel}.`
        : input.endpoint
          ? `South Station hissed. ${input.name} is on the map. Signal ${input.endpoint}.`
          : `South Station hissed. ${input.name} walked in as a Grok Bot.`;
      await fetch("/v1/me/speak", {
        method: "POST",
        headers: auth,
        body: JSON.stringify({ text: line }),
      });
      if (plot) {
        setMapOverview(false);
        setTopView(false);
        setCameraFocus({ x: plot.x + plot.w / 2, y: plot.y + plot.h / 2 });
        setCameraScaleState(1.15);
        setCameraTick((t) => t + 1);
      } else {
        focusPoi(dest === "hearth" ? "hearth" : "startup");
      }
      return { ok: true as const, agentId: data.agent_id };
    } catch {
      return { ok: false as const, reason: "Could not reach the airlock." };
    }
  }, [focusPoi]);

  const addBotToBuilding = useCallback(async (
    plotId: string,
    input: {
      name: string;
      role: RoleId;
      endpoint?: string;
      onlineFor?: string;
      idleExtend?: string;
    },
  ) => {
    const result = await connectBot({ ...input, plotId });
    if (result.ok) {
      setBuildingCrew((prev) =>
        addCrewMember(prev, plotId, {
          name: input.name,
          role: input.role,
          liveAgentId: result.agentId,
          endpoint: input.endpoint,
        }),
      );
      const plot = getPlot(plotId);
      apply((prev) => ({
        ...prev,
        events: pushEvent(prev.events, {
          kind: "connect",
          agentId: result.agentId,
          mapId: "lot",
          text: `CREW — ${input.name} joined ${plot?.groupLabel ?? "your building"}.`,
        }),
      }));
    }
    return result;
  }, [apply, connectBot]);

  const focusCoord = useCallback((x: number, y: number, scale = 1.05) => {
    setArchViewState(null);
    setMapOverview(false);
    setCameraFocus({ x, y });
    setCameraScaleState(scale);
    setCameraTick((t) => t + 1);
  }, []);

  const showCityOverview = useCallback(() => {
    setArchViewState(null);
    setFollowAgent(false);
    setMapOverview(true);
    setCameraFocus({ x: 32, y: 32 });
    setCameraTick((t) => t + 1);
  }, []);

  const setArchView = useCallback((v: ArchView | null) => {
    setArchViewState(v);
    if (v) {
      setFollowAgent(false);
      setMapOverview(false);
      setTopView(false);
      setSelectedBuildingId("loft");
      setCameraFocus({ x: 28, y: 3.5 });
      setCameraTick((t) => t + 1);
    }
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
      selectedPlotIds,
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
      zoomBy,
      zoomPulse,
      cameraTick,
      archView,
      setArchView,
      sunHour,
      setSunHour,
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
      claimedExtras,
      claimedPlaces,
      claimedUses,
      claimPlot,
      claimPlots,
      previewUseId,
      setPreviewUseId,
      plotExpand,
      setPlotExpand,
      buildingPlace,
      setBuildingPlace,
      landSlice,
      setLandSlice,
      beaconBidCents,
      placeBeaconBid,
      beaconOpen,
      setBeaconOpen,
      buildingSpecs,
      draftSpec,
      upsertBuildingSpec,
      studioOpen,
      setStudioOpen,
      studioMode,
      setStudioMode,
      saveCreatorPack,
      creatorPacks,
      claimSetupId,
      claimSetupStep,
      openClaimSetup,
      dismissClaimSetup,
      saveClaimBuilding,
      finishClaimSetup,
      buildingCrew,
      addBotToBuilding,
    }),
    [
      world,
      paused,
      selectedAgentId,
      selectedBuildingId,
      selectedPlotId,
      selectedPlotIds,
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
      archView,
      setArchView,
      sunHour,
      zoomPulse,
      zoomBy,
      mapOverview,
      showCityOverview,
      topView,
      toggleTopView,
      interiorId,
      enterBuilding,
      exitInterior,
      claimedPlotIds,
      claimedExtras,
      claimedPlaces,
      claimedUses,
      claimPlot,
      claimPlots,
      previewUseId,
      plotExpand,
      buildingPlace,
      landSlice,
      beaconBidCents,
      placeBeaconBid,
      beaconOpen,
      buildingSpecs,
      draftSpec,
      upsertBuildingSpec,
      studioOpen,
      studioMode,
      creatorPacks,
      claimSetupId,
      claimSetupStep,
      openClaimSetup,
      dismissClaimSetup,
      saveClaimBuilding,
      finishClaimSetup,
      buildingCrew,
      addBotToBuilding,
    ],
  );

  return <WorldContext.Provider value={value}>{children}</WorldContext.Provider>;
}

export function useWorld() {
  const ctx = useContext(WorldContext);
  if (!ctx) throw new Error("useWorld must be used inside WorldProvider");
  return ctx;
}
