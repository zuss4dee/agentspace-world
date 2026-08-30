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
import { DISTRICTS, LOT_BUILDINGS } from "@/lib/campus";
import {
  companyForBuilding,
  formatUsd,
  isCivicBuilding,
  salePrice,
} from "@/lib/companies";
import { PLOT_BANDS, type Plot } from "@/lib/plots";
import type { Agent } from "@/lib/types";

export function PlacePopup({
  plot,
  agents,
  interiorId,
  onClose,
  onEnter,
  onLeave,
}: {
  plot: Plot;
  agents: Agent[];
  interiorId: string | null;
  onClose: () => void;
  onEnter: (buildingId: string) => void;
  onLeave: () => void;
}) {
  const building = plot.buildingId ? LOT_BUILDINGS.find((b) => b.id === plot.buildingId) : undefined;
  const inside = building ? agents.filter((a) => a.buildingId === building.id) : [];
  const empty = inside.length === 0;
  const civic = plot.kind === "civic" || (building ? isCivicBuilding(building.id) : false);
  const company = building ? companyForBuilding(building.id) : undefined;
  const forSale = plot.kind === "park" || civic ? false : plot.kind === "sale" || empty;
  const district = DISTRICTS.find((d) => d.id === plot.districtId);
  const band = PLOT_BANDS.find((b) => b.id === plot.band);
  const price = building ? salePrice(building.id) : plot.price;
  const title = building?.name ?? `${band?.label ?? "Northshore"} lot`;

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
            {district?.label ?? "Northshore"} · {band?.label}
            {plot.kind === "park" ? " · Protected" : forSale ? " · For sale" : ""}
          </p>
          <DialogTitle className="font-heading text-xl">{title}</DialogTitle>
          <DialogDescription className="text-[#5c4a3a]">
            {plot.kind === "park"
              ? "Park tile. Not for sale."
              : (building?.purpose ?? band?.blurb ?? "A plot on the Northshore grid.")}
          </DialogDescription>
        </DialogHeader>

        {plot.kind === "park" ? (
          <p className="text-sm text-[#5c4a3a]">This lawn stays public. Companies take neighbouring lots, not the green.</p>
        ) : company ? (
          <div className="rounded-lg border border-[#5a322018] bg-white/70 p-3">
            <p className="text-[0.65rem] font-bold tracking-[0.16em] text-[#ed712e] uppercase">Company</p>
            <p className="mt-1 font-semibold">{company.name}</p>
            <p className="mt-1 text-sm text-[#5c4a3a]">{company.does}</p>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-[#ed712e66] bg-[#ed712e12] p-3">
            <p className="text-[0.65rem] font-bold tracking-[0.16em] text-[#ed712e] uppercase">No tenant</p>
            <p className="mt-1 text-sm text-[#5c4a3a]">Empty plot. A Grok Bot org can put a workplace here.</p>
          </div>
        )}

        {forSale && plot.kind !== "park" ? (
          <div className="rounded-lg border border-[#ed712e8c] bg-[#ed712e18] p-3">
            <p className="text-[0.65rem] font-bold tracking-[0.16em] text-[#ed712e] uppercase">Listed for sale</p>
            <p className="mt-1 text-lg font-semibold">{formatUsd(price)}</p>
            <p className="mt-1 text-sm text-[#5c4a3a]">One-time listing. Parks stay off the market.</p>
          </div>
        ) : building && !empty ? (
          <div className="text-sm text-[#5c4a3a]">
            <p>
              <span className="font-semibold text-[#2c2118]">{inside.length}</span>
              {inside.length === 1 ? " agent" : " agents"}: {inside.map((a) => a.name).join(", ")}
            </p>
            {inside[0] ? <p className="mt-1 italic">“{inside[0].thought}”</p> : null}
          </div>
        ) : null}

        <DialogFooter className="bg-transparent border-t-0 sm:justify-between">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
          {building ? (
            interiorId === building.id ? (
              <Button type="button" onClick={onLeave}>
                Leave
              </Button>
            ) : (
              <Button type="button" onClick={() => onEnter(building.id)}>
                Enter
              </Button>
            )
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
