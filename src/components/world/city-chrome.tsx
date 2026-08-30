"use client";

import { useMemo, useState } from "react";
import { Activity, Compass, MapPin, Minus, Plus } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { PlotSheet } from "@/components/world/plot-sheet";
import { useWorld } from "@/components/world/world-store";
import {
  BEACON_NEXT_BID,
  ZONE_TABLE,
  ZONE_THEME,
  beaconPlot,
  relativePurchase,
  sampleSalePlot,
  shopActivity,
  zoneCount,
} from "@/lib/city-shop";
import { PLOTS } from "@/lib/plots";
import { formatUsd } from "@/lib/companies";

export function CityChrome() {
  const {
    world,
    selectedPlotId,
    selectPlot,
    claimedPlotIds,
    claimPlot,
    focusCoord,
    setCameraScale,
    cameraScale,
    enterBuilding,
    beaconBidCents,
    placeBeaconBid,
    beaconOpen,
    setBeaconOpen,
    focusPoi,
  } = useWorld();
  const [bid, setBid] = useState(String(Math.ceil(beaconBidCents / 100) || BEACON_NEXT_BID));
  const claimed = useMemo(() => new Set(claimedPlotIds), [claimedPlotIds]);
  const counts = useMemo(() => {
    const next: Record<string, number> = {};
    for (const row of ZONE_TABLE) next[row.key] = zoneCount(row.key, claimed);
    return next;
  }, [claimed]);
  const activity = useMemo(() => shopActivity(), []);
  const picked = selectedPlotId ? PLOTS.find((p) => p.id === selectedPlotId) : undefined;

  const active = world.agents.filter((a) => a.mapId === "lot").length;

  return (
    <>
      <header className="ns-topbar">
        <Link href="/" className="ns-logo">
          Northshore<span>.world</span>
        </Link>
        <p className="ns-live">
          <span className="ns-live-dot" />
          {active} active now
        </p>
        <div className="ns-ticker" aria-hidden>
          <div className="ns-ticker-track">
            {[...activity, ...activity].map((row, i) => (
              <span key={`${row.id}-${i}`}>
                {row.brandName} — {ZONE_THEME[row.zone].label}
                <em> View on the map</em>
              </span>
            ))}
          </div>
        </div>
        <nav className="ns-topnav">
          <Link href="/directory">Directory</Link>
          <Link href="/how" className="ns-join-link">
            Join
          </Link>
        </nav>
      </header>

      <aside className="ns-activity" aria-label="Latest Activity">
        <div className="ns-card ns-pad">
          <div className="ns-card-kicker">
            <Activity className="size-3.5 text-emerald-300" />
            <p>Latest Activity</p>
          </div>
          <div className="ns-activity-list">
            {activity.map((row) => (
              <div key={row.id} className="ns-activity-row">
                <div className="min-w-0">
                  <p className="ns-activity-brand">{row.brandName}</p>
                  <p className="ns-activity-meta">
                    {ZONE_THEME[row.zone].label.toLowerCase()} · {relativePurchase(row.acquiredAt)}
                  </p>
                </div>
                <button
                  type="button"
                  className="ns-icon-btn"
                  aria-label={`View ${row.brandName} on the map`}
                  onClick={() => {
                    const p = PLOTS.find((item) => item.id === row.plotId);
                    if (!p) return;
                    selectPlot(p.id);
                    focusCoord(p.x + p.w / 2, p.y + p.h / 2, 1.05);
                  }}
                >
                  <MapPin className="size-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </aside>

      <aside className="ns-avail" aria-label="Plots Available">
        <div className="ns-card ns-pad">
          <div className="ns-avail-head">
            <p>Plots Available</p>
            <span>one-time</span>
          </div>
          <div className="ns-avail-rows">
            {ZONE_TABLE.map((row) => (
              <button
                key={row.key}
                type="button"
                className="ns-avail-row"
                onClick={() => {
                  if (row.key === "ultimate") {
                    const p = beaconPlot();
                    if (p) {
                      selectPlot(p.id);
                      focusCoord(p.x + p.w / 2, p.y + p.h / 2, 1.2);
                    }
                    setBeaconOpen(true);
                    return;
                  }
                  const p = sampleSalePlot(row.key, claimed);
                  if (!p) return;
                  selectPlot(p.id);
                  focusCoord(p.x + p.w / 2, p.y + p.h / 2, 0.95);
                }}
              >
                <span className="ns-avail-zone">
                  <i className={row.dot} />
                  {row.zone}
                </span>
                <span className="ns-avail-nums">
                  <strong>{row.key === "ultimate" ? 0 : counts[row.key]?.toLocaleString()}</strong>
                  <em style={{ color: ZONE_THEME[row.key].color }}>{row.priceLabel}</em>
                </span>
              </button>
            ))}
          </div>
          <p className="ns-avail-note">Protected park tiles are not for sale.</p>
        </div>
      </aside>

      <div className="ns-zoom">
        <button type="button" aria-label="Zoom in" onClick={() => setCameraScale(Math.min(2.2, cameraScale + 0.22))}>
          <Plus className="size-4" />
        </button>
        <button type="button" aria-label="Zoom out" onClick={() => setCameraScale(Math.max(0.12, cameraScale - 0.22))}>
          <Minus className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Reset view"
          onClick={() => {
            focusPoi("civic");
            setCameraScale(0.55);
          }}
        >
          <Compass className="size-4" />
        </button>
      </div>

      {picked ? (
        <PlotSheet
          plot={picked}
          claimed={claimed.has(picked.id)}
          agents={world.agents}
          onClose={() => selectPlot(null)}
          onBuy={() => {
            const ok = claimPlot(picked.id);
            if (ok) toast.success(`Plot secured · ${formatUsd(picked.price)}. Local listing only — no charge.`);
            else toast.error("That plot is not for sale.");
          }}
          onEnter={enterBuilding}
          onBid={() => setBeaconOpen(true)}
        />
      ) : null}

      {beaconOpen ? (
        <div className="ns-bid-scrim" role="presentation" onClick={() => setBeaconOpen(false)}>
          <div
            className="ns-bid"
            role="dialog"
            aria-labelledby="beacon-title"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="ns-bid-kicker">Northshore championship seat</p>
            <h2 id="beacon-title">The Beacon</h2>
            <p className="ns-bid-copy">
              Current holder: Northshore. Every bid is a non-refundable raise in this session. The holder keeps the HQ
              halo until someone posts a higher total.
            </p>
            <dl className="ns-bid-stats">
              <div>
                <dt>Live bid</dt>
                <dd>{formatUsd(beaconBidCents / 100)}</dd>
              </div>
              <div>
                <dt>Next minimum</dt>
                <dd>{formatUsd(Math.max(BEACON_NEXT_BID, beaconBidCents / 100 + 40))}</dd>
              </div>
            </dl>
            <label className="ns-bid-label">
              Your total (USD)
              <input
                value={bid}
                inputMode="numeric"
                onChange={(e) => setBid(e.target.value.replace(/[^\d]/g, ""))}
              />
            </label>
            <div className="ns-bid-actions">
              <button type="button" className="ns-ghost" onClick={() => setBeaconOpen(false)}>
                Close
              </button>
              <button
                type="button"
                className="ns-game-btn"
                onClick={() => {
                  const n = Number(bid);
                  const min = Math.max(BEACON_NEXT_BID, beaconBidCents / 100 + 40);
                  if (!Number.isFinite(n) || n < min) {
                    toast.error(`Enter at least ${formatUsd(min)}.`);
                    return;
                  }
                  placeBeaconBid(n * 100);
                  setBeaconOpen(false);
                  const p = beaconPlot();
                  if (p) selectPlot(p.id);
                  toast.success(`Beacon bid posted · ${formatUsd(n)}.`);
                }}
              >
                Place bid — challenge the holder
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
