"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { TILE, h } from "@/lib/coords";
import { familyForUse, specFor, type ArchFamily, type WindowKind } from "@/lib/architecture";
import { useCityMaps } from "@/components/world/gl/surface-maps";

type MassProps = {
  family: ArchFamily;
  w: number;
  d: number;
  height: number;
  wall: string;
  roof: string;
  accent: string;
  wallDark?: string;
  opacity?: number;
  selected?: boolean;
  occupied?: boolean;
};

function useRepeat(tex: THREE.Texture, sx: number, sy: number) {
  return useMemo(() => {
    const t = tex.clone();
    t.repeat.set(sx, sy);
    t.needsUpdate = true;
    return t;
  }, [tex, sx, sy]);
}

function hash(i: number) {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

type Win = { x: number; y: number; z: number; sx: number; sy: number; sz: number; rx: number; lit: boolean };

function windowLayout(
  w: number,
  d: number,
  height: number,
  cols: number,
  rows: number,
  kind: WindowKind,
  occupied: boolean,
): Win[] {
  if (kind === "none" || kind === "curtain") return [];
  const list: Win[] = [];
  const pw = kind === "strip" ? Math.min(TILE * 0.7, (w - TILE * 0.5) / Math.max(1, cols) * 1.4) : Math.min(TILE * 0.26, (w - TILE * 0.7) / Math.max(1, cols));
  const ph = kind === "strip" ? Math.min(TILE * 0.2, height / Math.max(2, rows) * 0.45) : Math.min(TILE * 0.38, (height - TILE * 0.85) / Math.max(1, rows));
  const inset = TILE * 0.035;
  const faces: { span: number; n: number; place: (u: number, y: number) => Omit<Win, "lit"> }[] = [
    {
      span: w,
      n: cols,
      place: (u, y) => ({ x: u, y, z: d / 2 - inset, sx: pw, sy: ph, sz: TILE * 0.08, rx: 0 }),
    },
    {
      span: w,
      n: cols,
      place: (u, y) => ({ x: u, y, z: -d / 2 + inset, sx: pw, sy: ph, sz: TILE * 0.08, rx: 0 }),
    },
    {
      span: d,
      n: Math.max(2, cols - 1),
      place: (u, y) => ({ x: w / 2 - inset, y, z: u, sx: TILE * 0.08, sy: ph, sz: pw, rx: 0 }),
    },
    {
      span: d,
      n: Math.max(2, cols - 1),
      place: (u, y) => ({ x: -w / 2 + inset, y, z: u, sx: TILE * 0.08, sy: ph, sz: pw, rx: 0 }),
    },
  ];
  let i = 0;
  for (const face of faces) {
    const count = Math.max(1, face.n);
    const margin = TILE * 0.42;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < count; c++) {
        const u = count === 1 ? 0 : -face.span / 2 + margin + (c * (face.span - margin * 2)) / Math.max(1, count - 1);
        const y = TILE * 0.55 + (r * (height - TILE * 0.95)) / Math.max(1, rows - 1 || 1);
        const p = face.place(u, y);
        list.push({ ...p, lit: occupied && hash(i++) > 0.38 });
      }
    }
  }
  return list;
}

function PunchWindows({
  w,
  d,
  height,
  cols,
  rows,
  kind,
  glass,
  mullion,
  opacity,
  occupied,
}: {
  w: number;
  d: number;
  height: number;
  cols: number;
  rows: number;
  kind: WindowKind;
  glass: string;
  mullion: string;
  opacity: number;
  occupied: boolean;
}) {
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const glassRef = useRef<THREE.InstancedMesh>(null);
  const frameRef = useRef<THREE.InstancedMesh>(null);
  const revealRef = useRef<THREE.InstancedMesh>(null);
  const sillRef = useRef<THREE.InstancedMesh>(null);
  const layout = useMemo(
    () => windowLayout(w, d, height, cols, rows, kind, occupied),
    [w, d, height, cols, rows, kind, occupied],
  );

  useLayoutEffect(() => {
    const g = glassRef.current;
    const f = frameRef.current;
    const r = revealRef.current;
    const s = sillRef.current;
    if (!g || !f || !r || !s) return;
    const c = new THREE.Color();
    layout.forEach((p, i) => {
      dummy.position.set(p.x, p.y, p.z);
      dummy.scale.set(p.sx * 1.04, p.sy * 1.05, p.sz * 1.06);
      dummy.updateMatrix();
      r.setMatrixAt(i, dummy.matrix);
      dummy.scale.set(p.sx, p.sy, p.sz);
      dummy.updateMatrix();
      f.setMatrixAt(i, dummy.matrix);
      dummy.scale.set(p.sx * 0.78, p.sy * 0.74, p.sz * 0.45);
      dummy.updateMatrix();
      g.setMatrixAt(i, dummy.matrix);
      dummy.position.set(p.x, p.y - p.sy * 0.52, p.z);
      dummy.scale.set(p.sx * 1.08, TILE * 0.03, p.sz * 1.4);
      dummy.updateMatrix();
      s.setMatrixAt(i, dummy.matrix);
      c.set(p.lit ? "#f3e4c4" : glass);
      g.setColorAt(i, c);
    });
    g.instanceMatrix.needsUpdate = true;
    f.instanceMatrix.needsUpdate = true;
    r.instanceMatrix.needsUpdate = true;
    s.instanceMatrix.needsUpdate = true;
    if (g.instanceColor) g.instanceColor.needsUpdate = true;
  }, [dummy, layout, glass]);

  if (!layout.length) return null;
  const trans = opacity < 0.99;
  return (
    <group>
      <instancedMesh ref={revealRef} args={[undefined, undefined, layout.length]} raycast={() => undefined}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#5a564e" roughness={0.62} transparent={trans} opacity={opacity} />
      </instancedMesh>
      <instancedMesh ref={frameRef} args={[undefined, undefined, layout.length]} raycast={() => undefined}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={mullion} roughness={0.38} metalness={0.42} transparent={trans} opacity={opacity} />
      </instancedMesh>
      <instancedMesh ref={sillRef} args={[undefined, undefined, layout.length]} raycast={() => undefined}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#cfc6b8" roughness={0.55} metalness={0.12} transparent={trans} opacity={opacity} />
      </instancedMesh>
      <instancedMesh ref={glassRef} args={[undefined, undefined, layout.length]} raycast={() => undefined}>
        <boxGeometry args={[1, 1, 1]} />
        <meshPhysicalMaterial
          color={glass}
          roughness={0.08}
          metalness={0.18}
          clearcoat={0.55}
          clearcoatRoughness={0.12}
          reflectivity={0.72}
          transparent
          opacity={trans ? opacity * 0.85 : 0.82}
          emissive="#f0ddb0"
          emissiveIntensity={occupied ? 0.12 : 0.03}
        />
      </instancedMesh>
    </group>
  );
}

function CurtainWall({
  w,
  d,
  height,
  floors,
  glass,
  mullion,
  opacity,
  occupied,
}: {
  w: number;
  d: number;
  height: number;
  floors: number;
  glass: string;
  mullion: string;
  opacity: number;
  occupied: boolean;
}) {
  const trans = opacity < 0.99;
  const rows = Math.max(2, floors);
  const colsW = Math.max(4, Math.round(w / (TILE * 0.28)));
  const colsD = Math.max(3, Math.round(d / (TILE * 0.28)));
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const paneRef = useRef<THREE.InstancedMesh>(null);
  const barRef = useRef<THREE.InstancedMesh>(null);
  const panes = useMemo(() => {
    const list: { x: number; y: number; z: number; sx: number; sy: number; sz: number; lit: boolean }[] = [];
    const cellW = w / colsW;
    const cellD = d / colsD;
    const cellH = height / rows;
    let i = 0;
    const add = (x: number, y: number, z: number, sx: number, sy: number, sz: number) => {
      list.push({ x, y, z, sx, sy, sz, lit: occupied && hash(i++) > 0.5 });
    };
    for (let r = 0; r < rows; r++) {
      const y = cellH * (r + 0.5);
      for (let c = 0; c < colsW; c++) {
        const x = -w / 2 + cellW * (c + 0.5);
        add(x, y, d / 2 + TILE * 0.012, cellW * 0.86, cellH * 0.78, TILE * 0.03);
        add(x, y, -d / 2 - TILE * 0.012, cellW * 0.86, cellH * 0.78, TILE * 0.03);
      }
      for (let c = 0; c < colsD; c++) {
        const z = -d / 2 + cellD * (c + 0.5);
        add(w / 2 + TILE * 0.012, y, z, TILE * 0.03, cellH * 0.78, cellD * 0.86);
        add(-w / 2 - TILE * 0.012, y, z, TILE * 0.03, cellH * 0.78, cellD * 0.86);
      }
    }
    return list;
  }, [w, d, height, rows, colsW, colsD, occupied]);

  useLayoutEffect(() => {
    const m = paneRef.current;
    const b = barRef.current;
    if (!m || !b) return;
    const c = new THREE.Color();
    panes.forEach((p, i) => {
      dummy.position.set(p.x, p.y, p.z);
      dummy.scale.set(p.sx, p.sy, p.sz);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      dummy.scale.set(p.sx * 1.08, p.sy * 1.12, p.sz * 0.5);
      dummy.updateMatrix();
      b.setMatrixAt(i, dummy.matrix);
      c.set(p.lit ? "#efe2c0" : glass);
      m.setColorAt(i, c);
    });
    m.instanceMatrix.needsUpdate = true;
    b.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [dummy, panes, glass]);

  return (
    <group>
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w * 0.98, height, d * 0.98]} />
        <meshStandardMaterial color={mullion} roughness={0.32} metalness={0.55} transparent={trans} opacity={opacity} />
      </mesh>
      {Array.from({ length: rows + 1 }).map((_, i) => (
        <mesh key={i} position={[0, (height / rows) * i, 0]}>
          <boxGeometry args={[w * 0.995, TILE * 0.04, d * 0.995]} />
          <meshStandardMaterial color="#d8d2c6" roughness={0.45} metalness={0.22} transparent={trans} opacity={opacity} />
        </mesh>
      ))}
      {panes.length ? (
        <>
          <instancedMesh ref={barRef} args={[undefined, undefined, panes.length]} raycast={() => undefined}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color={mullion} roughness={0.3} metalness={0.5} transparent={trans} opacity={opacity} />
          </instancedMesh>
          <instancedMesh ref={paneRef} args={[undefined, undefined, panes.length]} raycast={() => undefined}>
            <boxGeometry args={[1, 1, 1]} />
            <meshPhysicalMaterial
              color={glass}
              roughness={0.06}
              metalness={0.22}
              clearcoat={0.7}
              reflectivity={0.8}
              transparent
              opacity={trans ? opacity * 0.78 : 0.74}
              emissive="#ead9b0"
              emissiveIntensity={occupied ? 0.16 : 0.04}
            />
          </instancedMesh>
        </>
      ) : null}
    </group>
  );
}

function GableRoof({ w, d, y, rise, color, opacity, map }: { w: number; d: number; y: number; rise: number; color: string; opacity: number; map?: THREE.Texture }) {
  const angle = Math.atan2(rise, d / 2);
  const len = Math.hypot(d / 2, rise);
  const trans = opacity < 0.99;
  return (
    <group>
      <mesh position={[0, y + rise / 2, d / 4]} rotation={[angle, 0, 0]} castShadow>
        <boxGeometry args={[w * 1.08, TILE * 0.07, len * 1.04]} />
        <meshStandardMaterial color={color} map={map} roughness={0.62} metalness={0.08} transparent={trans} opacity={opacity} />
      </mesh>
      <mesh position={[0, y + rise / 2, -d / 4]} rotation={[-angle, 0, 0]} castShadow>
        <boxGeometry args={[w * 1.08, TILE * 0.07, len * 1.04]} />
        <meshStandardMaterial color={color} map={map} roughness={0.62} metalness={0.08} transparent={trans} opacity={opacity} />
      </mesh>
      <mesh position={[-w / 2 + TILE * 0.02, y + rise * 0.42, 0]} rotation={[0, 0, 0]}>
        <boxGeometry args={[TILE * 0.05, rise * 0.9, d * 1.02]} />
        <meshStandardMaterial color="#eadfce" roughness={0.78} transparent={trans} opacity={opacity} />
      </mesh>
      <mesh position={[w / 2 - TILE * 0.02, y + rise * 0.42, 0]}>
        <boxGeometry args={[TILE * 0.05, rise * 0.9, d * 1.02]} />
        <meshStandardMaterial color="#eadfce" roughness={0.78} transparent={trans} opacity={opacity} />
      </mesh>
    </group>
  );
}

function ShedRoof({ w, d, y, rise, color, opacity }: { w: number; d: number; y: number; rise: number; color: string; opacity: number }) {
  const angle = Math.atan2(rise, d);
  const len = Math.hypot(d, rise);
  return (
    <mesh position={[0, y + rise / 2, 0]} rotation={[angle, 0, 0]} castShadow>
      <boxGeometry args={[w * 1.06, TILE * 0.08, len]} />
      <meshStandardMaterial color={color} roughness={0.5} metalness={0.18} transparent={opacity < 0.99} opacity={opacity} />
    </mesh>
  );
}

function Parapet({ w, d, y, color, opacity }: { w: number; d: number; y: number; color: string; opacity: number }) {
  const t = TILE * 0.07;
  const hgt = TILE * 0.16;
  return (
    <group>
      <mesh position={[0, y, d / 2 - t / 2]}>
        <boxGeometry args={[w, hgt, t]} />
        <meshStandardMaterial color={color} roughness={0.55} transparent={opacity < 0.99} opacity={opacity} />
      </mesh>
      <mesh position={[0, y, -d / 2 + t / 2]}>
        <boxGeometry args={[w, hgt, t]} />
        <meshStandardMaterial color={color} roughness={0.55} transparent={opacity < 0.99} opacity={opacity} />
      </mesh>
      <mesh position={[w / 2 - t / 2, y, 0]}>
        <boxGeometry args={[t, hgt, d]} />
        <meshStandardMaterial color={color} roughness={0.55} transparent={opacity < 0.99} opacity={opacity} />
      </mesh>
      <mesh position={[-w / 2 + t / 2, y, 0]}>
        <boxGeometry args={[t, hgt, d]} />
        <meshStandardMaterial color={color} roughness={0.55} transparent={opacity < 0.99} opacity={opacity} />
      </mesh>
    </group>
  );
}

function Door({ d, accent, opacity, wide = false, occupied = false }: { d: number; accent: string; opacity: number; wide?: boolean; occupied?: boolean }) {
  const trans = opacity < 0.99;
  return (
    <group position={[0, TILE * 0.42, d / 2 + TILE * 0.02]}>
      <mesh>
        <boxGeometry args={[wide ? TILE * 0.72 : TILE * 0.38, TILE * 0.84, TILE * 0.12]} />
        <meshStandardMaterial color="#3a3630" roughness={0.48} metalness={0.18} transparent={trans} opacity={opacity} />
      </mesh>
      <mesh position={[0, TILE * 0.02, TILE * 0.04]}>
        <boxGeometry args={[wide ? TILE * 0.56 : TILE * 0.24, TILE * 0.58, TILE * 0.04]} />
        <meshPhysicalMaterial
          color={accent}
          roughness={0.16}
          metalness={0.35}
          transparent={trans}
          opacity={opacity}
          emissive={occupied ? accent : "#000000"}
          emissiveIntensity={occupied ? 0.18 : 0}
        />
      </mesh>
    </group>
  );
}

function Steps({ d, opacity }: { d: number; opacity: number }) {
  return (
    <group position={[0, 0, d / 2]}>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0, TILE * 0.04 + i * TILE * 0.05, TILE * 0.16 + i * TILE * 0.08]} receiveShadow>
          <boxGeometry args={[TILE * 0.7 - i * TILE * 0.08, TILE * 0.05, TILE * 0.14]} />
          <meshStandardMaterial color="#c8c0b2" roughness={0.72} transparent={opacity < 0.99} opacity={opacity} />
        </mesh>
      ))}
    </group>
  );
}

function Canopy({ w, d, y, color, opacity }: { w: number; d: number; y: number; color: string; opacity: number }) {
  return (
    <group position={[0, y, d / 2 + TILE * 0.18]}>
      <mesh rotation={[-0.12, 0, 0]} castShadow>
        <boxGeometry args={[w * 0.55, TILE * 0.05, TILE * 0.38]} />
        <meshStandardMaterial color={color} roughness={0.48} metalness={0.18} transparent={opacity < 0.99} opacity={opacity} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * w * 0.22, -TILE * 0.22, TILE * 0.08]}>
          <cylinderGeometry args={[TILE * 0.018, TILE * 0.018, TILE * 0.44, 6]} />
          <meshStandardMaterial color="#2a2622" metalness={0.4} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

function Hvac({ x, z, y, opacity }: { x: number; z: number; y: number; opacity: number }) {
  return (
    <group position={[x, y, z]}>
      <mesh castShadow>
        <boxGeometry args={[TILE * 0.32, TILE * 0.22, TILE * 0.26]} />
        <meshStandardMaterial color="#6d737c" roughness={0.4} metalness={0.5} transparent={opacity < 0.99} opacity={opacity} />
      </mesh>
      <mesh position={[0, TILE * 0.16, 0]}>
        <cylinderGeometry args={[TILE * 0.05, TILE * 0.06, TILE * 0.12, 8]} />
        <meshStandardMaterial color="#9aa3ae" metalness={0.55} roughness={0.32} />
      </mesh>
    </group>
  );
}

function LotGrounds({ w, d, opacity }: { w: number; d: number; opacity: number }) {
  const maps = useCityMaps();
  const grass = useRepeat(maps.grass, 3, 3);
  const conc = useRepeat(maps.concrete, 2.2, 1.4);
  const trans = opacity < 0.99;
  return (
    <group>
      <mesh position={[0, h(0.018), 0]} receiveShadow>
        <boxGeometry args={[w * 1.42, h(0.04), d * 1.48]} />
        <meshStandardMaterial color="#5f7548" map={grass} roughness={0.95} transparent={trans} opacity={opacity} />
      </mesh>
      <mesh position={[0, h(0.03), d * 0.42]} receiveShadow>
        <boxGeometry args={[w * 0.55, h(0.05), d * 0.42]} />
        <meshStandardMaterial color="#b7b0a2" map={conc} roughness={0.82} transparent={trans} opacity={opacity} />
      </mesh>
      <mesh position={[0, h(0.028), d * 0.78]} receiveShadow>
        <boxGeometry args={[TILE * 0.42, h(0.04), d * 0.38]} />
        <meshStandardMaterial color="#c4bdb0" roughness={0.84} transparent={trans} opacity={opacity} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * w * 0.58, h(0.1), d * 0.12]} castShadow>
          <boxGeometry args={[TILE * 0.12, TILE * 0.16, d * 0.72]} />
          <meshStandardMaterial color="#3a5c32" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function Awning({ w, d, color, opacity }: { w: number; d: number; color: string; opacity: number }) {
  return (
    <group position={[0, TILE * 0.78, d / 2 + TILE * 0.14]}>
      {Array.from({ length: 7 }).map((_, i) => (
        <mesh key={i} position={[((i - 3) / 3.2) * w * 0.32, 0, 0]} rotation={[-0.35, 0, 0]}>
          <boxGeometry args={[w * 0.09, TILE * 0.04, TILE * 0.36]} />
          <meshStandardMaterial color={i % 2 === 0 ? color : "#f4efe6"} roughness={0.7} transparent={opacity < 0.99} opacity={opacity} />
        </mesh>
      ))}
    </group>
  );
}

export function ArchitectureMass({
  family,
  w,
  d,
  height,
  wall,
  roof,
  accent,
  wallDark,
  opacity = 1,
  selected,
  occupied = false,
}: MassProps) {
  const maps = useCityMaps();
  const spec = specFor(family, w, d, height);
  const trans = opacity < 0.99;
  const bodyW = w * (1 - spec.setback);
  const bodyD = d * (1 - spec.setback);
  const wallColor = selected ? "#ead9c8" : wall;
  const brick = family === "townhouse" || family === "cafe" || family === "industrial" || family === "retail";
  const concrete = family === "civic" || family === "warehouse" || family === "office" || family === "apartment" || family === "research";
  const brickMap = useRepeat(maps.brick, Math.max(2.4, w / 22), Math.max(2.4, height / 18));
  const concMap = useRepeat(maps.concrete, Math.max(1.6, w / 30), Math.max(1.6, height / 26));
  const roofMap = useRepeat(maps.roof, 2.8, 2.8);
  const metalMap = useRepeat(maps.metal, 3.2, 2.2);
  const bodyMap = brick ? brickMap : concrete ? concMap : undefined;
  const floors = spec.floors;

  return (
    <group>
      <LotGrounds w={w} d={d} opacity={opacity} />
      <mesh position={[0, TILE * 0.08, 0]} receiveShadow>
        <boxGeometry args={[bodyW * 1.04, TILE * 0.14, bodyD * 1.04]} />
        <meshStandardMaterial color={spec.plinth} roughness={0.5} metalness={0.22} map={concMap} transparent={trans} opacity={opacity} />
      </mesh>

      {family === "hq" ? (
        <group>
          <mesh position={[0, height * 0.16, 0]} castShadow receiveShadow>
            <boxGeometry args={[bodyW * 1.06, height * 0.28, bodyD * 1.08]} />
            <meshStandardMaterial color={wallDark ?? "#3a404c"} roughness={0.42} metalness={0.28} map={concMap} transparent={trans} opacity={opacity} />
          </mesh>
          <group position={[0, height * 0.28, 0]}>
            <CurtainWall
              w={bodyW * 0.86}
              d={bodyD * 0.78}
              height={height * 0.7}
              floors={Math.max(3, floors)}
              glass={spec.glass}
              mullion={spec.mullion}
              opacity={opacity}
              occupied={occupied}
            />
          </group>
          <mesh position={[bodyW * 0.46, height * 0.52, 0]} castShadow>
            <boxGeometry args={[TILE * 0.08, height * 0.72, bodyD * 0.18]} />
            <meshStandardMaterial color={accent} roughness={0.32} metalness={0.2} transparent={trans} opacity={opacity} />
          </mesh>
          <Parapet w={bodyW * 0.86} d={bodyD * 0.78} y={height * 0.98} color={roof} opacity={opacity} />
          <Hvac x={bodyW * 0.18} z={-bodyD * 0.12} y={height + TILE * 0.12} opacity={opacity} />
          <Canopy w={w} d={d} y={TILE * 0.92} color="#1e2228" opacity={opacity} />
          <Steps d={d} opacity={opacity} />
        </group>
      ) : family === "startup" ? (
        <group>
          <mesh position={[-bodyW * 0.18, height * 0.38, 0]} castShadow receiveShadow>
            <boxGeometry args={[bodyW * 0.62, height * 0.68, bodyD]} />
            <meshStandardMaterial color={wallColor} roughness={0.55} metalness={0.06} transparent={trans} opacity={opacity} />
          </mesh>
          <group position={[bodyW * 0.22, TILE * 0.12, bodyD * 0.04]}>
            <CurtainWall
              w={bodyW * 0.58}
              d={bodyD * 0.72}
              height={height * 0.78}
              floors={Math.max(2, floors - 1)}
              glass={spec.glass}
              mullion={spec.mullion}
              opacity={opacity}
              occupied={occupied}
            />
          </group>
          <mesh position={[0, height * 0.92, 0]}>
            <boxGeometry args={[bodyW * 0.96, TILE * 0.08, bodyD * 0.96]} />
            <meshStandardMaterial color={roof} roughness={0.35} metalness={0.4} map={metalMap} transparent={trans} opacity={opacity} />
          </mesh>
          <mesh position={[0, height + TILE * 0.02, bodyD * 0.18]}>
            <boxGeometry args={[bodyW * 0.4, TILE * 0.06, bodyD * 0.22]} />
            <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.2} transparent={trans} opacity={opacity} />
          </mesh>
          <Canopy w={w * 0.7} d={d} y={TILE * 0.88} color={accent} opacity={opacity} />
          <Steps d={d} opacity={opacity} />
        </group>
      ) : family === "townhouse" ? (
        <group>
          <mesh position={[0, height * 0.34, 0]} castShadow receiveShadow>
            <boxGeometry args={[bodyW, height * 0.58, bodyD]} />
            <meshStandardMaterial color={wallColor} map={brickMap} roughness={0.82} metalness={0.03} transparent={trans} opacity={opacity} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * (bodyW / 2 - TILE * 0.04), height * 0.34, 0]}>
              <boxGeometry args={[TILE * 0.05, height * 0.58, bodyD]} />
              <meshStandardMaterial color="#efe6d8" roughness={0.7} />
            </mesh>
          ))}
          <GableRoof w={bodyW} d={bodyD} y={height * 0.62} rise={height * 0.32} color={roof} opacity={opacity} map={roofMap} />
          <mesh position={[bodyW * 0.28, height * 0.86, -bodyD * 0.08]} castShadow>
            <boxGeometry args={[TILE * 0.14, height * 0.28, TILE * 0.14]} />
            <meshStandardMaterial color={roof} roughness={0.65} />
          </mesh>
          <mesh position={[0, TILE * 0.16, bodyD / 2 + TILE * 0.14]} receiveShadow>
            <boxGeometry args={[TILE * 0.62, TILE * 0.08, TILE * 0.32]} />
            <meshStandardMaterial color="#cbb89a" roughness={0.78} />
          </mesh>
          <Steps d={d} opacity={opacity} />
        </group>
      ) : family === "civic" ? (
        <group>
          <mesh position={[0, TILE * 0.12, 0]} receiveShadow>
            <boxGeometry args={[bodyW * 1.12, TILE * 0.2, bodyD * 1.12]} />
            <meshStandardMaterial color="#e4d8c2" map={concMap} roughness={0.62} transparent={trans} opacity={opacity} />
          </mesh>
          {[
            [-1, -1],
            [1, -1],
            [-1, 1],
            [1, 1],
            [-1, 0],
            [1, 0],
          ].map(([sx, sz], i) => (
            <group key={i} position={[sx * (bodyW * 0.42), height * 0.32, sz * (bodyD * 0.38)]}>
              <mesh castShadow>
                <cylinderGeometry args={[TILE * 0.07, TILE * 0.08, height * 0.52, 10]} />
                <meshStandardMaterial color="#efe4d0" roughness={0.48} map={concMap} />
              </mesh>
              <mesh position={[0, height * 0.28, 0]}>
                <boxGeometry args={[TILE * 0.18, TILE * 0.06, TILE * 0.18]} />
                <meshStandardMaterial color="#f4ebe0" roughness={0.5} />
              </mesh>
            </group>
          ))}
          <mesh position={[0, height * 0.22, 0]} castShadow receiveShadow>
            <boxGeometry args={[bodyW * 0.72, height * 0.32, bodyD * 0.68]} />
            <meshStandardMaterial color={wallColor} map={concMap} roughness={0.58} transparent={trans} opacity={opacity} />
          </mesh>
          <GableRoof w={bodyW * 0.92} d={bodyD * 0.92} y={height * 0.42} rise={TILE * 0.55} color={roof} opacity={opacity} />
          <Steps d={d} opacity={opacity} />
        </group>
      ) : family === "cafe" || family === "retail" ? (
        <group>
          <mesh position={[0, height * 0.36, 0]} castShadow receiveShadow>
            <boxGeometry args={[bodyW, height * 0.64, bodyD]} />
            <meshStandardMaterial color={wallColor} map={brickMap} roughness={0.8} metalness={0.04} transparent={trans} opacity={opacity} />
          </mesh>
          <mesh position={[0, TILE * 0.4, bodyD / 2 - TILE * 0.04]}>
            <boxGeometry args={[bodyW * 0.78, TILE * 0.62, TILE * 0.1]} />
            <meshStandardMaterial color="#4a4640" roughness={0.55} />
          </mesh>
          <mesh position={[0, TILE * 0.42, bodyD / 2 + TILE * 0.01]}>
            <boxGeometry args={[bodyW * 0.7, TILE * 0.5, TILE * 0.05]} />
            <meshPhysicalMaterial
              color={spec.glass}
              roughness={0.08}
              metalness={0.2}
              clearcoat={0.5}
              transparent
              opacity={0.72}
              emissive={occupied ? "#f2e0b8" : "#000"}
              emissiveIntensity={occupied ? 0.2 : 0}
            />
          </mesh>
          <Awning w={bodyW} d={d} color={accent} opacity={opacity} />
          <ShedRoof w={bodyW} d={bodyD} y={height * 0.68} rise={TILE * 0.28} color={roof} opacity={opacity} />
          {family === "cafe" ? (
            <mesh position={[-bodyW * 0.28, TILE * 0.18, bodyD / 2 + TILE * 0.22]} castShadow>
              <cylinderGeometry args={[TILE * 0.08, TILE * 0.09, TILE * 0.08, 8]} />
              <meshStandardMaterial color="#6b5344" roughness={0.7} />
            </mesh>
          ) : (
            <mesh position={[bodyW * 0.42, TILE * 0.7, bodyD / 2 + TILE * 0.08]} rotation={[0, 0.2, 0]} castShadow>
              <boxGeometry args={[TILE * 0.08, TILE * 0.28, TILE * 0.22]} />
              <meshStandardMaterial color={accent} roughness={0.45} />
            </mesh>
          )}
          <Steps d={d} opacity={opacity} />
        </group>
      ) : family === "warehouse" || family === "industrial" ? (
        <group>
          <mesh position={[0, height * 0.34, 0]} castShadow receiveShadow>
            <boxGeometry args={[bodyW, height * 0.62, bodyD]} />
            <meshStandardMaterial
              color={wallColor}
              map={family === "industrial" ? brickMap : metalMap}
              roughness={0.72}
              metalness={family === "warehouse" ? 0.38 : 0.08}
              transparent={trans}
              opacity={opacity}
            />
          </mesh>
          {family === "industrial"
            ? [-0.33, 0, 0.33].map((ox, i) => (
                <group key={i} position={[ox * bodyW, 0, 0]}>
                  <ShedRoof
                    w={bodyW * 0.32}
                    d={bodyD * 0.9}
                    y={height * 0.64}
                    rise={TILE * 0.32}
                    color={roof}
                    opacity={opacity}
                  />
                </group>
              ))
            : (
              <mesh position={[0, height * 0.72, 0]}>
                <boxGeometry args={[bodyW * 1.04, TILE * 0.12, bodyD * 1.04]} />
                <meshStandardMaterial color={roof} map={roofMap} roughness={0.5} metalness={0.28} />
              </mesh>
            )}
          <mesh position={[bodyW * 0.18, TILE * 0.38, bodyD / 2 + TILE * 0.02]} castShadow>
            <boxGeometry args={[TILE * 0.95, TILE * 0.62, TILE * 0.1]} />
            <meshStandardMaterial color="#3a4048" roughness={0.48} metalness={0.35} />
          </mesh>
          <mesh position={[bodyW * 0.18, TILE * 0.78, bodyD / 2 + TILE * 0.16]} rotation={[-0.08, 0, 0]}>
            <boxGeometry args={[TILE * 1.05, TILE * 0.06, TILE * 0.36]} />
            <meshStandardMaterial color="#2a2e34" metalness={0.4} roughness={0.4} />
          </mesh>
          <mesh position={[bodyW * 0.36, height * 0.88, -bodyD * 0.16]} castShadow>
            <cylinderGeometry args={[TILE * 0.1, TILE * 0.14, height * 0.4, 10]} />
            <meshStandardMaterial color="#6b7280" metalness={0.5} roughness={0.35} />
          </mesh>
        </group>
      ) : family === "studio" ? (
        <group>
          <mesh position={[0, height * 0.34, -bodyD * 0.06]} castShadow receiveShadow>
            <boxGeometry args={[bodyW, height * 0.62, bodyD * 0.88]} />
            <meshStandardMaterial color={wallColor} roughness={0.62} metalness={0.08} transparent={trans} opacity={opacity} />
          </mesh>
          <ShedRoof w={bodyW} d={bodyD} y={height * 0.64} rise={height * 0.22} color={roof} opacity={opacity} />
          <mesh position={[0, height * 0.42, bodyD / 2 - TILE * 0.02]}>
            <boxGeometry args={[bodyW * 0.62, height * 0.38, TILE * 0.08]} />
            <meshStandardMaterial color="#4a4440" roughness={0.48} />
          </mesh>
          <mesh position={[0, height * 0.44, bodyD / 2 + TILE * 0.02]}>
            <boxGeometry args={[bodyW * 0.54, height * 0.3, TILE * 0.05]} />
            <meshPhysicalMaterial color={spec.glass} roughness={0.08} metalness={0.2} clearcoat={0.5} transparent opacity={0.7} />
          </mesh>
          <Canopy w={w * 0.6} d={d} y={TILE * 0.86} color="#2a2428" opacity={opacity} />
          <Steps d={d} opacity={opacity} />
        </group>
      ) : family === "apartment" ? (
        <group>
          <mesh position={[0, height * 0.42, 0]} castShadow receiveShadow>
            <boxGeometry args={[bodyW, height * 0.78, bodyD]} />
            <meshStandardMaterial color={wallColor} map={concMap} roughness={0.58} metalness={0.08} transparent={trans} opacity={opacity} />
          </mesh>
          {Array.from({ length: floors }).map((_, i) => (
            <mesh key={i} position={[0, TILE * 0.5 + (i * height * 0.7) / Math.max(1, floors), bodyD / 2 + TILE * 0.1]}>
              <boxGeometry args={[bodyW * 0.84, TILE * 0.04, TILE * 0.2]} />
              <meshStandardMaterial color="#e4ddd2" roughness={0.7} />
            </mesh>
          ))}
          <Parapet w={bodyW} d={bodyD} y={height * 0.84} color={roof} opacity={opacity} />
        </group>
      ) : family === "research" ? (
        <group>
          <mesh position={[0, height * 0.4, 0]} castShadow receiveShadow>
            <boxGeometry args={[bodyW, height * 0.74, bodyD]} />
            <meshStandardMaterial color={wallColor} map={concMap} roughness={0.48} metalness={0.12} transparent={trans} opacity={opacity} />
          </mesh>
          <mesh position={[0, height * 0.86, 0]}>
            <boxGeometry args={[bodyW * 0.72, height * 0.18, bodyD * 0.55]} />
            <meshStandardMaterial color={wallDark ?? "#9aadb8"} roughness={0.35} metalness={0.3} transparent={trans} opacity={opacity} />
          </mesh>
          <Parapet w={bodyW} d={bodyD} y={height * 0.8} color={roof} opacity={opacity} />
          <Hvac x={-bodyW * 0.16} z={bodyD * 0.1} y={height * 0.98} opacity={opacity} />
          <Canopy w={w} d={d} y={TILE * 0.9} color="#d8dde2" opacity={opacity} />
          <Steps d={d} opacity={opacity} />
        </group>
      ) : (
        <group>
          <mesh position={[0, height * 0.4, 0]} castShadow receiveShadow>
            <boxGeometry args={[bodyW, height * 0.74, bodyD]} />
            <meshStandardMaterial
              color={wallColor}
              map={bodyMap}
              roughness={0.52}
              metalness={0.14}
              transparent={trans}
              opacity={opacity}
            />
          </mesh>
          {Array.from({ length: floors }).map((_, i) => (
            <mesh key={i} position={[0, (height / Math.max(1, floors)) * i, 0]}>
              <boxGeometry args={[bodyW * 0.998, TILE * 0.03, bodyD * 0.998]} />
              <meshStandardMaterial color="#d4cfc4" roughness={0.5} metalness={0.12} />
            </mesh>
          ))}
          <Parapet w={bodyW} d={bodyD} y={height * 0.8} color={roof} opacity={opacity} />
          <mesh position={[0, height * 0.86, 0]}>
            <boxGeometry args={[bodyW * 0.7, TILE * 0.1, bodyD * 0.55]} />
            <meshStandardMaterial color={roof} map={roofMap} roughness={0.5} />
          </mesh>
          <Canopy w={w} d={d} y={TILE * 0.88} color="#2c3036" opacity={opacity} />
          <Steps d={d} opacity={opacity} />
        </group>
      )}

      {spec.windowKind === "punch" || spec.windowKind === "strip" ? (
        <PunchWindows
          w={bodyW}
          d={bodyD}
          height={height * 0.78}
          cols={spec.windowCols}
          rows={Math.max(1, spec.windowRows)}
          kind={spec.windowKind}
          glass={spec.glass}
          mullion={spec.mullion}
          opacity={opacity}
          occupied={occupied}
        />
      ) : null}
      {family !== "civic" ? <Door d={d} accent={accent} opacity={opacity} wide={family === "cafe" || family === "retail" || family === "hq"} occupied={occupied} /> : null}
    </group>
  );
}

export function FacadeOffice({
  w,
  d,
  height,
  wall,
  roof,
  accent,
  opacity = 1,
  useId,
}: {
  w: number;
  d: number;
  height: number;
  wall: string;
  roof: string;
  accent: string;
  opacity?: number;
  useId?: string;
}) {
  return (
    <ArchitectureMass
      family={familyForUse(useId ?? "office")}
      w={w}
      d={d}
      height={height}
      wall={wall}
      roof={roof}
      accent={accent}
      opacity={opacity}
    />
  );
}
