"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { TILE, h } from "@/lib/coords";
import { familyForUse } from "@/lib/architecture";
import { emptySpec, presetByFamily, applyPreset } from "@/lib/building-grammar";
import {
  balconyKindOf,
  entranceKindOf,
  foundationKindOf,
  landscapeKindOf,
  lightingKindOf,
  roofKindOf,
  variantOf,
  wallKindOf,
  windowKindOf,
  type BuildingSpec,
  type WallKind,
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
  let hv = 2166136261;
  const s = `${seed}:${i}`;
  for (let n = 0; n < s.length; n++) {
    hv ^= s.charCodeAt(n);
    hv = Math.imul(hv, 16777619);
  }
  return (hv >>> 0) / 4294967296;
}

function mixHex(a: string, b: string, t: number) {
  const pa = new THREE.Color(a);
  const pb = new THREE.Color(b);
  return `#${pa.lerp(pb, t).getHexString()}`;
}

function Skin({
  w,
  ht,
  d,
  position,
  color,
  map,
  wallKind,
  opacity,
  selected,
}: {
  w: number;
  ht: number;
  d: number;
  position: [number, number, number];
  color: string;
  map?: THREE.Texture;
  wallKind: WallKind;
  opacity: number;
  selected?: boolean;
}) {
  const trans = opacity < 0.99;
  const metal = wallKind === "metal" ? 0.52 : wallKind === "curtain" ? 0.18 : wallKind === "concrete" ? 0.08 : 0.03;
  const rough = wallKind === "brick" ? 0.88 : wallKind === "metal" ? 0.32 : wallKind === "plaster" ? 0.72 : wallKind === "curtain" ? 0.42 : 0.58;
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={[w, ht, d]} />
      <meshPhysicalMaterial
        color={selected ? mixHex(color, "#ead9c8", 0.35) : color}
        map={map}
        roughness={rough}
        metalness={metal}
        clearcoat={wallKind === "plaster" || wallKind === "metal" ? 0.22 : 0.05}
        clearcoatRoughness={wallKind === "metal" ? 0.28 : 0.55}
        envMapIntensity={0.62}
        transparent={trans}
        opacity={opacity}
      />
    </mesh>
  );
}

type Win = { x: number; y: number; z: number; sx: number; sy: number; sz: number; lit: boolean; axis: "x" | "z" };

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
  const pw =
    kind === "strip"
      ? Math.min(TILE * 0.62, ((w - TILE * 0.55) / Math.max(1, cols)) * 1.15)
      : Math.min(TILE * 0.2, (w - TILE * 0.85) / Math.max(1, cols));
  const ph =
    kind === "strip"
      ? Math.min(TILE * 0.16, (height / Math.max(2, rows)) * 0.38)
      : Math.min(TILE * 0.34, (height - TILE * 1.05) / Math.max(1, rows));
  const inset = TILE * 0.018;
  const depth = TILE * 0.055;
  const faces: { span: number; n: number; front: boolean; place: (u: number, y: number) => Omit<Win, "lit"> }[] = [
    {
      span: w,
      n: cols,
      front: true,
      place: (u, y) => ({ x: u, y, z: d / 2 - inset, sx: pw, sy: ph, sz: depth, axis: "z" }),
    },
    {
      span: w,
      n: cols,
      front: false,
      place: (u, y) => ({ x: u, y, z: -d / 2 + inset, sx: pw, sy: ph, sz: depth, axis: "z" }),
    },
    {
      span: d,
      n: Math.max(2, cols - 1),
      front: false,
      place: (u, y) => ({ x: w / 2 - inset, y, z: u, sx: depth, sy: ph, sz: pw, axis: "x" }),
    },
    {
      span: d,
      n: Math.max(2, cols - 1),
      front: false,
      place: (u, y) => ({ x: -w / 2 + inset, y, z: u, sx: depth, sy: ph, sz: pw, axis: "x" }),
    },
  ];
  let i = 0;
  for (const face of faces) {
    const count = Math.max(1, face.n);
    const margin = TILE * 0.38;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < count; c++) {
        const u = count === 1 ? 0 : -face.span / 2 + margin + (c * (face.span - margin * 2)) / Math.max(1, count - 1);
        const y = TILE * 0.62 + (r * (height - TILE * 1.05)) / Math.max(1, rows - 1 || 1);
        if (face.front && r === 0 && Math.abs(u) < TILE * 0.28) continue;
        const p = face.place(u, y);
        list.push({ ...p, lit: occupied && hash(i++, seed) > 0.42 });
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
  wall,
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
  wall: string;
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
  const revealCol = mixHex(wall, "#2a2824", 0.28);

  useLayoutEffect(() => {
    const g = glassRef.current;
    const f = frameRef.current;
    const r = revealRef.current;
    const s = sillRef.current;
    if (!g || !f || !r || !s) return;
    const c = new THREE.Color();
    layout.forEach((p, i) => {
      dummy.position.set(p.x, p.y, p.z);
      dummy.scale.set(p.sx * 1.12, p.sy * 1.14, p.sz * 1.15);
      dummy.updateMatrix();
      r.setMatrixAt(i, dummy.matrix);
      dummy.scale.set(p.sx * 1.02, p.sy * 1.02, p.sz * 0.55);
      dummy.updateMatrix();
      f.setMatrixAt(i, dummy.matrix);
      dummy.scale.set(p.sx * 0.84, p.sy * 0.82, p.sz * 0.22);
      dummy.updateMatrix();
      g.setMatrixAt(i, dummy.matrix);
      dummy.position.set(p.x, p.y - p.sy * 0.54, p.z);
      dummy.scale.set(p.sx * 1.16, TILE * 0.022, p.sz * 1.55);
      dummy.updateMatrix();
      s.setMatrixAt(i, dummy.matrix);
      c.set(p.lit ? mixHex(glass, "#f2e6c8", 0.55) : glass);
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
        <meshStandardMaterial color={revealCol} roughness={0.78} metalness={0.04} transparent={trans} opacity={opacity} />
      </instancedMesh>
      <instancedMesh ref={frameRef} args={[undefined, undefined, layout.length]} raycast={() => undefined}>
        <boxGeometry args={[1, 1, 1]} />
        <meshPhysicalMaterial
          color={mixHex(mullion, "#c8cdd2", 0.45)}
          roughness={0.28}
          metalness={0.62}
          clearcoat={0.35}
          transparent={trans}
          opacity={opacity}
        />
      </instancedMesh>
      <instancedMesh ref={sillRef} args={[undefined, undefined, layout.length]} raycast={() => undefined}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#d4cdc2" roughness={0.62} metalness={0.08} transparent={trans} opacity={opacity} />
      </instancedMesh>
      <instancedMesh ref={glassRef} args={[undefined, undefined, layout.length]} raycast={() => undefined}>
        <boxGeometry args={[1, 1, 1]} />
        <meshPhysicalMaterial
          color={glass}
          roughness={0.045}
          metalness={0.08}
          clearcoat={1}
          clearcoatRoughness={0.08}
          reflectivity={0.9}
          ior={1.45}
          envMapIntensity={1.15}
          transparent
          opacity={trans ? opacity * 0.72 : 0.78}
          emissive="#efe2c0"
          emissiveIntensity={occupied ? 0.08 : 0.015}
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
  wall,
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
  wall: string;
}) {
  const trans = opacity < 0.99;
  const rows = Math.max(2, floors);
  const colsW = Math.max(5, Math.round(w / (TILE * 0.22)));
  const colsD = Math.max(4, Math.round(d / (TILE * 0.22)));
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const paneRef = useRef<THREE.InstancedMesh>(null);
  const capRef = useRef<THREE.InstancedMesh>(null);
  const panes = useMemo(() => {
    const list: { x: number; y: number; z: number; sx: number; sy: number; sz: number; lit: boolean }[] = [];
    const cellW = w / colsW;
    const cellD = d / colsD;
    const cellH = height / rows;
    let i = 0;
    const add = (x: number, y: number, z: number, sx: number, sy: number, sz: number) => {
      list.push({ x, y, z, sx, sy, sz, lit: occupied && hash(i++, seed) > 0.55 });
    };
    const visH = cellH * 0.72;
    for (let r = 0; r < rows; r++) {
      const y = cellH * (r + 0.46);
      for (let c = 0; c < colsW; c++) {
        const x = -w / 2 + cellW * (c + 0.5);
        add(x, y, d / 2 + TILE * 0.01, cellW * 0.9, visH, TILE * 0.022);
        add(x, y, -d / 2 - TILE * 0.01, cellW * 0.9, visH, TILE * 0.022);
      }
      for (let c = 0; c < colsD; c++) {
        const z = -d / 2 + cellD * (c + 0.5);
        add(w / 2 + TILE * 0.01, y, z, TILE * 0.022, visH, cellD * 0.9);
        add(-w / 2 - TILE * 0.01, y, z, TILE * 0.022, visH, cellD * 0.9);
      }
    }
    return list;
  }, [w, d, height, rows, colsW, colsD, occupied, seed]);

  useLayoutEffect(() => {
    const m = paneRef.current;
    const b = capRef.current;
    if (!m || !b) return;
    const c = new THREE.Color();
    panes.forEach((p, i) => {
      dummy.position.set(p.x, p.y, p.z);
      dummy.scale.set(p.sx, p.sy, p.sz);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      dummy.scale.set(p.sx * 1.04, p.sy * 1.06, Math.min(p.sz, p.sx) * 0.35 + p.sz * 0.4);
      dummy.updateMatrix();
      b.setMatrixAt(i, dummy.matrix);
      c.set(p.lit ? mixHex(glass, "#efe6d0", 0.4) : glass);
      m.setColorAt(i, c);
    });
    m.instanceMatrix.needsUpdate = true;
    b.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [dummy, panes, glass]);

  const alu = mixHex(mullion, "#b8c0c6", 0.55);
  return (
    <group>
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w * 0.97, height, d * 0.97]} />
        <meshPhysicalMaterial color={mixHex(wall, "#8a9098", 0.25)} roughness={0.48} metalness={0.16} envMapIntensity={0.5} transparent={trans} opacity={opacity} />
      </mesh>
      {Array.from({ length: rows }).map((_, i) => (
        <mesh key={i} position={[0, (height / rows) * i + TILE * 0.02, 0]}>
          <boxGeometry args={[w * 0.992, TILE * 0.055, d * 0.992]} />
          <meshPhysicalMaterial color="#c4c0b6" roughness={0.42} metalness={0.28} transparent={trans} opacity={opacity} />
        </mesh>
      ))}
      {panes.length ? (
        <>
          <instancedMesh ref={capRef} args={[undefined, undefined, panes.length]} raycast={() => undefined}>
            <boxGeometry args={[1, 1, 1]} />
            <meshPhysicalMaterial color={alu} roughness={0.26} metalness={0.68} transparent={trans} opacity={opacity} />
          </instancedMesh>
          <instancedMesh ref={paneRef} args={[undefined, undefined, panes.length]} raycast={() => undefined}>
            <boxGeometry args={[1, 1, 1]} />
            <meshPhysicalMaterial
              color={glass}
              roughness={0.04}
              metalness={0.06}
              clearcoat={1}
              clearcoatRoughness={0.06}
              reflectivity={0.92}
              ior={1.5}
              envMapIntensity={1.25}
              transparent
              opacity={trans ? opacity * 0.7 : 0.76}
              emissive="#eadcc0"
              emissiveIntensity={occupied ? 0.1 : 0.02}
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
        <boxGeometry args={[w * 1.1, TILE * 0.055, len * 1.04]} />
        <meshPhysicalMaterial color={color} map={map} roughness={0.7} metalness={0.06} transparent={trans} opacity={opacity} />
      </mesh>
      <mesh position={[0, y + rise / 2, -d / 4]} rotation={[-angle, 0, 0]} castShadow>
        <boxGeometry args={[w * 1.1, TILE * 0.055, len * 1.04]} />
        <meshPhysicalMaterial color={color} map={map} roughness={0.7} metalness={0.06} transparent={trans} opacity={opacity} />
      </mesh>
      <mesh position={[0, y + rise + TILE * 0.02, 0]}>
        <boxGeometry args={[w * 1.12, TILE * 0.04, TILE * 0.08]} />
        <meshStandardMaterial color={mixHex(color, "#1a1814", 0.25)} roughness={0.45} metalness={0.25} />
      </mesh>
      <mesh position={[-w / 2 + TILE * 0.015, y + rise * 0.42, 0]}>
        <boxGeometry args={[TILE * 0.04, rise * 0.92, d * 1.02]} />
        <meshStandardMaterial color="#e8dfd2" roughness={0.76} transparent={trans} opacity={opacity} />
      </mesh>
      <mesh position={[w / 2 - TILE * 0.015, y + rise * 0.42, 0]}>
        <boxGeometry args={[TILE * 0.04, rise * 0.92, d * 1.02]} />
        <meshStandardMaterial color="#e8dfd2" roughness={0.76} transparent={trans} opacity={opacity} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (w / 2 + TILE * 0.02), y + TILE * 0.02, 0]} rotation={[0, 0, s * 0.15]}>
          <boxGeometry args={[TILE * 0.03, TILE * 0.04, d * 1.06]} />
          <meshStandardMaterial color="#8a8478" roughness={0.48} metalness={0.35} />
        </mesh>
      ))}
    </group>
  );
}

function ShedRoof({ w, d, y, rise, color, opacity }: { w: number; d: number; y: number; rise: number; color: string; opacity: number }) {
  const angle = Math.atan2(rise, d);
  const len = Math.hypot(d, rise);
  return (
    <group>
      <mesh position={[0, y + rise / 2, 0]} rotation={[angle, 0, 0]} castShadow>
        <boxGeometry args={[w * 1.06, TILE * 0.06, len]} />
        <meshPhysicalMaterial color={color} roughness={0.48} metalness={0.22} transparent={opacity < 0.99} opacity={opacity} />
      </mesh>
      <mesh position={[0, y + TILE * 0.02, d / 2 + TILE * 0.02]}>
        <boxGeometry args={[w * 1.08, TILE * 0.035, TILE * 0.06]} />
        <meshStandardMaterial color="#7a766c" metalness={0.3} roughness={0.45} />
      </mesh>
    </group>
  );
}

function Parapet({ w, d, y, color, opacity }: { w: number; d: number; y: number; color: string; opacity: number }) {
  const t = TILE * 0.055;
  const hgt = TILE * 0.14;
  const cap = mixHex(color, "#d8d2c8", 0.35);
  return (
    <group>
      {[
        [0, d / 2 - t / 2, w, t] as const,
        [0, -d / 2 + t / 2, w, t] as const,
        [w / 2 - t / 2, 0, t, d] as const,
        [-w / 2 + t / 2, 0, t, d] as const,
      ].map(([x, z, bw, bd], i) => (
        <group key={i}>
          <mesh position={[x, y, z]}>
            <boxGeometry args={[bw, hgt, bd]} />
            <meshStandardMaterial color={color} roughness={0.58} transparent={opacity < 0.99} opacity={opacity} />
          </mesh>
          <mesh position={[x, y + hgt * 0.42, z]}>
            <boxGeometry args={[bw * 1.04, TILE * 0.03, bd * 1.04]} />
            <meshStandardMaterial color={cap} roughness={0.5} metalness={0.12} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Door({ d, accent, opacity, wide = false, occupied = false }: { d: number; accent: string; opacity: number; wide?: boolean; occupied?: boolean }) {
  const trans = opacity < 0.99;
  const dw = wide ? TILE * 0.68 : TILE * 0.36;
  return (
    <group position={[0, TILE * 0.46, d / 2 + TILE * 0.01]}>
      <mesh position={[0, TILE * 0.08, -TILE * 0.04]}>
        <boxGeometry args={[dw + TILE * 0.16, TILE * 1.02, TILE * 0.08]} />
        <meshStandardMaterial color="#6a6560" roughness={0.62} transparent={trans} opacity={opacity} />
      </mesh>
      <mesh>
        <boxGeometry args={[dw, TILE * 0.88, TILE * 0.07]} />
        <meshPhysicalMaterial color="#2e2c28" roughness={0.38} metalness={0.28} transparent={trans} opacity={opacity} />
      </mesh>
      {(wide ? [-0.22, 0.22] : [0]).map((ox, i) => (
        <mesh key={i} position={[ox * TILE, TILE * 0.04, TILE * 0.028]}>
          <boxGeometry args={[wide ? TILE * 0.22 : TILE * 0.22, TILE * 0.62, TILE * 0.02]} />
          <meshPhysicalMaterial
            color={mixHex(accent, "#8aa0aa", 0.4)}
            roughness={0.08}
            metalness={0.12}
            clearcoat={0.7}
            transparent
            opacity={0.62}
            emissive={occupied ? "#f0ddb8" : "#000000"}
            emissiveIntensity={occupied ? 0.12 : 0}
          />
        </mesh>
      ))}
      <mesh position={[wide ? TILE * 0.28 : TILE * 0.12, 0, TILE * 0.04]}>
        <sphereGeometry args={[TILE * 0.012, 8, 6]} />
        <meshStandardMaterial color="#c8c0a8" metalness={0.7} roughness={0.25} />
      </mesh>
    </group>
  );
}

function Steps({ d, opacity }: { d: number; opacity: number }) {
  return (
    <group position={[0, 0, d / 2]}>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0, TILE * 0.035 + i * TILE * 0.045, TILE * 0.14 + i * TILE * 0.07]} receiveShadow>
          <boxGeometry args={[TILE * 0.78 - i * TILE * 0.06, TILE * 0.045, TILE * 0.12]} />
          <meshStandardMaterial color="#c2bbb0" roughness={0.78} transparent={opacity < 0.99} opacity={opacity} />
        </mesh>
      ))}
    </group>
  );
}

function Canopy({ w, d, y, color, opacity }: { w: number; d: number; y: number; color: string; opacity: number }) {
  return (
    <group position={[0, y, d / 2 + TILE * 0.2]}>
      <mesh rotation={[-0.08, 0, 0]} castShadow>
        <boxGeometry args={[Math.min(w * 0.48, TILE * 1.35), TILE * 0.04, TILE * 0.42]} />
        <meshPhysicalMaterial color={color} roughness={0.42} metalness={0.28} transparent={opacity < 0.99} opacity={opacity} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * Math.min(w * 0.2, TILE * 0.52), -TILE * 0.24, TILE * 0.1]}>
          <cylinderGeometry args={[TILE * 0.016, TILE * 0.018, TILE * 0.48, 8]} />
          <meshStandardMaterial color="#3a3834" metalness={0.55} roughness={0.32} />
        </mesh>
      ))}
    </group>
  );
}

function Hvac({ x, z, y, opacity }: { x: number; z: number; y: number; opacity: number }) {
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, -TILE * 0.04, 0]} receiveShadow>
        <boxGeometry args={[TILE * 0.4, TILE * 0.04, TILE * 0.34]} />
        <meshStandardMaterial color="#b8b2a8" roughness={0.7} />
      </mesh>
      <mesh castShadow>
        <boxGeometry args={[TILE * 0.3, TILE * 0.2, TILE * 0.24]} />
        <meshPhysicalMaterial color="#6a727c" roughness={0.38} metalness={0.55} transparent={opacity < 0.99} opacity={opacity} />
      </mesh>
      <mesh position={[0, TILE * 0.14, 0]}>
        <cylinderGeometry args={[TILE * 0.045, TILE * 0.055, TILE * 0.1, 10]} />
        <meshStandardMaterial color="#9aa3ae" metalness={0.58} roughness={0.3} />
      </mesh>
    </group>
  );
}

function LotTree({ x, z, s, seed }: { x: number; z: number; s: number; seed: number }) {
  const hue = seed > 0.5 ? "#2f5c32" : "#3a6a38";
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, h(0.22) * s, 0]} castShadow>
        <cylinderGeometry args={[h(0.028) * s, h(0.04) * s, h(0.44) * s, 6]} />
        <meshStandardMaterial color="#4a3426" roughness={0.9} />
      </mesh>
      <mesh position={[0, h(0.52) * s, 0]} castShadow>
        <icosahedronGeometry args={[h(0.22) * s, 1]} />
        <meshStandardMaterial color={hue} roughness={0.92} />
      </mesh>
    </group>
  );
}

function LotGrounds({
  w,
  d,
  opacity,
  kind,
  seed,
}: {
  w: number;
  d: number;
  opacity: number;
  kind: ReturnType<typeof landscapeKindOf>;
  seed: string;
}) {
  const maps = useCityMaps();
  const grass = useRepeat(maps.grass, 3.4, 3.4);
  const conc = useRepeat(maps.concrete, 2.4, 1.6);
  const trans = opacity < 0.99;
  if (kind === "none") return null;
  const lawn = kind === "lawn" || kind === "hedge";
  const plaza = kind === "plaza";
  const patches = [0, 1, 2, 3].map((i) => ({
    ox: (hash(i, seed) - 0.5) * w * 0.22,
    oz: (hash(i + 9, seed) - 0.5) * d * 0.18,
    sx: 0.28 + hash(i + 3, seed) * 0.18,
    sz: 0.22 + hash(i + 5, seed) * 0.16,
    col: hash(i + 7, seed) > 0.5 ? "#5a7244" : "#4e6a3c",
  }));
  const trees = lawn
    ? [
        { x: -w * 0.58, z: d * 0.22, s: 0.85 + hash(1, seed) * 0.2, n: hash(2, seed) },
        { x: w * 0.56, z: -d * 0.18, s: 0.7 + hash(3, seed) * 0.25, n: hash(4, seed) },
        { x: -w * 0.5, z: -d * 0.32, s: 0.55 + hash(5, seed) * 0.15, n: hash(6, seed) },
      ]
    : [];
  return (
    <group>
      <mesh position={[0, h(0.016), 0]} receiveShadow>
        <boxGeometry args={[w * 1.48, h(0.036), d * 1.55]} />
        <meshStandardMaterial
          color={plaza ? "#b4aea0" : "#547044"}
          map={plaza ? conc : grass}
          roughness={0.96}
          transparent={trans}
          opacity={opacity}
        />
      </mesh>
      {lawn
        ? patches.map((p, i) => (
            <mesh key={i} position={[p.ox, h(0.022), p.oz]} receiveShadow>
              <boxGeometry args={[w * p.sx, h(0.012), d * p.sz]} />
              <meshStandardMaterial color={p.col} roughness={0.97} transparent opacity={0.55} />
            </mesh>
          ))
        : null}
      <mesh position={[0, h(0.028), d * 0.38]} receiveShadow>
        <boxGeometry args={[w * 0.42, h(0.04), d * 0.48]} />
        <meshStandardMaterial color="#b8b2a6" map={conc} roughness={0.84} transparent={trans} opacity={opacity} />
      </mesh>
      <mesh position={[0, h(0.03), d * 0.78]} receiveShadow>
        <boxGeometry args={[TILE * 0.38, h(0.032), d * 0.36]} />
        <meshStandardMaterial color="#c6bfb4" roughness={0.86} transparent={trans} opacity={opacity} />
      </mesh>
      {[-TILE * 0.22, TILE * 0.22].map((x, i) => (
        <mesh key={i} position={[x, h(0.12), d * 0.72]} castShadow>
          <cylinderGeometry args={[TILE * 0.018, TILE * 0.02, TILE * 0.16, 8]} />
          <meshStandardMaterial color="#6a6862" roughness={0.45} metalness={0.35} />
        </mesh>
      ))}
      {kind === "hedge" || lawn
        ? [-1, 1].map((s) => (
            <mesh key={s} position={[s * w * 0.62, h(0.11), d * 0.08]} castShadow>
              <boxGeometry args={[TILE * 0.1, TILE * 0.18, d * 0.58]} />
              <meshStandardMaterial color="#355a32" roughness={0.92} />
            </mesh>
          ))
        : null}
      {trees.map((t, i) => (
        <LotTree key={i} x={t.x} z={t.z} s={t.s} seed={t.n} />
      ))}
      {lawn
        ? [-1, 1].map((s) => (
            <mesh key={`b${s}`} position={[s * w * 0.38, h(0.1), d * 0.52]} castShadow>
              <sphereGeometry args={[TILE * 0.1, 7, 6]} />
              <meshStandardMaterial color="#3d6a38" roughness={0.93} />
            </mesh>
          ))
        : null}
      {plaza ? (
        <mesh position={[w * 0.42, h(0.14), d * 0.28]} castShadow>
          <cylinderGeometry args={[TILE * 0.12, TILE * 0.14, TILE * 0.16, 10]} />
          <meshStandardMaterial color="#b8b0a4" roughness={0.7} />
        </mesh>
      ) : null}
    </group>
  );
}

function Awning({ w, d, color, opacity }: { w: number; d: number; color: string; opacity: number }) {
  return (
    <group position={[0, TILE * 0.78, d / 2 + TILE * 0.14]}>
      {Array.from({ length: 7 }).map((_, i) => (
        <mesh key={i} position={[((i - 3) / 3.2) * w * 0.28, 0, 0]} rotation={[-0.32, 0, 0]}>
          <boxGeometry args={[w * 0.075, TILE * 0.035, TILE * 0.34]} />
          <meshStandardMaterial color={i % 2 === 0 ? color : "#efe8dc"} roughness={0.68} transparent={opacity < 0.99} opacity={opacity} />
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
      <mesh position={[0, y + TILE * 0.015, 0]} receiveShadow>
        <boxGeometry args={[w * 0.9, TILE * 0.05, d * 0.72]} />
        <meshStandardMaterial color={mixHex(color, "#6a6e74", 0.2)} map={map} roughness={0.78} />
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
  const letters = Math.min(text.length, 8);
  if (kind === "roof-bar") {
    return (
      <group position={[0, height + TILE * 0.06, d * 0.08]}>
        <mesh>
          <boxGeometry args={[w * 0.38, TILE * 0.05, TILE * 0.1]} />
          <meshPhysicalMaterial color="#2e3238" roughness={0.4} metalness={0.45} transparent={opacity < 0.99} opacity={opacity} />
        </mesh>
        {Array.from({ length: letters }).map((_, i) => (
          <mesh key={i} position={[((i - (letters - 1) / 2) / Math.max(1, letters)) * w * 0.28, TILE * 0.04, 0]}>
            <boxGeometry args={[TILE * 0.04, TILE * 0.06, TILE * 0.03]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.18} />
          </mesh>
        ))}
      </group>
    );
  }
  if (kind === "blade") {
    return (
      <group position={[w * 0.48, TILE * 0.72, d / 2 + TILE * 0.06]} rotation={[0, 0.18, 0]}>
        <mesh castShadow>
          <boxGeometry args={[TILE * 0.05, TILE * 0.32, TILE * 0.2]} />
          <meshPhysicalMaterial color="#2c2a26" roughness={0.42} metalness={0.3} />
        </mesh>
        <mesh position={[TILE * 0.02, 0, 0]}>
          <boxGeometry args={[TILE * 0.02, TILE * 0.24, TILE * 0.14]} />
          <meshStandardMaterial color={color} roughness={0.45} />
        </mesh>
      </group>
    );
  }
  return (
    <group position={[0, TILE * 1.08, d / 2 + TILE * 0.045]}>
      <mesh>
        <boxGeometry args={[Math.min(w * 0.52, TILE * 1.35), TILE * 0.11, TILE * 0.045]} />
        <meshPhysicalMaterial color="#2a2824" roughness={0.4} metalness={0.22} />
      </mesh>
      <mesh position={[0, 0, TILE * 0.012]}>
        <boxGeometry args={[Math.min(w * 0.46, TILE * 1.2), TILE * 0.07, TILE * 0.02]} />
        <meshStandardMaterial color={color} roughness={0.48} metalness={0.12} />
      </mesh>
    </group>
  );
}

function BalconyRail({ w, y, z, opacity }: { w: number; y: number; z: number; opacity: number }) {
  return (
    <group position={[0, y, z]}>
      <mesh receiveShadow>
        <boxGeometry args={[w, TILE * 0.035, TILE * 0.22]} />
        <meshStandardMaterial color="#d8d2c8" roughness={0.7} transparent={opacity < 0.99} opacity={opacity} />
      </mesh>
      <mesh position={[0, TILE * 0.1, TILE * 0.09]}>
        <boxGeometry args={[w * 0.98, TILE * 0.09, TILE * 0.012]} />
        <meshPhysicalMaterial color="#c8d0d4" roughness={0.12} metalness={0.15} transparent opacity={0.45} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * w * 0.48, TILE * 0.08, TILE * 0.08]}>
          <boxGeometry args={[TILE * 0.02, TILE * 0.14, TILE * 0.02]} />
          <meshStandardMaterial color="#8a8882" metalness={0.4} roughness={0.4} />
        </mesh>
      ))}
    </group>
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
  const wallColor = wall;
  const wallKind = wallKindOf(spec);
  const winKind = windowKindOf(spec);
  const roofKind = roofKindOf(spec);
  const entrance = entranceKindOf(spec);
  const balcony = balconyKindOf(spec);
  const landscape = landscapeKindOf(spec);
  const lighting = lightingKindOf(spec);
  const foundation = foundationKindOf(spec);
  const floorBelt = variantOf(spec, "floor", "belt-concrete") === "belt-concrete";
  const lit = occupied && lighting !== "none";
  const brickMap = useRepeat(maps.brick, Math.max(2.6, w / 20), Math.max(2.8, height / 16));
  const concMap = useRepeat(maps.concrete, Math.max(1.8, w / 28), Math.max(1.8, height / 24));
  const roofMap = useRepeat(maps.roof, 3.2, 3.2);
  const metalMap = useRepeat(maps.metal, 3.4, 2.4);
  const bodyMap = wallKind === "brick" ? brickMap : wallKind === "metal" ? metalMap : wallKind === "concrete" ? concMap : undefined;
  const floors = spec.floors;
  const seed = spec.id;
  const cols = Math.max(2, Math.min(8, Math.round(Math.max(w, d) / 14)));
  const plinthH = foundation === "pad-wide" ? TILE * 0.2 : foundation === "loading-slab" ? TILE * 0.12 : TILE * 0.14;
  const plinthS = foundation === "pad-wide" ? 1.12 : foundation === "loading-slab" ? 1.08 : 1.04;

  return (
    <group>
      <LotGrounds w={w} d={d} opacity={opacity} kind={landscape} seed={seed} />
      <mesh position={[0, plinthH * 0.45, 0]} receiveShadow>
        <boxGeometry args={[bodyW * plinthS, plinthH, bodyD * plinthS]} />
        <meshPhysicalMaterial color={spec.materials.plinth} roughness={0.58} metalness={0.16} map={concMap} transparent={trans} opacity={opacity} />
      </mesh>

      {massing === "podium-tower" ? (
        <group>
          <Skin
            w={bodyW * 1.06}
            ht={height * 0.28}
            d={bodyD * 1.08}
            position={[0, height * 0.16, 0]}
            color={wallDark ?? "#3a404c"}
            map={concMap}
            wallKind="concrete"
            opacity={opacity}
            selected={selected}
          />
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
                wall={wallColor}
              />
            ) : (
              <Skin
                w={bodyW * 0.86}
                ht={height * 0.7}
                d={bodyD * 0.78}
                position={[0, height * 0.35, 0]}
                color={wallColor}
                map={bodyMap}
                wallKind={wallKind}
                opacity={opacity}
                selected={selected}
              />
            )}
          </group>
          <mesh position={[bodyW * 0.46, height * 0.52, 0]} castShadow>
            <boxGeometry args={[TILE * 0.06, height * 0.72, bodyD * 0.12]} />
            <meshPhysicalMaterial color={accent} roughness={0.42} metalness={0.18} transparent={trans} opacity={opacity} />
          </mesh>
          <RoofBySpec kind={roofKind} w={bodyW * 0.86} d={bodyD * 0.78} y={height * 0.98} rise={TILE * 0.4} color={roof} opacity={opacity} map={roofMap} />
          <Hvac x={bodyW * 0.18} z={-bodyD * 0.12} y={height + TILE * 0.12} opacity={opacity} />
          <Hvac x={-bodyW * 0.12} z={bodyD * 0.08} y={height + TILE * 0.1} opacity={opacity} />
        </group>
      ) : massing === "wing" ? (
        <group>
          <Skin
            w={bodyW * 0.62}
            ht={height * 0.68}
            d={bodyD}
            position={[-bodyW * 0.18, height * 0.38, 0]}
            color={wallColor}
            map={bodyMap}
            wallKind={wallKind}
            opacity={opacity}
            selected={selected}
          />
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
                wall={wallColor}
              />
            ) : (
              <Skin
                w={bodyW * 0.58}
                ht={height * 0.72}
                d={bodyD * 0.72}
                position={[0, height * 0.36, 0]}
                color={wallColor}
                map={bodyMap}
                wallKind={wallKind}
                opacity={opacity}
                selected={selected}
              />
            )}
          </group>
          <RoofBySpec kind={roofKind} w={bodyW * 0.96} d={bodyD * 0.96} y={height * 0.92} rise={TILE * 0.28} color={roof} opacity={opacity} map={metalMap} />
        </group>
      ) : massing === "gable-row" ? (
        <group>
          <Skin
            w={bodyW}
            ht={height * 0.58}
            d={bodyD}
            position={[0, height * 0.34, 0]}
            color={wallColor}
            map={brickMap}
            wallKind="brick"
            opacity={opacity}
            selected={selected}
          />
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * (bodyW / 2 - TILE * 0.03), height * 0.34, 0]}>
              <boxGeometry args={[TILE * 0.04, height * 0.58, bodyD]} />
              <meshStandardMaterial color="#efe8dc" roughness={0.72} />
            </mesh>
          ))}
          <mesh position={[bodyW * 0.18, TILE * 0.22, bodyD / 2 + TILE * 0.02]}>
            <boxGeometry args={[TILE * 0.18, TILE * 0.22, TILE * 0.08]} />
            <meshStandardMaterial color="#6a5040" roughness={0.7} />
          </mesh>
          <RoofBySpec kind={roofKind} w={bodyW} d={bodyD} y={height * 0.62} rise={height * 0.32} color={roof} opacity={opacity} map={roofMap} />
        </group>
      ) : massing === "colonnade" ? (
        <group>
          <mesh position={[0, TILE * 0.12, 0]} receiveShadow>
            <boxGeometry args={[bodyW * 1.12, TILE * 0.2, bodyD * 1.12]} />
            <meshPhysicalMaterial color="#e2d6c2" map={concMap} roughness={0.64} transparent={trans} opacity={opacity} />
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
                <cylinderGeometry args={[TILE * 0.065, TILE * 0.075, height * 0.52, 12]} />
                <meshPhysicalMaterial color="#efe6d4" roughness={0.5} map={concMap} />
              </mesh>
              <mesh position={[0, height * 0.28, 0]}>
                <boxGeometry args={[TILE * 0.16, TILE * 0.05, TILE * 0.16]} />
                <meshStandardMaterial color="#f2ebe2" roughness={0.52} />
              </mesh>
            </group>
          ))}
          <Skin
            w={bodyW * 0.72}
            ht={height * 0.32}
            d={bodyD * 0.68}
            position={[0, height * 0.22, 0]}
            color={wallColor}
            map={concMap}
            wallKind="concrete"
            opacity={opacity}
            selected={selected}
          />
          <RoofBySpec kind={roofKind} w={bodyW * 0.92} d={bodyD * 0.92} y={height * 0.42} rise={TILE * 0.55} color={roof} opacity={opacity} map={roofMap} />
        </group>
      ) : massing === "shopfront" ? (
        <group>
          <Skin
            w={bodyW}
            ht={height * 0.64}
            d={bodyD}
            position={[0, height * 0.36, 0]}
            color={wallColor}
            map={brickMap}
            wallKind="brick"
            opacity={opacity}
            selected={selected}
          />
          {winKind === "storefront" || winKind === "curtain" ? (
            <>
              <mesh position={[0, TILE * 0.42, bodyD / 2 - TILE * 0.03]}>
                <boxGeometry args={[bodyW * 0.8, TILE * 0.68, TILE * 0.08]} />
                <meshPhysicalMaterial color="#4e4a44" roughness={0.42} metalness={0.28} />
              </mesh>
              <mesh position={[0, TILE * 0.44, bodyD / 2 + TILE * 0.012]}>
                <boxGeometry args={[bodyW * 0.72, TILE * 0.52, TILE * 0.03]} />
                <meshPhysicalMaterial
                  color={spec.materials.glass}
                  roughness={0.05}
                  metalness={0.08}
                  clearcoat={0.85}
                  envMapIntensity={1.1}
                  transparent
                  opacity={0.7}
                  emissive={lit ? "#f2e0b8" : "#000"}
                  emissiveIntensity={lit ? 0.12 : 0}
                />
              </mesh>
              <mesh position={[0, TILE * 0.72, bodyD / 2 + TILE * 0.02]}>
                <boxGeometry args={[bodyW * 0.82, TILE * 0.06, TILE * 0.08]} />
                <meshStandardMaterial color="#2c2a26" roughness={0.45} />
              </mesh>
            </>
          ) : null}
          <RoofBySpec kind={roofKind} w={bodyW} d={bodyD} y={height * 0.68} rise={TILE * 0.28} color={roof} opacity={opacity} map={roofMap} />
        </group>
      ) : massing === "loading" || massing === "sawtooth" ? (
        <group>
          <Skin
            w={bodyW}
            ht={height * 0.62}
            d={bodyD}
            position={[0, height * 0.34, 0]}
            color={wallColor}
            map={wallKind === "brick" ? brickMap : metalMap}
            wallKind={wallKind === "brick" ? "brick" : "metal"}
            opacity={opacity}
            selected={selected}
          />
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
                <boxGeometry args={[TILE * 0.95, TILE * 0.62, TILE * 0.08]} />
                <meshPhysicalMaterial color="#3a4048" roughness={0.42} metalness={0.4} />
              </mesh>
              <mesh position={[bodyW * 0.18, TILE * 0.78, bodyD / 2 + TILE * 0.16]} rotation={[-0.08, 0, 0]}>
                <boxGeometry args={[TILE * 1.05, TILE * 0.05, TILE * 0.36]} />
                <meshStandardMaterial color="#2a2e34" metalness={0.45} roughness={0.38} />
              </mesh>
            </>
          ) : null}
          <mesh position={[bodyW * 0.36, height * 0.88, -bodyD * 0.16]} castShadow>
            <cylinderGeometry args={[TILE * 0.09, TILE * 0.13, height * 0.4, 12]} />
            <meshPhysicalMaterial color="#6b7280" metalness={0.52} roughness={0.32} />
          </mesh>
        </group>
      ) : massing === "northlight" ? (
        <group>
          <Skin
            w={bodyW}
            ht={height * 0.62}
            d={bodyD * 0.88}
            position={[0, height * 0.34, -bodyD * 0.06]}
            color={wallColor}
            map={bodyMap}
            wallKind={wallKind}
            opacity={opacity}
            selected={selected}
          />
          <RoofBySpec kind={roofKind} w={bodyW} d={bodyD} y={height * 0.64} rise={height * 0.22} color={roof} opacity={opacity} map={roofMap} />
          <mesh position={[0, height * 0.42, bodyD / 2 - TILE * 0.02]}>
            <boxGeometry args={[bodyW * 0.62, height * 0.38, TILE * 0.06]} />
            <meshPhysicalMaterial color="#4a4440" roughness={0.42} metalness={0.2} />
          </mesh>
          <mesh position={[0, height * 0.44, bodyD / 2 + TILE * 0.02]}>
            <boxGeometry args={[bodyW * 0.54, height * 0.3, TILE * 0.03]} />
            <meshPhysicalMaterial color={spec.materials.glass} roughness={0.06} metalness={0.08} clearcoat={0.7} envMapIntensity={1} transparent opacity={0.68} />
          </mesh>
        </group>
      ) : massing === "balcony-stack" ? (
        <group>
          <Skin
            w={bodyW}
            ht={height * 0.78}
            d={bodyD}
            position={[0, height * 0.42, 0]}
            color={wallColor}
            map={concMap}
            wallKind="concrete"
            opacity={opacity}
            selected={selected}
          />
          {balcony !== "none"
            ? Array.from({ length: floors }).map((_, i) => (
                <BalconyRail
                  key={i}
                  w={bodyW * 0.78}
                  y={TILE * 0.48 + (i * height * 0.68) / Math.max(1, floors)}
                  z={bodyD / 2 + TILE * 0.1}
                  opacity={opacity}
                />
              ))
            : null}
          <RoofBySpec kind={roofKind} w={bodyW} d={bodyD} y={height * 0.84} rise={TILE * 0.22} color={roof} opacity={opacity} map={roofMap} />
        </group>
      ) : massing === "ribbon" ? (
        <group>
          <Skin
            w={bodyW}
            ht={height * 0.74}
            d={bodyD}
            position={[0, height * 0.4, 0]}
            color={wallColor}
            map={concMap}
            wallKind="concrete"
            opacity={opacity}
            selected={selected}
          />
          {balcony === "terrace" ? (
            <group position={[0, height * 0.86, 0]}>
              <mesh>
                <boxGeometry args={[bodyW * 0.7, height * 0.16, bodyD * 0.52]} />
                <meshPhysicalMaterial color={wallDark ?? "#9aadb8"} roughness={0.38} metalness={0.28} transparent={trans} opacity={opacity} />
              </mesh>
              <mesh position={[0, height * 0.1, bodyD * 0.22]}>
                <boxGeometry args={[bodyW * 0.48, TILE * 0.06, TILE * 0.12]} />
                <meshStandardMaterial color="#4a6a3c" roughness={0.9} />
              </mesh>
            </group>
          ) : null}
          <RoofBySpec kind={roofKind} w={bodyW} d={bodyD} y={height * 0.8} rise={TILE * 0.2} color={roof} opacity={opacity} map={roofMap} />
          <Hvac x={-bodyW * 0.16} z={bodyD * 0.1} y={height * 0.98} opacity={opacity} />
        </group>
      ) : (
        <group>
          <Skin
            w={bodyW}
            ht={height * 0.74}
            d={bodyD}
            position={[0, height * 0.4, 0]}
            color={wallColor}
            map={bodyMap}
            wallKind={wallKind}
            opacity={opacity}
            selected={selected}
          />
          {floorBelt
            ? Array.from({ length: floors }).map((_, i) => (
                <mesh key={i} position={[0, (height / Math.max(1, floors)) * i + TILE * 0.02, 0]}>
                  <boxGeometry args={[bodyW * 1.002, TILE * 0.028, bodyD * 1.002]} />
                  <meshStandardMaterial color="#c8c4ba" roughness={0.55} metalness={0.1} />
                </mesh>
              ))
            : null}
          <RoofBySpec kind={roofKind} w={bodyW} d={bodyD} y={height * 0.8} rise={TILE * 0.28} color={roof} opacity={opacity} map={roofMap} />
          <Hvac x={bodyW * 0.14} z={-bodyD * 0.08} y={height * 0.92} opacity={opacity} />
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
          wall={wallColor}
          opacity={opacity}
          occupied={lit}
          seed={seed}
        />
      ) : null}

      {entrance === "awning" ? <Awning w={bodyW} d={d} color={accent} opacity={opacity} /> : null}
      {entrance === "canopy" ? <Canopy w={w} d={d} y={TILE * 0.9} color={lighting === "cool" ? "#d4dae0" : "#32363c"} opacity={opacity} /> : null}
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
