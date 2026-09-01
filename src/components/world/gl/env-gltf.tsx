"use client";

import { Suspense, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { AUTHORED_ENV_ENABLED, AUTHORED_ENV_GLB } from "@/lib/env-district";

function demoteEnvMaterial(mat: THREE.Material, cache: Map<string, THREE.Material>) {
  const cached = cache.get(mat.uuid);
  if (cached) return cached;
  const physical = mat as THREE.MeshPhysicalMaterial;
  const name = (mat.name || "").toLowerCase();
  const metal = name.includes("metal");
  if (physical.isMeshPhysicalMaterial) {
    const std = new THREE.MeshStandardMaterial({
      name: mat.name,
      color: physical.color,
      map: physical.map,
      roughness: Math.max(physical.roughness ?? 0.7, 0.45),
      roughnessMap: physical.roughnessMap,
      metalness: metal ? 0.72 : 0,
      metalnessMap: null,
      normalMap: physical.normalMap,
      emissive: physical.emissive,
      emissiveIntensity: physical.emissiveIntensity,
      envMapIntensity: 0.45,
      side: THREE.DoubleSide,
    });
    if ((physical.transmission ?? 0) > 0.01 || name.includes("glass")) {
      std.color.set("#f0ddb0");
      std.emissive.set("#e8c98a");
      std.emissiveIntensity = 1.15;
      std.metalness = 0.08;
      std.roughness = 0.32;
    }
    std.userData = { ...physical.userData };
    cache.set(mat.uuid, std);
    cache.set(std.uuid, std);
    return std;
  }
  const std = mat as THREE.MeshStandardMaterial;
  mat.side = THREE.DoubleSide;
  if ("metalness" in std && !metal) std.metalness = 0;
  cache.set(mat.uuid, mat);
  return mat;
}

export function AuthoredEnvironmentGltf({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  useMemo(() => {
    if (!scene.userData.aswEnvPrepared) {
      const root = scene.getObjectByName("Env_Startup") ?? scene;
      for (const child of root.children) {
        child.position.z *= -1;
      }
      scene.userData.aswEnvPrepared = true;
    }
    const cache = new Map<string, THREE.Material>();
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const next = mats.map((m) => demoteEnvMaterial(m, cache));
      mesh.material = Array.isArray(mesh.material) ? next : next[0]!;
      mesh.castShadow = false;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
    });
    return scene;
  }, [scene]);
  return <primitive object={scene} />;
}

export function AuthoredEnvironmentLayer() {
  if (!AUTHORED_ENV_ENABLED) return null;
  return (
    <Suspense fallback={null}>
      <AuthoredEnvironmentGltf url={AUTHORED_ENV_GLB} />
    </Suspense>
  );
}

export function preloadAuthoredEnv() {
  if (AUTHORED_ENV_ENABLED) useGLTF.preload(AUTHORED_ENV_GLB);
}
