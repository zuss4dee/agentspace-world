"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { GRID, ROAD_XS, ROAD_YS, TERRAIN } from "@/lib/campus";
import { TILE, h, wx, wz } from "@/lib/coords";
import { hitsSaleLot } from "@/lib/plots";
import { useCityMaps } from "@/components/world/gl/surface-maps";

/** First-district street kit only — north campus around the authored buildings. */
export const FIRST_DISTRICT = { x0: 6, y0: 0, x1: 46, y1: 13 };

function inDistrict(x: number, y: number) {
  return x >= FIRST_DISTRICT.x0 && x <= FIRST_DISTRICT.x1 && y >= FIRST_DISTRICT.y0 && y <= FIRST_DISTRICT.y1;
}

function isRoadCell(x: number, y: number) {
  if (x < 0 || y < 0 || x >= GRID || y >= GRID) return false;
  if (TERRAIN[y]![x] !== "road") return false;
  if (hitsSaleLot(x + 0.5, y + 0.5, 0.08)) return false;
  return true;
}

function isSidewalkCell(x: number, y: number) {
  if (x < 0 || y < 0 || x >= GRID || y >= GRID) return false;
  return TERRAIN[y]![x] === "sidewalk" && inDistrict(x, y);
}

export function StreetsLayer() {
  const maps = useCityMaps();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const asphaltRef = useRef<THREE.InstancedMesh>(null);
  const curbRef = useRef<THREE.InstancedMesh>(null);
  const walkRef = useRef<THREE.InstancedMesh>(null);
  const stripeRef = useRef<THREE.InstancedMesh>(null);

  const asphalt = useMemo(() => {
    const cells: { x: number; y: number }[] = [];
    for (let y = FIRST_DISTRICT.y0; y <= FIRST_DISTRICT.y1; y++) {
      for (let x = FIRST_DISTRICT.x0; x <= FIRST_DISTRICT.x1; x++) {
        if (isRoadCell(x, y)) cells.push({ x, y });
      }
    }
    return cells;
  }, []);

  const walks = useMemo(() => {
    const cells: { x: number; y: number }[] = [];
    for (let y = FIRST_DISTRICT.y0; y <= FIRST_DISTRICT.y1; y++) {
      for (let x = FIRST_DISTRICT.x0; x <= FIRST_DISTRICT.x1; x++) {
        if (isSidewalkCell(x, y) && !hitsSaleLot(x + 0.5, y + 0.5, 0.2)) cells.push({ x, y });
      }
    }
    return cells;
  }, []);

  const curbs = useMemo(() => {
    const list: { x: number; y: number; rot: number }[] = [];
    for (const c of asphalt) {
      const alongX = ROAD_YS.includes(c.y);
      if (alongX) {
        list.push({ x: c.x + 0.5, y: c.y + 0.08, rot: 0 });
        list.push({ x: c.x + 0.5, y: c.y + 0.92, rot: 0 });
      } else {
        list.push({ x: c.x + 0.08, y: c.y + 0.5, rot: Math.PI / 2 });
        list.push({ x: c.x + 0.92, y: c.y + 0.5, rot: Math.PI / 2 });
      }
    }
    return list;
  }, [asphalt]);

  const stripes = useMemo(() => {
    const list: { x: number; y: number; rot: number; i: number }[] = [];
    for (const rx of ROAD_XS) {
      for (const ry of ROAD_YS) {
        if (!inDistrict(rx, ry) || !isRoadCell(rx, ry)) continue;
        for (let i = 0; i < 5; i++) {
          list.push({ x: rx + 0.5, y: ry - 0.32 + i * 0.16, rot: 0, i });
          list.push({ x: rx - 0.32 + i * 0.16, y: ry + 0.5, rot: Math.PI / 2, i });
        }
      }
    }
    return list;
  }, []);

  useLayoutEffect(() => {
    const m = asphaltRef.current;
    if (!m) return;
    asphalt.forEach((c, i) => {
      dummy.position.set(wx(c.x + 0.5), h(0.035), wz(c.y + 0.5));
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [asphalt, dummy]);

  useLayoutEffect(() => {
    const m = curbRef.current;
    if (!m) return;
    curbs.forEach((c, i) => {
      dummy.position.set(wx(c.x), h(0.055), wz(c.y));
      dummy.rotation.set(0, c.rot, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [curbs, dummy]);

  useLayoutEffect(() => {
    const m = walkRef.current;
    if (!m) return;
    walks.forEach((c, i) => {
      dummy.position.set(wx(c.x + 0.5), h(0.05), wz(c.y + 0.5));
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [walks, dummy]);

  useLayoutEffect(() => {
    const m = stripeRef.current;
    if (!m) return;
    stripes.forEach((s, i) => {
      dummy.position.set(wx(s.x), h(0.048), wz(s.y));
      dummy.rotation.set(0, s.rot, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [stripes, dummy]);

  if (!asphalt.length) return null;
  return (
    <group>
      <instancedMesh ref={asphaltRef} args={[undefined, undefined, asphalt.length]} receiveShadow>
        <boxGeometry args={[TILE * 0.9, h(0.05), TILE * 0.9]} />
        <meshStandardMaterial color="#4a4740" map={maps.asphalt} roughness={0.92} metalness={0.04} />
      </instancedMesh>
      {curbs.length ? (
        <instancedMesh ref={curbRef} args={[undefined, undefined, curbs.length]} receiveShadow>
          <boxGeometry args={[TILE * 0.92, h(0.04), TILE * 0.06]} />
          <meshStandardMaterial color="#c4bba8" roughness={0.78} metalness={0.04} />
        </instancedMesh>
      ) : null}
      {walks.length ? (
        <instancedMesh ref={walkRef} args={[undefined, undefined, walks.length]} receiveShadow>
          <boxGeometry args={[TILE * 0.92, h(0.045), TILE * 0.92]} />
          <meshStandardMaterial color="#c8c2b4" map={maps.concrete} roughness={0.86} metalness={0.03} />
        </instancedMesh>
      ) : null}
      {stripes.length ? (
        <instancedMesh ref={stripeRef} args={[undefined, undefined, stripes.length]} raycast={() => undefined}>
          <boxGeometry args={[TILE * 0.12, h(0.02), TILE * 0.42]} />
          <meshStandardMaterial color="#e8e4d8" roughness={0.7} />
        </instancedMesh>
      ) : null}
    </group>
  );
}
