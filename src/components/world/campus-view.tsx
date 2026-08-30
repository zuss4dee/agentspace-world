"use client";

import { Pause, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { WorldCanvas } from "@/components/world/world-canvas";
import { useWorld } from "@/components/world/world-store";
import { ROLE_LABEL } from "@/lib/playbooks";
import { LOT_BUILDINGS } from "@/lib/campus";
import { catalogById } from "@/lib/catalog";
import type { MapId } from "@/lib/types";

function Director({ mapId }: { mapId: MapId }) {
  const { world } = useWorld();
  const events = world.events.filter((e) => e.mapId === mapId);
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <p className="font-heading text-sm">Director</p>
        <Badge variant="secondary">{events.length} beats</Badge>
      </div>
      <Separator />
      <ScrollArea className="min-h-0 flex-1">
        <ul className="flex flex-col gap-3 p-3">
          {events.length === 0 ? (
            <li className="text-muted-foreground text-sm">
              The floor is quiet. Connect a bot or wait for the demo crew to move.
            </li>
          ) : (
            events.map((event) => (
              <li key={event.id} className="flex flex-col gap-1">
                <p className="text-muted-foreground text-[11px] uppercase tracking-wide">
                  {event.kind} · {new Date(event.t).toLocaleTimeString()}
                </p>
                <p className="text-sm leading-snug">{event.text}</p>
              </li>
            ))
          )}
        </ul>
      </ScrollArea>
    </div>
  );
}

export function CampusView({
  mapId,
  title,
  kicker,
}: {
  mapId: MapId;
  title: string;
  kicker: string;
}) {
  const { world, paused, setPaused, selectedAgentId, selectAgent, agentsOn } = useWorld();
  const agents = agentsOn(mapId);
  const selected = world.agents.find((a) => a.id === selectedAgentId && a.mapId === mapId);
  const building = selected
    ? LOT_BUILDINGS.find((b) => b.id === selected.buildingId)
    : undefined;
  const outfit = selected ? catalogById(selected.outfitId) : undefined;

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <section className="relative min-h-[58vh] flex-1 lg:min-h-0">
        <WorldCanvas />
        <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col gap-1 p-4">
          <p className="text-muted-foreground text-xs uppercase tracking-[0.18em]">{kicker}</p>
          <h1 className="font-heading text-2xl text-balance text-white drop-shadow md:text-3xl">
            {title}
          </h1>
        </div>
        <div className="absolute right-3 bottom-3 flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => setPaused(!paused)}>
            {paused ? <Play data-icon="inline-start" /> : <Pause data-icon="inline-start" />}
            {paused ? "Resume" : "Pause"}
          </Button>
        </div>
      </section>
      <aside className="flex h-[42vh] w-full shrink-0 flex-col border-t bg-card lg:h-auto lg:w-80 lg:border-t-0 lg:border-l">
        <Director mapId={mapId} />
      </aside>
      <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && selectAgent(null)}>
        <SheetContent>
          {selected ? (
            <>
              <SheetHeader>
                <SheetTitle>
                  {selected.name} · {ROLE_LABEL[selected.role]}
                </SheetTitle>
                <SheetDescription>
                  {selected.connected ? "Signal live (simulated heartbeat)." : "Visitor — no private channel."}
                </SheetDescription>
              </SheetHeader>
              <div className="flex flex-col gap-3 px-4">
                <p className="text-sm">
                  <span className="text-muted-foreground">Now: </span>
                  {selected.status} — {selected.task}
                </p>
                <p className="text-sm italic">“{selected.thought}”</p>
                <p className="text-muted-foreground text-sm">
                  Station: {building?.name ?? selected.buildingId} · outfit {outfit?.name ?? selected.outfitId}
                </p>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
      <p className="sr-only">{agents.length} agents on map</p>
    </div>
  );
}
