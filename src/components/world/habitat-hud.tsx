"use client";

import { useEffect } from "react";
import { CityChrome } from "@/components/world/city-chrome";
import { useWorld } from "@/components/world/world-store";
import { occupiedBuilding } from "@/lib/company-profile";

export function HabitatHud({ place, mapId }: { place: string; mapId: "lot" | "plaza" }) {
  const { interiorId, exitInterior, buildingSpecs } = useWorld();
  void place;
  void mapId;

  useEffect(() => {
    if (!interiorId) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "Escape") {
        e.preventDefault();
        exitInterior();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [interiorId, exitInterior]);

  return (
    <>
      <CityChrome />
      {interiorId ? (
        <button type="button" className="gbw-inside" onClick={exitInterior}>
          Leave {occupiedBuilding(interiorId, buildingSpecs[interiorId])?.name ?? "building"}
        </button>
      ) : null}
    </>
  );
}
