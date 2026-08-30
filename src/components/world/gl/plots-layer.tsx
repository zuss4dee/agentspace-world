"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { PLOTS } from "@/lib/plots";
import { TILE, wx, wz } from "@/lib/coords";
import { useWorld } from "@/components/world/world-store";

const ZONE_SALE: Record<string, THREE.Color> = {
  downtown: new THREE.Color("#e8c56a"),
  midtown: new THREE.Color("#7eb0ea"),
  uptown: new THREE.Color("#6dce9a"),
  outskirts: new THREE.Color("#e39a5c"),
  ultimate: new THREE.Color("#c4a3f5"),
};

const COLOR = {
  sale: new THREE.Color("#e8c56a"),
  owned: new THREE.Color("#d9c4a8"),
  park: new THREE.Color("#4a8a4e"),
  civic: new THREE.Color("#c5d0c8"),
};

export function PlotsLayer() {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);
  const { selectedPlotId, selectPlot, claimedPlotIds } = useWorld();
  const list = PLOTS;
  const claimed = useMemo(() => new Set(claimedPlotIds), [claimedPlotIds]);

  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    list.forEach((p, i) => {
      dummy.position.set(wx(p.x + p.w / 2), 0.04, wz(p.y + p.h / 2));
      dummy.scale.set(p.w * TILE * 0.92, 1, p.h * TILE * 0.92);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      const taken = claimed.has(p.id);
      const c = p.kind === "sale" && !taken ? (ZONE_SALE[p.zone] ?? COLOR.sale) : taken ? COLOR.owned : COLOR[p.kind];
      color.copy(c);
      if (selectedPlotId === p.id) color.lerp(new THREE.Color("#a78bfa"), 0.45);
      m.setColorAt(i, color);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [dummy, color, list, selectedPlotId, claimed]);

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 4) return;
    e.stopPropagation();
    const id = e.instanceId;
    if (id == null) return;
    const p = list[id];
    if (p) selectPlot(p.id);
  };

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, list.length]} onClick={onClick} receiveShadow>
      <boxGeometry args={[1, 0.06, 1]} />
      <meshStandardMaterial roughness={0.85} metalness={0.04} />
    </instancedMesh>
  );
}

export function SaleStakes() {
  const { claimedPlotIds } = useWorld();
  const claimed = useMemo(() => new Set(claimedPlotIds), [claimedPlotIds]);
  const sales = useMemo(
    () => PLOTS.filter((p) => p.kind === "sale" && !claimed.has(p.id)).filter((_, i) => i % 3 === 0),
    [claimed],
  );
  return (
    <group>
      {sales.map((p) => (
        <group key={p.id} position={[wx(p.x + p.w / 2), 0, wz(p.y + p.h / 2)]}>
          <mesh position={[0.35, 0.45, 0.35]}>
            <cylinderGeometry args={[0.025, 0.03, 0.9, 5]} />
            <meshStandardMaterial color="#4a4038" />
          </mesh>
          <mesh position={[0.35, 0.85, 0.35]}>
            <boxGeometry args={[0.22, 0.16, 0.04]} />
            <meshStandardMaterial color="#7c6cff" emissive="#7c6cff" emissiveIntensity={0.25} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
