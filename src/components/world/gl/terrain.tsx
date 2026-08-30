"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { GRID, ROAD_XS, ROAD_YS, TERRAIN, groundZ } from "@/lib/campus";
import { TILE, wx, wz } from "@/lib/coords";
import { fbm } from "@/lib/noise";

function sampleColor(gx: number, gy: number, out: THREE.Color) {
  const ix = Math.floor(gx);
  const iy = Math.floor(gy);
  const inside = ix >= 0 && iy >= 0 && ix < GRID && iy < GRID;
  const kind = inside ? TERRAIN[iy]![ix]! : null;
  const n = fbm(gx * 0.12, gy * 0.12);
  if (kind === "water" || (!inside && gx < 4 + n * 3 && gy > 4 && gy < 52)) {
    out.setRGB(0.16 + n * 0.05, 0.4 + n * 0.08, 0.58);
    return;
  }
  if (kind === "road" || ROAD_XS.some((r) => Math.abs(gx - r) < 0.55) || ROAD_YS.some((r) => Math.abs(gy - r) < 0.55)) {
    if (inside || Math.abs(gx % 12) < 0.7 || Math.abs(gy % 12) < 0.7) {
      out.setRGB(0.28, 0.27, 0.26);
      return;
    }
  }
  if (kind === "sidewalk") {
    out.setRGB(0.78, 0.74, 0.68);
    return;
  }
  if (kind === "plaza") {
    out.setRGB(0.8, 0.74, 0.62);
    return;
  }
  if (kind === "sand") {
    out.setRGB(0.86, 0.78, 0.58);
    return;
  }
  if (kind === "park") {
    out.setRGB(0.28 + n * 0.08, 0.52 + n * 0.1, 0.26);
    return;
  }
  if (kind === "lot" || kind === "dirt") {
    out.setRGB(0.62, 0.5, 0.34);
    return;
  }
  out.setRGB(0.32 + n * 0.1, 0.5 + n * 0.12, 0.28 + n * 0.06);
}

export function TerrainMesh() {
  const geometry = useMemo(() => {
    const segs = 140;
    const size = 210;
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
      let y = fbm(gx * 0.07, gy * 0.07) * 0.55;
      if (inside) y = Math.max(-0.35, groundZ(gx, gy) * 0.06);
      if (!inside && gx < 5) y = -0.35;
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
    <mesh rotation-x={-Math.PI / 2} position={[wx(1.5), -0.22, wz(24)]} receiveShadow>
      <planeGeometry args={[18, 58]} />
      <meshStandardMaterial color="#2d6f9a" roughness={0.12} metalness={0.45} transparent opacity={0.88} />
    </mesh>
  );
}

export function DistantFills() {
  const meshes = useMemo(() => {
    const list: { x: number; z: number; w: number; h: number; d: number; color: string }[] = [];
    for (let i = 0; i < 70; i++) {
      const ang = (i / 70) * Math.PI * 1.6 + 0.4;
      const rad = 78 + (i % 7) * 6;
      list.push({
        x: Math.cos(ang) * rad,
        z: Math.sin(ang) * rad,
        w: 1.4 + (i % 4) * 0.8,
        h: 2 + (i % 9) * 1.1,
        d: 1.2 + (i % 3) * 0.7,
        color: i % 3 === 0 ? "#9aa8b8" : i % 3 === 1 ? "#c4b49a" : "#8fa89a",
      });
    }
    return list;
  }, []);
  return (
    <group>
      {meshes.map((m, i) => (
        <mesh key={i} position={[m.x, m.h / 2, m.z]} castShadow>
          <boxGeometry args={[m.w, m.h, m.d]} />
          <meshStandardMaterial color={m.color} roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}
