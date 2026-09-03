"use client";

import { Component, type ErrorInfo, type ReactNode, Suspense, useMemo } from "react";
import { Html, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { AUTHORED_WORLD_ENABLED, AUTHORED_WORLD_GLB } from "@/lib/world-gltf";

const _size = new THREE.Vector3();
const _box = new THREE.Box3();

function WorldStatus({ children }: { children: ReactNode }) {
  return (
    <Html center style={{ pointerEvents: "none" }}>
      <div className="rounded-md bg-black/65 px-3 py-2 text-xs tracking-wide text-white">{children}</div>
    </Html>
  );
}

class WorldGltfErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Authored world GLB failed", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return <WorldStatus>City model failed to load</WorldStatus>;
    }
    return this.props.children;
  }
}

function extrasOf(obj: THREE.Object3D) {
  const ud = obj.userData as Record<string, unknown>;
  const nested = ud.extras as Record<string, unknown> | undefined;
  return nested ?? ud;
}

/** R3F PlotsLayer owns all vacant-land demarcation; hide authored GLB lot pads. */
function hideAuthoredLotPads(root: THREE.Object3D) {
  root.traverse((obj) => {
    const extras = extrasOf(obj);
    if (extras.asw_kind === "lot") {
      obj.visible = false;
    }
  });
}

function AuthoredWorldGltf({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  const prepared = useMemo(() => {
    const root = scene.clone(true);
    hideAuthoredLotPads(root);
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.receiveShadow = true;
      _box.setFromObject(mesh);
      _box.getSize(_size);
      mesh.castShadow = _size.y > 1.5;
      mesh.raycast = () => {};
    });
    return root;
  }, [scene]);

  // glTF Y-up maps Blender +Y to -Z. Flip Z so world_xy matches Three.js wz.
  return (
    <group scale={[1, 1, -1]} frustumCulled={false}>
      <primitive object={prepared} />
    </group>
  );
}

export function AuthoredWorldLayer() {
  if (!AUTHORED_WORLD_ENABLED) return null;
  return (
    <WorldGltfErrorBoundary>
      <Suspense fallback={<WorldStatus>Loading city…</WorldStatus>}>
        <AuthoredWorldGltf url={AUTHORED_WORLD_GLB} />
      </Suspense>
    </WorldGltfErrorBoundary>
  );
}

export function preloadAuthoredWorld() {
  if (AUTHORED_WORLD_ENABLED) useGLTF.preload(AUTHORED_WORLD_GLB);
}
