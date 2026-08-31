"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { GRID, ROAD_XS, ROAD_YS, TERRAIN, groundZ } from "@/lib/campus";
import { TILE, WORLD_SPAN, h, wx, wz } from "@/lib/coords";
import { fbm, hash2 } from "@/lib/noise";
import { hitsSaleLot } from "@/lib/plots";
import { sectionAt } from "@/lib/world-sections";

function laneDist(v: number, lanes: number[]) {
  let d = 1e9;
  for (const r of lanes) {
    const t = Math.abs(v - (r + 0.5));
    if (t < d) d = t;
  }
  return d;
}

function sampleColor(gx: number, gy: number, out: THREE.Color) {
  const ix = Math.floor(gx);
  const iy = Math.floor(gy);
  const inside = ix >= 0 && iy >= 0 && ix < GRID && iy < GRID;
  const kind = inside ? TERRAIN[iy]![ix]! : null;
  const n = fbm(gx * 0.12, gy * 0.12);
  const n2 = fbm(gx * 0.41 + 8, gy * 0.37);
  const tuft = hash2(ix * 1.13, iy * 0.97);
  const sec = sectionAt(gx, gy);
  if (sec?.locked || (!inside && sec?.locked)) {
    out.setRGB(0.42 + n * 0.04, 0.44 + n * 0.03, 0.38);
    return;
  }
  if (!inside) {
    const ox = gx < 0 ? -gx : gx >= GRID ? gx - GRID : 0;
    const oy = gy < 0 ? -gy : gy >= GRID ? gy - GRID : 0;
    const edge = Math.hypot(ox, oy);
    const t = Math.min(1, edge / 5);
    out.setRGB(0.32 + n * 0.06 + t * 0.04, 0.48 + n * 0.08 - t * 0.04, 0.28 + n * 0.04);
    return;
  }
  if (kind === "water") {
    out.setRGB(0.18 + n * 0.04, 0.42 + n * 0.06, 0.44);
    return;
  }
  if (kind === "sand") {
    const wet = 0.04 * (1 - n);
    out.setRGB(0.78 + n * 0.08 - wet, 0.7 + n * 0.06, 0.5 + n * 0.04);
    return;
  }
  const dx = laneDist(gx, ROAD_XS);
  const dy = laneDist(gy, ROAD_YS);
  const onLot = hitsSaleLot(gx, gy, 0.62);
  const onRoad = !onLot && (kind === "road" || dx < 0.42 || dy < 0.42);
  if (onRoad) {
    const along = Math.min(dx, dy);
    const edge = along > 0.34 && along < 0.46 ? 0.05 : 0;
    const grit = n * 0.04 + n2 * 0.02;
    out.setRGB(0.4 + grit + edge, 0.38 + grit * 0.8 + edge * 0.7, 0.35 + grit * 0.6);
    return;
  }
  if (kind === "sidewalk") {
    out.setRGB(0.5 + n * 0.04, 0.48 + n * 0.03, 0.42 + n * 0.03);
    return;
  }
  if (kind === "plaza") {
    out.setRGB(0.78 + n * 0.04, 0.72 + n * 0.03, 0.6);
    return;
  }
  if (kind === "park") {
    const cool = tuft > 0.55 ? 0.05 : tuft < 0.22 ? -0.04 : 0;
    const worn = n2 > 0.72 ? -0.06 : 0;
    out.setRGB(0.2 + n * 0.12 + n2 * 0.04 + worn, 0.44 + n * 0.14 + cool, 0.18 + n * 0.06);
    return;
  }
  if (kind === "lot" || kind === "dirt") {
    out.setRGB(0.58 + n * 0.06, 0.48 + n * 0.04, 0.32);
    return;
  }
  const patch = tuft > 0.72 ? -0.06 : tuft < 0.18 ? 0.06 : 0;
  const path = n2 > 0.8 && tuft > 0.6 ? -0.08 : 0;
  out.setRGB(0.26 + n * 0.14 + n2 * 0.05 + patch + path, 0.48 + n * 0.16 + n2 * 0.05 + path * 0.6, 0.2 + n * 0.07);
}

export function TerrainMesh() {
  const geometry = useMemo(() => {
    const segs = 192;
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
      const ix = Math.floor(gx);
      const iy = Math.floor(gy);
      const kind = inside ? TERRAIN[iy]![ix]! : null;
      let y = fbm(gx * 0.07, gy * 0.07) * h(0.45);
      if (inside) y = Math.max(h(-0.45), groundZ(gx, gy) * h(0.06));
      if (kind === "water") y = h(-0.38);
      if (kind === "sand") y = h(-0.04) + fbm(gx * 0.3, gy * 0.3) * h(0.06);
      if (kind === "road" && !hitsSaleLot(gx, gy, 0.2)) y = h(0.02);
      const sec = sectionAt(gx, gy);
      if (sec?.locked) y = h(0.08) + fbm(gx * 0.2, gy * 0.2) * h(0.25);
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

function waterCells() {
  const cells: { x: number; y: number }[] = [];
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      if (TERRAIN[y]![x] === "water") cells.push({ x, y });
    }
  }
  return cells;
}

export function WaterPlane() {
  const cells = useMemo(() => waterCells(), []);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const mesh = useRef<THREE.InstancedMesh>(null);
  const foam = useRef<THREE.InstancedMesh>(null);
  const shore = useMemo(() => {
    const list: { x: number; y: number }[] = [];
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        if (TERRAIN[y]![x] !== "sand") continue;
        list.push({ x, y });
      }
    }
    return list;
  }, []);

  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    cells.forEach((c, i) => {
      dummy.position.set(wx(c.x + 0.5), h(-0.22), wz(c.y + 0.5));
      dummy.rotation.set(-Math.PI / 2, 0, hash2(c.x, c.y) * 0.4);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [cells, dummy]);

  useLayoutEffect(() => {
    const m = foam.current;
    if (!m) return;
    shore.forEach((c, i) => {
      dummy.position.set(wx(c.x + 0.5), h(-0.02), wz(c.y + 0.5));
      dummy.rotation.set(-Math.PI / 2, 0, 0);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [shore, dummy]);

  if (!cells.length) return null;
  return (
    <group>
      <instancedMesh ref={mesh} args={[undefined, undefined, cells.length]} receiveShadow>
        <circleGeometry args={[TILE * 0.62, 10]} />
        <meshStandardMaterial color="#2f6a6e" roughness={0.18} metalness={0.28} transparent opacity={0.88} />
      </instancedMesh>
      {shore.length ? (
        <instancedMesh ref={foam} args={[undefined, undefined, shore.length]} receiveShadow>
          <planeGeometry args={[TILE * 0.92, TILE * 0.92]} />
          <meshStandardMaterial color="#d4c6a0" roughness={0.9} />
        </instancedMesh>
      ) : null}
    </group>
  );
}

export function GrassTufts() {
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const mesh = useRef<THREE.InstancedMesh>(null);
  const spots = useMemo(() => {
    const out: { x: number; y: number; s: number; tone: number }[] = [];
    for (let i = 0; i < 720; i++) {
      const x = hash2(i * 1.17, 3.2) * GRID;
      const y = hash2(i * 0.91, 8.4) * GRID;
      const ix = Math.floor(x);
      const iy = Math.floor(y);
      if (ix < 0 || iy < 0 || ix >= GRID || iy >= GRID) continue;
      const t = TERRAIN[iy]![ix]!;
      if (t !== "grass" && t !== "park") continue;
      if (hitsSaleLot(x, y, 0.3)) continue;
      out.push({ x, y, s: 0.55 + hash2(i, 4.4) * 0.7, tone: hash2(i, 9.1) });
    }
    return out;
  }, []);

  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const c = new THREE.Color();
    spots.forEach((s, i) => {
      dummy.position.set(wx(s.x), h(0.08) * s.s, wz(s.y));
      dummy.scale.set(s.s, s.s, s.s);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      if (s.tone > 0.66) c.set("#2d6234");
      else if (s.tone > 0.33) c.set("#3d7a3a");
      else c.set("#5a8a3c");
      m.setColorAt(i, c);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [dummy, spots]);

  if (!spots.length) return null;
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, spots.length]} raycast={() => undefined}>
      <coneGeometry args={[h(0.07), h(0.16), 4]} />
      <meshStandardMaterial color="#3d7a3a" roughness={0.92} />
    </instancedMesh>
  );
}

export { DistantFills } from "./horizon";
