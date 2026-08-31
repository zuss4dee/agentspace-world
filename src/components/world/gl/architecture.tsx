"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { TILE, h } from "@/lib/coords";
import { familyForUse, specFor, type ArchFamily } from "@/lib/architecture";
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
};

function useRepeat(tex: THREE.Texture, sx: number, sy: number) {
  return useMemo(() => {
    const t = tex.clone();
    t.repeat.set(sx, sy);
    t.needsUpdate = true;
    return t;
  }, [tex, sx, sy]);
}

function RecessedWindows({
  w,
  d,
  height,
  cols,
  rows,
  glass,
  mullion,
  opacity,
}: {
  w: number;
  d: number;
  height: number;
  cols: number;
  rows: number;
  glass: string;
  mullion: string;
  opacity: number;
}) {
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const glassRef = useRef<THREE.InstancedMesh>(null);
  const frameRef = useRef<THREE.InstancedMesh>(null);
  const layout = useMemo(() => {
    const list: { x: number; y: number; z: number; sx: number; sy: number; sz: number }[] = [];
    const pw = Math.min(TILE * 0.28, (w - TILE * 0.55) / Math.max(1, cols));
    const ph = Math.min(TILE * 0.34, (height - TILE * 0.7) / Math.max(1, rows));
    const marginX = TILE * 0.38;
    const marginY = TILE * 0.42;
    const addFace = (span: number, n: number, place: (u: number, y: number, pw: number) => void) => {
      const count = Math.max(1, n);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < count; c++) {
          const u = count === 1 ? 0 : -span / 2 + marginX + (c * (span - marginX * 2)) / Math.max(1, count - 1);
          const y = marginY + (r * (height - marginY * 1.4)) / Math.max(1, rows - 1 || 1);
          place(u, y, pw);
        }
      }
    };
    addFace(w, cols, (x, y, pw) => {
      list.push({ x, y, z: d / 2 + TILE * 0.018, sx: pw, sy: ph, sz: TILE * 0.04 });
    });
    addFace(d, Math.max(1, cols - 1), (z, y, pw) => {
      list.push({ x: w / 2 + TILE * 0.018, y, z, sx: TILE * 0.04, sy: ph, sz: pw });
    });
    return list;
  }, [w, d, height, cols, rows]);

  useLayoutEffect(() => {
    const g = glassRef.current;
    const f = frameRef.current;
    if (!g || !f) return;
    layout.forEach((p, i) => {
      dummy.position.set(p.x, p.y, p.z);
      dummy.scale.set(p.sx * 0.82, p.sy * 0.78, p.sz * 0.6);
      dummy.updateMatrix();
      g.setMatrixAt(i, dummy.matrix);
      dummy.scale.set(p.sx, p.sy, p.sz);
      dummy.updateMatrix();
      f.setMatrixAt(i, dummy.matrix);
    });
    g.instanceMatrix.needsUpdate = true;
    f.instanceMatrix.needsUpdate = true;
  }, [dummy, layout]);

  if (!layout.length) return null;
  const trans = opacity < 0.99;
  return (
    <group>
      <instancedMesh ref={frameRef} args={[undefined, undefined, layout.length]} raycast={() => undefined}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={mullion} roughness={0.42} metalness={0.35} transparent={trans} opacity={opacity} />
      </instancedMesh>
      <instancedMesh ref={glassRef} args={[undefined, undefined, layout.length]} raycast={() => undefined}>
        <boxGeometry args={[1, 1, 1]} />
        <meshPhysicalMaterial
          color={glass}
          roughness={0.14}
          metalness={0.62}
          emissive={glass}
          emissiveIntensity={0.08}
          transparent={trans}
          opacity={opacity}
        />
      </instancedMesh>
    </group>
  );
}

function Door({ d, accent, opacity, wide = false }: { d: number; accent: string; opacity: number; wide?: boolean }) {
  const trans = opacity < 0.99;
  return (
    <group position={[0, TILE * 0.38, d / 2 + TILE * 0.03]}>
      <mesh>
        <boxGeometry args={[wide ? TILE * 0.62 : TILE * 0.36, TILE * 0.72, TILE * 0.1]} />
        <meshStandardMaterial color="#1f1c18" roughness={0.4} metalness={0.18} transparent={trans} opacity={opacity} />
      </mesh>
      <mesh position={[0, TILE * 0.04, TILE * 0.03]}>
        <boxGeometry args={[wide ? TILE * 0.48 : TILE * 0.22, TILE * 0.5, TILE * 0.04]} />
        <meshPhysicalMaterial color={accent} roughness={0.22} metalness={0.4} transparent={trans} opacity={opacity} />
      </mesh>
    </group>
  );
}

function Canopy({ w, d, y, color, opacity }: { w: number; d: number; y: number; color: string; opacity: number }) {
  return (
    <mesh position={[0, y, d / 2 + TILE * 0.16]} rotation={[-0.18, 0, 0]} castShadow>
      <boxGeometry args={[w * 0.72, TILE * 0.06, TILE * 0.42]} />
      <meshStandardMaterial color={color} roughness={0.55} metalness={0.12} transparent={opacity < 0.99} opacity={opacity} />
    </mesh>
  );
}

function RoofPlant({ w, d, height, roof, family, opacity }: { w: number; d: number; height: number; roof: string; family: ArchFamily; opacity: number }) {
  const trans = opacity < 0.99;
  if (family === "townhouse" || family === "civic") return null;
  return (
    <group position={[0, height + TILE * 0.02, 0]}>
      <mesh position={[w * 0.22, TILE * 0.14, -d * 0.18]} castShadow>
        <boxGeometry args={[TILE * 0.28, TILE * 0.28, TILE * 0.22]} />
        <meshStandardMaterial color="#6b7280" roughness={0.38} metalness={0.55} transparent={trans} opacity={opacity} />
      </mesh>
      <mesh position={[w * 0.22, TILE * 0.32, -d * 0.18]}>
        <cylinderGeometry args={[TILE * 0.04, TILE * 0.05, TILE * 0.16, 6]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.6} roughness={0.3} transparent={trans} opacity={opacity} />
      </mesh>
      {family === "hq" || family === "research" ? (
        <mesh position={[-w * 0.18, TILE * 0.08, d * 0.16]}>
          <boxGeometry args={[TILE * 0.42, TILE * 0.1, TILE * 0.28]} />
          <meshStandardMaterial color={roof} roughness={0.5} metalness={0.35} transparent={trans} opacity={opacity} />
        </mesh>
      ) : null}
    </group>
  );
}

function HipRoof({ w, d, height, color, opacity }: { w: number; d: number; height: number; color: string; opacity: number }) {
  return (
    <mesh position={[0, height * 0.08, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
      <coneGeometry args={[Math.max(w, d) * 0.72, height * 0.42, 4]} />
      <meshStandardMaterial color={color} roughness={0.72} metalness={0.06} transparent={opacity < 0.99} opacity={opacity} />
    </mesh>
  );
}

function Landscaping({ w, d, opacity }: { w: number; d: number; opacity: number }) {
  return (
    <group>
      <mesh position={[0, h(0.03), 0]} receiveShadow>
        <boxGeometry args={[w * 1.18, h(0.06), d * 1.18]} />
        <meshStandardMaterial color="#6a7a4e" roughness={0.92} transparent={opacity < 0.99} opacity={opacity} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (w * 0.42), h(0.1), d / 2 + TILE * 0.18]} castShadow>
          <cylinderGeometry args={[TILE * 0.1, TILE * 0.12, TILE * 0.16, 8]} />
          <meshStandardMaterial color="#8a7a62" roughness={0.8} />
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
}: MassProps) {
  const maps = useCityMaps();
  const spec = specFor(family, w, d, height);
  const trans = opacity < 0.99;
  const bodyW = w * (1 - spec.setback);
  const bodyD = d * (1 - spec.setback);
  const wallColor = selected ? "#ead9c8" : wall;
  const brick = family === "townhouse" || family === "cafe" || family === "industrial";
  const concrete = family === "civic" || family === "warehouse" || family === "office";
  const brickMap = useRepeat(maps.brick, Math.max(2, w / 28), Math.max(2, height / 22));
  const concMap = useRepeat(maps.concrete, Math.max(1.4, w / 36), Math.max(1.4, height / 32));
  const roofMap = useRepeat(maps.roof, 2.4, 2.4);
  const bodyMap = brick ? brickMap : concrete ? concMap : undefined;
  const metal = family === "hq" || family === "research" || family === "startup" ? 0.42 : brick ? 0.04 : 0.16;
  const rough = brick ? 0.82 : family === "hq" ? 0.22 : 0.48;

  return (
    <group>
      <Landscaping w={w} d={d} opacity={opacity} />
      <mesh position={[0, TILE * 0.07, 0]} receiveShadow>
        <boxGeometry args={[w * 1.05, TILE * 0.14, d * 1.05]} />
        <meshStandardMaterial
          color={spec.plinth}
          roughness={0.55}
          metalness={0.28}
          map={concMap}
          transparent={trans}
          opacity={opacity}
        />
      </mesh>

      {family === "hq" ? (
        <>
          <mesh position={[0, height * 0.28, 0]} castShadow receiveShadow>
            <boxGeometry args={[bodyW, height * 0.52, bodyD]} />
            <meshPhysicalMaterial
              color={wallColor}
              roughness={0.18}
              metalness={0.55}
              transparent={trans}
              opacity={opacity}
            />
          </mesh>
          <mesh position={[0, height * 0.72, 0]} castShadow>
            <boxGeometry args={[bodyW * 0.72, height * 0.42, bodyD * 0.62]} />
            <meshPhysicalMaterial
              color={wallDark ?? "#6a7b96"}
              roughness={0.2}
              metalness={0.5}
              transparent={trans}
              opacity={opacity}
            />
          </mesh>
          <mesh position={[w * 0.48, height * 0.45, 0]} castShadow>
            <boxGeometry args={[TILE * 0.1, height * 0.78, bodyD * 0.22]} />
            <meshStandardMaterial color={accent} roughness={0.35} metalness={0.25} transparent={trans} opacity={opacity} />
          </mesh>
          <Canopy w={w} d={d} y={TILE * 0.85} color="#2a2e34" opacity={opacity} />
        </>
      ) : family === "startup" ? (
        <>
          <mesh position={[0, height * 0.4, 0]} castShadow receiveShadow>
            <boxGeometry args={[bodyW, height * 0.74, bodyD]} />
            <meshPhysicalMaterial
              color={wallColor}
              roughness={0.16}
              metalness={0.48}
              transparent={trans}
              opacity={opacity}
            />
          </mesh>
          <mesh position={[0, height * 0.9, 0]} castShadow>
            <boxGeometry args={[bodyW * 0.92, TILE * 0.14, bodyD * 0.92]} />
            <meshStandardMaterial color={roof} roughness={0.32} metalness={0.45} transparent={trans} opacity={opacity} />
          </mesh>
          <mesh position={[0, height + TILE * 0.04, d * 0.22]}>
            <boxGeometry args={[bodyW * 0.7, TILE * 0.08, bodyD * 0.28]} />
            <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.22} transparent={trans} opacity={opacity} />
          </mesh>
        </>
      ) : family === "townhouse" ? (
        <>
          <mesh position={[0, height * 0.32, 0]} castShadow receiveShadow>
            <boxGeometry args={[bodyW, height * 0.58, bodyD]} />
            <meshStandardMaterial
              color={wallColor}
              map={bodyMap}
              roughness={0.8}
              metalness={0.04}
              transparent={trans}
              opacity={opacity}
            />
          </mesh>
          <group position={[0, height * 0.62, 0]}>
            <HipRoof w={bodyW} d={bodyD} height={height} color={roof} opacity={opacity} />
          </group>
          <mesh position={[0, TILE * 0.18, d / 2 + TILE * 0.12]} receiveShadow>
            <boxGeometry args={[TILE * 0.7, TILE * 0.1, TILE * 0.28]} />
            <meshStandardMaterial color="#c4b49a" roughness={0.78} />
          </mesh>
        </>
      ) : family === "civic" ? (
        <>
          {[
            [-bodyW / 2 + TILE * 0.14, -bodyD / 2 + TILE * 0.14],
            [bodyW / 2 - TILE * 0.14, -bodyD / 2 + TILE * 0.14],
            [-bodyW / 2 + TILE * 0.14, bodyD / 2 - TILE * 0.14],
            [bodyW / 2 - TILE * 0.14, bodyD / 2 - TILE * 0.14],
          ].map(([x, z], i) => (
            <mesh key={i} position={[x, height * 0.32, z]} castShadow>
              <cylinderGeometry args={[TILE * 0.07, TILE * 0.08, height * 0.58, 8]} />
              <meshStandardMaterial color="#e4d6bc" roughness={0.55} map={concMap} transparent={trans} opacity={opacity} />
            </mesh>
          ))}
          <mesh position={[0, height * 0.22, 0]} castShadow receiveShadow>
            <boxGeometry args={[bodyW * 0.78, height * 0.38, bodyD * 0.78]} />
            <meshStandardMaterial color={wallColor} map={concMap} roughness={0.62} transparent={trans} opacity={opacity} />
          </mesh>
          <mesh position={[0, height * 0.58, 0]} rotation={[0, Math.PI / 8, 0]} castShadow>
            <coneGeometry args={[Math.max(bodyW, bodyD) * 0.58, TILE * 0.42, 8]} />
            <meshStandardMaterial color={roof} roughness={0.7} transparent={trans} opacity={opacity} />
          </mesh>
        </>
      ) : family === "cafe" || family === "retail" ? (
        <>
          <mesh position={[0, height * 0.38, 0]} castShadow receiveShadow>
            <boxGeometry args={[bodyW, height * 0.7, bodyD]} />
            <meshStandardMaterial
              color={wallColor}
              map={brick ? bodyMap : concMap}
              roughness={rough}
              metalness={0.06}
              transparent={trans}
              opacity={opacity}
            />
          </mesh>
          <mesh position={[0, TILE * 0.42, d / 2 + TILE * 0.04]}>
            <boxGeometry args={[bodyW * 0.72, TILE * 0.55, TILE * 0.06]} />
            <meshPhysicalMaterial color={spec.glass} roughness={0.12} metalness={0.5} transparent={trans} opacity={opacity} />
          </mesh>
          <Canopy w={w} d={d} y={TILE * 0.82} color={accent} opacity={opacity} />
          <mesh position={[0, height * 0.82, 0]}>
            <boxGeometry args={[bodyW * 1.04, TILE * 0.1, bodyD * 1.04]} />
            <meshStandardMaterial color={roof} map={roofMap} roughness={0.6} transparent={trans} opacity={opacity} />
          </mesh>
        </>
      ) : family === "warehouse" || family === "industrial" ? (
        <>
          <mesh position={[0, height * 0.36, 0]} castShadow receiveShadow>
            <boxGeometry args={[bodyW, height * 0.68, bodyD]} />
            <meshStandardMaterial
              color={wallColor}
              map={bodyMap}
              roughness={0.78}
              metalness={family === "warehouse" ? 0.28 : 0.08}
              transparent={trans}
              opacity={opacity}
            />
          </mesh>
          <mesh position={[0, height * 0.78, 0]} rotation={[0, 0, 0]}>
            <boxGeometry args={[bodyW * 1.02, TILE * 0.12, bodyD * 1.02]} />
            <meshStandardMaterial color={roof} map={roofMap} roughness={0.55} metalness={0.3} transparent={trans} opacity={opacity} />
          </mesh>
          <mesh position={[bodyW * 0.12, TILE * 0.42, d / 2 + TILE * 0.02]}>
            <boxGeometry args={[TILE * 0.9, TILE * 0.7, TILE * 0.08]} />
            <meshStandardMaterial color="#3f4450" roughness={0.5} metalness={0.4} />
          </mesh>
          <mesh position={[bodyW * 0.34, height * 0.92, -d * 0.18]} castShadow>
            <cylinderGeometry args={[TILE * 0.1, TILE * 0.14, height * 0.42, 8]} />
            <meshStandardMaterial color="#6b7280" metalness={0.55} roughness={0.35} />
          </mesh>
        </>
      ) : family === "studio" ? (
        <>
          <mesh position={[0, height * 0.36, 0]} castShadow receiveShadow>
            <boxGeometry args={[bodyW, height * 0.68, bodyD]} />
            <meshStandardMaterial color={wallColor} roughness={0.58} metalness={0.08} transparent={trans} opacity={opacity} />
          </mesh>
          <mesh position={[0, height * 0.78, d * 0.08]} rotation={[-0.32, 0, 0]} castShadow>
            <boxGeometry args={[bodyW * 1.04, TILE * 0.1, bodyD * 0.7]} />
            <meshStandardMaterial color={roof} roughness={0.5} metalness={0.2} transparent={trans} opacity={opacity} />
          </mesh>
          <mesh position={[0, height * 0.5, d / 2 + TILE * 0.02]}>
            <boxGeometry args={[bodyW * 0.55, height * 0.32, TILE * 0.06]} />
            <meshPhysicalMaterial color={spec.glass} roughness={0.12} metalness={0.5} transparent={trans} opacity={opacity} />
          </mesh>
        </>
      ) : family === "apartment" ? (
        <>
          <mesh position={[0, height * 0.42, 0]} castShadow receiveShadow>
            <boxGeometry args={[bodyW, height * 0.8, bodyD]} />
            <meshStandardMaterial color={wallColor} roughness={0.55} metalness={0.1} map={concMap} transparent={trans} opacity={opacity} />
          </mesh>
          {Array.from({ length: spec.floors }).map((_, i) => (
            <mesh key={i} position={[0, TILE * 0.55 + i * (height * 0.72) / Math.max(1, spec.floors), d / 2 + TILE * 0.08]}>
              <boxGeometry args={[bodyW * 0.82, TILE * 0.05, TILE * 0.16]} />
              <meshStandardMaterial color="#d8d0c4" roughness={0.7} />
            </mesh>
          ))}
        </>
      ) : (
        <>
          <mesh position={[0, height * 0.42, 0]} castShadow receiveShadow>
            <boxGeometry args={[bodyW, height * 0.8, bodyD]} />
            <meshStandardMaterial
              color={wallColor}
              map={bodyMap}
              roughness={rough}
              metalness={metal}
              transparent={trans}
              opacity={opacity}
            />
          </mesh>
          <mesh position={[0, height * 0.88, 0]} castShadow>
            <boxGeometry args={[bodyW * 1.04, TILE * 0.1, bodyD * 1.04]} />
            <meshStandardMaterial color={roof} map={roofMap} roughness={0.55} metalness={0.22} transparent={trans} opacity={opacity} />
          </mesh>
          <mesh position={[0, height * 0.96, 0]}>
            <boxGeometry args={[bodyW * 0.86, TILE * 0.08, bodyD * 0.86]} />
            <meshStandardMaterial color={roof} roughness={0.5} transparent={trans} opacity={opacity} />
          </mesh>
        </>
      )}

      {family !== "civic" ? (
        <RecessedWindows
          w={bodyW}
          d={bodyD}
          height={height * (family === "hq" ? 0.55 : 0.82)}
          cols={spec.windowCols}
          rows={Math.max(1, spec.floors)}
          glass={spec.glass}
          mullion={spec.mullion}
          opacity={opacity}
        />
      ) : null}
      <Door d={d} accent={accent} opacity={opacity} wide={family === "cafe" || family === "retail" || family === "hq"} />
      <RoofPlant w={bodyW} d={bodyD} height={height * 0.92} roof={roof} family={family} opacity={opacity} />
    </group>
  );
}

/** Shared mass for sale ghosts and claimed offices. */
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
