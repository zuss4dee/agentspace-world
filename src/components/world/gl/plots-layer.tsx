"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import {
  CITY_PLOTS,
  LAND_COUNT,
  LAND_USES,
  buildingFootprint,
  coverageOfClaims,
  expandedRect,
  getPlot,
  landBounds,
  latticePlot,
  maxExpandFor,
  plotArea,
} from "@/lib/plots";
import { TILE, wx, wz } from "@/lib/coords";
import { useWorld } from "@/components/world/world-store";
import { formatUsd } from "@/lib/companies";

const C = {
  sale: new THREE.Color("#f4f4f0"),
  saleEdge: new THREE.Color("#111111"),
  owned: new THREE.Color("#9a9a9a"),
  taken: new THREE.Color("#c8c8c8"),
  selected: new THREE.Color("#111111"),
};

export function PlotsLayer() {
  const pads = useRef<THREE.InstancedMesh>(null);
  const edges = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);
  const { selectedPlotId, selectPlot, claimedPlotIds } = useWorld();
  const list = CITY_PLOTS;
  const claimed = useMemo(() => new Set(claimedPlotIds), [claimedPlotIds]);

  useLayoutEffect(() => {
    const pad = pads.current;
    const edge = edges.current;
    if (!pad || !edge) return;
    list.forEach((p, i) => {
      const cx = wx(p.x + p.w / 2);
      const cz = wz(p.y + p.h / 2);
      const taken = claimed.has(p.id);
      const forSale = p.kind === "sale" && !taken;
      const selected = selectedPlotId === p.id;

      dummy.position.set(cx, forSale ? 0.07 : 0.035, cz);
      dummy.scale.set(p.w * TILE * 0.9, 1, p.h * TILE * 0.9);
      dummy.updateMatrix();
      pad.setMatrixAt(i, dummy.matrix);

      dummy.position.set(cx, forSale ? 0.04 : 0.02, cz);
      dummy.scale.set(p.w * TILE * 0.98, 1, p.h * TILE * 0.98);
      dummy.updateMatrix();
      edge.setMatrixAt(i, dummy.matrix);

      if (selected && forSale) color.copy(C.selected);
      else if (forSale) color.copy(C.sale);
      else if (taken) color.copy(C.taken);
      else color.copy(C.owned);
      pad.setColorAt(i, color);
      color.copy(selected && forSale ? C.sale : C.saleEdge);
      edge.setColorAt(i, color);
    });
    pad.instanceMatrix.needsUpdate = true;
    edge.instanceMatrix.needsUpdate = true;
    if (pad.instanceColor) pad.instanceColor.needsUpdate = true;
    if (edge.instanceColor) edge.instanceColor.needsUpdate = true;
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
    <group>
      <instancedMesh ref={edges} args={[undefined, undefined, list.length]} receiveShadow>
        <boxGeometry args={[1, 0.05, 1]} />
        <meshStandardMaterial roughness={0.9} metalness={0} />
      </instancedMesh>
      <instancedMesh ref={pads} args={[undefined, undefined, list.length]} onClick={onClick} receiveShadow>
        <boxGeometry args={[1, 0.08, 1]} />
        <meshStandardMaterial roughness={0.72} metalness={0.02} />
      </instancedMesh>
    </group>
  );
}

export function LatticeField() {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const { selectPlot } = useWorld();
  const land = landBounds();

  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    for (let i = 0; i < LAND_COUNT; i++) {
      const p = latticePlot(i);
      dummy.position.set(wx(p.x + p.w / 2), 0.05, wz(p.y + p.h / 2));
      dummy.scale.set(p.w * TILE * 0.86, 1, p.h * TILE * 0.86);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [dummy]);

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 4) return;
    e.stopPropagation();
    const id = e.instanceId;
    if (id == null) return;
    selectPlot(`l-${id}`);
  };

  const cx = wx((land.x0 + land.x1) / 2);
  const cz = wz((land.y0 + land.y1) / 2);
  const w = (land.x1 - land.x0) * TILE;
  const d = (land.y1 - land.y0) * TILE;

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[cx, 0.02, cz]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color="#111111" roughness={0.95} />
      </mesh>
      <instancedMesh ref={mesh} args={[undefined, undefined, LAND_COUNT]} onClick={onClick} receiveShadow>
        <boxGeometry args={[1, 0.07, 1]} />
        <meshStandardMaterial color="#f4f4f0" roughness={0.78} />
      </instancedMesh>
    </group>
  );
}

export function SaleStakes() {
  const poles = useRef<THREE.InstancedMesh>(null);
  const flags = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const { claimedPlotIds, selectedPlotId, topView } = useWorld();
  const claimed = useMemo(() => new Set(claimedPlotIds), [claimedPlotIds]);
  const sales = useMemo(() => CITY_PLOTS.filter((p) => p.kind === "sale"), []);
  const picked = getPlot(selectedPlotId);
  const pickedOpen = picked && picked.kind === "sale" && !claimed.has(picked.id);

  useLayoutEffect(() => {
    const pole = poles.current;
    const flag = flags.current;
    if (!pole || !flag) return;
    sales.forEach((p, i) => {
      const hide = claimed.has(p.id);
      const x = wx(p.x + p.w / 2) + p.w * TILE * 0.32;
      const z = wz(p.y + p.h / 2) + p.h * TILE * 0.32;
      dummy.position.set(x, 0.55, z);
      dummy.scale.set(hide ? 0 : 1, hide ? 0 : 1, hide ? 0 : 1);
      dummy.updateMatrix();
      pole.setMatrixAt(i, dummy.matrix);
      dummy.position.set(x + 0.16, 1.02, z);
      dummy.updateMatrix();
      flag.setMatrixAt(i, dummy.matrix);
    });
    pole.instanceMatrix.needsUpdate = true;
    flag.instanceMatrix.needsUpdate = true;
  }, [dummy, claimed, sales]);

  if (sales.length === 0) return null;

  return (
    <group>
      <instancedMesh ref={poles} args={[undefined, undefined, sales.length]} frustumCulled={false}>
        <cylinderGeometry args={[0.028, 0.034, 1.1, 5]} />
        <meshStandardMaterial color="#111111" roughness={0.6} />
      </instancedMesh>
      <instancedMesh ref={flags} args={[undefined, undefined, sales.length]} frustumCulled={false}>
        <boxGeometry args={[0.38, 0.2, 0.04]} />
        <meshStandardMaterial color="#ffffff" roughness={0.45} />
      </instancedMesh>
      {pickedOpen && !topView ? (
        <Html
          position={[wx(picked.x + picked.w / 2), 1.55, wz(picked.y + picked.h / 2)]}
          center
          distanceFactor={14}
          occlude={false}
          pointerEvents="none"
        >
          <div className="ns-sale-pin">
            For sale · {formatUsd(picked.price)} · {plotArea(picked).footprint} tiles
          </div>
        </Html>
      ) : null}
    </group>
  );
}

export function BuildingGhost() {
  const { selectedPlotId, previewUseId, claimedPlotIds, claimedExtras, plotExpand } = useWorld();
  const claimed = useMemo(() => new Set(claimedPlotIds), [claimedPlotIds]);
  const plot = getPlot(selectedPlotId);
  if (!plot || plot.kind !== "sale" || claimed.has(plot.id)) return null;
  const extra = Math.min(
    plotExpand,
    maxExpandFor(plot, coverageOfClaims(claimedPlotIds, claimedExtras, plot.id)),
  );
  const use = LAND_USES.find((u) => u.id === previewUseId) ?? LAND_USES[0]!;
  const land = expandedRect(plot, extra);
  const fp = buildingFootprint(plot, use, extra);
  const padW = land.w * TILE * 0.96;
  const padD = land.h * TILE * 0.96;

  return (
    <group>
      <mesh position={[wx(land.x + land.w / 2), 0.12, wz(land.y + land.h / 2)]}>
        <boxGeometry args={[padW, 0.08, padD]} />
        <meshStandardMaterial color="#111111" roughness={0.5} />
      </mesh>
      {fp ? (
        <>
          <mesh position={[wx(fp.x + fp.w / 2), fp.height / 2 + 0.16, wz(fp.y + fp.h / 2)]}>
            <boxGeometry args={[fp.w * TILE * 0.82, fp.height, fp.h * TILE * 0.82]} />
            <meshStandardMaterial color="#ffffff" transparent opacity={0.82} roughness={0.35} />
          </mesh>
          <mesh position={[wx(fp.x + fp.w / 2), fp.height / 2 + 0.16, wz(fp.y + fp.h / 2)]}>
            <boxGeometry args={[fp.w * TILE * 0.82 + 0.04, fp.height + 0.04, fp.h * TILE * 0.82 + 0.04]} />
            <meshStandardMaterial color="#111111" wireframe />
          </mesh>
          <Html
            position={[wx(fp.x + fp.w / 2), fp.height + 0.55, wz(fp.y + fp.h / 2)]}
            center
            distanceFactor={16}
            occlude={false}
            pointerEvents="none"
          >
            <div className="ns-sale-pin">
              {use.name} · {fp.w}×{fp.h} on {land.w}×{land.h} land
            </div>
          </Html>
        </>
      ) : null}
    </group>
  );
}

export function ClaimedMarks() {
  const { claimedPlotIds, claimedExtras } = useWorld();
  return (
    <group>
      {claimedPlotIds.map((id) => {
        const p = getPlot(id);
        if (!p) return null;
        const r = expandedRect(p, claimedExtras[id] ?? 0);
        return (
          <mesh key={id} position={[wx(r.x + r.w / 2), 0.11, wz(r.y + r.h / 2)]}>
            <boxGeometry args={[r.w * TILE * 0.9, 0.12, r.h * TILE * 0.9]} />
            <meshStandardMaterial color="#bdbdbd" roughness={0.85} />
          </mesh>
        );
      })}
    </group>
  );
}
