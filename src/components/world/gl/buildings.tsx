"use client";

import type { ThreeEvent } from "@react-three/fiber";
import { WORLD_BUILDINGS } from "@/lib/campus";
import { BuildingFromSpec } from "@/components/world/gl/architecture";
import { DISTRICT_SPECS } from "@/lib/district-specs";
import { TILE, h as px, wx, wz } from "@/lib/coords";
import type { Building } from "@/lib/types";
import { useWorld } from "@/components/world/world-store";
import { specFromBuilding } from "@/lib/building-ai";

export { FacadeOffice } from "@/components/world/gl/architecture";

function BuildingBody({ b, selected, occupied }: { b: Building; selected: boolean; occupied: boolean }) {
  const { buildingSpecs, draftSpec } = useWorld();
  const spec =
    (draftSpec && draftSpec.id === b.id ? draftSpec : null) ??
    buildingSpecs[b.id] ??
    DISTRICT_SPECS[b.id] ??
    specFromBuilding(b);
  return <BuildingFromSpec spec={spec} selected={selected} occupied={occupied} />;
}

export function BuildingsLayer() {
  const { selectedBuildingId, interiorId, selectBuilding, selectDistrict, world } = useWorld();
  const occupiedIds = new Set(world.agents.filter((a) => a.buildingId && a.status !== "walking").map((a) => a.buildingId));
  const onClick = (b: Building) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    selectBuilding(b.id);
    selectDistrict(b.districtId);
  };
  return (
    <group>
      {WORLD_BUILDINGS.map((b) => {
        if (interiorId === b.id) return null;
        const cx = wx(b.origin.x + b.size.x / 2);
        const cz = wz(b.origin.y + b.size.y / 2);
        return (
          <group key={b.id} position={[cx, 0, cz]} onClick={onClick(b)}>
            <BuildingBody b={b} selected={selectedBuildingId === b.id} occupied={occupiedIds.has(b.id)} />
            {selectedBuildingId === b.id ? (
              <mesh position={[0, px(0.04), 0]} rotation-x={-Math.PI / 2}>
                <ringGeometry args={[Math.max(b.size.x, b.size.y) * TILE * 0.42, Math.max(b.size.x, b.size.y) * TILE * 0.52, 28]} />
                <meshBasicMaterial color="#ed712e" transparent opacity={0.55} />
              </mesh>
            ) : null}
          </group>
        );
      })}
    </group>
  );
}
