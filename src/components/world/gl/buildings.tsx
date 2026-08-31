"use client";

import type { ThreeEvent } from "@react-three/fiber";
import { WORLD_BUILDINGS } from "@/lib/campus";
import { familyForBuilding } from "@/lib/architecture";
import { ArchitectureMass, FacadeOffice } from "@/components/world/gl/architecture";
import { buildingHeight, TILE, h as px, wx, wz } from "@/lib/coords";
import type { Building } from "@/lib/types";
import { useWorld } from "@/components/world/world-store";

export { FacadeOffice };

function BuildingBody({ b, selected }: { b: Building; selected: boolean }) {
  const w = b.size.x * TILE * 0.9;
  const d = b.size.y * TILE * 0.9;
  const height = buildingHeight(b.height);
  return (
    <ArchitectureMass
      family={familyForBuilding(b)}
      w={w}
      d={d}
      height={height}
      wall={b.wall}
      roof={b.roof}
      accent={b.accent}
      wallDark={b.wallDark}
      selected={selected}
    />
  );
}

export function BuildingsLayer() {
  const { selectedBuildingId, interiorId, selectBuilding, selectDistrict } = useWorld();
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
            <BuildingBody b={b} selected={selectedBuildingId === b.id} />
            {selectedBuildingId === b.id ? (
              <mesh position={[0, px(0.04), 0]} rotation-x={-Math.PI / 2}>
                <ringGeometry args={[Math.max(b.size.x, b.size.y) * TILE * 0.55, Math.max(b.size.x, b.size.y) * TILE * 0.7, 24]} />
                <meshBasicMaterial color="#ed712e" transparent opacity={0.7} />
              </mesh>
            ) : null}
          </group>
        );
      })}
    </group>
  );
}
