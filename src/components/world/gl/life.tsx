"use client";

import { useMemo, useRef } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { GRID, TERRAIN } from "@/lib/campus";
import { TILE, wx, wz } from "@/lib/coords";
import { SCENERY, TRAFFIC } from "@/lib/scenery";
import { useWorld } from "@/components/world/world-store";

export function TreeField() {
  const trees = useMemo(() => SCENERY.filter((s) => s.kind === "tree"), []);
  return (
    <group>
      {trees.map((t) => {
        const s = 0.7 + ((t.x * 7 + t.y) % 5) * 0.08;
        return (
          <group key={t.id} position={[wx(t.x), 0, wz(t.y)]}>
            <mesh position={[0, 0.45 * s, 0]} castShadow>
              <cylinderGeometry args={[0.05 * s, 0.08 * s, 0.9 * s, 5]} />
              <meshStandardMaterial color="#5a3c28" />
            </mesh>
            <mesh position={[0, 1.15 * s, 0]} castShadow>
              {t.assetId.includes("pine") ? (
                <coneGeometry args={[0.55 * s, 1.4 * s, 7]} />
              ) : (
                <sphereGeometry args={[0.55 * s, 8, 6]} />
              )}
              <meshStandardMaterial color={t.assetId.includes("maple") ? "#3d8a3a" : "#2f6d38"} roughness={0.85} />
            </mesh>
          </group>
        );
      })}
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
  const { world, liveRef, selectedAgentId, selectAgent, setFollowAgent, setCameraScale } = useWorld();
  const group = useRef<THREE.Group>(null);
  const agents = world.agents.filter((a) => a.mapId === "lot");
  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const agents = liveRef.current.agents.filter((a) => a.mapId === "lot");
    for (let i = 0; i < g.children.length; i++) {
      const child = g.children[i];
      const a = agents[i];
      if (!child || !a) continue;
      child.position.set(wx(a.x), 0.12, wz(a.y));
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
          <capsuleGeometry args={[0.09, 0.08, 4, 8]} />
          <meshStandardMaterial
            color={a.color}
            emissive={selectedAgentId === a.id ? "#ed712e" : a.color}
            emissiveIntensity={selectedAgentId === a.id ? 0.4 : 0.05}
          />
        </mesh>
      ))}
    </group>
  );
}

export function TrafficLayer() {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const g = group.current;
    if (!g) return;
    TRAFFIC.forEach((car, i) => {
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
      child.position.set(wx(x), 0.18, wz(y));
      child.rotation.y = car.axis === "x" ? Math.PI / 2 : 0;
    });
  });
  return (
    <group ref={group}>
      {TRAFFIC.map((car, i) => (
        <mesh key={i} castShadow>
          <boxGeometry args={[0.55, 0.22, 0.28]} />
          <meshStandardMaterial color={car.color} metalness={0.35} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

export function Lamps() {
  const lamps = useMemo(() => SCENERY.filter((s) => s.kind === "lamp"), []);
  return (
    <group>
      {lamps.map((s) => (
        <group key={s.id} position={[wx(s.x), 0, wz(s.y)]}>
          <mesh position={[0, 0.7, 0]}>
            <cylinderGeometry args={[0.03, 0.04, 1.4, 5]} />
            <meshStandardMaterial color="#3a3f46" />
          </mesh>
          <mesh position={[0, 1.42, 0]}>
            <sphereGeometry args={[0.08, 6, 6]} />
            <meshStandardMaterial color="#ffe6a8" emissive="#ffd27a" emissiveIntensity={0.8} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export const TILE_HINT = TILE;
