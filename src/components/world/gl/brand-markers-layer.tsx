"use client";

import { useCallback, useMemo } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import { expandedRect, getPlot, buildingFootprint, usesForPlot, LAND_USES } from "@/lib/plots";
import { ECHT_ASSET_ID } from "@/lib/arch-viz";
import { brandMarkerFromClaim, brandMarkerWithLogoPose, WORLD_BRAND_MARKERS } from "@/lib/brand-marker";
import { AnimatedBrandMarker } from "@/components/world/gl/animated-brand-marker";
import { useWorld } from "@/components/world/world-store";

function BuildingHitProxy({
  cx,
  cz,
  w,
  d,
  fh,
  onSelect,
}: {
  cx: number;
  cz: number;
  w: number;
  d: number;
  fh: number;
  onSelect: () => void;
}) {
  return (
    <mesh
      position={[cx, fh * 0.5, cz]}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      <boxGeometry args={[w, fh, d]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

export function BrandMarkersLayer() {
  const { selectBuilding, selectPlot, claimedPlotIds, claimedExtras, claimedPlaces, claimedUses, buildingSpecs, logoEditPlotId } =
    useWorld();

  const onSelectWorld = useCallback(
    (targetId: string) => {
      selectBuilding(targetId);
    },
    [selectBuilding],
  );

  const onSelectClaim = useCallback(
    (plotId: string) => {
      selectPlot(plotId);
    },
    [selectPlot],
  );

  const claimMarkers = useMemo(() => {
    const out = [];
    const ids = [...new Set(claimedPlotIds)];
    for (const id of ids) {
      if (id === logoEditPlotId) continue;
      const plot = getPlot(id);
      if (!plot) continue;
      const extra = claimedExtras[id] ?? 0;
      const r = expandedRect(plot, extra);
      const fitting = usesForPlot(plot, extra);
      const requested = claimedUses[id];
      const use =
        fitting.find((u) => u.id === requested) ??
        fitting.find((u) => u.id === "office") ??
        fitting[0] ??
        LAND_USES[0]!;
      const fp = buildingFootprint(plot, use, extra, claimedPlaces[id]);
      if (!fp) continue;
      const spec = buildingSpecs[id];
      const profile = spec?.profile;
      if (!profile?.name?.trim()) continue;
      const cfg = brandMarkerFromClaim(id, { x: r.x, y: r.y, w: r.w, h: r.h }, profile);
      if (cfg) out.push(cfg);
    }
    return out;
  }, [claimedPlotIds, claimedExtras, claimedPlaces, claimedUses, buildingSpecs, logoEditPlotId]);

  const worldMarkers = useMemo(() => {
    const echtLot = { x: 26, y: 6, w: 5, h: 4 };
    return WORLD_BRAND_MARKERS.map((cfg) => {
      const profile = buildingSpecs[cfg.targetId]?.profile;
      const assetId = profile?.buildingAssetId ?? ECHT_ASSET_ID;
      return brandMarkerWithLogoPose(cfg, echtLot, assetId, profile?.logoPose);
    });
  }, [buildingSpecs]);

  return (
    <group>
      {worldMarkers.map((cfg) => (
        <group key={`world-${cfg.targetId}`}>
          <AnimatedBrandMarker config={cfg} onSelect={onSelectWorld} />
          {cfg.buildingHit ? (
            <BuildingHitProxy
              cx={cfg.buildingHit.cx}
              cz={cfg.buildingHit.cz}
              w={cfg.buildingHit.w}
              d={cfg.buildingHit.d}
              fh={cfg.buildingHit.h}
              onSelect={() => onSelectWorld(cfg.targetId)}
            />
          ) : null}
        </group>
      ))}
      {claimMarkers.map((cfg) => (
        <AnimatedBrandMarker key={`claim-${cfg.targetId}`} config={cfg} onSelect={onSelectClaim} />
      ))}
    </group>
  );
}
