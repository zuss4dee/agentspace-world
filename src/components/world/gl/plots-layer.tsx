"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import { Html, Line } from "@react-three/drei";
import * as THREE from "three";
import {
  CITY_PLOTS,
  LAND_COUNT,
  LAND_USES,
  basePlotId,
  buildingFootprint,
  claimedCoversPlot,
  coverageOfClaims,
  expandedRect,
  getPlot,
  isLotMultiModifier,
  landBounds,
  latticePlot,
  maxExpandFor,
  measureTiles,
  placeAtCell,
  plotRect,
  remainingRects,
  workingLand,
  type Plot,
} from "@/lib/plots";
import { TILE, h, wx, wz } from "@/lib/coords";
import { FacadeOffice } from "@/components/world/gl/buildings";
import { LOT_DEPTH, LOT_FILL } from "@/lib/architecture";
import { useWorld } from "@/components/world/world-store";

const C = {
  sale: new THREE.Color("#4a6e3c"),
  saleEdge: new THREE.Color("#111111"),
  owned: new THREE.Color("#9a9a9a"),
  taken: new THREE.Color("#c8c8c8"),
};

function officePalette(useId: string) {
  switch (useId) {
    case "hq":
    case "office":
    case "lab":
      return { wall: "#d4dbe4", roof: "#3f4654", accent: "#c45c3a" };
    case "warehouse":
      return { wall: "#c4ae7a", roof: "#57534e", accent: "#d4a017" };
    case "studio":
      return { wall: "#d8a8bc", roof: "#6b3048", accent: "#fb7185" };
    case "shop":
      return { wall: "#e8d2b8", roof: "#6b3a28", accent: "#f59e0b" };
    case "house":
      return { wall: "#ead9c4", roof: "#7a4a32", accent: "#b45309" };
    default:
      return { wall: "#d8d0c4", roof: "#4a453e", accent: "#8a8178" };
  }
}

export function PlotsLayer() {
  const pads = useRef<THREE.InstancedMesh>(null);
  const edges = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);
  const { selectedPlotId, selectedPlotIds, selectPlot, claimedPlotIds } = useWorld();
  const list = CITY_PLOTS;
  const claimed = useMemo(() => new Set(claimedPlotIds), [claimedPlotIds]);

  useLayoutEffect(() => {
    const pad = pads.current;
    const edge = edges.current;
    if (!pad || !edge) return;
    list.forEach((p, i) => {
      const cx = wx(p.x + p.w / 2);
      const cz = wz(p.y + p.h / 2);
      const taken = claimedCoversPlot(p.id, claimed) || remainingRects(p, claimed).length === 0;
      const forSale = p.kind === "sale" && !taken;
      const selected = selectedPlotIds.includes(p.id) || selectedPlotId === p.id || selectedPlotIds.some((id) => basePlotId(id) === p.id);
      const hidePad = selected && forSale;

      dummy.position.set(cx, forSale ? h(0.07) : h(0.035), cz);
      dummy.scale.set(hidePad ? 0 : p.w * TILE, hidePad ? 0 : 1, hidePad ? 0 : p.h * TILE);
      dummy.updateMatrix();
      pad.setMatrixAt(i, dummy.matrix);

      dummy.position.set(cx, forSale ? h(0.04) : h(0.02), cz);
      dummy.scale.set(hidePad ? 0 : p.w * TILE, hidePad ? 0 : 1, hidePad ? 0 : p.h * TILE);
      dummy.updateMatrix();
      edge.setMatrixAt(i, dummy.matrix);

      if (forSale) color.copy(C.sale);
      else if (taken) color.copy(C.taken);
      else color.copy(C.owned);
      pad.setColorAt(i, color);
      color.copy(C.saleEdge);
      edge.setColorAt(i, color);
    });
    pad.instanceMatrix.needsUpdate = true;
    edge.instanceMatrix.needsUpdate = true;
    if (pad.instanceColor) pad.instanceColor.needsUpdate = true;
    if (edge.instanceColor) edge.instanceColor.needsUpdate = true;
  }, [dummy, color, list, selectedPlotId, selectedPlotIds, claimed]);

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 4) return;
    e.stopPropagation();
    const id = e.instanceId;
    if (id == null) return;
    const p = list[id];
    if (p) selectPlot(p.id, { additive: isLotMultiModifier(e) });
  };

  return (
    <group>
      <instancedMesh ref={edges} args={[undefined, undefined, list.length]} receiveShadow>
        <boxGeometry args={[1, h(0.05), 1]} />
        <meshStandardMaterial roughness={0.9} metalness={0} />
      </instancedMesh>
      <instancedMesh ref={pads} args={[undefined, undefined, list.length]} onClick={onClick} receiveShadow>
        <boxGeometry args={[1, h(0.08), 1]} />
        <meshStandardMaterial roughness={0.9} metalness={0} />
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
      dummy.position.set(wx(p.x + p.w / 2), h(0.05), wz(p.y + p.h / 2));
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
    selectPlot(`l-${id}`, { additive: isLotMultiModifier(e) });
  };

  const cx = wx((land.x0 + land.x1) / 2);
  const cz = wz((land.y0 + land.y1) / 2);
  const w = (land.x1 - land.x0) * TILE;
  const d = (land.y1 - land.y0) * TILE;

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[cx, h(0.02), cz]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color="#111111" roughness={0.95} />
      </mesh>
      <instancedMesh ref={mesh} args={[undefined, undefined, LAND_COUNT]} onClick={onClick} receiveShadow>
        <boxGeometry args={[1, h(0.07), 1]} />
        <meshStandardMaterial color="#3f7a44" roughness={0.78} />
      </instancedMesh>
    </group>
  );
}

export function SaleStakes() {
  const poles = useRef<THREE.InstancedMesh>(null);
  const flags = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const { claimedPlotIds, selectedPlotId, selectedPlotIds } = useWorld();
  const claimed = useMemo(() => new Set(claimedPlotIds), [claimedPlotIds]);
  const sales = useMemo(() => CITY_PLOTS.filter((p) => p.kind === "sale"), []);

  useLayoutEffect(() => {
    const pole = poles.current;
    const flag = flags.current;
    if (!pole || !flag) return;
    sales.forEach((p, i) => {
      const hide =
        claimed.has(p.id) ||
        claimedCoversPlot(p.id, claimed) ||
        selectedPlotId === p.id ||
        selectedPlotIds.includes(p.id);
      const x = wx(p.x + p.w / 2) + p.w * TILE * 0.32;
      const z = wz(p.y + p.h / 2) + p.h * TILE * 0.32;
      dummy.position.set(x, h(0.55), z);
      dummy.scale.set(hide ? 0 : 1, hide ? 0 : 1, hide ? 0 : 1);
      dummy.updateMatrix();
      pole.setMatrixAt(i, dummy.matrix);
      dummy.position.set(x + h(0.16), h(1.02), z);
      dummy.updateMatrix();
      flag.setMatrixAt(i, dummy.matrix);
    });
    pole.instanceMatrix.needsUpdate = true;
    flag.instanceMatrix.needsUpdate = true;
  }, [dummy, claimed, sales, selectedPlotId, selectedPlotIds]);

  if (sales.length === 0) return null;

  return (
    <group>
      <instancedMesh ref={poles} args={[undefined, undefined, sales.length]} frustumCulled={false}>
        <cylinderGeometry args={[h(0.028), h(0.034), h(1.1), 5]} />
        <meshStandardMaterial color="#111111" roughness={0.6} />
      </instancedMesh>
      <instancedMesh ref={flags} args={[undefined, undefined, sales.length]} frustumCulled={false}>
        <boxGeometry args={[h(0.38), h(0.2), h(0.04)]} />
        <meshStandardMaterial color="#ffffff" roughness={0.45} />
      </instancedMesh>
    </group>
  );
}

export function BuildingGhost() {
  const {
    selectedPlotId,
    selectedPlotIds,
    previewUseId,
    claimedPlotIds,
    claimedExtras,
    plotExpand,
    buildingPlace,
    landSlice,
    setBuildingPlace,
    topView,
  } = useWorld();
  const claimed = useMemo(() => new Set(claimedPlotIds), [claimedPlotIds]);
  const plot = getPlot(selectedPlotId);
  if (!plot || plot.kind !== "sale" || claimedCoversPlot(plot.id, claimed)) return null;
  const landPlot = workingLand(plot, landSlice ?? plotRect(plot));
  const use = LAND_USES.find((u) => u.id === previewUseId) ?? LAND_USES[0]!;
  const extra = Math.min(
    plotExpand,
    maxExpandFor(landPlot, coverageOfClaims(claimedPlotIds, claimedExtras, plot.id), use, buildingPlace),
  );
  const land = expandedRect(landPlot, extra);
  const fp = buildingFootprint(landPlot, use, extra, buildingPlace);
  const landM = measureTiles(land.w, land.h);
  const bldgM = fp ? measureTiles(fp.w, fp.h) : null;
  const fillsLot = Boolean(fp && fp.w >= land.w && fp.h >= land.h);
  const others = selectedPlotIds
    .filter((id) => id !== plot.id)
    .map((id) => getPlot(id))
    .filter((p): p is Plot => p != null && p.kind === "sale" && !claimedCoversPlot(p.id, claimed));
  const y0 = h(0.22);
  const x0 = wx(land.x);
  const z0 = wz(land.y);
  const x1 = wx(land.x + land.w);
  const z1 = wz(land.y + land.h);
  const fence: [number, number, number][] = [
    [x0, y0, z0],
    [x1, y0, z0],
    [x1, y0, z1],
    [x0, y0, z1],
    [x0, y0, z0],
  ];

  return (
    <group>
      {others.map((p) => {
        const xA = wx(p.x);
        const zA = wz(p.y);
        const xB = wx(p.x + p.w);
        const zB = wz(p.y + p.h);
        return (
          <Line
            key={p.id}
            points={[
              [xA, y0, zA],
              [xB, y0, zA],
              [xB, y0, zB],
              [xA, y0, zB],
              [xA, y0, zA],
            ]}
            color="#111111"
            lineWidth={2}
          />
        );
      })}
      <Line points={fence} color="#111111" lineWidth={2.4} />
      {!fillsLot
        ? Array.from({ length: land.w * land.h }, (_, i) => {
            const col = i % land.w;
            const row = Math.floor(i / land.w);
            const under =
              fp && col >= fp.ox && col < fp.ox + fp.w && row >= fp.oy && row < fp.oy + fp.h;
            if (under) return null;
            return (
              <mesh
                key={i}
                position={[wx(land.x + col + 0.5), h(0.09), wz(land.y + row + 0.5)]}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!fp) return;
                  setBuildingPlace(placeAtCell(land.w, land.h, fp.w, fp.h, col, row));
                }}
              >
                <boxGeometry args={[TILE, h(0.04), TILE]} />
                <meshStandardMaterial color="#3d7a42" roughness={0.85} />
              </mesh>
            );
          })
        : null}
      {fp ? (
        <>
          <SitLandmark fp={fp} />
          <group position={[wx(fp.x + fp.w / 2), 0, wz(fp.y + fp.h / 2)]}>
            <FacadeOffice
              w={fp.w * TILE * LOT_FILL}
              d={fp.h * TILE * LOT_DEPTH}
              height={h(fp.height)}
              opacity={0.9}
              useId={use.id}
              {...officePalette(use.id)}
            />
          </group>
          {!topView ? (
            <>
              <Html
                position={[wx(land.x + land.w / 2), h(0.55), wz(land.y + land.h) + h(0.15)]}
                center
                distanceFactor={18}
                occlude={false}
                pointerEvents="none"
              >
                <div className="ns-sale-pin ns-sale-pin-lot">Land you buy · {landM.text}</div>
              </Html>
              <Html
                position={[wx(fp.x + fp.w / 2), h(fp.height) + h(0.7), wz(fp.y + fp.h / 2)]}
                center
                distanceFactor={16}
                occlude={false}
                pointerEvents="none"
              >
                <div className="ns-sale-pin">
                  {use.name} · {bldgM?.text}
                </div>
              </Html>
            </>
          ) : null}
        </>
      ) : null}
    </group>
  );
}

function SitLandmark({
  fp,
}: {
  fp: { x: number; y: number; w: number; h: number };
}) {
  const cx = wx(fp.x + fp.w / 2);
  const cz = wz(fp.y + fp.h / 2);
  const padW = fp.w * TILE;
  const padD = fp.h * TILE;
  const corners: [number, number][] = [
    [wx(fp.x) + h(0.08), wz(fp.y) + h(0.08)],
    [wx(fp.x + fp.w) - h(0.08), wz(fp.y) + h(0.08)],
    [wx(fp.x) + h(0.08), wz(fp.y + fp.h) - h(0.08)],
    [wx(fp.x + fp.w) - h(0.08), wz(fp.y + fp.h) - h(0.08)],
  ];
  return (
    <group>
      <mesh position={[cx, h(0.11), cz]} receiveShadow>
        <boxGeometry args={[padW, h(0.1), padD]} />
        <meshStandardMaterial color="#c4b7a0" roughness={0.78} />
      </mesh>
      <Line
        points={[
          [wx(fp.x), h(0.2), wz(fp.y)],
          [wx(fp.x + fp.w), h(0.2), wz(fp.y)],
          [wx(fp.x + fp.w), h(0.2), wz(fp.y + fp.h)],
          [wx(fp.x), h(0.2), wz(fp.y + fp.h)],
          [wx(fp.x), h(0.2), wz(fp.y)],
        ]}
        color="#6b5344"
        lineWidth={2.2}
      />
      {corners.map(([x, z], i) => (
        <mesh key={i} position={[x, h(0.28), z]}>
          <boxGeometry args={[h(0.14), h(0.28), h(0.14)]} />
          <meshStandardMaterial color="#2a2118" roughness={0.5} />
        </mesh>
      ))}
      <mesh position={[cx, h(0.2), cz]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[h(0.16), h(0.28), 20]} />
        <meshStandardMaterial color="#f4eee4" roughness={0.4} />
      </mesh>
      <mesh position={[cx, h(0.22), cz]}>
        <cylinderGeometry args={[h(0.08), h(0.1), h(0.12), 8]} />
        <meshStandardMaterial color="#111111" roughness={0.35} />
      </mesh>
    </group>
  );
}

export function ClaimedMarks() {
  const { claimedPlotIds, claimedExtras, claimedPlaces, claimedUses } = useWorld();
  return (
    <group>
      {claimedPlotIds.map((id) => {
        const p = getPlot(id);
        if (!p) return null;
        const extra = claimedExtras[id] ?? 0;
        const r = expandedRect(p, extra);
        const use = LAND_USES.find((u) => u.id === claimedUses[id]) ?? LAND_USES[0]!;
        const fp = buildingFootprint(p, use, extra, claimedPlaces[id]);
        const x0 = wx(r.x);
        const z0 = wz(r.y);
        const x1 = wx(r.x + r.w);
        const z1 = wz(r.y + r.h);
        return (
          <group key={id}>
            <Line
              points={[
                [x0, h(0.2), z0],
                [x1, h(0.2), z0],
                [x1, h(0.2), z1],
                [x0, h(0.2), z1],
                [x0, h(0.2), z0],
              ]}
              color="#111111"
              lineWidth={1.6}
            />
            {fp ? (
              <>
                <SitLandmark fp={fp} />
                <group position={[wx(fp.x + fp.w / 2), 0, wz(fp.y + fp.h / 2)]}>
                  <FacadeOffice
                    w={fp.w * TILE * LOT_FILL}
                    d={fp.h * TILE * LOT_DEPTH}
                    height={h(fp.height)}
                    useId={use.id}
                    {...officePalette(use.id)}
                  />
                </group>
              </>
            ) : null}
          </group>
        );
      })}
    </group>
  );
}
