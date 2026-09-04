"use client";

import { useEffect, useRef, useState } from "react";
import { Download, ExternalLink, Loader2, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { useWorld, type ClaimSetupStep } from "@/components/world/world-store";
import {
  LAND_USES,
  PLACE_ANCHORS,
  buildingSize,
  expandedRect,
  fitPlace,
  footprintFillsLot,
  formatSqFt,
  getPlot,
  matchingAnchor,
  measureTiles,
  placeFromAnchor,
  plotArea,
  usesForPlot,
  TILE_METERS,
  type Plot,
} from "@/lib/plots";
import {
  defaultClaimProfile,
  letterMark,
  mergeProfile,
  normalizeWebsiteUrl,
  visitSiteUrl,
  type CompanyProfile,
} from "@/lib/company-profile";
import {
  COMPANY_TIERS,
  STYLE_KEYWORDS,
  TIER_LABELS,
  brandProfileFileName,
  brandProfileFromCompanyProfile,
  cleanPalette,
  defaultBuildingAssetId,
  downloadBrandProfile,
  type CompanyTier,
  type DerivedBrandProfile,
} from "@/lib/brand-profile";
import type { HqLibraryBuilding } from "@/lib/hq-library";

function hostOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

export function ClaimSetupWizard() {
  const { claimSetupId } = useWorld();
  if (!claimSetupId) return null;
  const plot = getPlot(claimSetupId);
  if (!plot) return null;
  return <ClaimSetupWizardBody key={claimSetupId} claimSetupId={claimSetupId} plot={plot} />;
}

function ClaimSetupWizardBody({ claimSetupId, plot }: { claimSetupId: string; plot: Plot }) {
  const {
    dismissClaimSetup,
    saveClaimBuilding,
    finishClaimSetup,
    claimSetupStep,
    buildingSpecs,
    claimedExtras,
    claimedPlaces,
    claimedUses,
  } = useWorld();

  const extra = claimedExtras[claimSetupId] ?? 0;
  const spec = buildingSpecs[claimSetupId];
  const companyName = spec?.profile?.name?.trim() || "Your company";

  const [step, setStep] = useState<ClaimSetupStep>(claimSetupStep);
  const [profile, setProfile] = useState<CompanyProfile>(() => mergeProfile(spec?.profile));
  const [useId, setUseId] = useState(claimedUses[claimSetupId] ?? "office");
  const [place, setPlace] = useState(claimedPlaces[claimSetupId] ?? { ox: 0, oy: 0 });
  const [deriving, setDeriving] = useState(false);
  const [buildingHq, setBuildingHq] = useState(false);
  const [buildError, setBuildError] = useState<string | null>(null);
  const [library, setLibrary] = useState<HqLibraryBuilding[] | null>(null);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [libraryEnvelope, setLibraryEnvelope] = useState<{
    tilesW: number;
    tilesH: number;
    usableW: number;
    usableD: number;
  } | null>(null);
  const [placingId, setPlacingId] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const lastDerivedUrl = useRef<string | null>(profile.brand?.derivedFrom?.url ?? null);
  const deriveSeq = useRef(0);
  const buildAbort = useRef<AbortController | null>(null);
  const buildIgnore = useRef(false);

  useEffect(() => {
    setStep(claimSetupStep);
  }, [claimSetupStep, claimSetupId]);

  useEffect(() => {
    if (step !== "build") return;
    let cancelled = false;
    setLibraryError(null);
    void (async () => {
      try {
        const res = await fetch(`/v1/brand/library?plotId=${encodeURIComponent(claimSetupId)}`);
        const data = (await res.json()) as {
          ok: boolean;
          buildings?: HqLibraryBuilding[];
          envelope?: { tilesW: number; tilesH: number; usableW: number; usableD: number };
          error?: string;
        };
        if (cancelled) return;
        if (!data.ok || !data.buildings) {
          setLibraryError(data.error ?? "Couldn't load the HQ library.");
          setLibrary([]);
          return;
        }
        setLibrary(data.buildings);
        if (data.envelope) setLibraryEnvelope(data.envelope);
      } catch {
        if (!cancelled) {
          setLibraryError("Couldn't load the HQ library.");
          setLibrary([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [step, claimSetupId]);

  const grown = expandedRect(plot, extra);
  const uses = usesForPlot(plot, extra);
  const use = LAND_USES.find((u) => u.id === useId) ?? uses[0];
  const size = use ? buildingSize(plot, use, extra, place) : null;
  const pos = use && size ? fitPlace(plot, use, extra, place) : place;
  const activeAnchor = size ? matchingAnchor(pos, grown.w, grown.h, size.w, size.h) : null;
  const bldg = size ? measureTiles(size.w, size.h) : null;
  const fillsLot = size ? footprintFillsLot(grown.w, grown.h, size.w, size.h) : false;
  const siteUrl = visitSiteUrl(profile);
  const mark = letterMark(profile.name || "Co");
  const area = plotArea(plot);

  const canContinue = profile.name.trim().length > 0;
  const placementSummary =
    !use || !bldg
      ? "Pick a building type to preview footprint."
      : `${use.name} · ${bldg.w}×${bldg.h} tiles${fillsLot ? " · full lot" : ""}`;

  const setProfileField = (patch: Partial<CompanyProfile>) => setProfile((prev) => mergeProfile(prev, patch));
  const setPalette = (palette: string[]) => setProfile((prev) => ({ ...prev, palette }));
  const setTier = (tier: CompanyTier) => setProfile((prev) => ({ ...prev, tier }));
  const toggleKeyword = (kw: string) =>
    setProfile((prev) => {
      const current = prev.brand?.styleKeywords ?? [];
      const next = current.includes(kw) ? current.filter((k) => k !== kw) : [...current, kw];
      return { ...prev, brand: { ...prev.brand, styleKeywords: next } };
    });

  const palette = profile.palette ?? [];
  const keywords = profile.brand?.styleKeywords ?? [];
  const brandPulled = Boolean(profile.brand?.derivedFrom);
  const derivedHost = hostOf(profile.brand?.derivedFrom?.url) ?? "your site";
  const defaultName = defaultClaimProfile(use?.name).name;
  const brandForExport = brandProfileFromCompanyProfile(claimSetupId, profile);

  const pullFromWebsite = async (force = false) => {
    const url = normalizeWebsiteUrl(profile.website ?? "");
    if (!url) {
      if (force) toast.error("Enter a website URL first.");
      return;
    }
    if (!force && lastDerivedUrl.current === url) return;
    lastDerivedUrl.current = url;
    const seq = ++deriveSeq.current;
    setDeriving(true);
    try {
      const res = await fetch(`/v1/brand/derive?url=${encodeURIComponent(url)}`);
      const { error, ...derived } = (await res.json()) as DerivedBrandProfile;
      if (seq !== deriveSeq.current) return;
      if (error) {
        toast.error(`Couldn't read that site (${error.replace(/_/g, " ")}). You can still fill it in by hand.`);
      }
      setProfile((prev) => {
        const nameEmpty = !prev.name.trim() || prev.name === defaultName;
        const derivedPalette = cleanPalette([...derived.primaryColours, ...derived.secondaryColours]);
        return {
          ...prev,
          name: nameEmpty && derived.companyName && !error ? derived.companyName : prev.name,
          logo: !prev.logo.trim() && derived.logo.imageUrl ? derived.logo.imageUrl : prev.logo,
          tier: error ? prev.tier : derived.tier,
          palette: derivedPalette.length ? derivedPalette : prev.palette,
          description:
            (!prev.description.trim() ||
              prev.description ===
                "You just claimed this lot. Write who you are — name, trade, and a line for the people who knock.") &&
            derived.tagline
              ? derived.tagline
              : prev.description,
          does:
            (!prev.does.trim() || prev.does === "A new house on claimed land.") && derived.industry
              ? derived.industry === "general"
                ? prev.does
                : derived.industry.replace(/\b\w/g, (c) => c.toUpperCase())
              : prev.does,
          brand: derived,
        };
      });
      if (!error) toast.success(`Pulled brand from ${new URL(url).hostname}.`);
    } catch {
      if (seq === deriveSeq.current) toast.error("Couldn't reach the brand service.");
    } finally {
      if (seq === deriveSeq.current) setDeriving(false);
    }
  };

  const exportName = brandProfileFileName(brandForExport);
  const exportBrand = () => {
    downloadBrandProfile(brandForExport);
    toast.success(`${exportName} downloaded.`);
  };

  const onLogoFile = (file: File | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setProfileField({ logo: reader.result });
    };
    reader.readAsDataURL(file);
  };

  const buildPayload = {
    profile,
    useId,
    place: pos,
    extra,
  };

  const stopGenerate = (markFailed: boolean) => {
    buildIgnore.current = true;
    buildAbort.current?.abort();
    buildAbort.current = null;
    setBuildingHq(false);
    if (markFailed) {
      setBuildError("Generation stopped. Pick a library HQ or try again.");
      saveClaimBuilding({
        ...buildPayload,
        profile: { ...profile, buildingStatus: "failed" },
      });
    }
  };

  const placeLibraryHq = (item: HqLibraryBuilding) => {
    if (buildingHq) stopGenerate(false);
    setPlacingId(item.assetId);
    finishClaimSetup({
      ...buildPayload,
      profile: {
        ...profile,
        buildingAssetId: item.assetId,
        buildingMeters: item.buildingMeters,
        buildingYaw: item.yaw,
        buildingStatus: "ready",
        companyAdAssetId: item.companyAdAssetId,
      },
    });
    toast.success(`${item.label} placed on your lot.`);
  };

  const buildHqOnMap = async () => {
    const name = profile.name.trim() || companyName;
    setBuildError(null);
    buildIgnore.current = false;
    saveClaimBuilding({
      ...buildPayload,
      profile: { ...profile, buildingStatus: "building" },
    });
    setBuildingHq(true);
    const ac = new AbortController();
    buildAbort.current = ac;
    const timer = window.setTimeout(() => ac.abort(), 480_000);
    const expectedId = defaultBuildingAssetId(brandForExport, claimSetupId);
    try {
      const existing = await fetch(`/v1/brand/asset?assetId=${encodeURIComponent(expectedId)}`, {
        signal: ac.signal,
      });
      const existingData = (await existing.json()) as {
        ok?: boolean;
        exists?: boolean;
        assetId?: string;
        buildingMeters?: { width: number; depth: number; height: number };
      };
      if (!buildIgnore.current && existingData.ok && existingData.exists && existingData.assetId) {
        finishClaimSetup({
          ...buildPayload,
          profile: {
            ...profile,
            buildingAssetId: existingData.assetId,
            buildingMeters: existingData.buildingMeters,
            buildingStatus: "ready",
          },
        });
        toast.success(`${name} HQ is already on disk — placed on your lot.`);
        return;
      }
      const res = await fetch("/v1/brand/build", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plotId: claimSetupId, brand: brandForExport }),
        signal: ac.signal,
      });
      const data = (await res.json()) as {
        ok: boolean;
        assetId?: string;
        url?: string;
        buildingMeters?: { width: number; depth: number; height: number };
        generationFingerprint?: string;
        companyAdAssetId?: string;
        error?: string;
        detail?: string;
      };
      if (buildIgnore.current) return;
      if (!data.ok) {
        throw new Error(data.error ?? "Build failed");
      }
      const assetId = data.assetId ?? expectedId;
      finishClaimSetup({
        ...buildPayload,
        profile: {
          ...profile,
          buildingAssetId: assetId,
          buildingMeters: data.buildingMeters,
          buildingStatus: "ready",
          generationFingerprint: data.generationFingerprint,
          companyAdAssetId: data.companyAdAssetId,
        },
      });
      toast.success(`${name} HQ built and placed on your lot.`);
    } catch (e) {
      if (buildIgnore.current) return;
      const aborted = e instanceof DOMException && e.name === "AbortError";
      const msg = aborted
        ? "Build cancelled"
        : e instanceof Error
          ? e.message
          : "Build failed";
      saveClaimBuilding({
        ...buildPayload,
        profile: { ...profile, buildingStatus: "failed" },
      });
      setBuildError(aborted ? "Generation stopped. Pick a library HQ or try again." : msg);
      if (!aborted) toast.error(`${msg}. Pick a library HQ or try again.`);
    } finally {
      window.clearTimeout(timer);
      if (buildAbort.current === ac) buildAbort.current = null;
      setBuildingHq(false);
    }
  };

  const stepLabel =
    step === "profile" ? "Step 1 of 3" : step === "placement" ? "Step 2 of 3" : "Step 3 of 3";
  const stepTitle =
    step === "profile"
      ? "Name your company"
      : step === "placement"
        ? "Place your building"
        : "Build your HQ";

  return (
    <div
      className="ns-bid-scrim"
      role="presentation"
      onClick={() => {
        if (buildingHq) stopGenerate(true);
        dismissClaimSetup();
      }}
    >
      <div
        className="ns-bid ns-claim-setup"
        data-step={step}
        role="dialog"
        aria-labelledby="claim-setup-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ns-claim-setup-head">
          <div>
            <p className="ns-bid-kicker">{stepLabel}</p>
            <h2 id="claim-setup-title" className="font-heading">
              {stepTitle}
            </h2>
          </div>
          <button
            type="button"
            className="ns-icon-btn"
            aria-label="Close"
            onClick={() => {
              if (buildingHq) stopGenerate(true);
              dismissClaimSetup();
            }}
          >
            <X className="size-4" />
          </button>
        </div>

        {step === "profile" ? (
          <>
            <p className="ns-bid-copy">
              You secured {formatSqFt(area.sqft)} on the south field. Name the house, then pull your website so the HQ
              is yours — not a generic pad.
            </p>
            <div className="ns-claim-preview">
              <div className="ns-company-mark" aria-hidden>
                {profile.logo.trim() ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.logo} alt="" />
                ) : (
                  <span>{mark}</span>
                )}
              </div>
              <div className="ns-claim-preview-copy">
                <strong className="font-heading">{profile.name.trim() || "Your company"}</strong>
                <span>
                  {plot.groupLabel} · {formatSqFt(area.sqft)}
                </span>
              </div>
              <button
                type="button"
                className="ns-ghost ns-visit-site"
                disabled={!siteUrl}
                onClick={() => {
                  if (siteUrl) window.open(siteUrl, "_blank", "noopener,noreferrer");
                }}
              >
                <ExternalLink className="size-3.5" />
                Visit site
              </button>
            </div>
            <div className="ns-studio-profile ns-claim-fields">
              <label>
                Company name
                <input
                  value={profile.name}
                  onChange={(e) => setProfileField({ name: e.target.value })}
                  placeholder="Northwind Robotics"
                  autoFocus
                />
              </label>
              <label>
                Logo URL
                <input
                  value={profile.logo.startsWith("data:") ? "" : profile.logo}
                  onChange={(e) => setProfileField({ logo: e.target.value })}
                  placeholder="https://… or upload below"
                />
              </label>
              <label className="ns-claim-upload">
                Upload logo
                <button
                  type="button"
                  className="ns-ghost ns-claim-upload-btn"
                  onClick={() => logoInputRef.current?.click()}
                >
                  {profile.logo.trim() ? "Replace image" : "Choose image"}
                </button>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => onLogoFile(e.target.files?.[0])}
                />
              </label>
              <label>
                Website URL
                <div className="ns-brand-url-row">
                  <input
                    value={profile.website ?? ""}
                    onChange={(e) => setProfileField({ website: e.target.value })}
                    onBlur={() => void pullFromWebsite(false)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void pullFromWebsite(true);
                      }
                    }}
                    placeholder="https://yourcompany.com"
                    inputMode="url"
                  />
                  <button
                    type="button"
                    className="ns-ghost ns-brand-pull"
                    disabled={deriving || !normalizeWebsiteUrl(profile.website ?? "")}
                    onClick={() => void pullFromWebsite(true)}
                    title="Read colours, logo, and style from your website"
                  >
                    {deriving ? <Loader2 className="size-3.5 ns-spin" /> : <Sparkles className="size-3.5" />}
                    {deriving ? "Reading…" : "Pull from website"}
                  </button>
                </div>
              </label>
            </div>
            {brandPulled || palette.length > 0 ? (
              <div className="ns-brand-panel">
                <div className="ns-brand-row">
                  <span className="ns-brand-label">Palette</span>
                  {palette.length ? (
                    <ul className="ns-swatches" aria-label="Brand palette — click a colour to make it primary">
                      {palette.map((hex, i) => (
                        <li key={hex} data-primary={i === 0 ? "1" : "0"}>
                          <button
                            type="button"
                            className="ns-swatch"
                            style={{ background: hex }}
                            title={`${hex}${i === 0 ? " · primary" : " · click to make primary"}`}
                            aria-label={`${hex}${i === 0 ? ", primary colour" : ", make primary"}`}
                            onClick={() => {
                              if (i === 0) return;
                              setPalette([hex, ...palette.filter((c) => c !== hex)]);
                            }}
                          />
                          <button
                            type="button"
                            className="ns-swatch-x"
                            aria-label={`Remove ${hex}`}
                            onClick={() => setPalette(palette.filter((c) => c !== hex))}
                          >
                            <X className="size-2.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="ns-plot-hint">No brand colours found — the map keeps the default accent.</span>
                  )}
                </div>
                <div className="ns-brand-row">
                  <span className="ns-brand-label">Size</span>
                  <div className="ns-segmented" role="radiogroup" aria-label="Company size">
                    {COMPANY_TIERS.map((t) => (
                      <button
                        key={t}
                        type="button"
                        role="radio"
                        aria-checked={(profile.tier ?? "smb") === t}
                        data-on={(profile.tier ?? "smb") === t ? "1" : "0"}
                        onClick={() => setTier(t)}
                      >
                        {TIER_LABELS[t]}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="ns-brand-row">
                  <span className="ns-brand-label">Style</span>
                  <ul className="ns-brand-chips" aria-label="Style keywords">
                    {STYLE_KEYWORDS.map((kw) => (
                      <li key={kw}>
                        <button
                          type="button"
                          className="ns-chip"
                          data-on={keywords.includes(kw) ? "1" : "0"}
                          onClick={() => toggleKeyword(kw)}
                        >
                          {kw}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
                {profile.brand?.derivedFrom ? (
                  <p className="ns-plot-hint">
                    Read from {derivedHost} · confidence {Math.round(profile.brand.derivedFrom.confidence * 100)}%. Adjust
                    anything that looks off.
                  </p>
                ) : null}
              </div>
            ) : null}
            <div className="ns-bid-actions">
              <button type="button" className="ns-ghost" onClick={() => dismissClaimSetup()}>
                Later
              </button>
              <button
                type="button"
                className="ns-game-btn"
                disabled={!canContinue}
                onClick={() => setStep("placement")}
              >
                Continue to placement
              </button>
            </div>
          </>
        ) : step === "placement" ? (
          <>
            <p className="ns-bid-copy">
              Choose what rises on your pad. Placement updates the preview on the map — your website brand drives the
              unique HQ when you build.
            </p>
            <p className="ns-plot-copy">{placementSummary}</p>
            <div className="ns-plot-uses">
              <ul>
                {uses.map((u) => (
                  <li key={u.id}>
                    <button
                      type="button"
                      className="ns-chip"
                      data-on={useId === u.id ? "1" : "0"}
                      onClick={() => {
                        setUseId(u.id);
                        const nextUse = LAND_USES.find((row) => row.id === u.id);
                        if (!nextUse) return;
                        const nextSize = buildingSize(plot, nextUse, extra);
                        setPlace(
                          nextSize
                            ? {
                                ox: Math.floor((plot.w - nextSize.w) / 2),
                                oy: Math.floor((plot.h - nextSize.h) / 2),
                              }
                            : { ox: 0, oy: 0 },
                        );
                      }}
                    >
                      {u.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            {size && use && !fillsLot ? (
              <div className="ns-place-grid" role="group" aria-label="Place on lot">
                {PLACE_ANCHORS.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    title={a.hint}
                    data-on={activeAnchor === a.id ? "1" : "0"}
                    onClick={() => setPlace(placeFromAnchor(grown.w, grown.h, size.w, size.h, a.fx, a.fy))}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="ns-bid-actions">
              <button type="button" className="ns-ghost" onClick={() => setStep("profile")}>
                Back
              </button>
              <button
                type="button"
                className="ns-game-btn"
                onClick={() => {
                  saveClaimBuilding(buildPayload);
                  setStep("build");
                }}
              >
                Continue to build
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="ns-bid-copy">
              Pick a published HQ that already fits this lot, or generate a new one from{" "}
              <strong>{profile.name.trim() || companyName}</strong>.
            </p>
            <div className="ns-hq-lot">
              <span className="font-heading">{plot.groupLabel}</span>
              <span>
                {grown.w}×{grown.h} tiles · {Math.round(grown.w * TILE_METERS)}×{Math.round(grown.h * TILE_METERS)} m lot
                {libraryEnvelope
                  ? ` · ${libraryEnvelope.usableW.toFixed(1)}×${libraryEnvelope.usableD.toFixed(1)} m usable`
                  : ""}
              </span>
            </div>
            {library === null ? (
              <p className="ns-plot-hint ns-hq-loading">Measuring which HQs fit this pad…</p>
            ) : library.length ? (
              <ul className="ns-hq-grid" aria-label="Library HQs that fit this lot">
                {library.map((item) => (
                  <li key={item.assetId}>
                    <button
                      type="button"
                      className="ns-hq-card"
                      disabled={placingId === item.assetId}
                      onClick={() => placeLibraryHq(item)}
                    >
                      <strong className="font-heading">{item.label}</strong>
                      <span>
                        {item.buildingMeters.width.toFixed(0)}×{item.buildingMeters.depth.toFixed(0)} m
                        {item.rotated ? " · turned 90°" : ""}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="ns-hq-empty">
                <p className="font-heading">None of the library HQs fit this lot</p>
                <p>Generate a new HQ from your brand, sized to this pad.</p>
                {libraryError ? <p className="ns-plot-hint">{libraryError}</p> : null}
              </div>
            )}
            {buildingHq ? (
              <div className="ns-hq-progress">
                <Loader2 className="size-3.5 ns-spin" />
                <p>Blender is generating a new HQ. You can cancel and pick from the library instead.</p>
                <button type="button" className="ns-ghost" onClick={() => stopGenerate(true)}>
                  Cancel generate
                </button>
              </div>
            ) : null}
            {buildError && !buildingHq ? <p className="ns-hq-error">{buildError}</p> : null}
            <div className="ns-hq-generate">
              <div className="ns-hq-generate-copy">
                <strong>Build a new HQ</strong>
                <span>From your website brand in Blender — secondary path.</span>
              </div>
              <button
                type="button"
                className="ns-ghost"
                disabled={buildingHq}
                onClick={() => void buildHqOnMap()}
              >
                {buildingHq ? "Generating…" : "Generate"}
              </button>
            </div>
            <div className="ns-brand-export">
              <button type="button" className="ns-ghost" onClick={exportBrand}>
                <Download className="size-3.5" />
                Export brand JSON
              </button>
            </div>
            <div className="ns-bid-actions">
              <button
                type="button"
                className="ns-ghost"
                onClick={() => {
                  if (buildingHq) stopGenerate(true);
                  setStep("placement");
                }}
              >
                Back
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
