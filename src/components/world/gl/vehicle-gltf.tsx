"use client";

import { Suspense, useMemo, type ReactNode } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { TILE_METERS, TILE_PX, h } from "@/lib/units";
import { PACK_GLTF, type PackAssetId } from "@/lib/pack-gltf";

export const TESLA_SEDAN_ASSET_ID = "pack.agentspace.vehicle.car.tesla.sedan.01" satisfies PackAssetId;
/** Swap the visual of a single traffic instance; routes stay unchanged. */
export const TESLA_TRAFFIC_INDEX = 0;

const M_TO_PX = TILE_PX / TILE_METERS;
/** Modest bump so road cars read better from city camera — keep in sync with vehicle_scale.py. */
export const ROAD_VEHICLE_SCALE_BOOST = 1.2;
const ROAD_CAR_SCALE = M_TO_PX * ROAD_VEHICLE_SCALE_BOOST;

function isGlassMaterial(mat: THREE.Material) {
  const p = mat as THREE.MeshPhysicalMaterial;
  const n = (mat.name || "").toLowerCase();
  return n.includes("glass") || Boolean(p && "transmission" in p && p.transmission > 0);
}

function GltfModel({ url, remapGlass = true }: { url: string; remapGlass?: boolean }) {
  const { scene } = useGLTF(url);
  const clone = useMemo(() => {
    const c = scene.clone(true);
    const box = new THREE.Box3().setFromObject(c);
    if (!box.isEmpty()) {
      const center = box.getCenter(new THREE.Vector3());
      c.position.x -= center.x;
      c.position.z -= center.z;
      c.position.y -= box.min.y;
    }
    c.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mats = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map((m) => {
        const copy = m.clone();
        if (remapGlass && isGlassMaterial(copy)) {
          const physical = copy as THREE.MeshPhysicalMaterial;
          if ("transmission" in physical) physical.transmission = 0;
          physical.transparent = true;
          physical.opacity = 0.42;
          physical.depthWrite = false;
          physical.side = THREE.DoubleSide;
        }
        return copy;
      });
      mesh.material = Array.isArray(mesh.material) ? mats : mats[0]!;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.raycast = () => {};
    });
    return c;
  }, [scene, remapGlass]);

  return <primitive object={clone} />;
}

/** Load any published building GLB by URL (claimed-company HQs). */
export function BuildingGltfByUrl({
  url,
  scale,
  fallback = null,
}: {
  url: string;
  scale?: [number, number, number];
  fallback?: ReactNode;
}) {
  return (
    <Suspense fallback={fallback}>
      <group scale={scale}>
        <GltfModel url={url} remapGlass={false} />
      </group>
    </Suspense>
  );
}

/** Load a published pack GLB by assetId. Traffic still owns position/route. */
export function PackGltf({
  assetId,
  fallback,
  scale,
  rotation,
  position,
  remapGlass = true,
}: {
  assetId: PackAssetId;
  fallback: ReactNode;
  scale?: [number, number, number];
  rotation?: [number, number, number];
  position?: [number, number, number];
  remapGlass?: boolean;
}) {
  const url = PACK_GLTF[assetId];
  if (!url) return <>{fallback}</>;
  return (
    <Suspense fallback={fallback}>
      <group scale={scale} rotation={rotation} position={position}>
        <GltfModel url={url} remapGlass={remapGlass} />
      </group>
    </Suspense>
  );
}

/** Procedural box car — kept as the default traffic visual and GLB fallback. */
export function ProceduralCar({ color }: { color: string }) {
  const s = ROAD_VEHICLE_SCALE_BOOST;
  return (
    <>
      <mesh position={[0, h(0.08 * s), 0]} castShadow>
        <boxGeometry args={[h(0.2 * s), h(0.08 * s), h(0.38 * s)]} />
        <meshStandardMaterial color={color} metalness={0.42} roughness={0.38} />
      </mesh>
      <mesh position={[0, h(0.14 * s), h(-0.02 * s)]} castShadow>
        <boxGeometry args={[h(0.16 * s), h(0.08 * s), h(0.18 * s)]} />
        <meshPhysicalMaterial color="#1a1816" metalness={0.3} roughness={0.12} transparent opacity={0.7} />
      </mesh>
      {[
        [-h(0.08 * s), h(0.12 * s)],
        [h(0.08 * s), h(0.12 * s)],
        [-h(0.08 * s), h(-0.12 * s)],
        [h(0.08 * s), h(-0.12 * s)],
      ].map(([x, z], wi) => (
        <mesh key={wi} position={[x, h(0.04 * s), z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[h(0.035 * s), h(0.035 * s), h(0.04 * s), 8]} />
          <meshStandardMaterial color="#1c1917" roughness={0.5} />
        </mesh>
      ))}
    </>
  );
}

export function TeslaTrafficCar({ fallbackColor }: { fallbackColor: string }) {
  return (
    <PackGltf
      assetId={TESLA_SEDAN_ASSET_ID}
      fallback={<ProceduralCar color={fallbackColor} />}
      scale={[ROAD_CAR_SCALE, ROAD_CAR_SCALE, ROAD_CAR_SCALE]}
      rotation={[0, Math.PI / 2, 0]}
      position={[0, -h(0.14), 0]}
    />
  );
}

useGLTF.preload(PACK_GLTF[TESLA_SEDAN_ASSET_ID]);
