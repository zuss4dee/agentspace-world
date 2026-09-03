"use client";

import { BusinessAdView } from "@/components/world/business-ad-view";
import type { CompanyProfile } from "@/lib/company-profile";

export function CompanyProfileCard({
  profile,
  owned,
  onEnter,
  onClose,
  onBuildHq,
  onEditAd,
  onPlaceLogo,
  moveTargets,
  onMoveBuilding,
}: {
  profile: CompanyProfile;
  owned?: boolean;
  onEnter: () => void;
  onClose: () => void;
  /** @deprecated kept for callers; ad card no longer shows CLI export. */
  onExportBrand?: () => void;
  onBuildHq?: () => void;
  exportBrandName?: string;
  onEditAd?: () => void;
  onPlaceLogo?: () => void;
  moveTargets?: { id: string; label: string }[];
  onMoveBuilding?: (destPlotId: string) => void;
}) {
  return (
    <div className="ns-brand-ad-scrim" role="presentation" onClick={onClose}>
      <div
        className="ns-brand-ad-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`${profile.name || "Company"} advertisement`}
        onClick={(e) => e.stopPropagation()}
      >
        <BusinessAdView
          profile={profile}
          mode="visitor"
          owned={owned}
          onClose={onClose}
          onEnter={onEnter}
          onBuildHq={onBuildHq}
          onEditAd={onEditAd}
          onPlaceLogo={onPlaceLogo}
          moveTargets={moveTargets}
          onMoveBuilding={onMoveBuilding}
        />
      </div>
    </div>
  );
}
