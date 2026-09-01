"use client";

import { Suspense, useMemo, type ReactNode } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { PACK_GLTF, type PackAssetId } from "@/lib/pack-gltf";

function GltfCharacter({ url, tint }: { url: string; tint?: string }) {
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
    if (tint) {
      c.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (!mesh.isMesh || !mesh.material) return;
        const mats = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map((m) => {
          const copy = m.clone();
          if ("color" in copy && copy.color instanceof THREE.Color) {
            copy.color.lerp(new THREE.Color(tint), 0.22);
          }
          return copy;
        });
        mesh.material = Array.isArray(mesh.material) ? mats : mats[0]!;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      });
    } else {
      c.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      });
    }
    return c;
  }, [scene, tint]);

  return <primitive object={clone} />;
}

export function CharacterGltf({
  assetId,
  tint,
  scale = 0.42,
  fallback,
}: {
  assetId: PackAssetId;
  tint?: string;
  scale?: number;
  fallback?: ReactNode;
}) {
  const url = PACK_GLTF[assetId];
  if (!url) return <>{fallback}</>;
  return (
    <Suspense fallback={fallback}>
      <group scale={scale}>
        <GltfCharacter url={url} tint={tint} />
      </group>
    </Suspense>
  );
}

export function preloadCharacterAssets(assetIds: PackAssetId[]) {
  for (const id of assetIds) {
    const url = PACK_GLTF[id];
    if (url) useGLTF.preload(url);
  }
}
