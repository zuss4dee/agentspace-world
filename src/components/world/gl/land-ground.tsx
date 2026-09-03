"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { GRID } from "@/lib/campus";
import { TILE, h, wx, wz } from "@/lib/coords";
import { fbm } from "@/lib/noise";
import { landBounds } from "@/lib/plots";
import { SECTION_ONE } from "@/lib/world-sections";

/**
 * Flat lawn under the land-sales grid when the authored campus GLB does not cover it.
 * Keeps distant plots from floating over void at the south field.
 */
export function LandGround() {
  const geometry = useMemo(() => {
    const land = landBounds();
    const campusEnd = SECTION_ONE.y + SECTION_ONE.h;
    if (land.y0 <= campusEnd + 2) return null;

    const y0 = campusEnd;
    const y1 = land.y1;
    const x0 = Math.max(land.x0, SECTION_ONE.x - 8);
    const x1 = Math.min(land.x1, SECTION_ONE.x + SECTION_ONE.w + 8);
    const w = (x1 - x0) * TILE;
    const d = (y1 - y0) * TILE;
    const cx = wx((x0 + x1) / 2);
    const cz = wz((y0 + y1) / 2);
    const segs = Math.min(64, Math.max(16, Math.floor(d / TILE / 4)));
    const geo = new THREE.PlaneGeometry(w, d, segs, segs);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position!;
    const colors = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) + cx;
      const z = pos.getZ(i) + cz;
      const gx = x / TILE + GRID / 2;
      const gy = z / TILE + GRID / 2;
      const n = fbm(gx * 0.08, gy * 0.08);
      pos.setY(i, h(-0.08) + n * h(0.06));
      c.setRGB(0.72 + n * 0.06, 0.68 + n * 0.05, 0.58 + n * 0.04);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    return { geo, cx, cz };
  }, []);

  if (!geometry) return null;
  return (
    <mesh
      geometry={geometry.geo}
      position={[geometry.cx, 0, geometry.cz]}
      receiveShadow
      frustumCulled={false}
      raycast={() => undefined}
    >
      <meshStandardMaterial vertexColors roughness={0.96} metalness={0.01} />
    </mesh>
  );
}
