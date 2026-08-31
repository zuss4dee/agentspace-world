"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { GRID, TERRAIN } from "@/lib/campus";
import { extraLamps } from "@/lib/city-gen";
import { TILE, h, wx, wz } from "@/lib/coords";
import {
  LAND_USES,
  buildingFootprint,
  expandedRect,
  footprintBlocks,
  getPlot,
  nudgeOffBuilding,
  pointInRect,
  yardTreeSpots,
} from "@/lib/plots";
import { SCENERY } from "@/lib/scenery";
import { makeTrafficRoutes, pointOnPath } from "@/lib/traffic";
import { useWorld } from "@/components/world/world-store";

export function TreeField() {
  const core = useMemo(() => SCENERY.filter((s) => s.kind === "tree"), []);
  const trunks = useRef<THREE.InstancedMesh>(null);
  const oaks = useRef<THREE.InstancedMesh>(null);
  const pines = useRef<THREE.InstancedMesh>(null);
  const willows = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const {
    claimedPlotIds,
    claimedExtras,
    claimedPlaces,
    claimedUses,
    selectedPlotId,
    selectedPlotIds,
    previewUseId,
    plotExpand,
    buildingPlace,
    landSlice,
  } = useWorld();
  const claimed = useMemo(() => new Set(claimedPlotIds), [claimedPlotIds]);
  const hideLots = useMemo(() => {
    const rects: { x: number; y: number; w: number; h: number }[] = [];
    const ids = selectedPlotIds.length ? selectedPlotIds : selectedPlotId ? [selectedPlotId] : [];
    for (const id of ids) {
      const preview = getPlot(id);
      if (preview?.kind === "sale" && !claimed.has(preview.id)) {
        const land = id === selectedPlotId && landSlice ? { ...preview, ...landSlice } : preview;
        rects.push(expandedRect(land, id === selectedPlotId ? plotExpand : 0));
      }
    }
    for (const id of claimedPlotIds) {
      const p = getPlot(id);
      if (p) rects.push(expandedRect(p, claimedExtras[id] ?? 0));
    }
    return rects;
  }, [claimedPlotIds, claimedExtras, selectedPlotId, selectedPlotIds, plotExpand, landSlice, claimed]);
  const blockers = useMemo(
    () =>
      footprintBlocks(
        claimedPlotIds,
        claimedExtras,
        claimedPlaces,
        claimedUses,
        selectedPlotId && !claimed.has(selectedPlotId)
          ? {
              id: selectedPlotId,
              extra: plotExpand,
              useId: previewUseId,
              place: buildingPlace,
            }
          : null,
      ),
    [
      claimedPlotIds,
      claimedExtras,
      claimedPlaces,
      claimedUses,
      selectedPlotId,
      plotExpand,
      previewUseId,
      buildingPlace,
      claimed,
    ],
  );
  const all = useMemo(() => {
    const scenery = core
      .filter((t) => !hideLots.some((r) => pointInRect(t.x, t.y, r)))
      .map((t) => ({
        x: t.x,
        y: t.y,
        kind: t.assetId.includes("pine") ? "pine" : t.assetId.includes("willow") ? "willow" : "oak",
      }));
    const yards: { x: number; y: number; kind: string }[] = [];
    for (const id of claimedPlotIds) {
      const p = getPlot(id);
      if (!p) continue;
      const use = LAND_USES.find((u) => u.id === claimedUses[id]) ?? LAND_USES[0]!;
      const fp = buildingFootprint(p, use, claimedExtras[id] ?? 0, claimedPlaces[id]);
      if (!fp) continue;
      for (const spot of yardTreeSpots(id, fp)) {
        yards.push({ x: spot.x, y: spot.y, kind: spot.pine ? "pine" : "oak" });
      }
    }
    return [...scenery, ...yards];
  }, [core, hideLots, claimedPlotIds, claimedUses, claimedExtras, claimedPlaces]);

  useLayoutEffect(() => {
    const t = trunks.current;
    const oak = oaks.current;
    const pine = pines.current;
    const willow = willows.current;
    if (!t || !oak || !pine || !willow) return;
    const hide = () => {
      dummy.scale.set(0, 0, 0);
      dummy.position.set(0, 0, 0);
      dummy.updateMatrix();
    };
    all.forEach((tree, i) => {
      const moved = nudgeOffBuilding(tree.x, tree.y, blockers);
      const ix = moved ? Math.floor(moved.x) : -1;
      const iy = moved ? Math.floor(moved.y) : -1;
      const tile = ix >= 0 && iy >= 0 && ix < GRID && iy < GRID ? TERRAIN[iy]![ix] : null;
      const s = 0.65 + ((tree.x * 7 + tree.y) % 5) * 0.07;
      if (!moved || tile === "road" || tile === "water") {
        hide();
        t.setMatrixAt(i, dummy.matrix);
        oak.setMatrixAt(i, dummy.matrix);
        pine.setMatrixAt(i, dummy.matrix);
        willow.setMatrixAt(i, dummy.matrix);
        return;
      }
      dummy.position.set(wx(moved.x), h(0.42) * s, wz(moved.y));
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      t.setMatrixAt(i, dummy.matrix);
      hide();
      oak.setMatrixAt(i, dummy.matrix);
      pine.setMatrixAt(i, dummy.matrix);
      willow.setMatrixAt(i, dummy.matrix);
      dummy.position.set(wx(moved.x), (tree.kind === "pine" ? h(1.28) : h(1.08)) * s, wz(moved.y));
      if (tree.kind === "pine") dummy.scale.set(s * 0.85, s * 1.35, s * 0.85);
      else if (tree.kind === "willow") dummy.scale.set(s * 1.15, s * 0.72, s * 1.15);
      else dummy.scale.set(s * 1.05, s * 0.92, s * 1.05);
      dummy.updateMatrix();
      if (tree.kind === "pine") pine.setMatrixAt(i, dummy.matrix);
      else if (tree.kind === "willow") willow.setMatrixAt(i, dummy.matrix);
      else oak.setMatrixAt(i, dummy.matrix);
    });
    t.instanceMatrix.needsUpdate = true;
    oak.instanceMatrix.needsUpdate = true;
    pine.instanceMatrix.needsUpdate = true;
    willow.instanceMatrix.needsUpdate = true;
  }, [all, dummy, blockers]);

  if (!all.length) return null;
  return (
    <group>
      <instancedMesh ref={trunks} args={[undefined, undefined, all.length]} castShadow>
        <cylinderGeometry args={[h(0.045), h(0.09), h(0.95), 6]} />
        <meshStandardMaterial color="#5a3c28" roughness={0.86} />
      </instancedMesh>
      <instancedMesh ref={oaks} args={[undefined, undefined, all.length]} castShadow>
        <icosahedronGeometry args={[h(0.5), 1]} />
        <meshStandardMaterial color="#2f6a34" roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={pines} args={[undefined, undefined, all.length]} castShadow>
        <coneGeometry args={[h(0.38), h(1.15), 7]} />
        <meshStandardMaterial color="#245c38" roughness={0.88} />
      </instancedMesh>
      <instancedMesh ref={willows} args={[undefined, undefined, all.length]} castShadow>
        <sphereGeometry args={[h(0.52), 8, 6]} />
        <meshStandardMaterial color="#4a7a40" roughness={0.92} />
      </instancedMesh>
    </group>
  );
}

export function BushField() {
  const bushes = useMemo(() => SCENERY.filter((s) => s.kind === "bush" || s.kind === "hedge"), []);
  const { selectedPlotId, selectedPlotIds, claimedPlotIds, plotExpand, landSlice } = useWorld();
  const claimed = useMemo(() => new Set(claimedPlotIds), [claimedPlotIds]);
  const hide = useMemo(() => {
    const rects: { x: number; y: number; w: number; h: number }[] = [];
    const ids = selectedPlotIds.length ? selectedPlotIds : selectedPlotId ? [selectedPlotId] : [];
    for (const id of ids) {
      const p = getPlot(id);
      if (p?.kind === "sale" && !claimed.has(p.id)) {
        const land = id === selectedPlotId && landSlice ? { ...p, ...landSlice } : p;
        rects.push(expandedRect(land, id === selectedPlotId ? plotExpand : 0));
      }
    }
    return rects;
  }, [selectedPlotId, selectedPlotIds, claimed, plotExpand, landSlice]);
  return (
    <group>
      {bushes.map((s) => {
        if (hide.some((r) => pointInRect(s.x, s.y, r))) return null;
        return (
          <mesh key={s.id} position={[wx(s.x), h(0.22), wz(s.y)]} castShadow>
            <sphereGeometry args={[s.kind === "hedge" ? h(0.32) : h(0.22), 6, 5]} />
            <meshStandardMaterial color={s.kind === "hedge" ? "#2d5c32" : "#3d7a3a"} roughness={0.9} />
          </mesh>
        );
      })}
    </group>
  );
}

export function AgentsLayer() {
  const { world, liveRef, selectedAgentId, selectAgent, setFollowAgent, setCameraScale, cameraScale, topView } = useWorld();
  const group = useRef<THREE.Group>(null);
  const agents = world.agents.filter((a) => a.mapId === "lot");
  const far = cameraScale < 0.55;
  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const list = liveRef.current.agents.filter((a) => a.mapId === "lot");
    for (let i = 0; i < g.children.length; i++) {
      const child = g.children[i];
      const a = list[i];
      if (!child || !a) continue;
      child.position.set(wx(a.x), far ? h(0.2) : h(0.12), wz(a.y));
    }
  });
  return (
    <group ref={group}>
      {agents.map((a) => (
        <group key={a.id} position={[wx(a.x), h(0.12), wz(a.y)]}>
          <mesh
            onClick={(e: ThreeEvent<MouseEvent>) => {
              e.stopPropagation();
              selectAgent(a.id);
              setFollowAgent(true);
              setCameraScale(1.75);
            }}
          >
            <capsuleGeometry args={a.live ? [h(0.12), h(0.1), 4, 8] : far ? [h(0.07), h(0.04), 3, 6] : [h(0.085), h(0.07), 4, 8]} />
            <meshStandardMaterial
              color={a.color}
              emissive={selectedAgentId === a.id ? "#ed712e" : a.live ? a.color : a.color}
              emissiveIntensity={selectedAgentId === a.id ? 0.4 : a.live ? 0.22 : 0.06}
            />
          </mesh>
          {a.live && !topView ? (
            <Html position={[0, h(0.55), 0]} center distanceFactor={12} occlude={false} pointerEvents="none">
              <div className="ns-nametag">
                <strong>{a.name}</strong>
                {a.speech ? <em>{a.speech}</em> : null}
              </div>
            </Html>
          ) : null}
        </group>
      ))}
    </group>
  );
}

const CARS = makeTrafficRoutes();

export function TrafficLayer() {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const g = group.current;
    if (!g) return;
    CARS.forEach((car, i) => {
      const child = g.children[i];
      if (!child) return;
      const dist = t * car.speed * 7 + car.phase * car.length;
      const p = pointOnPath(car, dist);
      child.visible = true;
      child.position.set(wx(p.x), h(0.14), wz(p.y));
      child.rotation.y = p.heading;
    });
  });
  return (
    <group ref={group}>
      {CARS.map((car, i) => (
        <group key={i} raycast={() => undefined}>
          <mesh position={[0, h(0.08), 0]} castShadow>
            <boxGeometry args={[h(0.22), h(0.1), h(0.42)]} />
            <meshStandardMaterial color={car.color} metalness={0.3} roughness={0.45} />
          </mesh>
          <mesh position={[0, h(0.16), h(-0.04)]} castShadow>
            <boxGeometry args={[h(0.18), h(0.1), h(0.22)]} />
            <meshStandardMaterial color="#1c1917" metalness={0.15} roughness={0.35} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function Lamps() {
  const lamps = useMemo(() => {
    const core = SCENERY.filter((s) => s.kind === "lamp").map((s) => ({ x: s.x, y: s.y }));
    return [...core, ...extraLamps()];
  }, []);
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    lamps.forEach((s, i) => {
      dummy.position.set(wx(s.x), h(1.35), wz(s.y));
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [lamps, dummy]);
  if (!lamps.length) return null;
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, lamps.length]} raycast={() => undefined}>
      <sphereGeometry args={[h(0.07), 6, 6]} />
      <meshStandardMaterial color="#ffe6a8" emissive="#ffd27a" emissiveIntensity={0.75} />
    </instancedMesh>
  );
}

export const TILE_HINT = TILE;
