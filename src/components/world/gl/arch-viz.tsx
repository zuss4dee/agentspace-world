"use client";

import { Suspense, useLayoutEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment } from "@react-three/drei";
import * as THREE from "three";
import { useWorld } from "@/components/world/world-store";
import { ARCH_EXPOSURE, ENV_INTENSITY, HDRI_URL, sunFromHour } from "@/lib/arch-viz";
import { wx, wz } from "@/lib/coords";

export function ArchColorPipeline() {
  const gl = useThree((s) => s.gl);
  useLayoutEffect(() => {
    THREE.ColorManagement.enabled = true;
    gl.outputColorSpace = THREE.SRGBColorSpace;
    gl.toneMapping = THREE.AgXToneMapping;
    gl.toneMappingExposure = ARCH_EXPOSURE;
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
  }, [gl]);
  return null;
}

export function ArchSun() {
  const ref = useRef<THREE.DirectionalLight>(null);
  const scene = useThree((s) => s.scene);
  const { sunHour, archView } = useWorld();
  useLayoutEffect(() => {
    const l = ref.current;
    if (l) scene.add(l.target);
  }, [scene]);
  useFrame(({ camera }) => {
    const l = ref.current;
    if (!l) return;
    const sun = sunFromHour(sunHour);
    const dist = archView ? 220 : 160;
    const x = Math.cos(sun.elevation) * Math.sin(sun.azimuth);
    const y = Math.sin(sun.elevation);
    const z = Math.cos(sun.elevation) * Math.cos(sun.azimuth);
    const fx = archView ? wx(28) : camera.position.x;
    const fz = archView ? wz(3.5) : camera.position.z;
    l.position.set(fx + x * dist, Math.max(28, y * dist), fz + z * dist);
    l.target.position.set(fx, 0, fz);
    l.target.updateMatrixWorld();
    l.intensity = sun.intensity;
    l.color.set(sun.color);
    const span = archView ? 90 : 70;
    const cam = l.shadow.camera;
    cam.left = -span;
    cam.right = span;
    cam.top = span;
    cam.bottom = -span;
    cam.far = dist + 80;
    cam.updateProjectionMatrix();
  });
  const sun = sunFromHour(sunHour);
  return (
    <directionalLight
      ref={ref}
      color={sun.color}
      intensity={sun.intensity}
      castShadow
      shadow-mapSize={[2048, 2048]}
      shadow-bias={-0.00015}
      shadow-normalBias={0.04}
      shadow-radius={3.5}
    />
  );
}

export function ArchEnvironment() {
  return (
    <Suspense fallback={null}>
      <Environment files={HDRI_URL} environmentIntensity={ENV_INTENSITY} background={false} />
    </Suspense>
  );
}

export function ArchContactShadows() {
  return (
    <ContactShadows
      frames={1}
      position={[wx(28), 0.04, wz(3.5)]}
      opacity={0.28}
      scale={160}
      blur={2.4}
      far={18}
      color="#3a342c"
    />
  );
}

/** Post-FX (N8AO / EffectComposer) blacks the canvas with MeshPhysical glass. Leave the framebuffer as-is. */
export function ArchPost() {
  return null;
}

export function ArchVizLights() {
  return (
    <>
      <ArchColorPipeline />
      <ArchSun />
      <ArchEnvironment />
    </>
  );
}

export function ArchVizFinish() {
  return (
    <>
      <ArchContactShadows />
      <ArchPost />
    </>
  );
}
