"use client";

import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Landmark,
  Minus,
  Plus,
  X,
} from "lucide-react";
import { LOT_BUILDINGS } from "@/lib/campus";
import { companyForBuilding, formatUsd, isCivicBuilding } from "@/lib/companies";
import { ZONE_THEME } from "@/lib/city-shop";
import {
  LAND_USES,
  MAX_EXPAND,
  PLACE_ANCHORS,
  TILE_FEET,
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
  const maxOx = size ? Math.max(0, grown.w - size.w) : 0;
  const maxOy = size ? Math.max(0, grown.h - size.h) : 0;
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
            <p className="ns-plot-onetime">not for sale</p>
          </div>
        ) : listed ? (
          <div className="ns-plot-hero">
            <p className="ns-plot-kicker">For sale</p>
            <p className="ns-plot-price">{formatUsd(price)}</p>
            <p className="ns-plot-onetime">one-time · session listing · nothing billed</p>
          </div>
        ) : (
          <div className="ns-plot-hero">
            <div className="ns-plot-mark">
              <Landmark className="size-6" />
            </div>
            <p className="ns-plot-price">{claimed ? "Yours" : theme.price}</p>
            <p className="ns-plot-onetime">{claimed ? "claimed this session" : "one-time"}</p>
          </div>
        )}

        <div className="ns-plot-body">
          <div className="ns-plot-title-row">
            <h3>
              {park
                ? "Park tile"
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
            {park
              ? "Protected park tiles are not for sale."
              : owned
                ? (company?.does ?? building?.purpose ?? theme.description)
                : claimed
                  ? "This lot is yours in this session. Refreshing the page returns it to the shop — nothing is billed."
                  : (district?.blurb ?? theme.description)}
          </p>

          <dl className="ns-plot-facts">
            <div>
              <dt>Lot</dt>
              <dd>
                {formatSqFt(area.sqft)}
                <span>
                  {area.frontFt} ft front × {area.deepFt} ft deep
                </span>
              </dd>
            </div>
            <div>
              <dt>Price</dt>
              <dd>
                {formatUsd(price)}
                <span>{extra ? `base ${formatUsd(plot.price)} plus expand` : "one-time"}</span>
              </dd>
            </div>
            <div>
              <dt>Neighbourhood</dt>
              <dd>
                {district?.label ?? theme.label}
                <span>{theme.label}</span>
              </dd>
            </div>
            <div>
              <dt>Grid</dt>
              <dd>
                {area.footprint} tiles
                <span>each tile {TILE_FEET} × {TILE_FEET} ft</span>
              </dd>
            </div>
          </dl>

          {listed ? (
            <>
              <div className="ns-expand">
                <p>Expand the lot</p>
                <div className="ns-expand-row">
                  <button
                    type="button"
                    className="ns-icon-btn"
                    aria-label="Shrink"
                    disabled={extra <= 0}
                    onClick={() => onExtra(Math.max(0, extra - 1))}
                  >
                    <Minus className="size-4" />
                  </button>
                  <strong>
                    +{extra} tile{extra === 1 ? "" : "s"} · {formatSqFt(area.sqft)}
                  </strong>
                  <button
                    type="button"
                    className="ns-icon-btn"
                    aria-label="Expand"
                    disabled={extra >= maxExtra}
                    onClick={() => onExtra(Math.min(maxExtra, extra + 1))}
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
                <span>
                  Grows east and south on the map. Cap +{MAX_EXPAND} tiles
                  {maxExtra < MAX_EXPAND ? ` · this pad only allows +${maxExtra}` : ""}. Neighbours you cover come with
                  the claim.
                </span>
              </div>
              <div className="ns-plot-uses">
                <p>Building — shown on the map</p>
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
                        <span>
                          {formatSqFt(tilesToSqFt(u.minW, u.minH))} · {u.minW}×{u.minH} tiles · {u.blurb}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              {size && use ? (
                <div className="ns-place">
                  <p>Place the building on the lot</p>
                  <p className="ns-place-lead">
                    You buy the whole lot — {formatSqFt(area.sqft)} of yard. The {use.name.toLowerCase()} is only{" "}
                    {formatSqFt(bldgSqft)}. Light tiles are empty land you own. Dark tiles are the building. Same layout
                    as the map: click a tile, use Mid / edge / corner, or slide.
                  </p>
                  <div className="ns-place-legend">
                    <span>
                      <i className="ns-swatch ns-swatch-yard" /> Yard you own
                    </span>
                    <span>
                      <i className="ns-swatch ns-swatch-bldg" /> Building
                    </span>
                  </div>
                  <div className="ns-place-body">
                    <div className="ns-site-wrap">
                      <span className="ns-site-n">N</span>
                      <div
                        className="ns-site-plan"
                        style={{ gridTemplateColumns: `repeat(${grown.w}, 1fr)` }}
                        role="grid"
                        aria-label="Site plan. Light is yard. Dark is the building. Click to move it."
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
                            aria-label={`Tile ${col + 1},${row + 1}${on ? ", under the building" : ""}`}
                            data-on={on ? "1" : "0"}
                            onClick={() => onPlace(placeAtCell(grown.w, grown.h, size.w, size.h, col, row))}
                          />
                        );
                      })}
                      </div>
                    </div>
                    <div className="ns-place-tools">
                      <div className="ns-place-grid" role="group" aria-label="Preset positions">
                        {PLACE_ANCHORS.map((a) => (
                          <button
                            key={a.id}
                            type="button"
                            title={a.hint}
                            aria-label={a.hint}
                            data-on={activeAnchor === a.id ? "1" : "0"}
                            onClick={() => onPlace(placeFromAnchor(grown.w, grown.h, size.w, size.h, a.fx, a.fy))}
                          >
                            {a.label}
                          </button>
                        ))}
                      </div>
                      <div className="ns-nudge" role="group" aria-label="Nudge building">
                        <span />
                        <button
                          type="button"
                          aria-label="Nudge north"
                          disabled={pos.oy <= 0}
                          onClick={() => onPlace({ ox: pos.ox, oy: pos.oy - 1 })}
                        >
                          <ChevronUp className="size-4" />
                        </button>
                        <span />
                        <button
                          type="button"
                          aria-label="Nudge west"
                          disabled={pos.ox <= 0}
                          onClick={() => onPlace({ ox: pos.ox - 1, oy: pos.oy })}
                        >
                          <ChevronLeft className="size-4" />
                        </button>
                        <button type="button" className="ns-nudge-mid" disabled>
                          Slide
                        </button>
                        <button
                          type="button"
                          aria-label="Nudge east"
                          disabled={pos.ox >= maxOx}
                          onClick={() => onPlace({ ox: pos.ox + 1, oy: pos.oy })}
                        >
                          <ChevronRight className="size-4" />
                        </button>
                        <span />
                        <button
                          type="button"
                          aria-label="Nudge south"
                          disabled={pos.oy >= maxOy}
                          onClick={() => onPlace({ ox: pos.ox, oy: pos.oy + 1 })}
                        >
                          <ChevronDown className="size-4" />
                        </button>
                        <span />
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
              <ul className="ns-plot-perks">
                {["Workplace appears on the public map", "Listed in the business directory", "Clickable lot for visitors"].map(
                  (line) => (
                    <li key={line}>
                      <span className="ns-perk-tick">
                        <Check className="size-2.5" />
                      </span>
                      {line}
                    </li>
                  ),
                )}
              </ul>
            </>
          ) : null}

          <div className="ns-plot-badges">
            <span className="ns-badge">{theme.label}</span>
            <span className="ns-badge ns-badge-ghost">{formatSqFt(area.sqft)}</span>
            {owned && inside.length ? <span className="ns-badge">{inside.length} on site</span> : null}
          </div>

          <div className="ns-plot-actions">
            {park ? null : plot.zone === "ultimate" ? (
              <button type="button" className="ns-game-btn" onClick={onBid}>
                Bid for the Beacon · {theme.price}
              </button>
            ) : listed ? (
              <button type="button" className="ns-game-btn" onClick={onBuy}>
                Claim this plot · {formatUsd(price)}
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
