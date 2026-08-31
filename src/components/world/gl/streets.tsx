"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { GRID, ROAD_XS, ROAD_YS, TERRAIN } from "@/lib/campus";
import { TILE, h, wx, wz } from "@/lib/coords";
import { hitsSaleLot } from "@/lib/plots";
import { CARRIAGE_TILES, CURB_OFF, CURB_TILES, WALK_OFF, WALK_TILES } from "@/lib/traffic";
import { useCityMaps } from "@/components/world/gl/surface-maps";

/** First-district street kit only — north campus around the authored buildings. */
export const FIRST_DISTRICT = { x0: 6, y0: 0, x1: 46, y1: 13 };

const ROAD_W = TILE * CARRIAGE_TILES;
const WALK_W = TILE * WALK_TILES;
const CURB_W = TILE * CURB_TILES;

function inDistrict(x: number, y: number) {
  return x >= FIRST_DISTRICT.x0 && x <= FIRST_DISTRICT.x1 && y >= FIRST_DISTRICT.y0 && y <= FIRST_DISTRICT.y1;
}

function isRoadCell(x: number, y: number) {
  if (x < 0 || y < 0 || x >= GRID || y >= GRID) return false;
  if (TERRAIN[y]![x] !== "road") return false;
  if (hitsSaleLot(x + 0.5, y + 0.5, 0.08)) return false;
  return true;
}

type Seg = { cx: number; cy: number; alongX: boolean; len: number };

function mergeLanes(): Seg[] {
  const segs: Seg[] = [];
  for (const rx of ROAD_XS) {
    if (!inDistrict(rx, FIRST_DISTRICT.y0)) continue;
    let run: number | null = null;
    const flush = (end: number) => {
      if (run == null) return;
      const len = end - run + 1;
      if (len < 1) return;
      segs.push({ cx: rx + 0.5, cy: run + len / 2, alongX: false, len });
      run = null;
    };
    for (let y = FIRST_DISTRICT.y0; y <= FIRST_DISTRICT.y1; y++) {
      if (isRoadCell(rx, y)) {
        if (run == null) run = y;
      } else flush(y - 1);
    }
    flush(FIRST_DISTRICT.y1);
  }
  for (const ry of ROAD_YS) {
    if (ry < FIRST_DISTRICT.y0 || ry > FIRST_DISTRICT.y1) continue;
    let run: number | null = null;
    const flush = (end: number) => {
      if (run == null) return;
      const len = end - run + 1;
      if (len < 1) return;
      segs.push({ cx: run + len / 2, cy: ry + 0.5, alongX: true, len });
      run = null;
    };
    for (let x = FIRST_DISTRICT.x0; x <= FIRST_DISTRICT.x1; x++) {
      if (isRoadCell(x, ry)) {
        if (run == null) run = x;
      } else flush(x - 1);
    }
    flush(FIRST_DISTRICT.x1);
  }
  return segs;
}

export function StreetsLayer() {
  const maps = useCityMaps();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const asphaltRef = useRef<THREE.InstancedMesh>(null);
  const curbRef = useRef<THREE.InstancedMesh>(null);
  const walkRef = useRef<THREE.InstancedMesh>(null);
  const stripeRef = useRef<THREE.InstancedMesh>(null);

  const segs = useMemo(() => mergeLanes(), []);

  const curbs = useMemo(() => {
    const list: { x: number; y: number; rot: number; len: number }[] = [];
    for (const s of segs) {
      if (s.alongX) {
        list.push({ x: s.cx, y: s.cy - CURB_OFF, rot: 0, len: s.len });
        list.push({ x: s.cx, y: s.cy + CURB_OFF, rot: 0, len: s.len });
      } else {
        list.push({ x: s.cx - CURB_OFF, y: s.cy, rot: Math.PI / 2, len: s.len });
        list.push({ x: s.cx + CURB_OFF, y: s.cy, rot: Math.PI / 2, len: s.len });
      }
    }
    return list;
  }, [segs]);

  const walks = useMemo(() => {
    const list: { x: number; y: number; rot: number; len: number }[] = [];
    for (const s of segs) {
      if (s.alongX) {
        list.push({ x: s.cx, y: s.cy - WALK_OFF, rot: 0, len: s.len });
        list.push({ x: s.cx, y: s.cy + WALK_OFF, rot: 0, len: s.len });
      } else {
        list.push({ x: s.cx - WALK_OFF, y: s.cy, rot: Math.PI / 2, len: s.len });
        list.push({ x: s.cx + WALK_OFF, y: s.cy, rot: Math.PI / 2, len: s.len });
      }
    }
    return list;
  }, [segs]);

  const stripes = useMemo(() => {
    const list: { x: number; y: number; rot: number }[] = [];
    for (const rx of ROAD_XS) {
      for (const ry of ROAD_YS) {
        if (!inDistrict(rx, ry) || !isRoadCell(rx, ry)) continue;
        for (let i = 0; i < 3; i++) {
          list.push({ x: rx + 0.5, y: ry + 0.28 + i * 0.18, rot: 0 });
          list.push({ x: rx + 0.28 + i * 0.18, y: ry + 0.5, rot: Math.PI / 2 });
        }
      }
    }
    return list;
  }, []);

  useLayoutEffect(() => {
    const m = asphaltRef.current;
    if (!m) return;
    segs.forEach((s, i) => {
      dummy.position.set(wx(s.cx), h(0.032), wz(s.cy));
      dummy.rotation.set(0, s.alongX ? 0 : Math.PI / 2, 0);
      dummy.scale.set(s.len, 1, 1);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [segs, dummy]);

  useLayoutEffect(() => {
    const m = curbRef.current;
    if (!m) return;
    curbs.forEach((c, i) => {
      dummy.position.set(wx(c.x), h(0.05), wz(c.y));
      dummy.rotation.set(0, c.rot, 0);
      dummy.scale.set(c.len, 1, 1);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [curbs, dummy]);

  useLayoutEffect(() => {
    const m = walkRef.current;
    if (!m) return;
    walks.forEach((c, i) => {
      dummy.position.set(wx(c.x), h(0.044), wz(c.y));
      dummy.rotation.set(0, c.rot, 0);
      dummy.scale.set(c.len, 1, 1);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [walks, dummy]);

  useLayoutEffect(() => {
    const m = stripeRef.current;
    if (!m) return;
    stripes.forEach((s, i) => {
      dummy.position.set(wx(s.x), h(0.045), wz(s.y));
      dummy.rotation.set(0, s.rot, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [stripes, dummy]);

  if (!segs.length) return null;
  return (
    <group>
      <instancedMesh ref={asphaltRef} args={[undefined, undefined, segs.length]} receiveShadow>
        <boxGeometry args={[TILE, h(0.045), ROAD_W]} />
        <meshStandardMaterial color="#4a4842" map={maps.asphalt} roughness={0.96} metalness={0.02} />
      </instancedMesh>
      {curbs.length ? (
        <instancedMesh ref={curbRef} args={[undefined, undefined, curbs.length]} receiveShadow>
          <boxGeometry args={[TILE, h(0.035), CURB_W]} />
          <meshStandardMaterial color="#b8b0a4" roughness={0.88} metalness={0.02} />
        </instancedMesh>
      ) : null}
      {walks.length ? (
        <instancedMesh ref={walkRef} args={[undefined, undefined, walks.length]} receiveShadow>
          <boxGeometry args={[TILE, h(0.032), WALK_W]} />
          <meshStandardMaterial color="#c2bcb0" map={maps.concrete} roughness={0.88} metalness={0.02} />
        </instancedMesh>
      ) : null}
      {stripes.length ? (
        <instancedMesh ref={stripeRef} args={[undefined, undefined, stripes.length]} raycast={() => undefined}>
          <boxGeometry args={[TILE * 0.055, h(0.012), TILE * 0.2]} />
          <meshStandardMaterial color="#cfc8ba" roughness={0.82} />
        </instancedMesh>
      ) : null}
    </group>
  );
}
