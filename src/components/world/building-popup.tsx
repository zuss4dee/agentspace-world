"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DISTRICTS } from "@/lib/campus";
import {
  companyForBuilding,
  formatUsd,
  isCivicBuilding,
  salePrice,
} from "@/lib/companies";
import type { Agent, Building } from "@/lib/types";

export function BuildingPopup({
  building,
  agents,
  interiorId,
  onClose,
  onEnter,
  onLeave,
}: {
  building: Building;
  agents: Agent[];
  interiorId: string | null;
  onClose: () => void;
  onEnter: () => void;
  onLeave: () => void;
}) {
  const inside = agents.filter((a) => a.buildingId === building.id);
  const empty = inside.length === 0;
  const civic = isCivicBuilding(building.id);
  const company = companyForBuilding(building.id);
  const forSale = empty && !civic;
  const district = DISTRICTS.find((d) => d.id === building.districtId);

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md bg-[#fff8f0] text-[#2c2118] ring-[#5a322028]">
        <DialogHeader>
          <p className="text-[0.65rem] font-bold tracking-[0.18em] text-[#ed712e] uppercase">
            {district?.label ?? "Northshore"}
            {forSale ? " · For sale" : ""}
          </p>
          <DialogTitle className="font-heading text-xl">{building.name}</DialogTitle>
          <DialogDescription className="text-[#5c4a3a]">
            {building.purpose ?? `${building.kind} on this block.`}
          </DialogDescription>
        </DialogHeader>

        {company ? (
          <div className="rounded-lg border border-[#5a322018] bg-white/70 p-3">
            <p className="text-[0.65rem] font-bold tracking-[0.16em] text-[#ed712e] uppercase">Owned by</p>
            <p className="mt-1 font-semibold">{company.name}</p>
            <p className="mt-1 text-sm text-[#5c4a3a]">{company.does}</p>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-[#ed712e66] bg-[#ed712e12] p-3">
            <p className="text-[0.65rem] font-bold tracking-[0.16em] text-[#ed712e] uppercase">Unclaimed</p>
            <p className="mt-1 text-sm text-[#5c4a3a]">No company holds this address yet.</p>
          </div>
        )}

        {forSale ? (
          <div className="rounded-lg border border-[#ed712e8c] bg-[#ed712e18] p-3">
            <p className="text-[0.65rem] font-bold tracking-[0.16em] text-[#ed712e] uppercase">Listed for sale</p>
            <p className="mt-1 text-lg font-semibold">{formatUsd(salePrice(building.id))}</p>
            <p className="mt-1 text-sm text-[#5c4a3a]">Empty workplace. No agents inside. A Grok Bot org can take the lease later.</p>
          </div>
        ) : (
          <div className="text-sm text-[#5c4a3a]">
            <p>
              <span className="font-semibold text-[#2c2118]">{inside.length}</span>
              {inside.length === 1 ? " agent" : " agents"} here
              {inside.length ? `: ${inside.map((a) => a.name).join(", ")}` : "."}
            </p>
            {inside[0] ? <p className="mt-1 italic">“{inside[0].thought}”</p> : null}
          </div>
        )}

        <DialogFooter className="bg-transparent border-t-0 sm:justify-between">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
          <div className="flex gap-2">
            {interiorId === building.id ? (
              <Button type="button" onClick={onLeave}>
                Leave
              </Button>
            ) : (
              <Button type="button" onClick={onEnter}>
                Enter
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
