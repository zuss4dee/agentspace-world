"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { PLOTS, plotArea } from "@/lib/plots";
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

function usePlotColors() {
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);
  return { dummy, color };
}

export function PlotsLayer() {
  const pads = useRef<THREE.InstancedMesh>(null);
  const edges = useRef<THREE.InstancedMesh>(null);
  const { dummy, color } = usePlotColors();
  const { selectedPlotId, selectPlot, claimedPlotIds } = useWorld();
  const list = PLOTS;
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

const SALE_PLOTS = PLOTS.filter((p) => p.kind === "sale");

export function SaleStakes() {
  const poles = useRef<THREE.InstancedMesh>(null);
  const flags = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const { claimedPlotIds, selectedPlotId, topView } = useWorld();
  const claimed = useMemo(() => new Set(claimedPlotIds), [claimedPlotIds]);
  const picked = SALE_PLOTS.find((p) => p.id === selectedPlotId && !claimed.has(p.id));

  useLayoutEffect(() => {
    const pole = poles.current;
    const flag = flags.current;
    if (!pole || !flag) return;
    SALE_PLOTS.forEach((p, i) => {
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
  }, [dummy, claimed]);

  if (SALE_PLOTS.length === 0) return null;

  return (
    <group>
      <instancedMesh ref={poles} args={[undefined, undefined, SALE_PLOTS.length]} frustumCulled={false}>
        <cylinderGeometry args={[0.028, 0.034, 1.1, 5]} />
        <meshStandardMaterial color="#111111" roughness={0.6} />
      </instancedMesh>
      <instancedMesh ref={flags} args={[undefined, undefined, SALE_PLOTS.length]} frustumCulled={false}>
        <boxGeometry args={[0.38, 0.2, 0.04]} />
        <meshStandardMaterial color="#ffffff" roughness={0.45} />
      </instancedMesh>
      {picked && !topView ? (
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
