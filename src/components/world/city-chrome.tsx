"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowDownToLine, Compass, Keyboard, Map, MapPin, Minus, Plus } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { PlotSheet } from "@/components/world/plot-sheet";
import { ClaimSetupWizard } from "@/components/world/claim-setup-wizard";
import { CompanyProfileCard } from "@/components/world/company-profile";
import { BuildingStudio } from "@/components/world/building-studio";
import { useWorld } from "@/components/world/world-store";
import {
  BEACON_NEXT_BID,
  ZONE_THEME,
  beaconPlot,
  relativePurchase,
  shopActivity,
} from "@/lib/city-shop";
import { bestAdjoiningSale, buildingSize, centerPlace, claimIssueFor, claimedCoversPlot, coverageOfClaims, expandPrice, getPlot, LAND_USES, MAX_CLAIMS, maxExpandFor, plotArea, plotRect, resizeSlice, usesForPlot, workingLand } from "@/lib/plots";
import { formatUsd } from "@/lib/companies";
import { WORLD_BUILDINGS } from "@/lib/campus";
import { profileOf, visitSiteUrl } from "@/lib/company-profile";
import { brandProfileFileName, brandProfileFromCompanyProfile, downloadBrandProfile } from "@/lib/brand-profile";
import { CAMERA_SHORTCUTS, SHORTCUT_SURFACES } from "@/lib/shortcuts";
import { ARCH_VIEW_LABEL, type ArchView } from "@/lib/arch-viz";

export function CityChrome() {
  const {
    world,
    selectedPlotId,
    selectedPlotIds,
    selectedBuildingId,
    selectPlot,
    claimedPlotIds,
    claimedExtras,
    claimPlot,
    claimPlots,
    plotExpand,
    setPlotExpand,
    buildingPlace,
    setBuildingPlace,
    previewUseId,
    setPreviewUseId,
    landSlice,
    setLandSlice,
    focusCoord,
    setCameraScale,
    zoomBy,
    enterBuilding,
    interiorId,
    buildingSpecs,
    beaconBidCents,
    placeBeaconBid,
    beaconOpen,
    setBeaconOpen,
    focusPoi,
    mapOverview,
    showCityOverview,
    topView,
    toggleTopView,
    archView,
    setArchView,
    connectBot,
    openClaimSetup,
  } = useWorld();
  const [bid, setBid] = useState(String(Math.ceil(beaconBidCents / 100) || BEACON_NEXT_BID));
  const [keysOpen, setKeysOpen] = useState(false);
  const [walkingIn, setWalkingIn] = useState(false);
  const occupied = useMemo(
    () => coverageOfClaims(claimedPlotIds, claimedExtras),
    [claimedPlotIds, claimedExtras],
  );
  const activity = useMemo(() => shopActivity(), []);
  const picked = getPlot(selectedPlotId);
  const pickedClaimed = Boolean(picked && claimedCoversPlot(picked.id, claimedPlotIds));
  const worldBuilding = selectedBuildingId
    ? WORLD_BUILDINGS.find((b) => b.id === selectedBuildingId)
    : undefined;
  const occupiedId =
    worldBuilding?.id ?? (pickedClaimed && picked && buildingSpecs[picked.id] ? picked.id : null);
  const showCompany = Boolean(!interiorId && occupiedId);
  const occupiedSpec = occupiedId ? buildingSpecs[occupiedId] : undefined;
  const occupiedProfile = occupiedId ? profileOf(occupiedSpec, occupiedId) : null;
  const pickedCompanyReady = Boolean(
    pickedClaimed && picked && buildingSpecs[picked.id]?.profile?.name?.trim(),
  );
  const pickedProfile = pickedClaimed && picked ? buildingSpecs[picked.id]?.profile : undefined;
  const pickedBuildingReady = Boolean(pickedProfile?.buildingAssetId);
  const pickedBuildingFailed = pickedProfile?.buildingStatus === "failed";
  const ownedBrand =
    pickedClaimed && picked && pickedCompanyReady && occupiedProfile && occupiedId === picked.id
      ? brandProfileFromCompanyProfile(picked.id, occupiedProfile)
      : null;
  const exportOwnedBrand = ownedBrand
    ? () => {
        downloadBrandProfile(ownedBrand);
        toast.success(`${brandProfileFileName(ownedBrand)} downloaded.`);
      }
    : undefined;
  const land = picked ? workingLand(picked, landSlice ?? plotRect(picked)) : undefined;
  const selectedLands = selectedPlotIds
    .map((id) => {
      const p = getPlot(id);
      if (!p) return null;
      if (id === selectedPlotId && landSlice) return workingLand(p, landSlice);
      return p;
    })
    .filter((p): p is NonNullable<typeof p> => Boolean(p));
  const selectedSqFt = selectedLands.reduce((n, p) => n + plotArea(p).sqft, 0);
  const selectedPrice = selectedLands.reduce((n, p) => n + p.price, 0);
  const maxExtra =
    land && land.kind === "sale" && !pickedClaimed
      ? maxExpandFor(
          land,
          coverageOfClaims(claimedPlotIds, claimedExtras, picked?.id),
          LAND_USES.find((u) => u.id === previewUseId),
          buildingPlace,
        )
      : 0;
  const issue =
    land && land.kind === "sale" && !pickedClaimed
      ? claimIssueFor(selectedLands.length ? selectedLands : [land], claimedPlotIds, claimedExtras)
      : null;
  const adjoining = land
    ? bestAdjoiningSale(land, [...claimedPlotIds, ...selectedPlotIds])
    : undefined;

  const active = world.agents.filter((a) => a.mapId === "lot").length;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "?" || (e.key === "/" && e.shiftKey)) {
        e.preventDefault();
        setKeysOpen((v) => !v);
      }
      if (e.key === "Escape") {
        setKeysOpen(false);
        selectPlot(null);
      }
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
          <Link href="/bots">Bot floor</Link>
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

      <BuildingStudio />

      <div className="ns-arch-views" role="group" aria-label="Echt Studio camera">
        {(Object.keys(ARCH_VIEW_LABEL) as ArchView[]).map((id) => (
          <button
            key={id}
            type="button"
            data-on={archView === id ? "1" : "0"}
            aria-pressed={archView === id}
            onClick={() => setArchView(archView === id ? null : id)}
          >
            {ARCH_VIEW_LABEL[id]}
          </button>
        ))}
      </div>
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
          aria-label={topView ? "Leave crew view" : "Crew view (top-down)"}
          title={topView ? "Angle view" : "Crew view"}
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

      {showCompany && occupiedProfile && occupiedId ? (
        <CompanyProfileCard
          profile={occupiedProfile}
          owned={Boolean(pickedClaimed && occupiedId === picked?.id)}
          onClose={() => selectPlot(null)}
          onEnter={() => enterBuilding(occupiedId)}
          onVisit={
            visitSiteUrl(occupiedProfile)
              ? () => {
                  const url = visitSiteUrl(occupiedProfile);
                  if (url) window.open(url, "_blank", "noopener,noreferrer");
                }
              : () => {
                  const b = WORLD_BUILDINGS.find((row) => row.id === occupiedId);
                  if (b) focusCoord(b.origin.x + b.size.x / 2, b.origin.y + b.size.y / 2, 1.55);
                }
          }
          visitLabel={visitSiteUrl(occupiedProfile) ? "Visit site" : "View on map"}
          onExportBrand={exportOwnedBrand}
          exportBrandName={ownedBrand ? brandProfileFileName(ownedBrand) : undefined}
          onBuildHq={
            pickedClaimed && picked && occupiedId === picked.id && !pickedBuildingReady
              ? () => openClaimSetup(picked.id, "build")
              : undefined
          }
        />
      ) : picked && land && !interiorId ? (
        <PlotSheet
          plot={picked}
          land={land}
          claimed={pickedClaimed}
          selectedCount={Math.max(1, selectedLands.length)}
          selectedSqFt={selectedSqFt || plotArea(land).sqft}
          selectedPrice={selectedPrice || land.price}
          agents={world.agents}
          previewUseId={previewUseId}
          extra={Math.min(plotExpand, maxExtra)}
          maxExtra={maxExtra}
          place={buildingPlace}
          landSlice={landSlice ?? plotRect(picked)}
          maxLandGrow={Boolean(
            landSlice && landSlice.w >= picked.w && landSlice.h >= picked.h,
          )}
          claimIssue={issue}
          remainingClaims={Math.max(0, MAX_CLAIMS - claimedPlotIds.length)}
          adjoining={adjoining}
          onPreviewUse={(id) => {
            setPreviewUseId(id);
            const use = LAND_USES.find((u) => u.id === id);
            if (!use) return;
            setPlotExpand(0);
            const size = buildingSize(land, use, 0);
            setBuildingPlace(size ? centerPlace(land.w, land.h, size.w, size.h) : { ox: 0, oy: 0 });
          }}
          onExtra={(n) => {
            setPlotExpand(n);
            const uses = usesForPlot(land, n);
            const nextId = uses.some((u) => u.id === previewUseId) ? previewUseId : (uses[0]?.id ?? "kiosk");
            if (nextId !== previewUseId) setPreviewUseId(nextId);
          }}
          onPlace={setBuildingPlace}
          onLandSlice={(s) => {
            setLandSlice(s);
            setPlotExpand(0);
            const next = workingLand(picked, s);
            const uses = usesForPlot(next, 0);
            const nextId = uses.some((u) => u.id === previewUseId) ? previewUseId : (uses[0]?.id ?? "kiosk");
            const use = LAND_USES.find((u) => u.id === nextId) ?? LAND_USES[0]!;
            const size = buildingSize(next, use, 0);
            setBuildingPlace(size ? centerPlace(next.w, next.h, size.w, size.h) : { ox: 0, oy: 0 });
            if (nextId !== previewUseId) setPreviewUseId(nextId);
          }}
          onResizeLand={(delta) => {
            const cur = landSlice ?? plotRect(picked);
            const nextSlice = resizeSlice(picked, cur, delta);
            setLandSlice(nextSlice);
            const next = workingLand(picked, nextSlice);
            const use = LAND_USES.find((u) => u.id === previewUseId) ?? LAND_USES[0]!;
            const size = buildingSize(next, use, plotExpand);
            setBuildingPlace(size ? centerPlace(next.w, next.h, size.w, size.h) : { ox: 0, oy: 0 });
          }}
          onAddAdjoining={() => {
            if (!adjoining) return;
            if (pickedClaimed) {
              const extra = Math.min(plotExpand, maxExtra);
              const ok = claimPlot(adjoining.id, 0);
              if (ok)
                toast.success(
                  `Adjoining lot claimed · ${formatUsd(adjoining.price)}. ${claimedPlotIds.length + 1}/${MAX_CLAIMS} this session.`,
                );
              else if (claimedPlotIds.length >= MAX_CLAIMS)
                toast.error(`Lot cap reached — ${MAX_CLAIMS} per session.`);
              else toast.error("That adjoining pad hits owned land or the lot cap.");
              void extra;
              return;
            }
            selectPlot(adjoining.id, { additive: true });
            focusCoord(adjoining.x + adjoining.w / 2, adjoining.y + adjoining.h / 2, 0.95);
            toast.message(`Added ${adjoining.groupLabel}. Shift-click more lots, then Claim.`);
          }}
          onClose={() => selectPlot(null)}
          onBuy={() => {
            const extra = Math.min(plotExpand, maxExtra);
            const ids = selectedPlotIds.length ? selectedPlotIds : [picked.id];
            const result = claimPlots(ids, extra, buildingPlace, previewUseId, landSlice);
            const price = selectedPrice || expandPrice(land, extra);
            if (result.ok)
              toast.success(
                `${result.count > 1 ? `${result.count} plots` : "Plot"} secured · ${formatUsd(price)}. Set up your company, then build your HQ from your website brand.`,
              );
            else if (result.reason === "cap")
              toast.error(`Lot cap reached — ${MAX_CLAIMS} per session.`);
            else if (result.reason === "overlap")
              toast.error("That claim hits a road, a neighbour, or owned land.");
            else toast.error("That claim hits a road, a neighbour, or the lot cap.");
          }}
          onEnter={enterBuilding}
          onBid={() => setBeaconOpen(true)}
          onSetupCompany={pickedClaimed && picked ? () => openClaimSetup(picked.id) : undefined}
          companyReady={pickedCompanyReady}
          buildingReady={pickedBuildingReady}
          buildingFailed={pickedBuildingFailed}
          onExportBrand={exportOwnedBrand}
          exportBrandName={ownedBrand ? brandProfileFileName(ownedBrand) : undefined}
          onBuildHq={
            pickedClaimed && picked && pickedCompanyReady
              ? () => openClaimSetup(picked.id, "build")
              : undefined
          }
        />
      ) : null}

      <ClaimSetupWizard />

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
