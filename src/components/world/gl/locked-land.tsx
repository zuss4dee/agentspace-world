"use client";

import { Html } from "@react-three/drei";
import { WORLD_SECTIONS } from "@/lib/world-sections";
import { TILE, wx, wz } from "@/lib/coords";
import { useWorld } from "@/components/world/world-store";
import { hash2 } from "@/lib/noise";

export function LockedLand() {
  const { selectDistrict, selectBuilding, selectAgent, selectPlot } = useWorld();
  return (
    <group>
      {WORLD_SECTIONS.filter((s) => s.locked).map((s) => {
        const cx = wx(s.origin.x + s.size.x / 2);
        const cz = wz(s.origin.y + s.size.y / 2);
        const w = s.size.x * TILE;
        const d = s.size.y * TILE;
        const silhouettes = Array.from({ length: 9 }, (_, i) => {
          const hx = hash2(i * 2.1, s.origin.x);
          const hz = hash2(i * 3.3, s.origin.y);
          return {
            x: (hx - 0.5) * w * 0.62,
            z: (hz - 0.5) * d * 0.62,
            h: 1.2 + hx * 2.8,
            bw: 0.8 + hz * 1.1,
            bd: 0.7 + hx * 0.9,
          };
        });
        return (
          <group
            key={s.id}
            position={[cx, 0, cz]}
            onClick={(e) => {
              e.stopPropagation();
              selectPlot(null);
              selectBuilding(null);
              selectAgent(null);
              selectDistrict(`locked:${s.id}`);
            }}
          >
            <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 0]} receiveShadow>
              <planeGeometry args={[w, d]} />
              <meshStandardMaterial color="#6b7468" roughness={0.96} transparent opacity={0.55} />
            </mesh>
            {silhouettes.map((b, i) => (
              <mesh key={i} position={[b.x, b.h / 2, b.z]} castShadow>
                <boxGeometry args={[b.bw, b.h, b.bd]} />
                <meshStandardMaterial color="#8a9188" roughness={0.9} transparent opacity={0.45} />
              </mesh>
            ))}
            <Html position={[0, 2.2, 0]} center distanceFactor={18} occlude={false} pointerEvents="none">
              <div className="gbw-lockchip">
                Locked · {s.label}
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}
