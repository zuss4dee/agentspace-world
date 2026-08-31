"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { TILE, h } from "@/lib/coords";
import { familyForUse } from "@/lib/architecture";
import { emptySpec, presetByFamily, applyPreset } from "@/lib/building-grammar";
import {
  balconyKindOf,
  entranceKindOf,
  landscapeKindOf,
  lightingKindOf,
  roofKindOf,
  wallKindOf,
  windowKindOf,
  type BuildingSpec,
} from "@/lib/building-spec";
import type { ArchFamily, WindowKind } from "@/lib/architecture";
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

function hash(i: number, seed = "") {
  let h = 2166136261;
  const s = `${seed}:${i}`;
  for (let n = 0; n < s.length; n++) {
    h ^= s.charCodeAt(n);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
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
  seed: string,
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
        list.push({ ...p, lit: occupied && hash(i++, seed) > 0.38 });
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
  seed,
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
  seed: string;
}) {
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const glassRef = useRef<THREE.InstancedMesh>(null);
  const frameRef = useRef<THREE.InstancedMesh>(null);
  const revealRef = useRef<THREE.InstancedMesh>(null);
  const sillRef = useRef<THREE.InstancedMesh>(null);
  const layout = useMemo(
    () => windowLayout(w, d, height, cols, rows, kind, occupied, seed),
    [w, d, height, cols, rows, kind, occupied, seed],
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
  seed,
}: {
  w: number;
  d: number;
  height: number;
  floors: number;
  glass: string;
  mullion: string;
  opacity: number;
  occupied: boolean;
  seed: string;
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
      list.push({ x, y, z, sx, sy, sz, lit: occupied && hash(i++, seed) > 0.5 });
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
  }, [w, d, height, rows, colsW, colsD, occupied, seed]);

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

function LotGrounds({
  w,
  d,
  opacity,
  kind,
}: {
  w: number;
  d: number;
  opacity: number;
  kind: ReturnType<typeof landscapeKindOf>;
}) {
  const maps = useCityMaps();
  const grass = useRepeat(maps.grass, 3, 3);
  const conc = useRepeat(maps.concrete, 2.2, 1.4);
  const trans = opacity < 0.99;
  if (kind === "none") return null;
  const lawn = kind === "lawn" || kind === "hedge";
  const plaza = kind === "plaza";
  return (
    <group>
      <mesh position={[0, h(0.018), 0]} receiveShadow>
        <boxGeometry args={[w * 1.42, h(0.04), d * 1.48]} />
        <meshStandardMaterial
          color={plaza ? "#b7b0a2" : "#5f7548"}
          map={plaza ? conc : grass}
          roughness={0.95}
          transparent={trans}
          opacity={opacity}
        />
      </mesh>
      <mesh position={[0, h(0.03), d * 0.42]} receiveShadow>
        <boxGeometry args={[w * 0.55, h(0.05), d * 0.42]} />
        <meshStandardMaterial color="#b7b0a2" map={conc} roughness={0.82} transparent={trans} opacity={opacity} />
      </mesh>
      <mesh position={[0, h(0.028), d * 0.78]} receiveShadow>
        <boxGeometry args={[TILE * 0.42, h(0.04), d * 0.38]} />
        <meshStandardMaterial color="#c4bdb0" roughness={0.84} transparent={trans} opacity={opacity} />
      </mesh>
      {kind === "hedge" || lawn
        ? [-1, 1].map((s) => (
            <mesh key={s} position={[s * w * 0.58, h(0.1), d * 0.12]} castShadow>
              <boxGeometry args={[TILE * 0.12, TILE * 0.16, d * 0.72]} />
              <meshStandardMaterial color="#3a5c32" roughness={0.9} />
            </mesh>
          ))
        : null}
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

function RoofBySpec({
  kind,
  w,
  d,
  y,
  rise,
  color,
  opacity,
  map,
}: {
  kind: ReturnType<typeof roofKindOf>;
  w: number;
  d: number;
  y: number;
  rise: number;
  color: string;
  opacity: number;
  map?: THREE.Texture;
}) {
  if (kind === "gable" || kind === "hip-civic") return <GableRoof w={w} d={d} y={y} rise={rise} color={color} opacity={opacity} map={map} />;
  if (kind === "shed") return <ShedRoof w={w} d={d} y={y} rise={rise} color={color} opacity={opacity} />;
  return (
    <group>
      <Parapet w={w} d={d} y={y} color={color} opacity={opacity} />
      <mesh position={[0, y + TILE * 0.02, 0]}>
        <boxGeometry args={[w * 0.92, TILE * 0.08, d * 0.7]} />
        <meshStandardMaterial color={color} map={map} roughness={0.5} />
      </mesh>
    </group>
  );
}

function SignBySpec({
  kind,
  text,
  color,
  w,
  d,
  height,
  opacity,
}: {
  kind: string;
  text: string;
  color: string;
  w: number;
  d: number;
  height: number;
  opacity: number;
}) {
  if (kind === "none" || !text) return null;
  if (kind === "roof-bar") {
    return (
      <mesh position={[0, height + TILE * 0.04, d * 0.12]}>
        <boxGeometry args={[w * 0.42, TILE * 0.07, TILE * 0.16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.22} transparent={opacity < 0.99} opacity={opacity} />
      </mesh>
    );
  }
  if (kind === "blade") {
    return (
      <mesh position={[w * 0.42, TILE * 0.7, d / 2 + TILE * 0.08]} rotation={[0, 0.2, 0]} castShadow>
        <boxGeometry args={[TILE * 0.08, TILE * 0.28, TILE * 0.22]} />
        <meshStandardMaterial color={color} roughness={0.45} />
      </mesh>
    );
  }
  return (
    <mesh position={[0, TILE * 1.05, d / 2 + TILE * 0.06]}>
      <boxGeometry args={[Math.min(w * 0.55, TILE * 1.4), TILE * 0.12, TILE * 0.06]} />
      <meshStandardMaterial color={color} roughness={0.4} metalness={0.2} />
    </mesh>
  );
}

export function BuildingFromSpec({
  spec,
  opacity = 1,
  selected,
  occupied = false,
}: {
  spec: BuildingSpec;
  opacity?: number;
  selected?: boolean;
  occupied?: boolean;
}) {
  const maps = useCityMaps();
  const w = spec.footprint.w;
  const d = spec.footprint.d;
  const height = spec.height;
  const massing = spec.massing;
  const trans = opacity < 0.99;
  const bodyW = w * (1 - spec.footprint.setback);
  const bodyD = d * (1 - spec.footprint.setback);
  const wall = spec.materials.wall;
  const roof = spec.materials.roof;
  const accent = spec.materials.accent;
  const wallDark = spec.materials.wallDark;
  const wallColor = selected ? "#ead9c8" : wall;
  const wallKind = wallKindOf(spec);
  const winKind = windowKindOf(spec);
  const roofKind = roofKindOf(spec);
  const entrance = entranceKindOf(spec);
  const balcony = balconyKindOf(spec);
  const landscape = landscapeKindOf(spec);
  const lighting = lightingKindOf(spec);
  const lit = occupied && lighting !== "none";
  const brickMap = useRepeat(maps.brick, Math.max(2.4, w / 22), Math.max(2.4, height / 18));
  const concMap = useRepeat(maps.concrete, Math.max(1.6, w / 30), Math.max(1.6, height / 26));
  const roofMap = useRepeat(maps.roof, 2.8, 2.8);
  const metalMap = useRepeat(maps.metal, 3.2, 2.2);
  const bodyMap = wallKind === "brick" ? brickMap : wallKind === "metal" ? metalMap : wallKind === "concrete" ? concMap : undefined;
  const floors = spec.floors;
  const seed = spec.id;
  const cols = Math.max(2, Math.min(8, Math.round(Math.max(w, d) / 14)));

  return (
    <group>
      <LotGrounds w={w} d={d} opacity={opacity} kind={landscape} />
      <mesh position={[0, TILE * 0.08, 0]} receiveShadow>
        <boxGeometry args={[bodyW * 1.04, TILE * 0.14, bodyD * 1.04]} />
        <meshStandardMaterial color={spec.materials.plinth} roughness={0.5} metalness={0.22} map={concMap} transparent={trans} opacity={opacity} />
      </mesh>

      {massing === "podium-tower" ? (
        <group>
          <mesh position={[0, height * 0.16, 0]} castShadow receiveShadow>
            <boxGeometry args={[bodyW * 1.06, height * 0.28, bodyD * 1.08]} />
            <meshStandardMaterial color={wallDark ?? "#3a404c"} roughness={0.42} metalness={0.28} map={concMap} transparent={trans} opacity={opacity} />
          </mesh>
          <group position={[0, height * 0.28, 0]}>
            {winKind === "curtain" ? (
              <CurtainWall
                w={bodyW * 0.86}
                d={bodyD * 0.78}
                height={height * 0.7}
                floors={Math.max(3, floors)}
                glass={spec.materials.glass}
                mullion={spec.materials.mullion}
                opacity={opacity}
                occupied={lit}
                seed={seed}
              />
            ) : (
              <mesh position={[0, height * 0.35, 0]} castShadow receiveShadow>
                <boxGeometry args={[bodyW * 0.86, height * 0.7, bodyD * 0.78]} />
                <meshStandardMaterial color={wallColor} map={bodyMap} roughness={0.48} metalness={0.16} transparent={trans} opacity={opacity} />
              </mesh>
            )}
          </group>
          <mesh position={[bodyW * 0.46, height * 0.52, 0]} castShadow>
            <boxGeometry args={[TILE * 0.08, height * 0.72, bodyD * 0.18]} />
            <meshStandardMaterial color={accent} roughness={0.32} metalness={0.2} transparent={trans} opacity={opacity} />
          </mesh>
          <RoofBySpec kind={roofKind} w={bodyW * 0.86} d={bodyD * 0.78} y={height * 0.98} rise={TILE * 0.4} color={roof} opacity={opacity} map={roofMap} />
          <Hvac x={bodyW * 0.18} z={-bodyD * 0.12} y={height + TILE * 0.12} opacity={opacity} />
        </group>
      ) : massing === "wing" ? (
        <group>
          <mesh position={[-bodyW * 0.18, height * 0.38, 0]} castShadow receiveShadow>
            <boxGeometry args={[bodyW * 0.62, height * 0.68, bodyD]} />
            <meshStandardMaterial color={wallColor} roughness={0.55} metalness={0.06} transparent={trans} opacity={opacity} />
          </mesh>
          <group position={[bodyW * 0.22, TILE * 0.12, bodyD * 0.04]}>
            {winKind === "curtain" ? (
              <CurtainWall
                w={bodyW * 0.58}
                d={bodyD * 0.72}
                height={height * 0.78}
                floors={Math.max(2, floors - 1)}
                glass={spec.materials.glass}
                mullion={spec.materials.mullion}
                opacity={opacity}
                occupied={lit}
                seed={seed}
              />
            ) : (
              <mesh position={[0, height * 0.36, 0]} castShadow>
                <boxGeometry args={[bodyW * 0.58, height * 0.72, bodyD * 0.72]} />
                <meshStandardMaterial color={wallColor} map={bodyMap} roughness={0.5} />
              </mesh>
            )}
          </group>
          <RoofBySpec kind={roofKind} w={bodyW * 0.96} d={bodyD * 0.96} y={height * 0.92} rise={TILE * 0.28} color={roof} opacity={opacity} map={metalMap} />
        </group>
      ) : massing === "gable-row" ? (
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
          <RoofBySpec kind={roofKind} w={bodyW} d={bodyD} y={height * 0.62} rise={height * 0.32} color={roof} opacity={opacity} map={roofMap} />
        </group>
      ) : massing === "colonnade" ? (
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
          <RoofBySpec kind={roofKind} w={bodyW * 0.92} d={bodyD * 0.92} y={height * 0.42} rise={TILE * 0.55} color={roof} opacity={opacity} map={roofMap} />
        </group>
      ) : massing === "shopfront" ? (
        <group>
          <mesh position={[0, height * 0.36, 0]} castShadow receiveShadow>
            <boxGeometry args={[bodyW, height * 0.64, bodyD]} />
            <meshStandardMaterial color={wallColor} map={brickMap} roughness={0.8} metalness={0.04} transparent={trans} opacity={opacity} />
          </mesh>
          {winKind === "storefront" || winKind === "curtain" ? (
            <>
              <mesh position={[0, TILE * 0.4, bodyD / 2 - TILE * 0.04]}>
                <boxGeometry args={[bodyW * 0.78, TILE * 0.62, TILE * 0.1]} />
                <meshStandardMaterial color="#4a4640" roughness={0.55} />
              </mesh>
              <mesh position={[0, TILE * 0.42, bodyD / 2 + TILE * 0.01]}>
                <boxGeometry args={[bodyW * 0.7, TILE * 0.5, TILE * 0.05]} />
                <meshPhysicalMaterial
                  color={spec.materials.glass}
                  roughness={0.08}
                  metalness={0.2}
                  clearcoat={0.5}
                  transparent
                  opacity={0.72}
                  emissive={lit ? "#f2e0b8" : "#000"}
                  emissiveIntensity={lit ? 0.2 : 0}
                />
              </mesh>
            </>
          ) : null}
          <RoofBySpec kind={roofKind} w={bodyW} d={bodyD} y={height * 0.68} rise={TILE * 0.28} color={roof} opacity={opacity} map={roofMap} />
        </group>
      ) : massing === "loading" || massing === "sawtooth" ? (
        <group>
          <mesh position={[0, height * 0.34, 0]} castShadow receiveShadow>
            <boxGeometry args={[bodyW, height * 0.62, bodyD]} />
            <meshStandardMaterial
              color={wallColor}
              map={wallKind === "brick" ? brickMap : metalMap}
              roughness={0.72}
              metalness={wallKind === "metal" ? 0.38 : 0.08}
              transparent={trans}
              opacity={opacity}
            />
          </mesh>
          {massing === "sawtooth"
            ? [-0.33, 0, 0.33].map((ox, i) => (
                <group key={i} position={[ox * bodyW, 0, 0]}>
                  <ShedRoof w={bodyW * 0.32} d={bodyD * 0.9} y={height * 0.64} rise={TILE * 0.32} color={roof} opacity={opacity} />
                </group>
              ))
            : (
              <RoofBySpec kind={roofKind} w={bodyW * 1.04} d={bodyD * 1.04} y={height * 0.72} rise={TILE * 0.22} color={roof} opacity={opacity} map={roofMap} />
            )}
          {entrance === "loading" ? (
            <>
              <mesh position={[bodyW * 0.18, TILE * 0.38, bodyD / 2 + TILE * 0.02]} castShadow>
                <boxGeometry args={[TILE * 0.95, TILE * 0.62, TILE * 0.1]} />
                <meshStandardMaterial color="#3a4048" roughness={0.48} metalness={0.35} />
              </mesh>
              <mesh position={[bodyW * 0.18, TILE * 0.78, bodyD / 2 + TILE * 0.16]} rotation={[-0.08, 0, 0]}>
                <boxGeometry args={[TILE * 1.05, TILE * 0.06, TILE * 0.36]} />
                <meshStandardMaterial color="#2a2e34" metalness={0.4} roughness={0.4} />
              </mesh>
            </>
          ) : null}
          <mesh position={[bodyW * 0.36, height * 0.88, -bodyD * 0.16]} castShadow>
            <cylinderGeometry args={[TILE * 0.1, TILE * 0.14, height * 0.4, 10]} />
            <meshStandardMaterial color="#6b7280" metalness={0.5} roughness={0.35} />
          </mesh>
        </group>
      ) : massing === "northlight" ? (
        <group>
          <mesh position={[0, height * 0.34, -bodyD * 0.06]} castShadow receiveShadow>
            <boxGeometry args={[bodyW, height * 0.62, bodyD * 0.88]} />
            <meshStandardMaterial color={wallColor} roughness={0.62} metalness={0.08} map={bodyMap} transparent={trans} opacity={opacity} />
          </mesh>
          <RoofBySpec kind={roofKind} w={bodyW} d={bodyD} y={height * 0.64} rise={height * 0.22} color={roof} opacity={opacity} map={roofMap} />
          <mesh position={[0, height * 0.42, bodyD / 2 - TILE * 0.02]}>
            <boxGeometry args={[bodyW * 0.62, height * 0.38, TILE * 0.08]} />
            <meshStandardMaterial color="#4a4440" roughness={0.48} />
          </mesh>
          <mesh position={[0, height * 0.44, bodyD / 2 + TILE * 0.02]}>
            <boxGeometry args={[bodyW * 0.54, height * 0.3, TILE * 0.05]} />
            <meshPhysicalMaterial color={spec.materials.glass} roughness={0.08} metalness={0.2} clearcoat={0.5} transparent opacity={0.7} />
          </mesh>
        </group>
      ) : massing === "balcony-stack" ? (
        <group>
          <mesh position={[0, height * 0.42, 0]} castShadow receiveShadow>
            <boxGeometry args={[bodyW, height * 0.78, bodyD]} />
            <meshStandardMaterial color={wallColor} map={concMap} roughness={0.58} metalness={0.08} transparent={trans} opacity={opacity} />
          </mesh>
          {balcony !== "none"
            ? Array.from({ length: floors }).map((_, i) => (
                <mesh key={i} position={[0, TILE * 0.5 + (i * height * 0.7) / Math.max(1, floors), bodyD / 2 + TILE * 0.1]}>
                  <boxGeometry args={[bodyW * 0.84, TILE * 0.04, TILE * 0.2]} />
                  <meshStandardMaterial color="#e4ddd2" roughness={0.7} />
                </mesh>
              ))
            : null}
          <RoofBySpec kind={roofKind} w={bodyW} d={bodyD} y={height * 0.84} rise={TILE * 0.22} color={roof} opacity={opacity} map={roofMap} />
        </group>
      ) : massing === "ribbon" ? (
        <group>
          <mesh position={[0, height * 0.4, 0]} castShadow receiveShadow>
            <boxGeometry args={[bodyW, height * 0.74, bodyD]} />
            <meshStandardMaterial color={wallColor} map={concMap} roughness={0.48} metalness={0.12} transparent={trans} opacity={opacity} />
          </mesh>
          {balcony === "terrace" ? (
            <mesh position={[0, height * 0.86, 0]}>
              <boxGeometry args={[bodyW * 0.72, height * 0.18, bodyD * 0.55]} />
              <meshStandardMaterial color={wallDark ?? "#9aadb8"} roughness={0.35} metalness={0.3} transparent={trans} opacity={opacity} />
            </mesh>
          ) : null}
          <RoofBySpec kind={roofKind} w={bodyW} d={bodyD} y={height * 0.8} rise={TILE * 0.2} color={roof} opacity={opacity} map={roofMap} />
          <Hvac x={-bodyW * 0.16} z={bodyD * 0.1} y={height * 0.98} opacity={opacity} />
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
          <RoofBySpec kind={roofKind} w={bodyW} d={bodyD} y={height * 0.8} rise={TILE * 0.28} color={roof} opacity={opacity} map={roofMap} />
        </group>
      )}

      {winKind === "punch" || winKind === "strip" ? (
        <PunchWindows
          w={bodyW}
          d={bodyD}
          height={height * 0.78}
          cols={cols}
          rows={Math.max(1, floors)}
          kind={winKind}
          glass={spec.materials.glass}
          mullion={spec.materials.mullion}
          opacity={opacity}
          occupied={lit}
          seed={seed}
        />
      ) : null}

      {entrance === "awning" ? <Awning w={bodyW} d={d} color={accent} opacity={opacity} /> : null}
      {entrance === "canopy" ? <Canopy w={w} d={d} y={TILE * 0.9} color={lighting === "cool" ? "#d8dde2" : "#2c3036"} opacity={opacity} /> : null}
      {entrance !== "loading" && massing !== "colonnade" ? (
        <Door d={d} accent={accent} opacity={opacity} wide={entrance === "wide" || entrance === "awning"} occupied={lit} />
      ) : null}
      {entrance !== "loading" ? <Steps d={d} opacity={opacity} /> : null}
      <SignBySpec kind={spec.modules.find((m) => m.slot === "signage")?.variant ?? "none"} text={spec.signage.text} color={spec.signage.color} w={bodyW} d={d} height={height} opacity={opacity} />
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
  const spec = applyPreset(emptySpec(`mass.${family}`, family, w, d, height, Math.max(2, Math.round(w / TILE)), Math.max(2, Math.round(d / TILE))), presetByFamily(family));
  spec.materials = { ...spec.materials, wall, roof, accent, wallDark: wallDark ?? spec.materials.wallDark };
  return <BuildingFromSpec spec={spec} opacity={opacity} selected={selected} occupied={occupied} />;
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
