"use client";

import { Check, Landmark, X } from "lucide-react";
import { LOT_BUILDINGS } from "@/lib/campus";
import { companyForBuilding, isCivicBuilding } from "@/lib/companies";
import { ZONE_THEME } from "@/lib/city-shop";
import type { Plot } from "@/lib/plots";
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

  return (
    <div className="ns-plot-sheet" data-zone={plot.zone}>
      <div className={`ns-card ns-card-zone-${plot.zone}`}>
        {owned && company ? (
          <div className="ns-plot-hero" style={{ background: theme.imgGradient, borderColor: theme.border }}>
            <div className="ns-plot-glow" style={{ background: `radial-gradient(ellipse at 50% 100%, ${theme.glow} 0%, transparent 70%)` }} />
            <p className="ns-plot-hero-brand" style={{ color: theme.color, textShadow: `0 0 16px ${theme.glow}` }}>
              {company.name}
            </p>
          </div>
        ) : park ? (
          <div className="ns-plot-hero" style={{ background: theme.imgGradient, borderColor: theme.border }}>
            <p className="ns-plot-price" style={{ color: "#86eac8" }}>
              Protected
            </p>
            <p className="ns-plot-onetime">not for sale</p>
          </div>
        ) : (
          <div className="ns-plot-hero" style={{ background: theme.imgGradient, borderColor: theme.border }}>
            <div className="ns-plot-glow" style={{ background: `radial-gradient(ellipse at 50% 100%, ${theme.glow} 0%, transparent 65%)` }} />
            <div className="ns-plot-mark" style={{ background: theme.bg, border: `1px solid ${theme.glow}`, boxShadow: `0 0 20px ${theme.glow}` }}>
              <Landmark className="size-6" style={{ color: theme.color }} />
            </div>
            <p className="ns-plot-price" style={{ color: theme.color, textShadow: `0 0 14px ${theme.glow}` }}>
              {claimed ? "Taken" : theme.price}
            </p>
            {!claimed ? <p className="ns-plot-onetime">one-time</p> : null}
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
                    : "Available Plot"}
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
                  : theme.description}
          </p>
          <div className="ns-plot-badges">
            <span className={`ns-badge ns-badge-${plot.zone}`}>{theme.label}</span>
            {owned && inside.length ? <span className="ns-badge">{inside.length} on site</span> : null}
          </div>
          {listed ? (
            <ul className="ns-plot-perks">
              {["Workplace appears on the public map", "Listed for Grok Bot organisations", "Agents walk in over HTTP"].map((line) => (
                <li key={line}>
                  <span className="ns-perk-tick" style={{ background: theme.glow }}>
                    <Check className="size-2.5" style={{ color: theme.color }} />
                  </span>
                  {line}
                </li>
              ))}
            </ul>
          ) : null}
          <div className="ns-plot-actions">
            {park ? null : plot.zone === "ultimate" ? (
              <button type="button" className="ns-game-btn" onClick={onBid}>
                Bid for the Beacon · {theme.price}
              </button>
            ) : listed ? (
              <button type="button" className="ns-game-btn" onClick={onBuy}>
                Secure Checkout · {theme.price}
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
