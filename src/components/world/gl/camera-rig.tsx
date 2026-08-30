"use client";

import { useRef } from "react";
import { MapControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useWorld } from "@/components/world/world-store";
import { distFromScale, wx, wz } from "@/lib/coords";

type ControlsApi = {
  target: THREE.Vector3;
  update: () => void;
};

export function ExplorerCamera() {
  const { cameraFocus, cameraScale, followAgent, selectedAgentId, liveRef, interiorId } = useWorld();
  const controls = useRef<ControlsApi | null>(null);
  const camera = useThree((s) => s.camera);
  const lock = useRef(true);
  const applyDist = useRef(true);

  useFrame((_, dt) => {
    const c = controls.current;
    if (!c) return;
    let fx = cameraFocus?.x ?? 32;
    let fy = cameraFocus?.y ?? 32;
    if (followAgent && selectedAgentId) {
      const a = liveRef.current.agents.find((ag) => ag.id === selectedAgentId);
      if (a) {
        fx = a.x;
        fy = a.y;
        lock.current = true;
      }
    }
    if (lock.current || followAgent) {
      const k = Math.min(1, dt * 3.4);
      c.target.x += (wx(fx) - c.target.x) * k;
      c.target.z += (wz(fy) - c.target.z) * k;
      c.target.y += ((interiorId ? 1.15 : 0.35) - c.target.y) * k;
    }
    if (applyDist.current || interiorId) {
      const want = interiorId ? 7.2 : distFromScale(cameraScale);
      const current = camera.position.distanceTo(c.target);
      const next = current + (want - current) * Math.min(1, dt * 2.6);
      const dir = camera.position.clone().sub(c.target);
      if (dir.lengthSq() < 0.001) dir.set(18, 22, 18);
      dir.normalize().multiplyScalar(next);
      camera.position.copy(c.target).add(dir);
    }
    c.update();
  });

  return (
    <MapControls
      ref={controls as never}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minDistance={4.2}
      maxDistance={128}
      maxPolarAngle={Math.PI / 2.12}
      minPolarAngle={0.32}
      screenSpacePanning
      onStart={() => {
        lock.current = false;
        applyDist.current = false;
      }}
    />
  );
}
