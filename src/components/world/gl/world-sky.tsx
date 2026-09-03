"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { h } from "@/lib/coords";
import { type AtmospherePreset } from "@/lib/atmosphere";
import { playableBounds } from "@/lib/world-sections";
import { wx, wz } from "@/lib/coords";

const SKY_RADIUS = h(2400);

function skyMaterial(preset: AtmospherePreset) {
  const zenith = new THREE.Color(preset.sky.zenith);
  const mid = new THREE.Color(preset.sky.mid);
  const horizon = new THREE.Color(preset.sky.horizon);
  const haze = new THREE.Color(preset.sky.haze);
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      zenith: { value: zenith },
      mid: { value: mid },
      horizon: { value: horizon },
      haze: { value: haze },
    },
    vertexShader: `
      varying vec3 vWorldPos;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vWorldPos;
      uniform vec3 zenith;
      uniform vec3 mid;
      uniform vec3 horizon;
      uniform vec3 haze;
      void main() {
        float y = normalize(vWorldPos).y;
        float t = clamp(y * 0.5 + 0.5, 0.0, 1.0);
        vec3 col = mix(horizon, mid, smoothstep(0.0, 0.42, t));
        col = mix(col, zenith, smoothstep(0.38, 1.0, t));
        float hazeAmt = smoothstep(0.02, 0.28, 1.0 - t) * 0.55;
        col = mix(col, haze, hazeAmt);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}

export function WorldSky({ preset }: { preset: AtmospherePreset }) {
  const play = useMemo(() => playableBounds(), []);
  const cx = wx((play.x0 + play.x1) / 2);
  const cz = wz((play.y0 + play.y1) / 2);
  const mat = useMemo(() => skyMaterial(preset), [preset]);

  return (
    <mesh position={[cx, h(0.5), cz]} frustumCulled={false} renderOrder={-20} material={mat}>
      <sphereGeometry args={[SKY_RADIUS, 48, 32]} />
    </mesh>
  );
}
