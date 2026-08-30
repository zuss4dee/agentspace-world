"use client";

import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { BuildingsLayer } from "@/components/world/gl/buildings";
import { ExplorerCamera } from "@/components/world/gl/camera-rig";
import { InteriorRoom } from "@/components/world/gl/interior";
import { AgentsLayer, BushField, Lamps, TrafficLayer, TreeField } from "@/components/world/gl/life";
import { DistantFills, TerrainMesh, WaterPlane } from "@/components/world/gl/terrain";
import { useWorld } from "@/components/world/world-store";
import { fromWorld } from "@/lib/coords";

function ExteriorScene() {
  const { selectBuilding, selectAgent, focusCoord } = useWorld();
  const onMiss = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 4) return;
    selectBuilding(null);
    selectAgent(null);
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
      <fog attach="fog" args={["#a7c6d8", 48, 168]} />
      <hemisphereLight args={["#fff1dc", "#3f5a44", 0.78]} />
      <directionalLight
        position={[48, 62, 28]}
        intensity={1.45}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={160}
        shadow-camera-left={-70}
        shadow-camera-right={70}
        shadow-camera-top={70}
        shadow-camera-bottom={-70}
      />
      <ambientLight intensity={0.18} />
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
  return (
    <Canvas
      shadows
      dpr={[1, 1.6]}
      camera={{ position: [38, 42, 38], fov: 42, near: 0.3, far: 260 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      className="size-full touch-none"
    >
      <Scene />
    </Canvas>
  );
}
