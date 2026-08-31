"use client";

import { useMemo } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import { WORLD_BUILDINGS } from "@/lib/campus";
import { buildingHeight, TILE, h as px, wx, wz } from "@/lib/coords";
import type { Building, BuildingStyle } from "@/lib/types";
import { useWorld } from "@/components/world/world-store";

function wallMat(style: BuildingStyle) {
  switch (style) {
    case "hq":
    case "office":
    case "conference":
    case "lab":
      return { color: "#c4cdd8", roughness: 0.28, metalness: 0.38 };
    case "data":
      return { color: "#334155", roughness: 0.35, metalness: 0.6 };
    case "factory":
    case "workshop":
      return { color: "#c4ae7a", roughness: 0.86, metalness: 0.08 };
    case "warehouse":
    case "station":
      return { color: "#8b96a6", roughness: 0.55, metalness: 0.35 };
    case "house":
    case "cafe":
    case "restaurant":
      return { color: "#e8d2b8", roughness: 0.78, metalness: 0.04 };
    case "hotel":
    case "apartment":
      return { color: "#e4c4b4", roughness: 0.62, metalness: 0.08 };
    case "studio":
    case "gallery":
      return { color: "#d8a8bc", roughness: 0.55, metalness: 0.1 };
    case "retail":
      return { color: "#f0c8c4", roughness: 0.5, metalness: 0.12 };
    default:
      return { color: "#d4c8b8", roughness: 0.7, metalness: 0.08 };
  }
}

function WindowGrid({ w, h, d, glow = "#d9c49a" }: { w: number; h: number; d: number; glow?: string }) {
  const panes = useMemo(() => {
    const list: { x: number; y: number; z: number; sx: number; sz: number }[] = [];
    const gapX = TILE * 0.58;
    const gapY = TILE * 0.68;
    const rows = Math.max(1, Math.min(4, Math.floor((h - TILE * 0.4) / gapY)));
    const pw = TILE * 0.2;
    const ph = TILE * 0.26;
    const addFace = (span: number, place: (x: number, y: number) => { x: number; y: number; z: number; sx: number; sz: number }) => {
      const fc = Math.max(1, Math.min(5, Math.floor((span - TILE * 0.45) / gapX)));
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < fc; c++) {
          const u = -span / 2 + TILE * 0.4 + (c * (span - TILE * 0.8)) / Math.max(1, fc - 1);
          const y = TILE * 0.4 + (r * (h - TILE * 0.75)) / Math.max(1, rows);
          list.push(place(u, y));
        }
      }
    };
    addFace(w, (x, y) => ({ x, y, z: d / 2 + TILE * 0.02, sx: pw, sz: TILE * 0.04 }));
    addFace(d, (z, y) => ({ x: w / 2 + TILE * 0.02, y, z, sx: TILE * 0.04, sz: pw }));
    return list;
  }, [w, h, d]);
  return (
    <group>
      {panes.map((p, i) => (
        <mesh key={i} position={[p.x, p.y, p.z]}>
          <boxGeometry args={[p.sx, TILE * 0.26, p.sz]} />
          <meshStandardMaterial
            color="#7d8f92"
            emissive={glow}
            emissiveIntensity={i % 4 === 0 ? 0.22 : 0.05}
            roughness={0.22}
            metalness={0.2}
          />
        </mesh>
      ))}
    </group>
  );
}

/** Shared mass for the sale ghost, claimed offices, and world buildings. */
export function FacadeOffice({
  w,
  d,
  height,
  wall,
  roof,
  accent,
  opacity = 1,
}: {
  w: number;
  d: number;
  height: number;
  wall: string;
  roof: string;
  accent: string;
  opacity?: number;
}) {
  const trans = opacity < 0.99;
  return (
    <group>
      <mesh position={[0, TILE * 0.06, 0]} receiveShadow>
        <boxGeometry args={[w * 1.06, TILE * 0.12, d * 1.06]} />
        <meshStandardMaterial color="#2a2622" roughness={0.55} transparent={trans} opacity={opacity} />
      </mesh>
      <mesh position={[0, height * 0.42, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, height * 0.84, d]} />
        <meshStandardMaterial color={wall} roughness={0.48} metalness={0.12} transparent={trans} opacity={opacity} />
      </mesh>
      <mesh position={[0, height * 0.86, 0]} castShadow>
        <boxGeometry args={[w * 1.04, TILE * 0.1, d * 1.04]} />
        <meshStandardMaterial color={roof} roughness={0.62} transparent={trans} opacity={opacity} />
      </mesh>
      <mesh position={[0, height * 0.92, 0]}>
        <boxGeometry args={[w * 0.72, TILE * 0.08, d * 0.72]} />
        <meshStandardMaterial color={roof} roughness={0.5} transparent={trans} opacity={Math.min(1, opacity + 0.04)} />
      </mesh>
      <mesh position={[0, TILE * 0.42, d / 2 + TILE * 0.02]}>
        <boxGeometry args={[TILE * 0.42, TILE * 0.7, TILE * 0.08]} />
        <meshStandardMaterial color={accent} roughness={0.4} transparent={trans} opacity={opacity} />
      </mesh>
      <WindowGrid w={w} h={height} d={d} />
    </group>
  );
}

function EchtHouse({ selected, w, h, d }: { selected: boolean; w: number; h: number; d: number }) {
  const lime = selected ? "#f7fee7" : "#ecfccb";
  return (
    <group>
      <mesh position={[0, px(0.16), 0]} receiveShadow>
        <boxGeometry args={[w * 1.08, px(0.32), d * 1.08]} />
        <meshStandardMaterial color="#111827" roughness={0.4} metalness={0.35} />
      </mesh>
      <mesh position={[0, h * 0.42, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h * 0.78, d]} />
        <meshStandardMaterial color={lime} roughness={0.18} metalness={0.42} />
      </mesh>
      <mesh position={[0, h * 0.92, -d * 0.12]} castShadow>
        <boxGeometry args={[w * 0.62, h * 0.38, d * 0.42]} />
        <meshStandardMaterial color="#1f2937" roughness={0.3} metalness={0.5} />
      </mesh>
      <mesh position={[0, h * 1.08, d * 0.28]} castShadow>
        <boxGeometry args={[w * 0.9, px(0.12), d * 0.28]} />
        <meshStandardMaterial color="#84cc16" emissive="#65a30d" emissiveIntensity={0.35} />
      </mesh>
      {[-0.28, 0, 0.28].map((x) => (
        <mesh key={x} position={[x * w, h * 0.55, d / 2 + px(0.04)]}>
          <boxGeometry args={[w * 0.18, h * 0.22, px(0.06)]} />
          <meshStandardMaterial color="#d9f99d" emissive="#84cc16" emissiveIntensity={0.2} roughness={0.12} />
        </mesh>
      ))}
      <mesh position={[0, px(0.55), d / 2 + px(0.05)]}>
        <boxGeometry args={[px(1.15), px(0.28), px(0.08)]} />
        <meshStandardMaterial color="#111827" />
      </mesh>
      <mesh position={[0, px(0.55), d / 2 + px(0.1)]}>
        <boxGeometry args={[px(0.95), px(0.14), px(0.04)]} />
        <meshStandardMaterial color="#84cc16" emissive="#84cc16" emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

function BuildingBody({ b, selected }: { b: Building; selected: boolean }) {
  const w = b.size.x * TILE * 0.92;
  const d = b.size.y * TILE * 0.92;
  const h = buildingHeight(b.height);
  const mat = wallMat(b.style);
  const roof = b.roof;
  const style = b.style;

  if (b.id === "incubator") {
    return <EchtHouse selected={selected} w={w} h={h} d={d} />;
  }

  const extras = (
    <>
      <WindowGrid w={w} h={h} d={d} />
      <mesh position={[0, px(0.18), d / 2 + px(0.02)]}>
        <boxGeometry args={[px(0.38), px(0.7), px(0.08)]} />
        <meshStandardMaterial color={b.accent} />
      </mesh>
    </>
  );

  if (style === "house") {
    return (
      <group>
        <mesh position={[0, h * 0.32, 0]} castShadow receiveShadow>
          <boxGeometry args={[w, h * 0.64, d]} />
          <meshStandardMaterial {...mat} />
        </mesh>
        <mesh position={[0, h * 0.78, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
          <coneGeometry args={[Math.max(w, d) * 0.72, h * 0.42, 4]} />
          <meshStandardMaterial color={roof} roughness={0.7} />
        </mesh>
        {extras}
      </group>
    );
  }
  if (style === "hq" || style === "hotel" || style === "apartment" || style === "data") {
    return (
      <group>
        <mesh position={[0, TILE * 0.06, 0]} receiveShadow>
          <boxGeometry args={[w * 1.06, TILE * 0.12, d * 1.06]} />
          <meshStandardMaterial color="#1f2937" roughness={0.5} />
        </mesh>
        <mesh position={[0, h * 0.45, 0]} castShadow receiveShadow>
          <boxGeometry args={[w, h * 0.9, d]} />
          <meshStandardMaterial {...mat} color={selected ? "#ead7c4" : mat.color} />
        </mesh>
        <mesh position={[0, h * 0.98, 0]} castShadow>
          <boxGeometry args={[w * 0.55, h * 0.35, d * 0.5]} />
          <meshStandardMaterial {...mat} metalness={0.6} />
        </mesh>
        {extras}
      </group>
    );
  }
  if (style === "factory" || style === "warehouse" || style === "workshop") {
    return (
      <group>
        <mesh position={[0, h * 0.38, 0]} castShadow receiveShadow>
          <boxGeometry args={[w, h * 0.76, d]} />
          <meshStandardMaterial {...mat} />
        </mesh>
        <mesh position={[w * 0.38, h * 0.95, -d * 0.2]} castShadow>
          <cylinderGeometry args={[TILE * 0.12, TILE * 0.16, h * 0.5, 8]} />
          <meshStandardMaterial color="#6b7280" metalness={0.5} roughness={0.4} />
        </mesh>
        {extras}
      </group>
    );
  }
  if (style === "pavilion") {
    return (
      <group>
        {[
          [-w / 2 + TILE * 0.12, -d / 2 + TILE * 0.12],
          [w / 2 - TILE * 0.12, -d / 2 + TILE * 0.12],
          [-w / 2 + TILE * 0.12, d / 2 - TILE * 0.12],
          [w / 2 - TILE * 0.12, d / 2 - TILE * 0.12],
        ].map(([x, z], i) => (
          <mesh key={i} position={[x, h * 0.35, z]} castShadow>
            <cylinderGeometry args={[TILE * 0.06, TILE * 0.06, h * 0.7, 6]} />
            <meshStandardMaterial color="#d9cbb4" />
          </mesh>
        ))}
        <mesh position={[0, h * 0.72, 0]} castShadow>
          <coneGeometry args={[Math.max(w, d) * 0.62, TILE * 0.4, 8]} />
          <meshStandardMaterial color={roof} />
        </mesh>
      </group>
    );
  }
  if (style === "cafe" || style === "restaurant") {
    return (
      <group>
        <mesh position={[0, h * 0.38, 0]} castShadow receiveShadow>
          <boxGeometry args={[w, h * 0.76, d]} />
          <meshStandardMaterial {...mat} />
        </mesh>
        <mesh position={[0, h * 0.82, d * 0.2]} rotation={[-0.4, 0, 0]} castShadow>
          <boxGeometry args={[w * 1.05, px(0.08), d * 0.45]} />
          <meshStandardMaterial color={b.accent} />
        </mesh>
        {extras}
      </group>
    );
  }
  return (
    <group>
      <mesh position={[0, TILE * 0.05, 0]} receiveShadow>
        <boxGeometry args={[w * 1.04, TILE * 0.1, d * 1.04]} />
        <meshStandardMaterial color="#2c261f" roughness={0.6} />
      </mesh>
      <mesh position={[0, h * 0.42, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h * 0.84, d]} />
        <meshStandardMaterial {...mat} color={selected ? "#f0ddcc" : mat.color} />
      </mesh>
      <mesh position={[0, h * 0.88, 0]}>
        <boxGeometry args={[w * 1.02, TILE * 0.1, d * 1.02]} />
        <meshStandardMaterial color={roof} roughness={0.6} />
      </mesh>
      {extras}
    </group>
  );
}

export function BuildingsLayer() {
  const { selectedBuildingId, interiorId, selectBuilding, selectDistrict } = useWorld();
  const onClick = (b: Building) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    selectBuilding(b.id);
    selectDistrict(b.districtId);
  };
  return (
    <group>
      {WORLD_BUILDINGS.map((b) => {
        if (interiorId === b.id) return null;
        const cx = wx(b.origin.x + b.size.x / 2);
        const cz = wz(b.origin.y + b.size.y / 2);
        return (
          <group key={b.id} position={[cx, 0, cz]} onClick={onClick(b)}>
            <BuildingBody b={b} selected={selectedBuildingId === b.id} />
            {selectedBuildingId === b.id ? (
              <mesh position={[0, px(0.04), 0]} rotation-x={-Math.PI / 2}>
                <ringGeometry args={[Math.max(b.size.x, b.size.y) * TILE * 0.55, Math.max(b.size.x, b.size.y) * TILE * 0.7, 24]} />
                <meshBasicMaterial color="#ed712e" transparent opacity={0.7} />
              </mesh>
            ) : null}
          </group>
        );
      })}
    </group>
  );
}
