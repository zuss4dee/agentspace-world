"use client";

import { useEffect, useRef } from "react";
import { MapControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useWorld } from "@/components/world/world-store";
import { GRID } from "@/lib/campus";
import { distFromScale, TILE, wx, wz } from "@/lib/coords";

type ControlsApi = {
  target: THREE.Vector3;
  update: () => void;
};

const keys = new Set<string>();
const HALF = (GRID * TILE) / 2 - 10;

export function ExplorerCamera() {
  const { cameraFocus, cameraScale, followAgent, selectedAgentId, liveRef, interiorId, cameraTick } = useWorld();
  const controls = useRef<ControlsApi | null>(null);
  const camera = useThree((s) => s.camera);
  const lock = useRef(true);
  const applyDist = useRef(true);
  const lastTick = useRef(cameraTick);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) {
        keys.add(k);
        lock.current = false;
        applyDist.current = false;
      }
    };
    const up = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useFrame((_, dt) => {
    const c = controls.current;
    if (!c) return;
    if (cameraTick !== lastTick.current) {
      lastTick.current = cameraTick;
      applyDist.current = true;
      lock.current = true;
    }
    let fx = cameraFocus?.x ?? 24;
    let fy = cameraFocus?.y ?? 24;
    if (followAgent && selectedAgentId) {
      const a = liveRef.current.agents.find((ag) => ag.id === selectedAgentId);
      if (a) {
        fx = a.x;
        fy = a.y;
        lock.current = true;
      }
    }

    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    if (forward.lengthSq() < 0.0001) forward.set(0, 0, -1);
    forward.normalize();
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
    const pan = 22 * dt * (keys.has("shift") ? 1.8 : 1);
    if (keys.has("w") || keys.has("arrowup")) c.target.addScaledVector(forward, pan);
    if (keys.has("s") || keys.has("arrowdown")) c.target.addScaledVector(forward, -pan);
    if (keys.has("d") || keys.has("arrowright")) c.target.addScaledVector(right, pan);
    if (keys.has("a") || keys.has("arrowleft")) c.target.addScaledVector(right, -pan);

    if (lock.current || followAgent) {
      const k = Math.min(1, dt * 3.4);
      c.target.x += (wx(fx) - c.target.x) * k;
      c.target.z += (wz(fy) - c.target.z) * k;
      c.target.y += ((interiorId ? 1.15 : 0.35) - c.target.y) * k;
    }
    c.target.x = THREE.MathUtils.clamp(c.target.x, -HALF, HALF);
    c.target.z = THREE.MathUtils.clamp(c.target.z, -HALF, HALF);

    if (applyDist.current || interiorId) {
      const want = interiorId ? 7.2 : distFromScale(cameraScale);
      const current = camera.position.distanceTo(c.target);
      const next = current + (want - current) * Math.min(1, dt * 2.6);
      const dir = camera.position.clone().sub(c.target);
      if (dir.lengthSq() < 0.001) dir.set(16, 18, 16);
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
      dampingFactor={0.085}
      minDistance={3.6}
      maxDistance={160}
      maxPolarAngle={Math.PI / 2.18}
      minPolarAngle={0.28}
      screenSpacePanning
      zoomToCursor
      mouseButtons={{
        LEFT: THREE.MOUSE.PAN,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.ROTATE,
      }}
      onStart={() => {
        lock.current = false;
        applyDist.current = false;
      }}
    />
  );
}
