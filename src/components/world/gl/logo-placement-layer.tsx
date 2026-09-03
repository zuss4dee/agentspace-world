"use client";

import { useMemo, useRef, useLayoutEffect } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import type * as THREE from "three";
import { Line } from "@react-three/drei";
import { h, TILE, wx, wz } from "@/lib/coords";
import {
  brandMarkerFromClaim,
  buildingShellForLot,
  logoPoseFromWorldPoint,
  lotCenter,
  placementFromLogoPose,
  yardCellsForLot,
  type BrandMarkerConfig,
} from "@/lib/brand-marker";
import { adLogoUrl } from "@/lib/business-ad";
import { AnimatedBrandMarker } from "@/components/world/gl/animated-brand-marker";
import { useWorld } from "@/components/world/world-store";
import { expandedRect, getPlot } from "@/lib/plots";

function PreviewMarker({ config }: { config: BrandMarkerConfig }) {
  const root = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    if (root.current) root.current.raycast = () => undefined;
  }, []);
  return (
    <group ref={root}>
      <AnimatedBrandMarker config={config} onSelect={() => {}} interactive={false} />
    </group>
  );
}

export function LogoPlacementLayer() {
  const {
    logoEditPlotId,
    logoEditDraft,
    setLogoEditDraft,
    buildingSpecs,
    claimedExtras,
  } = useWorld();

  const scene = useMemo(() => {
    if (!logoEditPlotId || !logoEditDraft) return null;
    const plot = getPlot(logoEditPlotId);
    if (!plot) return null;
    const extra = claimedExtras[logoEditPlotId] ?? 0;
    const expanded = expandedRect(plot, extra);
    const lot = { x: expanded.x, y: expanded.y, w: expanded.w, h: expanded.h };
    const profile = buildingSpecs[logoEditPlotId]?.profile;
    if (!profile || !adLogoUrl(profile)) return null;
    const assetId = profile.buildingAssetId;
    const shell = buildingShellForLot(lot, assetId);
    const cells = yardCellsForLot(lot, shell);
    const previewCfg: BrandMarkerConfig | null = brandMarkerFromClaim(logoEditPlotId, lot, {
      ...profile,
      logoPose: logoEditDraft,
    });
    return { lot, shell, cells, previewCfg, assetId, yaw: logoEditDraft.yaw };
  }, [buildingSpecs, claimedExtras, logoEditDraft, logoEditPlotId]);

  if (!scene || !logoEditDraft) return null;

  const { lot, shell, cells, previewCfg, yaw } = scene;
  const { cx: lotCx, cz: lotCz } = lotCenter(lot);
  const x0 = wx(lot.x);
  const z0 = wz(lot.y);
  const x1 = wx(lot.x + lot.w);
  const z1 = wz(lot.y + lot.h);
  const fence: [number, number, number][] = [
    [x0, h(0.18), z0],
    [x1, h(0.18), z0],
    [x1, h(0.18), z1],
    [x0, h(0.18), z1],
    [x0, h(0.18), z0],
  ];

  const onPick = (worldX: number, worldZ: number) => {
    const next = logoPoseFromWorldPoint(lot, shell, worldX, worldZ, yaw);
    setLogoEditDraft(next);
  };

  return (
    <group>
      <Line points={fence} color="#7ecf8a" lineWidth={0.55} transparent opacity={0.75} />
      {shell ? (
        <Line
          points={[
            [shell.cx - shell.w / 2, h(0.17), shell.cz - shell.d / 2],
            [shell.cx + shell.w / 2, h(0.17), shell.cz - shell.d / 2],
            [shell.cx + shell.w / 2, h(0.17), shell.cz + shell.d / 2],
            [shell.cx - shell.w / 2, h(0.17), shell.cz + shell.d / 2],
            [shell.cx - shell.w / 2, h(0.17), shell.cz - shell.d / 2],
          ]}
          color="#c4a574"
          lineWidth={0.35}
          transparent
          opacity={0.55}
        />
      ) : null}
      {cells.map(({ col, row }) => {
        const px = wx(lot.x + col + 0.5);
        const pz = wz(lot.y + row + 0.5);
        const placement = placementFromLogoPose(lot, logoEditDraft);
        const selected =
          Math.hypot(placement.x - px, placement.z - pz) < TILE * 0.55;
        return (
          <mesh
            key={`${col}-${row}`}
            position={[px, h(0.1), pz]}
            onClick={(e: ThreeEvent<MouseEvent>) => {
              e.stopPropagation();
              onPick(px, pz);
            }}
          >
            <boxGeometry args={[TILE * 0.92, h(0.05), TILE * 0.92]} />
            <meshStandardMaterial
              color={selected ? "#8fd49a" : "#b8c4b0"}
              roughness={0.88}
              transparent
              opacity={selected ? 0.82 : 0.48}
            />
          </mesh>
        );
      })}
      {previewCfg ? (
        <PreviewMarker config={{ ...previewCfg, scale: (previewCfg.scale ?? 1) * 0.98 }} />
      ) : null}
      <mesh
        position={[lotCx, h(0.08), lotCz]}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          onPick(e.point.x, e.point.z);
        }}
      >
        <boxGeometry args={[lot.w * TILE * 0.98, h(0.02), lot.h * TILE * 0.98]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}
