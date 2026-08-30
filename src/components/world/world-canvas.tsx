"use client";

import { Suspense, useLayoutEffect, useRef } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { BuildingsLayer } from "@/components/world/gl/buildings";
import { ExplorerCamera } from "@/components/world/gl/camera-rig";
import { LandmarkSprites } from "@/components/world/gl/landmark-sprites";
import { CityLotsLayer } from "@/components/world/gl/city-lots";
import { InteriorRoom } from "@/components/world/gl/interior";
import { AgentsLayer, BushField, Lamps, TrafficLayer, TreeField } from "@/components/world/gl/life";
import { DistantFills, TerrainMesh, WaterPlane } from "@/components/world/gl/terrain";
import { useWorld } from "@/components/world/world-store";
import { GRID, TERRAIN, districtAt } from "@/lib/campus";
import { fromWorld } from "@/lib/coords";
import { buildingAnywhere } from "@/lib/city-gen";

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
    l.position.set(camera.position.x + 36, camera.position.y + 48, camera.position.z + 22);
    l.target.position.set(camera.position.x - 8, 0, camera.position.z - 8);
    l.target.updateMatrixWorld();
  });
  return (
    <directionalLight
      ref={ref}
      intensity={1.35}
      castShadow
      shadow-mapSize={[2048, 2048]}
      shadow-camera-far={120}
      shadow-camera-left={-40}
      shadow-camera-right={40}
      shadow-camera-top={40}
      shadow-camera-bottom={-40}
    />
  );
}

function ExteriorScene() {
  const { selectBuilding, selectAgent, selectDistrict, focusCoord } = useWorld();
  const onMiss = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 4) return;
    const g = fromWorld(e.point.x, e.point.z);
    const b = buildingAnywhere(g.x, g.y);
    if (b) {
      selectBuilding(b.id);
      selectDistrict(b.districtId);
      selectAgent(null);
      return;
    }
    const ix = Math.floor(g.x);
    const iy = Math.floor(g.y);
    const tile = ix >= 0 && iy >= 0 && ix < GRID && iy < GRID ? TERRAIN[iy]![ix] : null;
    const d = districtAt(g.x, g.y);
    selectBuilding(null);
    selectAgent(null);
    selectDistrict(d?.id ?? (tile === "road" ? "street" : null));
  };
  const onDouble = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const p = e.point;
    const g = fromWorld(p.x, p.z);
    focusCoord(g.x, g.y, 1.15);
  };
  return (
    <>
      <color attach="background" args={["#8eb8d6"]} />
      <fog attach="fog" args={["#9fc4d6", 70, 250]} />
      <hemisphereLight args={["#fff1dc", "#3f5a44", 0.78]} />
      <LightFollow />
      <ambientLight intensity={0.2} />
      <ExplorerCamera />
      <group onClick={onMiss} onDoubleClick={onDouble}>
        <TerrainMesh />
      </group>
      <WaterPlane />
      <DistantFills />
      <TreeField />
      <BushField />
      <Lamps />
      <BuildingsLayer />
      <CityLotsLayer />
      <Suspense fallback={null}>
        <LandmarkSprites />
      </Suspense>
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
          : { position: [-70, 24, -70], fov: 42, near: 0.35, far: 420 }
      }
      gl={{ antialias: true, powerPreference: "high-performance" }}
      className="size-full touch-none"
    >
      <Scene />
    </Canvas>
  );
}
