"use client";

import { useEffect } from "react";
import { CityChrome } from "@/components/world/city-chrome";
import { useWorld } from "@/components/world/world-store";
import { ALL_BUILDINGS } from "@/lib/city-gen";

export function HabitatHud({ place, mapId }: { place: string; mapId: "lot" | "plaza" }) {
  const { interiorId, exitInterior } = useWorld();
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
          Leave {ALL_BUILDINGS.find((b) => b.id === interiorId)?.name ?? "building"}
        </button>
      ) : null}
    </>
  );
}
