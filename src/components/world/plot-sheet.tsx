"use client";

import {
  Check,
  Landmark,
  Minus,
  Plus,
  X,
} from "lucide-react";
import { LOT_BUILDINGS } from "@/lib/campus";
import { companyForBuilding, formatUsd, isCivicBuilding } from "@/lib/companies";
import { ZONE_THEME } from "@/lib/city-shop";
import {
  MAX_EXPAND,
  districtForPlot,
  expandPrice,
  expandedRect,
  plotArea,
  usesForPlot,
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
  onClose,
  onBuy,
  onEnter,
  onBid,
  onPreviewUse,
  onExtra,
}: {
  plot: Plot;
  claimed: boolean;
  agents: Agent[];
  previewUseId: string;
  extra: number;
  maxExtra: number;
  onClose: () => void;
  onBuy: () => void;
  onEnter: (buildingId: string) => void;
  onBid: () => void;
  onPreviewUse: (id: string) => void;
  onExtra: (n: number) => void;
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
  const cells = Math.min(area.tiles, 36);
  const price = listed ? expandPrice(plot, extra) : plot.price;

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

          <div
            className="ns-footprint"
            style={{ gridTemplateColumns: `repeat(${grown.w}, 1fr)` }}
            aria-label={`Footprint ${area.footprint} tiles`}
          >
            {Array.from({ length: cells }, (_, i) => (
              <i key={i} />
            ))}
          </div>

          <dl className="ns-plot-facts">
            <div>
              <dt>Size</dt>
              <dd>
                {area.footprint} tiles
                <span>
                  {area.tiles} tiles · {area.meters.toLocaleString()} m²
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
              <dt>Status</dt>
              <dd>
                {listed ? "For sale" : claimed ? "Claimed" : owned ? "Occupied" : park ? "Protected" : plot.kind}
                <span>
                  {grown.w} street front × {grown.h} deep
                </span>
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
                    +{extra} tile{extra === 1 ? "" : "s"}
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
                <p>Building on this lot — shown on the map</p>
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
                          {u.minW}×{u.minH} tiles · {u.blurb}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
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
            <span className="ns-badge ns-badge-ghost">{area.footprint}</span>
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
