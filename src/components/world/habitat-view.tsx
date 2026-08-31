"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { HabitatHud } from "@/components/world/habitat-hud";
import { useWorld } from "@/components/world/world-store";
import { getPlot } from "@/lib/plots";

const WorldCanvas = dynamic(() => import("@/components/world/world-canvas").then((m) => m.WorldCanvas), {
  ssr: false,
  loading: () => <div className="size-full bg-[#0a0a0a]" />,
});

export function HabitatView({
  mapId,
  place,
  startPoi = "startup",
}: {
  mapId: "lot" | "plaza";
  place: string;
  startPoi?: string;
}) {
  const { focusPoi, selectPlot, focusCoord } = useWorld();
  const params = useSearchParams();
  const started = useRef(false);
  useEffect(() => {
    const plotId = params.get("plot");
    if (plotId) {
      const p = getPlot(plotId);
      if (p) {
        selectPlot(p.id);
        focusCoord(p.x + p.w / 2, p.y + p.h / 2, 1.1);
        started.current = true;
        return;
      }
    }
    if (started.current) return;
    started.current = true;
    focusPoi(startPoi);
  }, [focusPoi, startPoi, params, selectPlot, focusCoord]);
  return (
    <div className="relative min-h-0 flex-1">
      <WorldCanvas />
      <HabitatHud place={place} mapId={mapId} />
    </div>
  );
}
