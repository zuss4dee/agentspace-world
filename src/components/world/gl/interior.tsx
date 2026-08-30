"use client";

import { useLayoutEffect } from "react";
import { OrbitControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { LOT_BUILDINGS } from "@/lib/campus";
import { useWorld } from "@/components/world/world-store";

function InteriorCamera() {
  const camera = useThree((s) => s.camera);
  useLayoutEffect(() => {
    camera.position.set(2.4, 2.15, 4.35);
    camera.near = 0.08;
    camera.far = 48;
    camera.updateProjectionMatrix();
    camera.lookAt(0, 1.05, 0);
  }, [camera]);
  return (
    <OrbitControls
      makeDefault
      enableDamping
      dampingFactor={0.1}
      target={[0, 1.05, 0]}
      minDistance={2.4}
      maxDistance={7.2}
      maxPolarAngle={Math.PI / 2.05}
      minPolarAngle={0.32}
    />
  );
}

export function InteriorRoom() {
  const { interiorId, world, selectAgent, setFollowAgent, setCameraScale } = useWorld();
  if (!interiorId) return null;
  const b = LOT_BUILDINGS.find((item) => item.id === interiorId);
  if (!b) return null;
  const w = 9.2;
  const d = 7.4;
  const agents = world.agents.filter((a) => a.buildingId === b.id && a.mapId === "lot");
  return (
    <>
      <color attach="background" args={["#1c1814"]} />
      <ambientLight intensity={0.45} />
      <hemisphereLight args={["#fff4e0", "#3a3028", 0.5]} />
      <pointLight position={[0, 3.2, 0]} intensity={18} distance={16} color="#fff1d6" />
      <pointLight position={[2.4, 2.4, 2]} intensity={6} distance={10} color="#ed712e" />
      <InteriorCamera />
      <group>
        <mesh rotation-x={-Math.PI / 2} receiveShadow position={[0, 0, 0]}>
          <planeGeometry args={[w, d]} />
          <meshStandardMaterial color="#d9cfc2" roughness={0.88} />
        </mesh>
        <mesh position={[0, 1.5, -d / 2]} receiveShadow>
          <boxGeometry args={[w, 3, 0.16]} />
          <meshStandardMaterial color={b.wall} roughness={0.62} />
        </mesh>
        <mesh position={[-1.8, 1.85, -d / 2 + 0.09]}>
          <boxGeometry args={[1.6, 1.15, 0.06]} />
          <meshStandardMaterial color="#8ec5e8" emissive="#3a6a88" emissiveIntensity={0.35} />
        </mesh>
        <mesh position={[1.8, 1.85, -d / 2 + 0.09]}>
          <boxGeometry args={[1.6, 1.15, 0.06]} />
          <meshStandardMaterial color="#8ec5e8" emissive="#3a6a88" emissiveIntensity={0.35} />
        </mesh>
        <mesh position={[0, 1.5, d / 2]} receiveShadow>
          <boxGeometry args={[w, 3, 0.16]} />
          <meshStandardMaterial color={b.wallDark} roughness={0.62} />
        </mesh>
        <mesh position={[-w / 2, 1.5, 0]} receiveShadow>
          <boxGeometry args={[0.16, 3, d]} />
          <meshStandardMaterial color={b.wallDark} roughness={0.62} />
        </mesh>
        <mesh position={[w / 2, 1.5, 0]} receiveShadow>
          <boxGeometry args={[0.16, 3, d]} />
          <meshStandardMaterial color={b.wall} roughness={0.62} />
        </mesh>
        <mesh position={[0, 3.05, 0]}>
          <boxGeometry args={[w, 0.12, d]} />
          <meshStandardMaterial color="#2a2420" roughness={0.9} />
        </mesh>
        {b.stations.map((s, i) => (
          <group key={s.id} position={[-2.2 + i * 2.1, 0, -0.6]}>
            <mesh position={[0, 0.38, 0]} castShadow>
              <boxGeometry args={[1.15, 0.76, 0.7]} />
              <meshStandardMaterial color="#6b4a28" roughness={0.7} />
            </mesh>
            <mesh position={[0, 0.82, 0]}>
              <boxGeometry args={[1.2, 0.06, 0.75]} />
              <meshStandardMaterial color="#c4a574" />
            </mesh>
          </group>
        ))}
        {agents.length === 0 ? (
          <mesh position={[0, 0.12, 1.6]}>
            <capsuleGeometry args={[0.09, 0.08, 4, 8]} />
            <meshStandardMaterial color="#94a3b8" transparent opacity={0.35} />
          </mesh>
        ) : (
          agents.map((a, i) => (
            <mesh
              key={a.id}
              position={[-1.6 + i * 0.7, 0.18, 1.5]}
              onClick={(e) => {
                e.stopPropagation();
                selectAgent(a.id);
                setFollowAgent(false);
                setCameraScale(1.75);
              }}
            >
              <capsuleGeometry args={[0.11, 0.14, 4, 8]} />
              <meshStandardMaterial color={a.color} />
            </mesh>
          ))
        )}
      </group>
    </>
  );
}
