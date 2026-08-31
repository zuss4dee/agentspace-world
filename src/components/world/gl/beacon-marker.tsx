"use client";

import { TILE, wx, wz } from "@/lib/coords";
import { useWorld } from "@/components/world/world-store";

export function BeaconMarker() {
  const { selectPlot, focusCoord, setBeaconOpen } = useWorld();
  return (
    <group
      position={[wx(16.5), 0, wz(4)]}
      onClick={(e) => {
        e.stopPropagation();
        selectPlot("plot-b-hq");
        focusCoord(16.5, 4, 1.25);
        setBeaconOpen(true);
      }}
    >
      <mesh position={[0, 0.06, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[2.2 * TILE, 2.55 * TILE, 32]} />
        <meshBasicMaterial color="#fbbd23" transparent opacity={0.85} />
      </mesh>
    </group>
  );
}
