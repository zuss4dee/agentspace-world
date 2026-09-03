"use client";

import { useState } from "react";
import { ArrowRight, X } from "lucide-react";
import type { CompanyProfile } from "@/lib/company-profile";
import { getPlot } from "@/lib/plots";
import {
  adCompanyName,
  adCreativeUrl,
  adCtaLabel,
  adCtaUrl,
  adDescription,
  adHeadline,
  adImageFrame,
  adLabels,
  adLetterMark,
  adLogoUrl,
  brandCssVars,
} from "@/lib/business-ad";

export type BusinessAdViewProps = {
  profile: CompanyProfile;
  /** Visitor modal vs editor live preview. */
  mode?: "visitor" | "preview";
  onClose?: () => void;
  onEnter?: () => void;
  owned?: boolean;
  onBuildHq?: () => void;
  onEditAd?: () => void;
  onPlaceLogo?: () => void;
  moveTargets?: { id: string; label: string }[];
  onMoveBuilding?: (destPlotId: string) => void;
};

export function BusinessAdView({
  profile,
  mode = "visitor",
  onClose,
  onEnter,
  owned,
  onBuildHq,
  onEditAd,
  onPlaceLogo,
  moveTargets,
  onMoveBuilding,
}: BusinessAdViewProps) {
  const [moveOpen, setMoveOpen] = useState(false);
  const isPreview = mode === "preview";

  const name = adCompanyName(profile);
  const mark = adLetterMark(profile);
  const logo = adLogoUrl(profile);
  const hasLogo = Boolean(logo);
  const headline = adHeadline(profile);
  const description = adDescription(profile);
  const creative = adCreativeUrl(profile);
  const imageFrame = adImageFrame(profile);
  const labels = adLabels(profile);
  const ctaLabel = adCtaLabel(profile);
  const ctaUrl = adCtaUrl(profile);

  const hqReady = Boolean(profile.buildingAssetId);
  const ownedLot = Boolean(owned);
  const palette = (profile.palette?.length ? profile.palette : profile.brand?.primaryColours) ?? [];
  const showPlaceHq = ownedLot && !hqReady && Boolean(onBuildHq) && !isPreview;
  const canMove = ownedLot && Boolean(onMoveBuilding) && (moveTargets?.length ?? 0) > 0;
  const showMove = ownedLot && Boolean(onMoveBuilding) && !isPreview;
  const showPlaceLogo = ownedLot && hasLogo && Boolean(onPlaceLogo) && !isPreview;
  const showOwner = ownedLot && !isPreview && (onEditAd || showMove || showPlaceLogo);

  const handleCta = () => {
    if (isPreview) return;
    if (ctaUrl) {
      window.open(ctaUrl, "_blank", "noopener,noreferrer");
      return;
    }
    onEnter?.();
  };

  return (
    <article
      className={`ns-brand-ad-card${isPreview ? " ns-brand-ad-card-preview" : ""}`}
      style={brandCssVars(palette)}
      aria-labelledby={isPreview ? undefined : "business-ad-headline"}
    >
      <div className="ns-brand-ad-body">
        {!isPreview && onClose ? (
          <button type="button" className="ns-icon-btn ns-brand-ad-close" aria-label="Close" onClick={onClose}>
            <X className="size-4" />
          </button>
        ) : null}

        <header className="ns-brand-ad-hero">
          <div className="ns-brand-ad-mark" aria-hidden>
            {hasLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt="" />
            ) : (
              <span>{mark}</span>
            )}
          </div>
          <p className="ns-brand-ad-kicker">{name}</p>
          <h2 id="business-ad-headline" className="ns-brand-ad-headline">
            {headline}
          </h2>
        </header>

        {description ? <p className="ns-brand-ad-description">{description}</p> : null}

        {creative ? (
          <figure className={`ns-brand-ad-creative ns-brand-ad-creative-${imageFrame}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={creative} alt="" />
          </figure>
        ) : null}

        {labels.length > 0 ? (
          <ul className="ns-brand-ad-labels">
            {labels.map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
        ) : null}

        <div className="ns-brand-ad-actions">
          <button
            type="button"
            className="ns-brand-ad-cta"
            onClick={handleCta}
            disabled={isPreview}
            aria-disabled={isPreview}
          >
            {ctaLabel}
            <ArrowRight className="size-4" aria-hidden />
          </button>

          {showPlaceHq ? (
            <button type="button" className="ns-brand-ad-secondary" onClick={onBuildHq}>
              Place HQ
            </button>
          ) : null}

          {showOwner ? (
            <div className="ns-brand-ad-owner">
              {onEditAd ? (
                <button type="button" className="ns-brand-ad-owner-btn" onClick={onEditAd}>
                  Edit ad
                </button>
              ) : null}
              {showPlaceLogo ? (
                <button type="button" className="ns-brand-ad-owner-btn" onClick={onPlaceLogo}>
                  Place logo
                </button>
              ) : null}
              {showMove ? (
                <button
                  type="button"
                  className="ns-brand-ad-owner-btn"
                  disabled={!canMove}
                  title={
                    canMove
                      ? "Move HQ to another lot you own"
                      : "Need another owned lot with no building"
                  }
                  onClick={() => setMoveOpen((v) => !v)}
                >
                  Move building
                </button>
              ) : null}
            </div>
          ) : null}

          {moveOpen && canMove && moveTargets ? (
            <ul className="ns-brand-ad-move-list" aria-label="Move building to">
              {moveTargets.map((target) => {
                const plot = getPlot(target.id);
                return (
                  <li key={target.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onMoveBuilding?.(target.id);
                        setMoveOpen(false);
                      }}
                    >
                      {target.label}
                      {plot ? ` · ${plot.groupLabel}` : ""}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      </div>
    </article>
  );
}
