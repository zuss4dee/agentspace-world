"use client";

import { Minus, Plus, X } from "lucide-react";
import { LOT_BUILDINGS } from "@/lib/campus";
import { companyForBuilding, formatUsd, isCivicBuilding } from "@/lib/companies";
import { ZONE_THEME } from "@/lib/city-shop";
import {
  LAND_USES,
  MAX_CLAIMS,
  PLACE_ANCHORS,
  buildingSize,
  canSlicePlot,
  footprintFillsLot,
  districtForPlot,
  expandPrice,
  expandedRect,
  fitPlace,
  formatSqFt,
  matchingAnchor,
  measureTiles,
  placeFromAnchor,
  plotArea,
  portionChoices,
  rectsEqual,
  usesForPlot,
  type ClaimIssue,
  type LotPlace,
  type Plot,
  type TileRect,
} from "@/lib/plots";
import type { Agent } from "@/lib/types";

export function PlotSheet({
  plot,
  land,
  claimed,
  selectedCount,
  selectedSqFt,
  selectedPrice,
  agents,
  previewUseId,
  extra,
  maxExtra,
  place,
  landSlice,
  maxLandGrow,
  claimIssue,
  remainingClaims,
  adjoining,
  onClose,
  onBuy,
  onEnter,
  onBid,
  onPreviewUse,
  onExtra,
  onPlace,
  onLandSlice,
  onResizeLand,
  onAddAdjoining,
}: {
  plot: Plot;
  land: Plot;
  claimed: boolean;
  selectedCount: number;
  selectedSqFt: number;
  selectedPrice: number;
  agents: Agent[];
  previewUseId: string;
  extra: number;
  maxExtra: number;
  place: LotPlace;
  landSlice: TileRect;
  maxLandGrow: boolean;
  claimIssue: ClaimIssue;
  remainingClaims: number;
  adjoining: Plot | undefined;
  onClose: () => void;
  onBuy: () => void;
  onEnter: (buildingId: string) => void;
  onBid: () => void;
  onPreviewUse: (id: string) => void;
  onExtra: (n: number) => void;
  onPlace: (p: LotPlace) => void;
  onLandSlice: (s: TileRect) => void;
  onResizeLand: (delta: number) => void;
  onAddAdjoining: () => void;
}) {
  const theme = ZONE_THEME[plot.zone];
  const building = plot.buildingId ? LOT_BUILDINGS.find((b) => b.id === plot.buildingId) : undefined;
  const company = building ? companyForBuilding(building.id) : undefined;
  const civic = plot.kind === "civic" || (building ? isCivicBuilding(building.id) : false);
  const park = plot.kind === "park";
  const inside = building ? agents.filter((a) => a.buildingId === building.id) : [];
  const owned = Boolean(building) && !claimed && plot.kind === "owned";
  const listed = !park && !civic && plot.kind === "sale" && !claimed;
  const multi = listed && selectedCount > 1;
  const grown = expandedRect(land, extra);
  const area = plotArea(land);
  const district = districtForPlot(plot);
  const uses = usesForPlot(land, extra);
  const price = listed ? (multi ? selectedPrice : expandPrice(land, extra)) : plot.price;
  const use = LAND_USES.find((u) => u.id === previewUseId) ?? uses[0];
  const size = use ? buildingSize(land, use, extra, place) : null;
  const pos = use && size ? fitPlace(land, use, extra, place) : place;
  const activeAnchor = size ? matchingAnchor(pos, grown.w, grown.h, size.w, size.h) : null;
  const bldg = size ? measureTiles(size.w, size.h) : null;
  const fillsLot = size ? footprintFillsLot(grown.w, grown.h, size.w, size.h) : false;
  const sliceable = listed && canSlicePlot(plot);
  const portions = sliceable ? portionChoices(plot) : [];
  const partial = listed && !rectsEqual(land, plot);
  const showWidth = listed && (maxExtra > 0 || extra > 0);
  const claimLabel = multi
    ? `Claim ${selectedCount} · ${formatUsd(price)}`
    : `Claim · ${formatUsd(price)}`;
  const warn =
    listed && claimIssue === "cap"
      ? `Cap ${selectedCount} / ${remainingClaims} of ${MAX_CLAIMS} left.`
      : listed && claimIssue === "overlap"
        ? "Overlaps a claimed pad."
        : listed && claimIssue === "closed"
          ? "Nothing left on this pad."
          : null;

  const title = park
    ? "Park"
    : claimed
      ? "Your plot"
      : owned
        ? (company?.name ?? building?.name ?? "Occupied")
        : multi
          ? `${selectedCount} lots`
          : plot.groupLabel;
  const kicker = park
    ? "Park"
    : claimed
      ? "Yours"
      : owned
        ? "Occupied"
        : listed
          ? multi
            ? "Selected"
            : "For sale"
          : theme.label;
  const priceText = park ? "—" : listed || plot.zone === "ultimate" ? formatUsd(price) : claimed ? "Yours" : theme.price;
  const sizeLine = multi
    ? `${formatSqFt(selectedSqFt)} · ${district?.label ?? theme.label}`
    : `${formatSqFt(area.sqft)} · ${area.footprint} · ${district?.label ?? theme.label}${partial ? " · portion" : ""}`;

  return (
    <div className="ns-plot-sheet" data-zone={plot.zone}>
      <div className="ns-card">
        <div className="ns-plot-body">
          <div className="ns-plot-title-row">
            <div className="ns-plot-id">
              <p className="ns-plot-kicker">{kicker}</p>
              <h3>{title}</h3>
            </div>
            <p className="ns-plot-price">{priceText}</p>
            <button type="button" className="ns-icon-btn" aria-label="Close" onClick={onClose}>
              <X className="size-4" />
            </button>
          </div>
          <p className="ns-plot-copy">{sizeLine}</p>
          {listed ? <p className="ns-plot-hint">Shift or Ctrl-click to add lots. Studio (left of zoom) edits the building spec.</p> : null}

          {listed ? (
            <>
              {sliceable ? (
                <div className="ns-expand">
                  <div className="ns-portion-row">
                    {portions.map((row) => (
                      <button
                        key={row.id}
                        type="button"
                        className="ns-chip"
                        data-on={rectsEqual(landSlice, row.slice) ? "1" : "0"}
                        onClick={() => onLandSlice(row.slice)}
                      >
                        {row.label}
                      </button>
                    ))}
                  </div>
                  <div className="ns-expand-row">
                    <button
                      type="button"
                      className="ns-icon-btn"
                      aria-label="Smaller land"
                      disabled={land.w <= 3 && land.h <= 3}
                      onClick={() => onResizeLand(-1)}
                    >
                      <Minus className="size-4" />
                    </button>
                    <strong>{`${land.w}×${land.h}`}</strong>
                    <button
                      type="button"
                      className="ns-icon-btn"
                      aria-label="Larger land"
                      disabled={maxLandGrow}
                      onClick={() => onResizeLand(1)}
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>
                </div>
              ) : null}
              <div className="ns-plot-uses">
                <ul>
                  {uses.map((u) => (
                    <li key={u.id}>
                      <button
                        type="button"
                        className="ns-chip"
                        data-on={previewUseId === u.id ? "1" : "0"}
                        onClick={() => onPreviewUse(u.id)}
                      >
                        {u.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              {showWidth ? (
                <div className="ns-expand-row">
                  <span className="ns-plot-mute">Width</span>
                  <button
                    type="button"
                    className="ns-icon-btn"
                    aria-label="Narrower"
                    disabled={extra <= 0}
                    onClick={() => onExtra(Math.max(0, extra - 1))}
                  >
                    <Minus className="size-4" />
                  </button>
                  <strong>{bldg ? `${bldg.w}×${bldg.h}` : "—"}</strong>
                  <button
                    type="button"
                    className="ns-icon-btn"
                    aria-label="Wider"
                    disabled={extra >= maxExtra}
                    onClick={() => onExtra(Math.min(maxExtra, extra + 1))}
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
              ) : null}
              {size && use && !fillsLot ? (
                <div className="ns-place-grid" role="group" aria-label="Place on lot">
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
              ) : null}
            </>
          ) : null}

          {adjoining && (listed || claimed) ? (
            <button type="button" className="ns-ghost ns-adjoin-btn" onClick={onAddAdjoining}>
              Adjoin · {formatUsd(adjoining.price)}
            </button>
          ) : null}

          {owned && inside.length ? <p className="ns-plot-mute">{inside.length} on site</p> : null}

          {warn ? <p className="ns-plot-warn">{warn}</p> : null}

          <div className="ns-plot-actions">
            {park ? null : plot.zone === "ultimate" ? (
              <button type="button" className="ns-game-btn" onClick={onBid}>
                Bid · {theme.price}
              </button>
            ) : listed ? (
              <button type="button" className="ns-game-btn" disabled={Boolean(claimIssue)} onClick={onBuy}>
                {claimLabel}
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
