"use client";

import { Check, Landmark, X } from "lucide-react";
import { LOT_BUILDINGS } from "@/lib/campus";
import { companyForBuilding, formatUsd, isCivicBuilding } from "@/lib/companies";
import { ZONE_THEME } from "@/lib/city-shop";
import { districtForPlot, plotArea, usesForPlot, type Plot } from "@/lib/plots";
import type { Agent } from "@/lib/types";

export function PlotSheet({
  plot,
  claimed,
  agents,
  onClose,
  onBuy,
  onEnter,
  onBid,
}: {
  plot: Plot;
  claimed: boolean;
  agents: Agent[];
  onClose: () => void;
  onBuy: () => void;
  onEnter: (buildingId: string) => void;
  onBid: () => void;
}) {
  const theme = ZONE_THEME[plot.zone];
  const building = plot.buildingId ? LOT_BUILDINGS.find((b) => b.id === plot.buildingId) : undefined;
  const company = building ? companyForBuilding(building.id) : undefined;
  const civic = plot.kind === "civic" || (building ? isCivicBuilding(building.id) : false);
  const park = plot.kind === "park";
  const inside = building ? agents.filter((a) => a.buildingId === building.id) : [];
  const owned = Boolean(building) && !claimed && plot.kind === "owned";
  const listed = !park && !civic && plot.kind === "sale" && !claimed;
  const area = plotArea(plot);
  const district = districtForPlot(plot);
  const uses = usesForPlot(plot);
  const cells = Math.min(area.tiles, 36);

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
            <p className="ns-plot-price">{formatUsd(plot.price)}</p>
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
            style={{ gridTemplateColumns: `repeat(${plot.w}, 1fr)` }}
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
                {formatUsd(plot.price)}
                <span>one-time</span>
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
                  {plot.w} street front × {plot.h} deep
                </span>
              </dd>
            </div>
          </dl>

          {listed ? (
            <>
              <div className="ns-plot-uses">
                <p>This lot can take</p>
                <ul>
                  {uses.map((u) => (
                    <li key={u.id}>
                      <strong>{u.name}</strong>
                      <span>{u.blurb}</span>
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
                Claim this plot · {formatUsd(plot.price)}
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
