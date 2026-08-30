"use client";

import { LOT_BUILDINGS } from "@/lib/campus";
import { TILE, wx, wz } from "@/lib/coords";
import { useWorld } from "@/components/world/world-store";

export function InteriorRoom() {
  const { interiorId, liveRef } = useWorld();
  if (!interiorId) return null;
  const b = LOT_BUILDINGS.find((item) => item.id === interiorId);
  if (!b) return null;
  const w = Math.max(5.5, b.size.x * TILE);
  const d = Math.max(5.5, b.size.y * TILE);
  const cx = wx(b.origin.x + b.size.x / 2);
  const cz = wz(b.origin.y + b.size.y / 2);
  const agents = liveRef.current.agents.filter((a) => a.buildingId === b.id && a.mapId === "lot");
  return (
    <group position={[cx, 0.02, cz]}>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color="#e6dcd0" roughness={0.85} />
      </mesh>
      <mesh position={[0, 1.2, -d / 2]} receiveShadow>
        <boxGeometry args={[w, 2.4, 0.12]} />
        <meshStandardMaterial color={b.wall} roughness={0.7} />
      </mesh>
      <mesh position={[-w / 2, 1.2, 0]} receiveShadow>
        <boxGeometry args={[0.12, 2.4, d]} />
        <meshStandardMaterial color={b.wallDark} roughness={0.7} />
      </mesh>
      {b.stations.map((s, i) => (
        <mesh key={s.id} position={[(i - 1) * 1.1, 0.35, 0.4]} castShadow>
          <boxGeometry args={[0.7, 0.7, 0.7]} />
          <meshStandardMaterial color="#8b6914" roughness={0.65} />
        </mesh>
      ))}
      {agents.map((a, i) => (
        <mesh key={a.id} position={[-0.8 + i * 0.55, 0.16, 0.9]}>
          <capsuleGeometry args={[0.1, 0.12, 4, 8]} />
          <meshStandardMaterial color={a.color} />
        </mesh>
      ))}
      <pointLight position={[0, 2.2, 0]} intensity={8} distance={10} color="#fff4e0" />
    </group>
  );
}
