"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
import { HabitatHud } from "@/components/world/habitat-hud";
import { useWorld } from "@/components/world/world-store";

const WorldCanvas = dynamic(() => import("@/components/world/world-canvas").then((m) => m.WorldCanvas), {
  ssr: false,
  loading: () => <div className="size-full bg-[#8eb8d6]" />,
});

export function HabitatView({
  mapId,
  place,
  startPoi = "civic",
}: {
  mapId: "lot" | "plaza";
  place: string;
  startPoi?: string;
}) {
  const { focusPoi } = useWorld();
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    focusPoi(startPoi);
  }, [focusPoi, startPoi]);
  return (
    <div className="relative min-h-0 flex-1">
      <WorldCanvas />
      <HabitatHud place={place} mapId={mapId} />
    </div>
  );
}
