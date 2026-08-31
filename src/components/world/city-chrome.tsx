"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowDownToLine, Compass, Keyboard, Map, MapPin, Minus, Plus } from "lucide-react";
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
  shopActivity,
} from "@/lib/city-shop";
import { coverageOfClaims, expandPrice, fitPlace, formatSqFt, getPlot, LAND_ORIGIN, LAND_USES, MAX_CLAIMS, listSalePlots, maxExpandFor, openSaleCount, plotArea, SALE_STOCK, usesForPlot, type PlotZone } from "@/lib/plots";
import { formatUsd } from "@/lib/companies";
import { CAMERA_SHORTCUTS, SHORTCUT_SURFACES } from "@/lib/shortcuts";

export function CityChrome() {
  const {
    world,
    selectedPlotId,
    selectPlot,
    claimedPlotIds,
    claimedExtras,
    claimPlot,
    plotExpand,
    setPlotExpand,
    buildingPlace,
    setBuildingPlace,
    previewUseId,
    setPreviewUseId,
    focusCoord,
    setCameraScale,
    cameraScale,
    zoomBy,
    enterBuilding,
    beaconBidCents,
    placeBeaconBid,
    beaconOpen,
    setBeaconOpen,
    focusPoi,
    mapOverview,
    showCityOverview,
    topView,
    toggleTopView,
    connectBot,
  } = useWorld();
  const [bid, setBid] = useState(String(Math.ceil(beaconBidCents / 100) || BEACON_NEXT_BID));
  const [keysOpen, setKeysOpen] = useState(false);
  const [walkingIn, setWalkingIn] = useState(false);
  const [band, setBand] = useState<"all" | PlotZone>("all");
  const claimed = useMemo(() => new Set(claimedPlotIds), [claimedPlotIds]);
  const occupied = useMemo(
    () => coverageOfClaims(claimedPlotIds, claimedExtras),
    [claimedPlotIds, claimedExtras],
  );
  const listings = useMemo(() => listSalePlots(claimedPlotIds, band, 36, occupied), [claimedPlotIds, band, occupied]);
  const openLots = useMemo(() => openSaleCount(claimedPlotIds), [claimedPlotIds]);
  const activity = useMemo(() => shopActivity(), []);
  const picked = getPlot(selectedPlotId);
  const maxExtra = picked && picked.kind === "sale" && !claimed.has(picked.id)
    ? maxExpandFor(picked, coverageOfClaims(claimedPlotIds, claimedExtras, picked.id))
    : 0;

  const active = world.agents.filter((a) => a.mapId === "lot").length;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "?" || (e.key === "/" && e.shiftKey)) {
        e.preventDefault();
        setKeysOpen((v) => !v);
      }
      if (e.key === "Escape") setKeysOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <header className="ns-topbar">
        <Link href="/" className="ns-logo">
          Agentspace<span>.world</span>
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
          <button
            type="button"
            className="ns-join-link"
            disabled={walkingIn}
            onClick={async () => {
              setWalkingIn(true);
              const result = await connectBot({
                name: `Grok`,
                role: "visitor",
                onlineFor: "7d",
                idleExtend: "24h",
              });
              setWalkingIn(false);
              if (!result.ok) toast.error(result.reason);
              else toast.success("Grok walked in. Look for the nametag on the plaza.");
            }}
          >
            {walkingIn ? "Walking in…" : "Walk a bot in"}
          </button>
          <Link href="/how" className="ns-join-link">
            Join
          </Link>
        </nav>
      </header>

      <aside className="ns-activity" aria-label="Latest Activity">
        <div className="ns-card ns-pad">
          <div className="ns-card-kicker">
            <Activity className="size-3.5" />
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
                    const p = getPlot(row.plotId);
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
            <p>Land for sale</p>
            <span>
              {claimedPlotIds.length}/{MAX_CLAIMS} held
            </span>
          </div>
          <p className="ns-avail-hint">
            {openLots.toLocaleString()} lots open · {SALE_STOCK.toLocaleString()} in the south field at opening. White
            pads are empty. You can claim up to {MAX_CLAIMS} this session.
          </p>
          <button
            type="button"
            className="ns-avail-jump"
            onClick={() => {
              selectPlot("l-0");
              focusCoord(LAND_ORIGIN.x + 8, LAND_ORIGIN.y + 6, 0.78);
            }}
          >
            Fly to the south field
          </button>
          <div className="ns-avail-filters">
            <button type="button" data-on={band === "all" ? "1" : "0"} onClick={() => setBand("all")}>
              All
            </button>
            {ZONE_TABLE.filter((row) => row.key !== "ultimate").map((row) => (
              <button
                key={row.key}
                type="button"
                data-on={band === row.key ? "1" : "0"}
                onClick={() => setBand(row.key)}
              >
                {row.zone}
              </button>
            ))}
          </div>
          <div className="ns-avail-rows">
            {listings.map((p) => {
              const area = plotArea(p);
              return (
                <button
                  key={p.id}
                  type="button"
                  className="ns-avail-row"
                  data-on={selectedPlotId === p.id ? "1" : "0"}
                  onClick={() => {
                    selectPlot(p.id);
                    focusCoord(p.x + p.w / 2, p.y + p.h / 2, 0.95);
                  }}
                >
                  <span className="ns-avail-zone">
                    <i className="ns-dot ns-dot-downtown" />
                    <span className="ns-avail-lot">
                      <strong>{p.groupLabel}</strong>
                      <em>
                        {formatSqFt(area.sqft)} · {ZONE_THEME[p.zone].label}
                      </em>
                    </span>
                  </span>
                  <span className="ns-avail-nums">
                    <em>{formatUsd(p.price)}</em>
                  </span>
                </button>
              );
            })}
            {listings.length === 0 ? <p className="ns-avail-empty">No open lots in this band.</p> : null}
          </div>
        </div>
      </aside>

      <div className="ns-zoom">
        <button type="button" aria-label="Zoom in" onClick={() => zoomBy(true)}>
          <Plus className="size-4" />
        </button>
        <button type="button" aria-label="Zoom out" onClick={() => zoomBy(false)}>
          <Minus className="size-4" />
        </button>
        <button
          type="button"
          className="ns-zoom-map"
          data-on={mapOverview ? "1" : "0"}
          aria-pressed={mapOverview}
          aria-label={mapOverview ? "Leave whole-city view" : "See the whole city"}
          title={mapOverview ? "Street view" : "Whole city"}
          onClick={() => {
            if (mapOverview) {
              focusPoi("civic");
              return;
            }
            showCityOverview();
          }}
        >
          <Map className="size-4" />
        </button>
        <button
          type="button"
          className="ns-zoom-top"
          data-on={topView ? "1" : "0"}
          aria-pressed={topView}
          aria-label={topView ? "Leave top view" : "Look straight down"}
          title={topView ? "Angle view" : "Top view"}
          onClick={() => toggleTopView()}
        >
          <ArrowDownToLine className="size-4" />
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
        <button
          type="button"
          className="ns-zoom-keys"
          data-on={keysOpen ? "1" : "0"}
          aria-pressed={keysOpen}
          aria-label={keysOpen ? "Hide shortcuts" : "Show shortcuts"}
          title="Shortcuts"
          onClick={() => setKeysOpen((v) => !v)}
        >
          <Keyboard className="size-4" />
        </button>
      </div>

      {keysOpen ? (
        <aside className="ns-keys" aria-label="Shortcuts">
          <div className="ns-card ns-pad">
            <div className="ns-card-kicker">
              <Keyboard className="size-3.5" />
              <p>Shortcuts</p>
            </div>
            <ul className="ns-keys-list">
              {CAMERA_SHORTCUTS.map((row) => (
                <li key={row.keys}>
                  <kbd>{row.keys}</kbd>
                  <span>{row.does}</span>
                </li>
              ))}
            </ul>
            <p className="ns-keys-where">Listed in the same words here, in the README, and on Join.</p>
            <ul className="ns-keys-surfaces">
              {SHORTCUT_SURFACES.map((row) => (
                <li key={row.id}>{row.where}</li>
              ))}
            </ul>
          </div>
        </aside>
      ) : null}

      {picked ? (
        <PlotSheet
          plot={picked}
          claimed={claimed.has(picked.id)}
          agents={world.agents}
          previewUseId={previewUseId}
          extra={Math.min(plotExpand, maxExtra)}
          maxExtra={maxExtra}
          place={buildingPlace}
          onPreviewUse={(id) => {
            setPreviewUseId(id);
            if (!picked) return;
            const use = LAND_USES.find((u) => u.id === id);
            if (use) setBuildingPlace(fitPlace(picked, use, Math.min(plotExpand, maxExtra), buildingPlace));
          }}
          onExtra={(n) => {
            setPlotExpand(n);
            if (!picked) return;
            const uses = usesForPlot(picked, n);
            const nextId = uses.some((u) => u.id === previewUseId) ? previewUseId : (uses[0]?.id ?? "kiosk");
            if (nextId !== previewUseId) setPreviewUseId(nextId);
            const use = LAND_USES.find((u) => u.id === nextId);
            if (use) setBuildingPlace(fitPlace(picked, use, n, buildingPlace));
          }}
          onPlace={setBuildingPlace}
          onClose={() => selectPlot(null)}
          onBuy={() => {
            const extra = Math.min(plotExpand, maxExtra);
            const ok = claimPlot(picked.id, extra, buildingPlace, previewUseId);
            const price = expandPrice(picked, extra);
            if (ok)
              toast.success(
                `Plot secured · ${formatUsd(price)}${extra ? ` · +${extra} expand` : ""}. ${claimedPlotIds.length + 1}/${MAX_CLAIMS} this session.`,
              );
            else if (claimedPlotIds.length >= MAX_CLAIMS)
              toast.error(`Lot cap reached — ${MAX_CLAIMS} per session.`);
            else toast.error("That expand hits a road, a neighbour you do not own, or the lot cap.");
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
            <p className="ns-bid-kicker">Agentspace championship seat</p>
            <h2 id="beacon-title">The Beacon</h2>
            <p className="ns-bid-copy">
              Current holder: Agentspace. Every bid is a non-refundable raise in this session. The holder keeps the HQ
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
