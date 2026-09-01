"use client";

import { Suspense } from "react";
import { BotWorkspaceView } from "@/components/world/bot-workspace/bot-workspace-view";

export default function BotsPage() {
  return (
    <Suspense fallback={<div className="size-full flex-1 bg-[#1c1814]" />}>
      <BotWorkspaceView />
    </Suspense>
  );
}
