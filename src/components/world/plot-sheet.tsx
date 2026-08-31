"use client";

import { Landmark, Minus, Plus, X } from "lucide-react";
import { LOT_BUILDINGS } from "@/lib/campus";
import { companyForBuilding, formatUsd, isCivicBuilding } from "@/lib/companies";
import { ZONE_THEME } from "@/lib/city-shop";
import { formatPx } from "@/lib/units";
import {
  LAND_USES,
  PLACE_ANCHORS,
  buildingSize,
  districtForPlot,
  expandPrice,
  expandedRect,
  fitPlace,
  formatSqFt,
  matchingAnchor,
  placeAtCell,
  placeFromAnchor,
  plotArea,
  tilesToSqFt,
  usesForPlot,
  type LotPlace,
  type Plot,
} from "@/lib/plots";
import type { Agent } from "@/lib/types";

export function PlotSheet({
  plot,
  claimed,
  agents,
  previewUseId,
  extra,
  maxExtra,
  place,
  onClose,
  onBuy,
  onEnter,
  onBid,
  onPreviewUse,
  onExtra,
  onPlace,
}: {
  plot: Plot;
  claimed: boolean;
  agents: Agent[];
  previewUseId: string;
  extra: number;
  maxExtra: number;
  place: LotPlace;
  onClose: () => void;
  onBuy: () => void;
  onEnter: (buildingId: string) => void;
  onBid: () => void;
  onPreviewUse: (id: string) => void;
  onExtra: (n: number) => void;
  onPlace: (p: LotPlace) => void;
}) {
  const theme = ZONE_THEME[plot.zone];
  const building = plot.buildingId ? LOT_BUILDINGS.find((b) => b.id === plot.buildingId) : undefined;
  const company = building ? companyForBuilding(building.id) : undefined;
  const civic = plot.kind === "civic" || (building ? isCivicBuilding(building.id) : false);
  const park = plot.kind === "park";
  const inside = building ? agents.filter((a) => a.buildingId === building.id) : [];
  const owned = Boolean(building) && !claimed && plot.kind === "owned";
  const listed = !park && !civic && plot.kind === "sale" && !claimed;
  const grown = expandedRect(plot, extra);
  const area = plotArea({ ...plot, w: grown.w, h: grown.h });
  const district = districtForPlot(plot);
  const uses = usesForPlot(plot, extra);
  const price = listed ? expandPrice(plot, extra) : plot.price;
  const use = LAND_USES.find((u) => u.id === previewUseId) ?? uses[0];
  const size = use ? buildingSize(plot, use, extra) : null;
  const pos = use && size ? fitPlace(plot, use, extra, place) : place;
  const activeAnchor = size ? matchingAnchor(pos, grown.w, grown.h, size.w, size.h) : null;
  const bldgSqft = size ? tilesToSqFt(size.w, size.h) : 0;

  return (
    <div className="ns-plot-sheet" data-zone={plot.zone}>
      <div className="ns-card">
        {owned && company ? (
          <div className="ns-plot-hero">
            <p className="ns-plot-kicker">Occupied</p>
            <p className="ns-plot-hero-brand">{company.name}</p>
          </div>
        ) : park ? (
          <div className="ns-plot-hero">
            <p className="ns-plot-kicker">Park</p>
            <p className="ns-plot-price">Protected</p>
          </div>
        ) : listed ? (
          <div className="ns-plot-hero">
            <p className="ns-plot-kicker">For sale</p>
            <p className="ns-plot-price">{formatUsd(price)}</p>
          </div>
        ) : (
          <div className="ns-plot-hero">
            <div className="ns-plot-mark">
              <Landmark className="size-6" />
            </div>
            <p className="ns-plot-price">{claimed ? "Yours" : theme.price}</p>
          </div>
        )}

        <div className="ns-plot-body">
          <div className="ns-plot-title-row">
            <h3>
              {park
                ? "Park"
                : claimed
                  ? "Your plot"
                  : owned
                    ? (company?.name ?? building?.name ?? "Occupied")
                    : plot.groupLabel}
            </h3>
            <button type="button" className="ns-icon-btn" aria-label="Close" onClick={onClose}>
              <X className="size-4" />
            </button>
          </div>
          <p className="ns-plot-copy">
            {formatSqFt(area.sqft)} · {formatPx(area.frontPx)} × {formatPx(area.deepPx)} ·{" "}
            {district?.label ?? theme.label}
            {size ? ` · ${use?.name} ${formatSqFt(bldgSqft)}` : ""}
          </p>

          {listed ? (
            <>
              <div className="ns-expand">
                  <p>Lot size</p>
                  <div className="ns-expand-row">
                    <button
                      type="button"
                      className="ns-icon-btn"
                      aria-label="Smaller"
                      disabled={extra <= 0}
                      onClick={() => onExtra(Math.max(0, extra - 1))}
                    >
                      <Minus className="size-4" />
                    </button>
                    <strong>{formatSqFt(area.sqft)}</strong>
                    <button
                      type="button"
                      className="ns-icon-btn"
                      aria-label="Larger"
                      disabled={extra >= maxExtra}
                      onClick={() => onExtra(Math.min(maxExtra, extra + 1))}
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>
                </div>
              <div className="ns-plot-uses">
                <p>Building</p>
                <ul>
                  {uses.map((u) => (
                    <li key={u.id}>
                      <button
                        type="button"
                        className="ns-use-btn"
                        data-on={previewUseId === u.id ? "1" : "0"}
                        onClick={() => onPreviewUse(u.id)}
                      >
                        <strong>{u.name}</strong>
                        <span>{formatSqFt(tilesToSqFt(u.minW, u.minH))}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              {size && use ? (
                <div className="ns-place">
                  <p>Place</p>
                  <div className="ns-place-body">
                    <div className="ns-site-wrap">
                      <div
                        className="ns-site-plan"
                        style={{ gridTemplateColumns: `repeat(${grown.w}, 1fr)` }}
                        role="grid"
                        aria-label="Move the building on the lot"
                      >
                        {Array.from({ length: grown.w * grown.h }, (_, i) => {
                          const col = i % grown.w;
                          const row = Math.floor(i / grown.w);
                          const on =
                            col >= pos.ox && col < pos.ox + size.w && row >= pos.oy && row < pos.oy + size.h;
                          return (
                            <button
                              key={i}
                              type="button"
                              role="gridcell"
                              data-on={on ? "1" : "0"}
                              onClick={() => onPlace(placeAtCell(grown.w, grown.h, size.w, size.h, col, row))}
                            />
                          );
                        })}
                      </div>
                    </div>
                    <div className="ns-place-grid" role="group" aria-label="Position">
                      {PLACE_ANCHORS.map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          title={a.hint}
                          data-on={activeAnchor === a.id ? "1" : "0"}
                          onClick={() => onPlace(placeFromAnchor(grown.w, grown.h, size.w, size.h, a.fx, a.fy))}
                        >
                          {a.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </>
          ) : null}

          {owned && inside.length ? (
            <div className="ns-plot-badges">
              <span className="ns-badge">{inside.length} on site</span>
            </div>
          ) : null}

          <div className="ns-plot-actions">
            {park ? null : plot.zone === "ultimate" ? (
              <button type="button" className="ns-game-btn" onClick={onBid}>
                Bid · {theme.price}
              </button>
            ) : listed ? (
              <button type="button" className="ns-game-btn" onClick={onBuy}>
                Claim · {formatUsd(price)}
              </button>
            ) : building ? (
              <button type="button" className="ns-game-btn" onClick={() => onEnter(building.id)}>
                Enter
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
