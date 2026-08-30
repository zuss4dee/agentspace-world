"use client";

import { CityChrome } from "@/components/world/city-chrome";
import { useWorld } from "@/components/world/world-store";
import { ALL_BUILDINGS } from "@/lib/city-gen";

export function HabitatHud({ place, mapId }: { place: string; mapId: "lot" | "plaza" }) {
  const { interiorId, exitInterior } = useWorld();
  void place;
  void mapId;
  return (
    <>
      <CityChrome />
      {interiorId ? (
        <button type="button" className="gbw-inside" onClick={exitInterior}>
          Inside {ALL_BUILDINGS.find((b) => b.id === interiorId)?.name} — return to the world
        </button>
      ) : null}
    </>
  );
}
