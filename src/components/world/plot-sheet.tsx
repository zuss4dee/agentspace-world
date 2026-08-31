"use client";

import { Landmark, Minus, Plus, X } from "lucide-react";
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
  placeAtCell,
  placeFromAnchor,
  plotArea,
  portionChoices,
  rectsEqual,
  tilesToSqFt,
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
  const claimLabel = multi
    ? `Claim ${selectedCount} lots · ${formatUsd(price)}`
    : `Claim · ${formatUsd(price)}`;
  const warn =
    listed && claimIssue === "cap"
      ? `Lot cap — ${selectedCount} selected, ${remainingClaims} of ${MAX_CLAIMS} left this session.`
      : listed && claimIssue === "overlap"
        ? "That land overlaps a claimed pad."
        : listed && claimIssue === "closed"
          ? "Nothing left to claim on this pad."
          : null;

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
            <p className="ns-plot-kicker">{multi ? `${selectedCount} lots` : "For sale"}</p>
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
                    : multi
                      ? `${selectedCount} lots selected`
                      : plot.groupLabel}
            </h3>
            <button type="button" className="ns-icon-btn" aria-label="Close" onClick={onClose}>
              <X className="size-4" />
            </button>
          </div>
          <p className="ns-plot-copy">
            {multi
              ? `${formatSqFt(selectedSqFt)} combined · ${district?.label ?? theme.label}`
              : `${area.text} · ${district?.label ?? theme.label}`}
            {bldg && !multi ? ` · ${use?.name} ${bldg.text}` : ""}
            {partial ? " · portion of pad" : ""}
          </p>

          {listed ? (
            <>
              {sliceable ? (
                <div className="ns-expand">
                  <p>Land you buy</p>
                  <div className="ns-portion-row">
                    {portions.map((row) => (
                      <button
                        key={row.id}
                        type="button"
                        className="ns-use-btn"
                        data-on={rectsEqual(landSlice, row.slice) ? "1" : "0"}
                        onClick={() => onLandSlice(row.slice)}
                      >
                        <strong>{row.label}</strong>
                        <span>{formatSqFt(tilesToSqFt(row.slice.w, row.slice.h))}</span>
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
                    <strong>{measureTiles(land.w, land.h).text}</strong>
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
                  <span>Pay for a quarter, half, or a custom slice — not the whole field.</span>
                </div>
              ) : null}
              <div className="ns-expand">
                  <p>Building width</p>
                  <div className="ns-expand-row">
                    <button
                      type="button"
                      className="ns-icon-btn"
                      aria-label="Narrower"
                      disabled={extra <= 0}
                      onClick={() => onExtra(Math.max(0, extra - 1))}
                    >
                      <Minus className="size-4" />
                    </button>
                    <strong>{bldg ? bldg.text : "—"}</strong>
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
                  <span>Stays on your pad. Cannot cross the fence or a road.</span>
                </div>
              <div className="ns-plot-uses">
                <p>Building</p>
                <ul>
                  {uses.map((u) => {
                    const s = buildingSize(land, u, extra, place);
                    return (
                    <li key={u.id}>
                      <button
                        type="button"
                        className="ns-use-btn"
                        data-on={previewUseId === u.id ? "1" : "0"}
                        onClick={() => onPreviewUse(u.id)}
                      >
                        <strong>{u.name}</strong>
                        <span>{s ? measureTiles(s.w, s.h).text : "—"}</span>
                      </button>
                    </li>
                    );
                  })}
                </ul>
              </div>
              {size && use && !fillsLot ? (
                <div className="ns-place">
                  <p>Sit on the lot</p>
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

          {adjoining && (listed || claimed) ? (
            <button type="button" className="ns-ghost ns-adjoin-btn" onClick={onAddAdjoining}>
              Add adjoining lot · {adjoining.groupLabel} · {formatUsd(adjoining.price)}
            </button>
          ) : null}

          {owned && inside.length ? (
            <div className="ns-plot-badges">
              <span className="ns-badge">{inside.length} on site</span>
            </div>
          ) : null}

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
