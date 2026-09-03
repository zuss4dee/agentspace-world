"use client";

import { Canvas, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { BeaconMarker } from "@/components/world/gl/beacon-marker";
import { BrandMarkersLayer } from "@/components/world/gl/brand-markers-layer";
import { LogoPlacementLayer } from "@/components/world/gl/logo-placement-layer";
import { BuildingsLayer } from "@/components/world/gl/buildings";
import { BuildingGhost, ClaimedMarks, LatticeField, PlotsLayer, SaleStakes } from "@/components/world/gl/plots-layer";
import { ExplorerCamera } from "@/components/world/gl/camera-rig";
import { ArchVizFinish, ArchVizLights } from "@/components/world/gl/arch-viz";
import { LockedLand } from "@/components/world/gl/locked-land";
import { InteriorRoom } from "@/components/world/gl/interior";
import { AgentsLayer, BushField, Lamps, TrafficLayer, TreeField } from "@/components/world/gl/life";
import { StreetLife } from "@/components/world/gl/street-life";
import { AuthoredEnvironmentLayer } from "@/components/world/gl/env-gltf";
import { AuthoredWorldLayer, preloadAuthoredWorld } from "@/components/world/gl/world-gltf";
import { StreetsLayer } from "@/components/world/gl/streets";
import { GrassTufts, TerrainMesh, WaterPlane } from "@/components/world/gl/terrain";
import { WorldEnvironment } from "@/components/world/gl/world-environment";
import { atmospherePreset, DEFAULT_ATMOSPHERE } from "@/lib/atmosphere";
import { useWorld } from "@/components/world/world-store";
import { GRID, TERRAIN, districtAt } from "@/lib/campus";
import { TILE, fromWorld, h, wx, wz } from "@/lib/coords";
import { landBounds, plotAt, isLotMultiModifier } from "@/lib/plots";
import { sectionAt } from "@/lib/world-sections";
import { BUILDINGS_ENABLED } from "@/lib/architecture-stage";
import { ARCH_EXPOSURE } from "@/lib/arch-viz";
import { AUTHORED_WORLD_ENABLED } from "@/lib/world-gltf";

preloadAuthoredWorld();

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
      selectPlot(p.id, { additive: isLotMultiModifier(e) });
      return;
    }
    const ix = Math.floor(g.x);
    const iy = Math.floor(g.y);
    const tile = ix >= 0 && iy >= 0 && ix < GRID && iy < GRID ? TERRAIN[iy]![ix] : null;
    const d = districtAt(g.x, g.y);
    if (isLotMultiModifier(e)) return;
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
  const atmos = atmospherePreset(DEFAULT_ATMOSPHERE);
  return (
    <>
      <WorldEnvironment atmosphereId={DEFAULT_ATMOSPHERE} />
      <hemisphereLight args={[atmos.hemisphere.sky, atmos.hemisphere.ground, atmos.hemisphere.intensity]} />
      <ambientLight intensity={atmos.ambient} />
      <ArchVizLights />
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
      {AUTHORED_WORLD_ENABLED ? (
        <AuthoredWorldLayer />
      ) : (
        <>
          <group>
            <TerrainMesh />
            <GrassTufts />
          </group>
          <AuthoredEnvironmentLayer />
          <StreetsLayer />
          <WaterPlane />
          <TreeField />
          <BushField />
          <StreetLife />
          <Lamps />
        </>
      )}
      <LockedLand />
      <LatticeField />
      <PlotsLayer />
      <SaleStakes />
      <ClaimedMarks />
      <BuildingGhost />
      <BuildingsLayer />
      <BrandMarkersLayer />
      <LogoPlacementLayer />
      <BeaconMarker />
      <TrafficLayer />
      <AgentsLayer />
      <ArchVizFinish />
    </>
  );
}

function Scene() {
  const { interiorId } = useWorld();
  if (!BUILDINGS_ENABLED) return <ExteriorScene />;
  return interiorId ? <InteriorRoom /> : <ExteriorScene />;
}

export function WorldCanvas() {
  const { interiorId } = useWorld();
  return (
    <Canvas
      key={interiorId ? `in-${interiorId}` : "out"}
      shadows
      dpr={[1, 2]}
      camera={
        interiorId
          ? { position: [2.4, 2.15, 4.35], fov: 50, near: 0.08, far: 48 }
          : { position: [wx(28.5) + h(9), h(12), wz(8) + h(9)], fov: 36, near: h(0.3), far: h(4200) }
      }
      gl={{
        alpha: false,
        antialias: true,
        powerPreference: "high-performance",
        outputColorSpace: THREE.SRGBColorSpace,
        toneMapping: THREE.AgXToneMapping,
        toneMappingExposure: ARCH_EXPOSURE,
      }}
      onCreated={({ gl }) => {
        gl.setClearColor(atmospherePreset(DEFAULT_ATMOSPHERE).background, 1);
      }}
      className="size-full touch-none cursor-grab active:cursor-grabbing"
    >
      <Scene />
    </Canvas>
  );
}
