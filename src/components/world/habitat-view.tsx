"use client";

import { useEffect, useRef } from "react";
import { HabitatHud } from "@/components/world/habitat-hud";
import { WorldCanvas } from "@/components/world/world-canvas";
import { useWorld } from "@/components/world/world-store";

export function HabitatView({
  mapId,
  place,
  startPoi = "hearth",
}: {
  mapId: "lot" | "plaza";
  place: string;
  startPoi?: string;
}) {
  const { selectedAgentId, selectAgent, focusPoi } = useWorld();
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    focusPoi(startPoi);
  }, [focusPoi, startPoi]);
  return (
    <div className="relative min-h-0 flex-1">
      <WorldCanvas mapId={mapId} selectedAgentId={selectedAgentId} onSelectAgent={selectAgent} />
      <HabitatHud place={place} mapId={mapId} />
    </div>
  );
}
