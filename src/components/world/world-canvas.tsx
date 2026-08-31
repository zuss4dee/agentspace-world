"use client";

import { useLayoutEffect, useRef } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { BeaconMarker } from "@/components/world/gl/beacon-marker";
import { BuildingsLayer } from "@/components/world/gl/buildings";
import { PlotsLayer, SaleStakes } from "@/components/world/gl/plots-layer";
import { ExplorerCamera } from "@/components/world/gl/camera-rig";
import { LockedLand } from "@/components/world/gl/locked-land";
import { InteriorRoom } from "@/components/world/gl/interior";
import { AgentsLayer, BushField, Lamps, TrafficLayer, TreeField } from "@/components/world/gl/life";
import { DistantFills, TerrainMesh, WaterPlane } from "@/components/world/gl/terrain";
import { useWorld } from "@/components/world/world-store";
import { GRID, TERRAIN, districtAt } from "@/lib/campus";
import { TILE, fromWorld, wx, wz } from "@/lib/coords";
import { plotAt } from "@/lib/plots";
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
    l.position.set(camera.position.x + 28, camera.position.y + 36, camera.position.z + 16);
    l.target.position.set(camera.position.x - 6, 0, camera.position.z - 6);
    l.target.updateMatrixWorld();
  });
  return (
    <directionalLight
      ref={ref}
      intensity={1.35}
      castShadow
      shadow-mapSize={[2048, 2048]}
      shadow-camera-far={90}
      shadow-camera-left={-32}
      shadow-camera-right={32}
      shadow-camera-top={32}
      shadow-camera-bottom={-32}
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
  return (
    <>
      <color attach="background" args={["#8eb8d6"]} />
      <fog attach="fog" args={["#9fc4d6", 16, 38]} />
      <hemisphereLight args={["#fff1dc", "#3f5a44", 0.78]} />
      <LightFollow />
      <ambientLight intensity={0.22} />
      <ExplorerCamera />
      <mesh
        rotation-x={-Math.PI / 2}
        position={[0, 0.01, 0]}
        onClick={onMiss}
        onDoubleClick={onDouble}
      >
        <planeGeometry args={[GRID * TILE, GRID * TILE]} />
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
      <Lamps />
      <PlotsLayer />
      <SaleStakes />
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
          : { position: [wx(28.5) + 9, 12, wz(8) + 9], fov: 42, near: 0.3, far: 160 }
      }
      gl={{ antialias: true, powerPreference: "high-performance" }}
      className="size-full touch-none cursor-grab active:cursor-grabbing"
    >
      <Scene />
    </Canvas>
  );
}
