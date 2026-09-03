"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { GRID } from "@/lib/campus";
import { TILE, h, wx, wz } from "@/lib/coords";
import { fbm, hash2 } from "@/lib/noise";
import {
  HORIZON_PAD,
  SCENERY_MARGIN,
  horizonBounds,
  playableBounds,
  sceneryBounds,
  signedRectDist,
  worldRectCenterSpan,
} from "@/lib/world-sections";

function cloudMap() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 160;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, 256, 160);
  const blobs = [
    [128, 88, 118],
    [86, 96, 70],
    [172, 92, 74],
    [118, 70, 52],
    [150, 108, 58],
  ] as const;
  for (const [x, y, r] of blobs) {
    const g = ctx.createRadialGradient(x, y, r * 0.12, x, y, r);
    g.addColorStop(0, "rgba(252,250,246,0.7)");
    g.addColorStop(0.38, "rgba(232,226,214,0.32)");
    g.addColorStop(1, "rgba(210,200,180,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 160);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function SkirtGeometry() {
  const play = playableBounds();
  const hor = horizonBounds();
  const span = worldRectCenterSpan(hor);
  const segs = 112;
  const geo = new THREE.PlaneGeometry(span.w, span.d, segs, segs);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position!;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + span.cx;
    const z = pos.getZ(i) + span.cz;
    const gx = x / TILE + GRID / 2;
    const gy = z / TILE + GRID / 2;
    const edge = signedRectDist(gx, gy, play);
    const n = fbm(gx * 0.045, gy * 0.045);
    const lake =
      hash2(Math.floor(gx / 28), Math.floor(gy / 22)) > 0.78 &&
      edge < -6 &&
      edge > -(SCENERY_MARGIN - 4) &&
      n > 0.42;
    let y = n * h(0.22);
    if (edge >= 0) {
      const berm = Math.max(0, 1 - edge / 3.2);
      y = n * h(0.18) + berm * h(0.55);
      if (gx >= 0 && gy >= 0 && gx < GRID && gy < GRID) y = h(-0.35);
      c.setRGB(0.32 + n * 0.08, 0.5 + n * 0.1, 0.27 + n * 0.05);
      if (gx >= play.x0 + 2 && gy >= 86) c.setRGB(0.3 + n * 0.07, 0.48 + n * 0.09, 0.26);
    } else if (lake) {
      y = h(-0.72) + n * h(0.04);
      c.setRGB(0.22 + n * 0.04, 0.4 + n * 0.06, 0.38);
    } else if (edge > -7) {
      y = h(-0.12) + n * h(0.08);
      c.setRGB(0.78 + n * 0.06, 0.72 + n * 0.05, 0.52);
    } else if (edge > -18) {
      y = h(-0.38) + n * h(0.12);
      const park = (Math.abs(gy - play.y0) < 28 || gx > play.x1 - 4) && n > 0.32;
      if (park) {
        y = n * h(0.35);
        c.setRGB(0.24 + n * 0.1, 0.5 + n * 0.12, 0.24);
      } else {
        c.setRGB(0.3 + n * 0.06, 0.46 + n * 0.07, 0.3 + n * 0.04);
      }
    } else {
      const fade = THREE.MathUtils.clamp((-edge - 18) / HORIZON_PAD, 0, 1);
      y = h(-0.7) + n * h(0.08) * (1 - fade);
      if (fade > 0.78) {
        c.setRGB(0.28 + fade * 0.08, 0.4 + fade * 0.06, 0.38);
      } else {
        c.setRGB(0.34 + fade * 0.1, 0.44 + fade * 0.08, 0.3 + fade * 0.04);
      }
    }
    pos.setX(i, x);
    pos.setZ(i, z);
    pos.setY(i, y);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

function WorldSkirt() {
  const geometry = useMemo(() => SkirtGeometry(), []);
  return (
    <mesh geometry={geometry} receiveShadow frustumCulled={false}>
      <meshStandardMaterial vertexColors roughness={0.96} metalness={0.02} fog />
    </mesh>
  );
}

function OceanRim() {
  const hor = horizonBounds();
  const sc = sceneryBounds();
  const y = h(-0.7);
  const strips = [
    { x: (hor.x0 + hor.x1) / 2, z: (hor.y0 + sc.y0) / 2, w: hor.x1 - hor.x0, d: Math.max(4, sc.y0 - hor.y0) },
    { x: (hor.x0 + hor.x1) / 2, z: (hor.y1 + sc.y1) / 2, w: hor.x1 - hor.x0, d: Math.max(4, hor.y1 - sc.y1) },
    { x: (hor.x0 + sc.x0) / 2, z: (sc.y0 + sc.y1) / 2, w: Math.max(4, sc.x0 - hor.x0), d: sc.y1 - sc.y0 },
    { x: (hor.x1 + sc.x1) / 2, z: (sc.y0 + sc.y1) / 2, w: Math.max(4, hor.x1 - sc.x1), d: sc.y1 - sc.y0 },
  ];
  return (
    <group frustumCulled={false}>
      {strips.map((s, i) => (
        <mesh key={i} rotation-x={-Math.PI / 2} position={[wx(s.x), y, wz(s.z)]} receiveShadow frustumCulled={false}>
          <planeGeometry args={[s.w * TILE, s.d * TILE]} />
          <meshStandardMaterial color="#3a5c5e" roughness={0.22} metalness={0.28} fog />
        </mesh>
      ))}
    </group>
  );
}

const PARKS: { x: number; y: number; w: number; d: number }[] = (() => {
  const p = playableBounds();
  return [
    { x: p.x1 + 12, y: p.y0 + 40, w: 22, d: 48 },
    { x: p.x1 + 10, y: (p.y0 + p.y1) * 0.42, w: 26, d: 56 },
    { x: p.x1 + 14, y: p.y1 - 80, w: 20, d: 40 },
    { x: p.x0 + 80, y: p.y0 - 16, w: 70, d: 18 },
    { x: p.x0 + 420, y: p.y0 - 18, w: 90, d: 20 },
    { x: p.x1 - 120, y: p.y0 - 14, w: 54, d: 16 },
    { x: p.x0 + 200, y: p.y1 + 14, w: 80, d: 16 },
    { x: p.x1 - 200, y: p.y1 + 12, w: 64, d: 18 },
    { x: p.x0 - 16, y: p.y1 - 200, w: 18, d: 50 },
  ];
})();

const LAKES: { x: number; y: number; w: number; d: number }[] = (() => {
  const p = playableBounds();
  return [
    { x: p.x1 + 18, y: p.y0 + 120, w: 28, d: 16 },
    { x: p.x1 + 20, y: (p.y0 + p.y1) * 0.55, w: 22, d: 18 },
    { x: p.x0 + 240, y: p.y0 - 20, w: 32, d: 14 },
    { x: p.x0 + 900, y: p.y0 - 22, w: 24, d: 12 },
    { x: p.x0 + 500, y: p.y1 + 20, w: 36, d: 14 },
    { x: p.x0 - 20, y: 32, w: 16, d: 22 },
  ];
})();

function RimParks() {
  return (
    <group>
      {PARKS.map((p, i) => (
        <mesh
          key={i}
          rotation-x={-Math.PI / 2}
          position={[wx(p.x), h(0.08), wz(p.y)]}
          receiveShadow
        >
          <planeGeometry args={[p.w * TILE, p.d * TILE]} />
          <meshStandardMaterial color={i % 2 ? "#3d7a3c" : "#2f6a38"} roughness={0.94} />
        </mesh>
      ))}
    </group>
  );
}

function RimLakes() {
  return (
    <group>
      {LAKES.map((p, i) => (
        <mesh key={i} rotation-x={-Math.PI / 2} position={[wx(p.x), h(-0.18), wz(p.y)]} receiveShadow>
          <circleGeometry args={[Math.max(p.w, p.d) * TILE * 0.42, 28]} />
          <meshStandardMaterial color="#3a6a68" roughness={0.14} metalness={0.32} transparent opacity={0.82} />
        </mesh>
      ))}
    </group>
  );
}

/** Soft shoreline strips — no box berms (those read as a rectangular map edge). */
function ShoreTransition() {
  const p = playableBounds();
  const cx = wx((p.x0 + p.x1) / 2);
  const cz = wz((p.y0 + p.y1) / 2);
  const w = (p.x1 - p.x0) * TILE;
  const d = (p.y1 - p.y0) * TILE;
  const sand = h(3.8);
  const strips = [
    { x: cx, z: wz(p.y0) - sand * 0.45, sw: w + sand * 2, sd: sand, color: "#cbb68a" },
    { x: cx, z: wz(p.y1) + sand * 0.45, sw: w + sand * 2, sd: sand, color: "#bfc8a8" },
    { x: wx(p.x0) - sand * 0.45, z: cz, sw: sand, sd: d + sand, color: "#5a6e58" },
    { x: wx(p.x1) + sand * 0.55, z: cz, sw: sand * 1.1, sd: d + sand, color: "#4a7a44" },
  ];
  return (
    <group frustumCulled={false}>
      {strips.map((s, i) => (
        <mesh key={i} rotation-x={-Math.PI / 2} position={[s.x, h(0.02), s.z]} receiveShadow frustumCulled={false}>
          <planeGeometry args={[s.sw, s.sd]} />
          <meshStandardMaterial color={s.color} roughness={0.92} transparent opacity={0.72} fog />
        </mesh>
      ))}
    </group>
  );
}

function DistantSilhouettes() {
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const blocks = useRef<THREE.InstancedMesh>(null);
  const hills = useRef<THREE.InstancedMesh>(null);
  const play = useMemo(() => playableBounds(), []);
  const { buildings, hillSpots } = useMemo(() => {
    const buildings: { gx: number; gy: number; h: number; w: number; d: number }[] = [];
    const hillSpots: { gx: number; gy: number; h: number; w: number; d: number }[] = [];
    const cx = (play.x0 + play.x1) / 2;
    const cy = (play.y0 + play.y1) / 2;
    const rx = (play.x1 - play.x0) / 2;
    const ry = (play.y1 - play.y0) / 2;
    const rings = [
      { r: SCENERY_MARGIN + 8, n: 48 },
      { r: SCENERY_MARGIN + 28, n: 56 },
      { r: SCENERY_MARGIN + HORIZON_PAD * 0.35, n: 40 },
    ];
    for (const ring of rings) {
      for (let i = 0; i < ring.n; i++) {
        const a = (i / ring.n) * Math.PI * 2 + hash2(i, ring.r) * 0.35;
        const gx = cx + Math.cos(a) * (rx + ring.r);
        const gy = cy + Math.sin(a) * (ry + ring.r);
        const hill = hash2(gx, gy) > 0.62;
        const spot = {
          gx,
          gy,
          h: hill ? h(1.2 + hash2(gy, gx) * 2.8) : h(2.4 + hash2(gx * 0.2, gy) * 5.5),
          w: hill ? h(2.8 + hash2(gx, gy) * 4) : h(0.9 + hash2(gy, gx) * 1.4),
          d: hill ? h(2.4 + hash2(gy, gx) * 3.5) : h(0.8 + hash2(gx, gy) * 1.2),
        };
        if (hill) hillSpots.push(spot);
        else buildings.push(spot);
      }
    }
    return { buildings, hillSpots };
  }, [play]);

  useLayoutEffect(() => {
    const b = blocks.current;
    const hi = hills.current;
    if (!b || !hi) return;
    buildings.forEach((s, i) => {
      dummy.position.set(wx(s.gx), s.h * 0.5, wz(s.gy));
      dummy.scale.set(s.w, s.h, s.d);
      dummy.updateMatrix();
      b.setMatrixAt(i, dummy.matrix);
    });
    hillSpots.forEach((s, i) => {
      dummy.position.set(wx(s.gx), s.h * 0.5, wz(s.gy));
      dummy.scale.set(s.w, s.h, s.d);
      dummy.updateMatrix();
      hi.setMatrixAt(i, dummy.matrix);
    });
    b.instanceMatrix.needsUpdate = true;
    hi.instanceMatrix.needsUpdate = true;
  }, [buildings, dummy, hillSpots]);

  if (!buildings.length && !hillSpots.length) return null;

  return (
    <group frustumCulled={false}>
      {buildings.length ? (
        <instancedMesh ref={blocks} args={[undefined, undefined, buildings.length]} frustumCulled={false} castShadow>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#7a8488" roughness={0.94} fog transparent opacity={0.82} />
        </instancedMesh>
      ) : null}
      {hillSpots.length ? (
        <instancedMesh ref={hills} args={[undefined, undefined, hillSpots.length]} frustumCulled={false} castShadow>
          <coneGeometry args={[1, 1, 5]} />
          <meshStandardMaterial color="#4a6848" roughness={0.96} fog transparent opacity={0.78} />
        </instancedMesh>
      ) : null}
    </group>
  );
}

function ParkTrees() {
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const trunks = useRef<THREE.InstancedMesh>(null);
  const canopies = useRef<THREE.InstancedMesh>(null);
  const spots = useMemo(() => {
    const out: { x: number; y: number; s: number }[] = [];
    for (const p of PARKS) {
      for (let i = 0; i < 22; i++) {
        const hx = hash2(p.x + i * 1.7, p.y);
        const hy = hash2(p.y + i * 2.1, p.x);
        out.push({
          x: p.x + (hx - 0.5) * p.w * 0.72,
          y: p.y + (hy - 0.5) * p.d * 0.72,
          s: 0.7 + hx * 0.55,
        });
      }
    }
    return out;
  }, []);

  useLayoutEffect(() => {
    const t = trunks.current;
    const c = canopies.current;
    if (!t || !c) return;
    spots.forEach((s, i) => {
      dummy.position.set(wx(s.x), h(0.4) * s.s, wz(s.y));
      dummy.scale.set(s.s, s.s, s.s);
      dummy.updateMatrix();
      t.setMatrixAt(i, dummy.matrix);
      dummy.position.set(wx(s.x), h(1.05) * s.s, wz(s.y));
      dummy.updateMatrix();
      c.setMatrixAt(i, dummy.matrix);
    });
    t.instanceMatrix.needsUpdate = true;
    c.instanceMatrix.needsUpdate = true;
  }, [dummy, spots]);

  return (
    <group>
      <instancedMesh ref={trunks} args={[undefined, undefined, spots.length]} castShadow>
        <cylinderGeometry args={[h(0.05), h(0.08), h(0.85), 5]} />
        <meshStandardMaterial color="#5a3c28" />
      </instancedMesh>
      <instancedMesh ref={canopies} args={[undefined, undefined, spots.length]} castShadow>
        <sphereGeometry args={[h(0.5), 6, 5]} />
        <meshStandardMaterial color="#2c6840" roughness={0.88} />
      </instancedMesh>
    </group>
  );
}

function HorizonHaze() {
  const sc = sceneryBounds();
  const span = worldRectCenterSpan({
    x0: sc.x0 - HORIZON_PAD * 0.25,
    y0: sc.y0 - HORIZON_PAD * 0.25,
    x1: sc.x1 + HORIZON_PAD * 0.25,
    y1: sc.y1 + HORIZON_PAD * 0.25,
  });
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        uniforms: {
          col: { value: new THREE.Color("#ddd6c6") },
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          varying vec2 vUv;
          uniform vec3 col;
          void main() {
            vec2 p = vUv - 0.5;
            float d = length(p) * 2.0;
            float ring = smoothstep(0.86, 0.93, d) * (1.0 - smoothstep(0.98, 1.03, d));
            float a = ring * 0.28;
            gl_FragColor = vec4(col, a);
          }
        `,
      }),
    [],
  );
  return (
    <mesh rotation-x={-Math.PI / 2} position={[span.cx, h(2.4), span.cz]} material={mat} renderOrder={8}>
      <planeGeometry args={[span.w, span.d]} />
    </mesh>
  );
}

function HorizonClouds() {
  const tex = useMemo(() => cloudMap(), []);
  const play = useMemo(() => playableBounds(), []);
  const cards = useMemo(() => {
    const out: { x: number; y: number; z: number; w: number; hgt: number; lookX: number; lookZ: number }[] = [];
    const rings = [
      { r: SCENERY_MARGIN + 18, n: 18, y: h(5.5) },
      { r: SCENERY_MARGIN + 55, n: 22, y: h(8.2) },
      { r: SCENERY_MARGIN + HORIZON_PAD * 0.55, n: 16, y: h(11.5) },
    ];
    const cx = (play.x0 + play.x1) / 2;
    const cy = (play.y0 + play.y1) / 2;
    const rx = (play.x1 - play.x0) / 2;
    const ry = (play.y1 - play.y0) / 2;
    const lookX = wx(cx);
    const lookZ = wz(cy);
    for (const ring of rings) {
      for (let i = 0; i < ring.n; i++) {
        const a = (i / ring.n) * Math.PI * 2 + hash2(i, ring.r) * 0.2;
        const gx = cx + Math.cos(a) * (rx + ring.r);
        const gy = cy + Math.sin(a) * (ry + ring.r);
        out.push({
          x: wx(gx),
          y: ring.y + hash2(gx, gy) * h(3.2),
          z: wz(gy),
          w: h(18) + hash2(gy, gx) * h(22),
          hgt: h(6) + hash2(gx * 0.3, gy) * h(7),
          lookX,
          lookZ,
        });
      }
    }
    return out;
  }, [play]);

  return (
    <group>
      {cards.map((c, i) => (
        <mesh
          key={i}
          position={[c.x, c.y, c.z]}
          renderOrder={6}
          onUpdate={(m) => m.lookAt(c.lookX, c.y, c.lookZ)}
        >
          <planeGeometry args={[c.w, c.hgt]} />
          <meshBasicMaterial
            map={tex}
            transparent
            opacity={0.55}
            depthWrite={false}
            fog
            color="#f4f0e8"
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

export function DistantFills() {
  return (
    <group frustumCulled={false}>
      <OceanRim />
      <WorldSkirt />
      <RimParks />
      <RimLakes />
      <ParkTrees />
      <ShoreTransition />
      <DistantSilhouettes />
      <HorizonHaze />
      <HorizonClouds />
    </group>
  );
}
