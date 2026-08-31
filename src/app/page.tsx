"use client";

import { Suspense } from "react";
import { HabitatView } from "@/components/world/habitat-view";

export default function HomePage() {
  return (
    <Suspense fallback={<div className="size-full flex-1 bg-[#0a0a0a]" />}>
      <HabitatView mapId="lot" place="Agentspace" />
    </Suspense>
  );
}
