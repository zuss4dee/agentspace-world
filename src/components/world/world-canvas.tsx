"use client";

import { useLayoutEffect, useRef } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { BeaconMarker } from "@/components/world/gl/beacon-marker";
import { BuildingsLayer } from "@/components/world/gl/buildings";
import { BuildingGhost, ClaimedMarks, LatticeField, PlotsLayer, SaleStakes } from "@/components/world/gl/plots-layer";
import { ExplorerCamera } from "@/components/world/gl/camera-rig";
import { LockedLand } from "@/components/world/gl/locked-land";
import { InteriorRoom } from "@/components/world/gl/interior";
import { StreetsLayer } from "@/components/world/gl/streets";
import { AgentsLayer, BushField, TrafficLayer, TreeField } from "@/components/world/gl/life";
import { DistantFills, TerrainMesh, WaterPlane } from "@/components/world/gl/terrain";
import { useWorld } from "@/components/world/world-store";
import { GRID, TERRAIN, districtAt } from "@/lib/campus";
import { TILE, fromWorld, h, wx, wz } from "@/lib/coords";
import { landBounds, plotAt } from "@/lib/plots";
import { sectionAt } from "@/lib/world-sections";

function LightFollow() {
  const ref = useRef<THREE.DirectionalLight>(null);
  const scene = useThree((s) => s.scene);
  useLayoutEffect(() => {
    const l = ref.current;
    if (l) scene.add(l.target);
  }, [scene]);
  useFrame(({ camera }) => {
    const l = ref.current;
    if (!l) return;
    l.position.set(camera.position.x + h(28), camera.position.y + h(36), camera.position.z + h(16));
    l.target.position.set(camera.position.x - h(6), 0, camera.position.z - h(6));
    l.target.updateMatrixWorld();
  });
  return (
    <directionalLight
      ref={ref}
      intensity={1.35}
      castShadow
      shadow-mapSize={[2048, 2048]}
      shadow-camera-far={h(90)}
      shadow-camera-left={-h(32)}
      shadow-camera-right={h(32)}
      shadow-camera-top={h(32)}
      shadow-camera-bottom={-h(32)}
    />
  );
}

function ExteriorScene() {
  const { selectBuilding, selectAgent, selectDistrict, selectPlot, focusCoord } = useWorld();
  const onMiss = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 4) return;
    const g = fromWorld(e.point.x, e.point.z);
    const locked = sectionAt(g.x, g.y);
    if (locked?.locked) {
      selectPlot(null);
      selectBuilding(null);
      selectAgent(null);
      selectDistrict(`locked:${locked.id}`);
      return;
    }
    const p = plotAt(g.x, g.y);
    if (p) {
      selectPlot(p.id);
      return;
    }
    const ix = Math.floor(g.x);
    const iy = Math.floor(g.y);
    const tile = ix >= 0 && iy >= 0 && ix < GRID && iy < GRID ? TERRAIN[iy]![ix] : null;
    const d = districtAt(g.x, g.y);
    selectPlot(null);
    selectBuilding(null);
    selectAgent(null);
    selectDistrict(d?.id ?? (tile === "road" ? "street" : null));
  };
  const onDouble = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const p = e.point;
    const g = fromWorld(p.x, p.z);
    if (sectionAt(g.x, g.y)?.locked) return;
    focusCoord(g.x, g.y, 1.15);
  };
  const land = landBounds();
  const planeW = Math.max(GRID, land.x1) * TILE;
  const planeD = Math.max(GRID, land.y1) * TILE;
  const planeX = wx(Math.max(GRID, land.x1) / 2);
  const planeZ = wz(Math.max(GRID, land.y1) / 2);
  return (
    <>
      <color attach="background" args={["#8eb8d6"]} />
      <fog attach="fog" args={["#9fc4d6", h(16), h(38)]} />
      <hemisphereLight args={["#fff1dc", "#3f5a44", 0.78]} />
      <LightFollow />
      <ambientLight intensity={0.22} />
      <ExplorerCamera />
      <mesh
        rotation-x={-Math.PI / 2}
        position={[planeX, h(0.01), planeZ]}
        onClick={onMiss}
        onDoubleClick={onDouble}
      >
        <planeGeometry args={[planeW, planeD]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <group>
        <TerrainMesh />
      </group>
      <WaterPlane />
      <DistantFills />
      <LockedLand />
      <TreeField />
      <BushField />
      <LatticeField />
      <PlotsLayer />
      <StreetsLayer />
      <SaleStakes />
      <ClaimedMarks />
      <BuildingGhost />
      <BuildingsLayer />
      <BeaconMarker />
      <TrafficLayer />
      <AgentsLayer />
    </>
  );
}

function Scene() {
  const { interiorId } = useWorld();
  return interiorId ? <InteriorRoom /> : <ExteriorScene />;
}

export function WorldCanvas() {
  const { interiorId } = useWorld();
  return (
    <Canvas
      key={interiorId ? `in-${interiorId}` : "out"}
      shadows
      dpr={[1, 1.6]}
      camera={
        interiorId
          ? { position: [2.4, 2.15, 4.35], fov: 50, near: 0.08, far: 48 }
          : { position: [wx(28.5) + h(9), h(12), wz(8) + h(9)], fov: 42, near: h(0.3), far: h(4200) }
      }
      gl={{ antialias: true, powerPreference: "high-performance" }}
      className="size-full touch-none cursor-grab active:cursor-grabbing"
    >
      <Scene />
    </Canvas>
  );
}
