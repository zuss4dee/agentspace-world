"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { PLOTS } from "@/lib/plots";
import { TILE, wx, wz } from "@/lib/coords";
import { useWorld } from "@/components/world/world-store";

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
  const { selectedPlotId, selectPlot } = useWorld();
  const list = PLOTS;

  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    list.forEach((p, i) => {
      dummy.position.set(wx(p.x + p.w / 2), 0.04, wz(p.y + p.h / 2));
      dummy.scale.set(p.w * TILE * 0.92, 1, p.h * TILE * 0.92);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      const c = COLOR[p.kind];
      color.copy(c);
      if (selectedPlotId === p.id) color.lerp(new THREE.Color("#ed712e"), 0.45);
      m.setColorAt(i, color);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [dummy, color, list, selectedPlotId]);

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
  const sales = useMemo(() => PLOTS.filter((p) => p.kind === "sale").filter((_, i) => i % 3 === 0), []);
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
            <meshStandardMaterial color="#ed712e" emissive="#ed712e" emissiveIntensity={0.25} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
