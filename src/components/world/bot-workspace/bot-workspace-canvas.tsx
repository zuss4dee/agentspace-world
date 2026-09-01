"use client";

import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { FloorPlanScene } from "@/components/world/bot-workspace/floor-plan-scene";
import type { WorkspaceBot } from "@/lib/bot-workspace";

export function BotWorkspaceCanvas({
  bots,
  selectedId,
  onSelect,
}: {
  bots: WorkspaceBot[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      orthographic
      camera={{ position: [0, 14, 0.001], zoom: 50, near: 0.1, far: 80, up: [0, 0, -1] }}
      gl={{
        alpha: false,
        antialias: true,
        powerPreference: "high-performance",
        outputColorSpace: THREE.SRGBColorSpace,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.05,
      }}
      onCreated={({ gl }) => {
        gl.setClearColor("#1c1814", 1);
      }}
      className="size-full touch-none"
    >
      <FloorPlanScene bots={bots} selectedId={selectedId} onSelect={onSelect} />
    </Canvas>
  );
}
