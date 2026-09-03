"use client";

import { useGLTF } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { WORLD_BUILDINGS } from "@/lib/campus";
import { BuildingFromSpec } from "@/components/world/gl/architecture";
import { PackGltf } from "@/components/world/gl/vehicle-gltf";
import { DISTRICT_SPECS } from "@/lib/district-specs";
import { TILE, h as px } from "@/lib/coords";
import {
  CANONICAL_BUILDING_ASSET_ID,
  gltfUrlForAssetId,
} from "@/lib/building-gltf";
import { authoredBuildingPlacement } from "@/lib/lot-footprint";
import { PACK_GLTF, type PackAssetId } from "@/lib/pack-gltf";
import type { Building } from "@/lib/types";
import { useWorld } from "@/components/world/world-store";
import { specFromBuilding } from "@/lib/building-ai";
import { BUILDINGS_ENABLED } from "@/lib/architecture-stage";

export { FacadeOffice } from "@/components/world/gl/architecture";

function packAssetId(id: string | undefined): PackAssetId | undefined {
  if (id && id in PACK_GLTF) return id as PackAssetId;
  if (gltfUrlForAssetId(id)) return CANONICAL_BUILDING_ASSET_ID;
  return undefined;
}

function BuildingBody({
  b,
  selected,
  occupied,
  scale,
}: {
  b: Building;
  selected: boolean;
  occupied: boolean;
  scale: number;
}) {
  const { buildingSpecs } = useWorld();
  const assetId = packAssetId(b.assetId);
  if (assetId) {
    return <PackGltf assetId={assetId} fallback={null} scale={[scale, scale, scale]} remapGlass={false} />;
  }
  const spec = buildingSpecs[b.id] ?? DISTRICT_SPECS[b.id] ?? specFromBuilding(b);
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
        const authored = Boolean(gltfUrlForAssetId(b.assetId));
        if (!BUILDINGS_ENABLED && !authored) return null;
        if (interiorId === b.id) return null;
        const place = authoredBuildingPlacement(b);
        if (!place) return null;
        const fh = Math.max(TILE * 2.4, (b.height / 16) * (TILE / 1.2));
        return (
          <group key={b.id} position={[place.cx, 0, place.cz]} {...(authored ? {} : { onClick: onClick(b) })}>
            <BuildingBody
              b={b}
              selected={selectedBuildingId === b.id}
              occupied={occupiedIds.has(b.id)}
              scale={place.scale}
            />
            {authored ? (
              <mesh position={[0, fh * 0.5, 0]} onClick={onClick(b)}>
                <boxGeometry args={[place.w, fh, place.d]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
              </mesh>
            ) : null}
            {selectedBuildingId === b.id ? (
              <mesh position={[0, px(0.04), 0]} rotation-x={-Math.PI / 2} raycast={() => undefined}>
                <ringGeometry
                  args={[Math.max(place.w, place.d) * 0.42, Math.max(place.w, place.d) * 0.52, 28]}
                />
                <meshBasicMaterial color="#ed712e" transparent opacity={0.55} />
              </mesh>
            ) : null}
          </group>
        );
      })}
    </group>
  );
}

if (BUILDINGS_ENABLED) {
  useGLTF.preload(PACK_GLTF[CANONICAL_BUILDING_ASSET_ID]);
}
