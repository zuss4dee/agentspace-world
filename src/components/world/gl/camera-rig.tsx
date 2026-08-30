"use client";

import { useEffect, useRef } from "react";
import { MapControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useWorld } from "@/components/world/world-store";
import { distFromScale, MAX_VIEW_DIST, MIN_VIEW_DIST, wx, wz } from "@/lib/coords";
import { cameraPanLimits } from "@/lib/world-sections";

type ControlsApi = {
  target: THREE.Vector3;
  update: () => void;
  enabled: boolean;
};

const keys = new Set<string>();

export function ExplorerCamera() {
  const { cameraFocus, cameraScale, followAgent, selectedAgentId, liveRef, interiorId, cameraTick } = useWorld();
  const controls = useRef<ControlsApi | null>(null);
  const camera = useThree((s) => s.camera);
  const applyDist = useRef(false);
  const lastTick = useRef(cameraTick);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const k = e.key.toLowerCase();
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) {
        keys.add(k);
        e.preventDefault();
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
    }

    if (followAgent && selectedAgentId) {
      const a = liveRef.current.agents.find((ag) => ag.id === selectedAgentId);
      if (a) {
        const k = Math.min(1, dt * 5);
        c.target.x += (wx(a.x) - c.target.x) * k;
        c.target.z += (wz(a.y) - c.target.z) * k;
      }
    } else if (applyDist.current && cameraFocus) {
      const k = Math.min(1, dt * 4.2);
      c.target.x += (wx(cameraFocus.x) - c.target.x) * k;
      c.target.z += (wz(cameraFocus.y) - c.target.z) * k;
    }

    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    if (forward.lengthSq() < 0.0001) forward.set(0, 0, -1);
    forward.normalize();
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
    const pan = 48 * dt;
    if (keys.has("w") || keys.has("arrowup")) c.target.addScaledVector(forward, pan);
    if (keys.has("s") || keys.has("arrowdown")) c.target.addScaledVector(forward, -pan);
    if (keys.has("d") || keys.has("arrowright")) c.target.addScaledVector(right, pan);
    if (keys.has("a") || keys.has("arrowleft")) c.target.addScaledVector(right, -pan);

    c.target.y = interiorId ? 1.15 : 0.2;
    c.update();

    if (!interiorId) {
      const lim = cameraPanLimits();
      c.target.x = THREE.MathUtils.clamp(c.target.x, lim.minX, lim.maxX);
      c.target.z = THREE.MathUtils.clamp(c.target.z, lim.minZ, lim.maxZ);
    }

    if (applyDist.current || interiorId) {
      const want = interiorId ? 7.2 : distFromScale(cameraScale);
      const current = camera.position.distanceTo(c.target);
      const next = current + (want - current) * Math.min(1, dt * 3.2);
      const dir = camera.position.clone().sub(c.target);
      if (dir.lengthSq() < 0.001) dir.set(14, 16, 14);
      dir.normalize().multiplyScalar(next);
      camera.position.copy(c.target).add(dir);
      if (!interiorId && Math.abs(want - next) < 0.35) applyDist.current = false;
    }

    if (!interiorId) {
      const d = camera.position.distanceTo(c.target);
      const capped = THREE.MathUtils.clamp(d, MIN_VIEW_DIST, MAX_VIEW_DIST);
      if (Math.abs(capped - d) > 0.04) {
        const dir = camera.position.clone().sub(c.target);
        if (dir.lengthSq() < 0.001) dir.set(14, 16, 14);
        dir.normalize().multiplyScalar(capped);
        camera.position.copy(c.target).add(dir);
      }
    }
  });

  return (
    <MapControls
      ref={controls as never}
      makeDefault
      enableDamping
      dampingFactor={0.18}
      enablePan
      enableRotate={Boolean(interiorId)}
      enableZoom
      panSpeed={1.6}
      rotateSpeed={0.55}
      zoomSpeed={1.15}
      minDistance={MIN_VIEW_DIST}
      maxDistance={MAX_VIEW_DIST}
      maxPolarAngle={interiorId ? Math.PI / 2.05 : Math.PI / 3}
      minPolarAngle={interiorId ? 0.12 : Math.PI / 3}
      screenSpacePanning
      zoomToCursor
      mouseButtons={{
        LEFT: THREE.MOUSE.PAN,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: interiorId ? THREE.MOUSE.ROTATE : THREE.MOUSE.PAN,
      }}
      onStart={() => {
        applyDist.current = false;
      }}
    />
  );
}
