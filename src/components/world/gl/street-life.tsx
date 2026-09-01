"use client";

import { useMemo } from "react";
import { GRID, TERRAIN } from "@/lib/campus";
import { TILE, h, wx, wz } from "@/lib/coords";
import { expandedRect, getPlot, pointInRect } from "@/lib/plots";
import { SCENERY } from "@/lib/scenery";
import { FIRST_DISTRICT } from "@/components/world/gl/streets";
import { inAuthoredEnv } from "@/lib/env-district";
import { useWorld } from "@/components/world/world-store";

function inFirst(x: number, y: number) {
  return x >= FIRST_DISTRICT.x0 - 1 && x <= FIRST_DISTRICT.x1 + 1 && y >= FIRST_DISTRICT.y0 && y <= FIRST_DISTRICT.y1 + 1;
}

function Bench({ x, y }: { x: number; y: number }) {
  return (
    <group position={[wx(x), h(0.12), wz(y)]}>
      <mesh position={[0, h(0.12), 0]} castShadow>
        <boxGeometry args={[TILE * 0.42, h(0.05), TILE * 0.14]} />
        <meshStandardMaterial color="#6b5344" roughness={0.72} />
      </mesh>
      {[-0.14, 0.14].map((sx) => (
        <mesh key={sx} position={[sx * TILE, h(0.06), 0]}>
          <boxGeometry args={[h(0.04), h(0.12), TILE * 0.12]} />
          <meshStandardMaterial color="#2a2118" roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

function Planter({ x, y }: { x: number; y: number }) {
  return (
    <group position={[wx(x), h(0.08), wz(y)]}>
      <mesh castShadow>
        <cylinderGeometry args={[TILE * 0.12, TILE * 0.14, TILE * 0.16, 8]} />
        <meshStandardMaterial color="#8a7a62" roughness={0.78} />
      </mesh>
      <mesh position={[0, TILE * 0.1, 0]}>
        <sphereGeometry args={[TILE * 0.14, 7, 5]} />
        <meshStandardMaterial color="#3d6e3a" roughness={0.9} />
      </mesh>
    </group>
  );
}

function ParkedCar({ x, y, color }: { x: number; y: number; color: string }) {
  const alongY = TERRAIN[Math.floor(y)]?.[Math.floor(x)] === "road";
  return (
    <group position={[wx(x), h(0.12), wz(y)]} rotation-y={alongY ? 0 : Math.PI / 2}>
      <mesh position={[0, h(0.08), 0]} castShadow>
        <boxGeometry args={[h(0.22), h(0.1), h(0.42)]} />
        <meshStandardMaterial color={color} metalness={0.32} roughness={0.42} />
      </mesh>
      <mesh position={[0, h(0.16), h(-0.04)]} castShadow>
        <boxGeometry args={[h(0.18), h(0.1), h(0.22)]} />
        <meshStandardMaterial color="#1c1917" metalness={0.2} roughness={0.32} />
      </mesh>
    </group>
  );
}

function DistrictSign({ x, y, color }: { x: number; y: number; color?: string }) {
  return (
    <group position={[wx(x), 0, wz(y)]}>
      <mesh position={[0, h(0.32), 0]}>
        <cylinderGeometry args={[h(0.03), h(0.035), h(0.64), 6]} />
        <meshStandardMaterial color="#3f3a34" roughness={0.5} metalness={0.25} />
      </mesh>
      <mesh position={[0, h(0.62), 0]} castShadow>
        <boxGeometry args={[TILE * 0.28, TILE * 0.16, TILE * 0.04]} />
        <meshStandardMaterial color={color ?? "#f3efe6"} roughness={0.55} />
      </mesh>
    </group>
  );
}

export function StreetLife() {
  const { selectedPlotId, claimedPlotIds, plotExpand } = useWorld();
  const claimed = useMemo(() => new Set(claimedPlotIds), [claimedPlotIds]);
  const hide = useMemo(() => {
    const p = getPlot(selectedPlotId);
    if (p?.kind === "sale" && !claimed.has(p.id)) return expandedRect(p, plotExpand);
    return null;
  }, [selectedPlotId, claimed, plotExpand]);

  const items = useMemo(() => {
    return SCENERY.filter((s) => {
      if (!inFirst(s.x, s.y)) return false;
      if (inAuthoredEnv(s.x, s.y)) return false;
      if (s.kind !== "bench" && s.kind !== "planter" && s.kind !== "car" && s.kind !== "sign") return false;
      const ix = Math.floor(s.x);
      const iy = Math.floor(s.y);
      if (ix >= 0 && iy >= 0 && iy < GRID && ix < GRID && TERRAIN[iy]![ix] === "water") return false;
      return true;
    });
  }, []);

  return (
    <group>
      {items.map((s) => {
        if (hide && pointInRect(s.x, s.y, hide)) return null;
        if (s.kind === "bench") return <Bench key={s.id} x={s.x} y={s.y} />;
        if (s.kind === "planter") return <Planter key={s.id} x={s.x} y={s.y} />;
        if (s.kind === "car") return <ParkedCar key={s.id} x={s.x} y={s.y} color={s.color ?? "#c45c4a"} />;
        if (s.kind === "sign") return <DistrictSign key={s.id} x={s.x} y={s.y} color={s.color} />;
        return null;
      })}
    </group>
  );
}
