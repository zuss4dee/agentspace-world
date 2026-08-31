"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { GRID, ROAD_XS, ROAD_YS, TERRAIN } from "@/lib/campus";
import { TILE, h, wx, wz } from "@/lib/coords";

function tilesOf(kind: "road" | "sidewalk" | "plaza") {
  const out: { x: number; y: number }[] = [];
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      if (TERRAIN[y]![x] === kind) out.push({ x, y });
    }
  }
  return out;
}

function isCross(x: number, y: number) {
  return ROAD_XS.includes(x) && ROAD_YS.includes(y);
}

export function StreetsLayer() {
  const roads = useMemo(() => tilesOf("road"), []);
  const walks = useMemo(() => tilesOf("sidewalk"), []);
  const plazas = useMemo(() => tilesOf("plaza"), []);
  const stripes = useMemo(() => roads.filter((t) => !isCross(t.x, t.y)), [roads]);
  const lamps = useMemo(() => {
    const out: { x: number; y: number }[] = [];
    for (const w of walks) {
      if ((w.x + w.y) % 2 !== 0) continue;
      out.push({ x: w.x + 0.35, y: w.y + 0.35 });
    }
    return out;
  }, [walks]);

  const roadMesh = useRef<THREE.InstancedMesh>(null);
  const walkMesh = useRef<THREE.InstancedMesh>(null);
  const plazaMesh = useRef<THREE.InstancedMesh>(null);
  const stripeMesh = useRef<THREE.InstancedMesh>(null);
  const poleMesh = useRef<THREE.InstancedMesh>(null);
  const globeMesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useLayoutEffect(() => {
    const road = roadMesh.current;
    const walk = walkMesh.current;
    const plaza = plazaMesh.current;
    const stripe = stripeMesh.current;
    if (!road || !walk || !plaza || !stripe) return;
    roads.forEach((t, i) => {
      dummy.rotation.set(0, 0, 0);
      dummy.position.set(wx(t.x + 0.5), h(0.07), wz(t.y + 0.5));
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      road.setMatrixAt(i, dummy.matrix);
    });
    walks.forEach((t, i) => {
      dummy.rotation.set(0, 0, 0);
      dummy.position.set(wx(t.x + 0.5), h(0.11), wz(t.y + 0.5));
      dummy.updateMatrix();
      walk.setMatrixAt(i, dummy.matrix);
    });
    plazas.forEach((t, i) => {
      dummy.rotation.set(0, 0, 0);
      dummy.position.set(wx(t.x + 0.5), h(0.1), wz(t.y + 0.5));
      dummy.updateMatrix();
      plaza.setMatrixAt(i, dummy.matrix);
    });
    stripes.forEach((t, i) => {
      const alongY = ROAD_XS.includes(t.x);
      dummy.position.set(wx(t.x + 0.5), h(0.125), wz(t.y + 0.5));
      dummy.rotation.set(0, alongY ? 0 : Math.PI / 2, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      stripe.setMatrixAt(i, dummy.matrix);
    });
    road.instanceMatrix.needsUpdate = true;
    walk.instanceMatrix.needsUpdate = true;
    plaza.instanceMatrix.needsUpdate = true;
    stripe.instanceMatrix.needsUpdate = true;
    road.computeBoundingSphere();
    walk.computeBoundingSphere();
  }, [dummy, roads, walks, plazas, stripes]);

  useLayoutEffect(() => {
    const poles = poleMesh.current;
    const globes = globeMesh.current;
    if (!poles || !globes) return;
    lamps.forEach((s, i) => {
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.position.set(wx(s.x), h(1.15), wz(s.y));
      dummy.updateMatrix();
      poles.setMatrixAt(i, dummy.matrix);
      dummy.position.set(wx(s.x), h(2.28), wz(s.y));
      dummy.updateMatrix();
      globes.setMatrixAt(i, dummy.matrix);
    });
    poles.instanceMatrix.needsUpdate = true;
    globes.instanceMatrix.needsUpdate = true;
    poles.computeBoundingSphere();
  }, [dummy, lamps]);

  return (
    <group>
      {roads.length ? (
        <instancedMesh ref={roadMesh} args={[undefined, undefined, roads.length]} receiveShadow>
          <boxGeometry args={[TILE * 0.98, h(0.1), TILE * 0.98]} />
          <meshStandardMaterial color="#2a2a2a" roughness={0.92} />
        </instancedMesh>
      ) : null}
      {walks.length ? (
        <instancedMesh ref={walkMesh} args={[undefined, undefined, walks.length]} receiveShadow>
          <boxGeometry args={[TILE * 0.94, h(0.08), TILE * 0.94]} />
          <meshStandardMaterial color="#d9d4cc" roughness={0.86} />
        </instancedMesh>
      ) : null}
      {plazas.length ? (
        <instancedMesh ref={plazaMesh} args={[undefined, undefined, plazas.length]} receiveShadow>
          <boxGeometry args={[TILE * 0.96, h(0.07), TILE * 0.96]} />
          <meshStandardMaterial color="#cfc6b8" roughness={0.88} />
        </instancedMesh>
      ) : null}
      {stripes.length ? (
        <instancedMesh ref={stripeMesh} args={[undefined, undefined, stripes.length]} frustumCulled={false}>
          <boxGeometry args={[TILE * 0.08, h(0.02), TILE * 0.42]} />
          <meshStandardMaterial color="#f2e27a" roughness={0.55} />
        </instancedMesh>
      ) : null}
      {lamps.length ? (
        <>
          <instancedMesh ref={poleMesh} args={[undefined, undefined, lamps.length]} castShadow>
            <cylinderGeometry args={[h(0.045), h(0.06), h(2.3), 6]} />
            <meshStandardMaterial color="#111111" roughness={0.45} metalness={0.25} />
          </instancedMesh>
          <instancedMesh ref={globeMesh} args={[undefined, undefined, lamps.length]} frustumCulled={false}>
            <sphereGeometry args={[h(0.16), 8, 8]} />
            <meshStandardMaterial color="#fff4d2" emissive="#ffd27a" emissiveIntensity={1.15} />
          </instancedMesh>
        </>
      ) : null}
    </group>
  );
}
