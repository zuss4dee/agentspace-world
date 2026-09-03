"use client";

import { useLayoutEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  DEFAULT_ATMOSPHERE,
  atmospherePreset,
  type AtmospherePresetId,
} from "@/lib/atmosphere";
import { DistantFills } from "@/components/world/gl/horizon";
import { WorldSky } from "@/components/world/gl/world-sky";
import { LandGround } from "@/components/world/gl/land-ground";

export type WorldEnvironmentProps = {
  /** Switch presets later via world store or URL param. */
  atmosphereId?: AtmospherePresetId;
};

/** Visual-only outer world: sky, fog tint, distant terrain ring. Playable city stays unchanged. */
export function WorldEnvironment({ atmosphereId = DEFAULT_ATMOSPHERE }: WorldEnvironmentProps) {
  const preset = atmospherePreset(atmosphereId);
  const scene = useThree((s) => s.scene);
  const gl = useThree((s) => s.gl);

  useLayoutEffect(() => {
    const bg = new THREE.Color(preset.background);
    scene.background = bg;
    gl.setClearColor(preset.background, 1);
    if (!(scene.fog instanceof THREE.Fog)) {
      scene.fog = new THREE.Fog(preset.fog.color, 1, 2);
    }
    const fog = scene.fog as THREE.Fog;
    fog.color.set(preset.fog.color);
  }, [gl, preset, scene]);

  return (
    <>
      <WorldSky preset={preset} />
      <LandGround />
      <DistantFills />
    </>
  );
}

export { atmospherePreset, DEFAULT_ATMOSPHERE };
export type { AtmospherePresetId };
