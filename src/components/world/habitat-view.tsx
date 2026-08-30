"use client";

import { HabitatHud } from "@/components/world/habitat-hud";
import { WorldCanvas } from "@/components/world/world-canvas";
import { useWorld } from "@/components/world/world-store";

export function HabitatView({
  mapId,
  place,
}: {
  mapId: "lot" | "plaza";
  place: string;
}) {
  const { selectedAgentId, selectAgent } = useWorld();
  return (
    <div className="relative min-h-0 flex-1">
      <WorldCanvas mapId={mapId} selectedAgentId={selectedAgentId} onSelectAgent={selectAgent} />
      <HabitatHud place={place} mapId={mapId} />
    </div>
  );
}
