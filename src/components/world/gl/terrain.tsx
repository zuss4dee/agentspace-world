"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { GRID, ROAD_XS, ROAD_YS, TERRAIN, groundZ } from "@/lib/campus";
import { TILE, WORLD_SPAN, wx, wz } from "@/lib/coords";
import { fbm } from "@/lib/noise";
import { sectionAt } from "@/lib/world-sections";

function sampleColor(gx: number, gy: number, out: THREE.Color) {
  const ix = Math.floor(gx);
  const iy = Math.floor(gy);
  const inside = ix >= 0 && iy >= 0 && ix < GRID && iy < GRID;
  const kind = inside ? TERRAIN[iy]![ix]! : null;
  const n = fbm(gx * 0.12, gy * 0.12);
  const sec = sectionAt(gx, gy);
  if (sec?.locked || (!inside && sec?.locked)) {
    out.setRGB(0.42 + n * 0.04, 0.44 + n * 0.03, 0.38);
    return;
  }
  if (!inside) {
    out.setRGB(0.3 + n * 0.06, 0.46 + n * 0.08, 0.28);
    return;
  }
  if (kind === "water") {
    out.setRGB(0.16 + n * 0.05, 0.4 + n * 0.08, 0.58);
    return;
  }
  if (kind === "road" || ROAD_XS.some((r) => Math.abs(gx - r) < 0.55) || ROAD_YS.some((r) => Math.abs(gy - r) < 0.55)) {
    out.setRGB(0.3, 0.29, 0.28);
    return;
  }
  if (kind === "sidewalk") {
    out.setRGB(0.78, 0.74, 0.68);
    return;
  }
  if (kind === "plaza") {
    out.setRGB(0.82, 0.75, 0.62);
    return;
  }
  if (kind === "sand") {
    out.setRGB(0.86, 0.78, 0.58);
    return;
  }
  if (kind === "park") {
    out.setRGB(0.28 + n * 0.08, 0.54 + n * 0.1, 0.26);
    return;
  }
  if (kind === "lot" || kind === "dirt") {
    out.setRGB(0.62, 0.5, 0.34);
    return;
  }
  out.setRGB(0.33 + n * 0.1, 0.51 + n * 0.12, 0.28 + n * 0.06);
}

export function TerrainMesh() {
  const geometry = useMemo(() => {
    const segs = 96;
    const size = WORLD_SPAN + 36;
    const geo = new THREE.PlaneGeometry(size, size, segs, segs);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position!;
    const colors = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const gx = x / TILE + GRID / 2;
      const gy = z / TILE + GRID / 2;
      const inside = gx >= 0 && gy >= 0 && gx < GRID && gy < GRID;
      let y = fbm(gx * 0.07, gy * 0.07) * 0.45;
      if (inside) y = Math.max(-0.45, groundZ(gx, gy) * 0.06);
      const sec = sectionAt(gx, gy);
      if (sec?.locked) y = 0.08 + fbm(gx * 0.2, gy * 0.2) * 0.25;
      pos.setY(i, y);
      sampleColor(gx, gy, c);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial vertexColors roughness={0.94} metalness={0.02} />
    </mesh>
  );
}

export function WaterPlane() {
  return (
    <mesh rotation-x={-Math.PI / 2} position={[wx(1.5), -0.2, wz(24)]} receiveShadow>
      <planeGeometry args={[16, 48]} />
      <meshStandardMaterial color="#2a6a96" roughness={0.08} metalness={0.5} transparent opacity={0.86} />
    </mesh>
  );
}

export function DistantFills() {
  return null;
}
