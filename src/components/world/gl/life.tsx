"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { GRID, TERRAIN } from "@/lib/campus";
import { extraLamps, extraTraffic } from "@/lib/city-gen";
import { TILE, wx, wz } from "@/lib/coords";
import { SCENERY, TRAFFIC } from "@/lib/scenery";
import { useWorld } from "@/components/world/world-store";

export function TreeField() {
  const core = useMemo(() => SCENERY.filter((s) => s.kind === "tree"), []);
  const all = useMemo(() => core.map((t) => ({ x: t.x, y: t.y, pine: t.assetId.includes("pine") })), [core]);
  const trunks = useRef<THREE.InstancedMesh>(null);
  const canopies = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useLayoutEffect(() => {
    const t = trunks.current;
    const c = canopies.current;
    if (!t || !c) return;
    all.forEach((tree, i) => {
      const s = 0.65 + ((tree.x * 7 + tree.y) % 5) * 0.07;
      dummy.position.set(wx(tree.x), 0.42 * s, wz(tree.y));
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      t.setMatrixAt(i, dummy.matrix);
      dummy.position.set(wx(tree.x), 1.12 * s, wz(tree.y));
      dummy.scale.set(tree.pine ? s * 0.9 : s, tree.pine ? s * 1.15 : s, tree.pine ? s * 0.9 : s);
      dummy.updateMatrix();
      c.setMatrixAt(i, dummy.matrix);
    });
    t.instanceMatrix.needsUpdate = true;
    c.instanceMatrix.needsUpdate = true;
  }, [all, dummy]);

  if (!all.length) return null;
  return (
    <group>
      <instancedMesh ref={trunks} args={[undefined, undefined, all.length]} castShadow>
        <cylinderGeometry args={[0.05, 0.08, 0.9, 5]} />
        <meshStandardMaterial color="#5a3c28" />
      </instancedMesh>
      <instancedMesh ref={canopies} args={[undefined, undefined, all.length]} castShadow>
        <sphereGeometry args={[0.52, 7, 5]} />
        <meshStandardMaterial color="#2f6d38" roughness={0.86} />
      </instancedMesh>
    </group>
  );
}

export function BushField() {
  const bushes = useMemo(() => SCENERY.filter((s) => s.kind === "bush" || s.kind === "hedge" || s.kind === "planter"), []);
  return (
    <group>
      {bushes.map((s) => (
        <mesh key={s.id} position={[wx(s.x), 0.22, wz(s.y)]} castShadow>
          <sphereGeometry args={[s.kind === "hedge" ? 0.32 : 0.22, 6, 5]} />
          <meshStandardMaterial color="#3d7a3a" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

export function AgentsLayer() {
  const { world, liveRef, selectedAgentId, selectAgent, setFollowAgent, setCameraScale, cameraScale } = useWorld();
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
      child.position.set(wx(a.x), far ? 0.2 : 0.12, wz(a.y));
    }
  });
  return (
    <group ref={group}>
      {agents.map((a) => (
        <mesh
          key={a.id}
          position={[wx(a.x), 0.12, wz(a.y)]}
          onClick={(e: ThreeEvent<MouseEvent>) => {
            e.stopPropagation();
            selectAgent(a.id);
            setFollowAgent(true);
            setCameraScale(1.75);
          }}
        >
          <capsuleGeometry args={far ? [0.07, 0.04, 3, 6] : [0.085, 0.07, 4, 8]} />
          <meshStandardMaterial
            color={a.color}
            emissive={selectedAgentId === a.id ? "#ed712e" : a.color}
            emissiveIntensity={selectedAgentId === a.id ? 0.4 : 0.06}
          />
        </mesh>
      ))}
    </group>
  );
}

const CARS = [...TRAFFIC, ...extraTraffic()];

export function TrafficLayer() {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const g = group.current;
    if (!g) return;
    CARS.forEach((car, i) => {
      const child = g.children[i];
      if (!child) return;
      const u = ((t * car.speed * 6 + car.phase * GRID) % GRID + GRID) % GRID;
      let x = car.lane;
      let y = u;
      if (car.axis === "x") {
        x = u;
        y = car.lane;
      }
      const ix = Math.min(GRID - 1, Math.floor(x));
      const iy = Math.min(GRID - 1, Math.floor(y));
      if (TERRAIN[iy]![ix] !== "road") {
        child.visible = false;
        return;
      }
      child.visible = true;
      child.position.set(wx(x), 0.16, wz(y));
      child.rotation.y = car.axis === "x" ? Math.PI / 2 : 0;
    });
  });
  return (
    <group ref={group}>
      {CARS.map((car, i) => (
        <mesh key={i} castShadow raycast={() => undefined}>
          <boxGeometry args={[0.48, 0.18, 0.24]} />
          <meshStandardMaterial color={car.color} metalness={0.35} roughness={0.4} />
        </mesh>
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
      dummy.position.set(wx(s.x), 1.35, wz(s.y));
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [lamps, dummy]);
  if (!lamps.length) return null;
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, lamps.length]} raycast={() => undefined}>
      <sphereGeometry args={[0.07, 6, 6]} />
      <meshStandardMaterial color="#ffe6a8" emissive="#ffd27a" emissiveIntensity={0.75} />
    </instancedMesh>
  );
}

export const TILE_HINT = TILE;
