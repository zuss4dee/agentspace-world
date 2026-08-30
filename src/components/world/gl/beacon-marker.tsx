"use client";

import { Html } from "@react-three/drei";
import { TILE, wx, wz } from "@/lib/coords";
import { useWorld } from "@/components/world/world-store";
import { formatUsd } from "@/lib/companies";
import { BEACON_NEXT_BID } from "@/lib/city-shop";

export function BeaconMarker() {
  const { beaconBidCents, selectPlot, focusCoord, setBeaconOpen } = useWorld();
  const next = Math.max(BEACON_NEXT_BID, beaconBidCents / 100 + 40);
  return (
    <group position={[wx(16.5), 0, wz(4)]}>
      <Html position={[0, 7.2, 0]} center distanceFactor={22} occlude={false} zIndexRange={[20, 0]}>
        <button
          type="button"
          className="ns-beacon-cta"
          aria-label={`Bid ${formatUsd(next)} to take The Beacon`}
          onClick={(e) => {
            e.stopPropagation();
            selectPlot("plot-b-hq");
            focusCoord(16.5, 4, 1.25);
            setBeaconOpen(true);
          }}
        >
          <span className="ns-beacon-ring" aria-hidden />
          <span className="ns-beacon-label">
            Bid for the Beacon <strong>{formatUsd(next)}</strong>
          </span>
        </button>
      </Html>
      <mesh position={[0, 0.06, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[2.2 * TILE, 2.55 * TILE, 32]} />
        <meshBasicMaterial color="#fbbd23" transparent opacity={0.85} />
      </mesh>
    </group>
  );
}
