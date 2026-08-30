"use client";

import * as THREE from "three";
import { Billboard, useTexture } from "@react-three/drei";
import { LOT_BUILDINGS } from "@/lib/campus";
import { isoForStyle } from "@/lib/asset-pack";
import { buildingHeight, TILE, wx, wz } from "@/lib/coords";
import { useWorld } from "@/components/world/world-store";
import type { BuildingStyle } from "@/lib/types";

const URLS = [
  "/assets/pack/iso-hq.png",
  "/assets/pack/iso-lab.png",
  "/assets/pack/iso-factory.png",
  "/assets/pack/iso-studio.png",
  "/assets/pack/iso-data.png",
  "/assets/pack/iso-cafe.png",
  "/assets/pack/iso-apartment.png",
  "/assets/pack/iso-warehouse.png",
  "/assets/pack/iso-hall.png",
  "/assets/pack/iso-house.png",
  "/assets/pack/iso-hotel.png",
  "/assets/pack/iso-park.png",
] as const;

export function LandmarkSprites() {
  const textures = useTexture([...URLS]);
  const { cameraScale, interiorId, selectBuilding, selectDistrict } = useWorld();
  const map = new Map<string, THREE.Texture>(URLS.map((u, i) => [u, textures[i]!]));
  const worldish = cameraScale < 0.95;
  return (
    <group visible={worldish}>
      {LOT_BUILDINGS.map((b) => {
        if (interiorId === b.id) return null;
        const url = isoForStyle(b.style as BuildingStyle);
        const tex = map.get(url);
        if (!tex) return null;
        tex.colorSpace = THREE.SRGBColorSpace;
        const h = buildingHeight(b.height);
        const s = Math.max(b.size.x, b.size.y) * TILE * 1.85;
        return (
          <Billboard key={b.id} position={[wx(b.origin.x + b.size.x / 2), h * 0.55 + 0.4, wz(b.origin.y + b.size.y / 2)]}>
            <mesh
              onClick={(e) => {
                e.stopPropagation();
                selectBuilding(b.id);
                selectDistrict(b.districtId);
              }}
            >
              <planeGeometry args={[s, s]} />
              <meshBasicMaterial map={tex} transparent depthWrite={false} />
            </mesh>
          </Billboard>
        );
      })}
    </group>
  );
}
