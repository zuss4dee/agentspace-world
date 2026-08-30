"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { useWorld } from "@/components/world/world-store";
import { CITY_LOTS } from "@/lib/city-gen";
import { buildingHeight, TILE, wx, wz } from "@/lib/coords";

export function CityLotsLayer() {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const { selectedBuildingId, interiorId, selectBuilding, selectDistrict } = useWorld();
  const lots = useMemo(() => CITY_LOTS.filter((b) => b.id !== interiorId), [interiorId]);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);

  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    lots.forEach((b, i) => {
      const w = b.size.x * TILE * 0.88;
      const d = b.size.y * TILE * 0.88;
      const h = buildingHeight(b.height);
      dummy.position.set(wx(b.origin.x + b.size.x / 2), h * 0.42, wz(b.origin.y + b.size.y / 2));
      dummy.scale.set(w, h * 0.84, d);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      color.set(selectedBuildingId === b.id ? "#ead7c4" : b.wall);
      m.setColorAt(i, color);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [lots, dummy, color, selectedBuildingId]);

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const id = e.instanceId;
    if (id == null) return;
    const b = lots[id];
    if (!b) return;
    selectBuilding(b.id);
    selectDistrict(b.districtId);
  };

  if (!lots.length) return null;
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, lots.length]} castShadow={false} receiveShadow onClick={onClick}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial roughness={0.62} metalness={0.12} />
    </instancedMesh>
  );
}
