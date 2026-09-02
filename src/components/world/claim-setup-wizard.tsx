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
  type Plot,
} from "@/lib/plots";
import { crewForPlot } from "@/lib/building-crew";
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
  downloadBrandProfile,
  type CompanyTier,
  type DerivedBrandProfile,
} from "@/lib/brand-profile";
import { roleLabel } from "@/lib/playbooks";
import type { RoleId } from "@/lib/types";

const CREW_ROLES: RoleId[] = [
  "ceo",
  "cto",
  "cfo",
  "cmo",
  "coo",
  "creative",
  "researcher",
  "support",
  "ops",
  "security",
  "visitor",
];

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
    openClaimSetup,
    claimSetupStep,
    buildingSpecs,
    buildingCrew,
    addBotToBuilding,
    claimedExtras,
    claimedPlaces,
    claimedUses,
  } = useWorld();

  const extra = claimedExtras[claimSetupId] ?? 0;
  const spec = buildingSpecs[claimSetupId];
  const crew = crewForPlot(buildingCrew, claimSetupId);
  const companyName = spec?.profile?.name?.trim() || "Your company";

  const [step, setStep] = useState<ClaimSetupStep>(claimSetupStep);
  const [profile, setProfile] = useState<CompanyProfile>(() => mergeProfile(spec?.profile));
  const [useId, setUseId] = useState(claimedUses[claimSetupId] ?? "office");
  const [place, setPlace] = useState(claimedPlaces[claimSetupId] ?? { ox: 0, oy: 0 });
  const [botName, setBotName] = useState("Grok");
  const [botRole, setBotRole] = useState<RoleId>("ceo");
  const [botEndpoint, setBotEndpoint] = useState("");
  const [walkingIn, setWalkingIn] = useState(false);
  const [deriving, setDeriving] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const lastDerivedUrl = useRef<string | null>(profile.brand?.derivedFrom?.url ?? null);
  const deriveSeq = useRef(0);

  useEffect(() => {
    setStep(claimSetupStep);
  }, [claimSetupStep, claimSetupId]);

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

  const exportName = brandProfileFileName(brandProfileFromCompanyProfile(claimSetupId, profile));
  const exportBrand = () => {
    downloadBrandProfile(brandProfileFromCompanyProfile(claimSetupId, profile));
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

  const stepLabel =
    step === "profile" ? "Step 1 of 3" : step === "placement" ? "Step 2 of 3" : "Step 3 of 3";
  const stepTitle =
    step === "profile"
      ? "Name your company"
      : step === "placement"
        ? "Place your building"
        : "Staff your building";

  const walkBotIn = async () => {
    if (!botName.trim()) {
      toast.error("Name your Grok bot.");
      return;
    }
    setWalkingIn(true);
    const result = await addBotToBuilding(claimSetupId, {
      name: botName.trim(),
      role: botRole,
      endpoint: botEndpoint.trim() || undefined,
      onlineFor: "7d",
      idleExtend: "24h",
    });
    setWalkingIn(false);
    if (!result.ok) toast.error(result.reason);
    else {
      toast.success(`${botName.trim()} is inside ${companyName}.`);
      setBotName("Grok");
      setBotEndpoint("");
    }
  };

  return (
    <div className="ns-bid-scrim" role="presentation" onClick={() => dismissClaimSetup()}>
      <div
        className="ns-bid ns-claim-setup"
        role="dialog"
        aria-labelledby="claim-setup-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ns-claim-setup-head">
          <div>
            <p className="ns-bid-kicker">{stepLabel}</p>
            <h2 id="claim-setup-title">{stepTitle}</h2>
          </div>
          <button type="button" className="ns-icon-btn" aria-label="Close" onClick={() => dismissClaimSetup()}>
            <X className="size-4" />
          </button>
        </div>

        {step === "profile" ? (
          <>
            <p className="ns-bid-copy">
              You secured {formatSqFt(area.sqft)} on the south field. Before we raise walls, tell visitors who lives
              here.
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
                <strong>{profile.name.trim() || "Your company"}</strong>
                <span>{plot.groupLabel}</span>
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
                Continue to building
              </button>
            </div>
          </>
        ) : step === "placement" ? (
          <>
            <p className="ns-bid-copy">
              Choose what rises on your pad. Placement updates the preview on the map — procedural generation ships
              when the city opens the build phase.
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
                  saveClaimBuilding({
                    profile,
                    useId,
                    place: pos,
                    extra,
                  });
                  openClaimSetup(claimSetupId, "crew");
                }}
              >
                Continue to crew
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="ns-bid-copy">
              Walk Grok bots into <strong>{companyName}</strong>. They spawn inside your building on the map — use crew
              view to see them Among Us-style from above.
            </p>
            {crew.length ? (
              <ul className="ns-crew-roster">
                {crew.map((member) => (
                  <li key={member.id}>
                    <span className="ns-crew-dot" style={{ background: member.color }} aria-hidden />
                    <span>{member.name}</span>
                    <em>{roleLabel(member.role)}</em>
                    {member.liveAgentId ? <strong>live</strong> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="ns-plot-hint">No crew yet — add your first Grok bot below.</p>
            )}
            <div className="ns-studio-profile ns-claim-fields">
              <label>
                Bot name
                <input
                  value={botName}
                  onChange={(e) => setBotName(e.target.value)}
                  placeholder="Grok"
                  autoFocus
                />
              </label>
              <label>
                Role
                <select
                  value={botRole}
                  onChange={(e) => setBotRole(e.target.value as RoleId)}
                  className="ns-crew-role"
                >
                  {CREW_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {roleLabel(role)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Status endpoint (optional)
                <input
                  value={botEndpoint}
                  onChange={(e) => setBotEndpoint(e.target.value)}
                  placeholder="https://your-grokbot.example/status"
                  inputMode="url"
                />
              </label>
            </div>
            <div className="ns-brand-export">
              <button type="button" className="ns-ghost" onClick={exportBrand}>
                <Download className="size-3.5" />
                Export brand JSON
              </button>
              <p className="ns-plot-hint">
                Feeds the Blender build: <code>scripts/blender/build_company_from_brand.py -- --brand {exportName}</code>
              </p>
            </div>
            <div className="ns-bid-actions">
              <button type="button" className="ns-ghost" onClick={() => setStep("placement")}>
                Back
              </button>
              <button type="button" className="ns-ghost" onClick={() => dismissClaimSetup()}>
                Done for now
              </button>
              <button type="button" className="ns-game-btn" disabled={walkingIn} onClick={() => void walkBotIn()}>
                {walkingIn ? "Walking in…" : "Walk bot in"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
