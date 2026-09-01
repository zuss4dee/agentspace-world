"use client";

import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

function isGlassMaterial(mat: THREE.Material) {
  const p = mat as THREE.MeshPhysicalMaterial;
  const n = (mat.name || "").toLowerCase();
  return n.includes("glass") || Boolean(p && "transmission" in p && p.transmission > 0);
}

function preserveGltfMaterial(mat: THREE.Material) {
  if (!isGlassMaterial(mat)) return;
  const physical = mat as THREE.MeshPhysicalMaterial;
  if ("transmission" in physical) physical.transmission = 0;
  physical.transparent = true;
  physical.opacity = 0.38;
  physical.depthWrite = false;
  physical.side = THREE.DoubleSide;
  physical.roughness = 0.08;
  if ("metalness" in physical) physical.metalness = 0.18;
  physical.envMapIntensity = Math.max(physical.envMapIntensity ?? 1, 1.6);
  physical.color.set("#c8d6d0");
  if ("emissive" in physical) {
    physical.emissive.set("#7a8c84");
    physical.emissiveIntensity = 0.22;
  }
}

export function BuildingGltf({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  const clone = useMemo(() => {
    const c = scene.clone(true);
    c.position.set(0, 0, 0);
    c.scale.set(1, 1, 1);
    c.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mats = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map((m) => {
        const copy = m.clone();
        preserveGltfMaterial(copy);
        return copy;
      });
      mesh.material = Array.isArray(mesh.material) ? mats : mats[0]!;
      const glass = mats.some((m) => isGlassMaterial(m) || (m.name || "").toLowerCase().includes("glass"));
      mesh.castShadow = !glass;
      mesh.receiveShadow = !glass;
      mesh.raycast = () => {};
    });
    return c;
  }, [scene]);

  return <primitive object={clone} />;
}

export function preloadBuildingGltf(url: string) {
  useGLTF.preload(url);
}
