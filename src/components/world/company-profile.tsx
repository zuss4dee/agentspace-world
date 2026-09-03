"use client";

import { DoorOpen, Download, X } from "lucide-react";
import { letterMark, type CompanyProfile } from "@/lib/company-profile";
import { TIER_LABELS, type CompanyTier } from "@/lib/brand-profile";

const CLAIM_BOILERPLATE_DOES = "A new house on claimed land.";
const CLAIM_BOILERPLATE_DESC =
  "You just claimed this lot. Write who you are — name, trade, and a line for the people who knock.";
const CLAIM_BOILERPLATE_VISITOR = "We just moved in. Come say hello.";

function isBoilerplate(profile: CompanyProfile) {
  return (
    profile.does === CLAIM_BOILERPLATE_DOES ||
    profile.description === CLAIM_BOILERPLATE_DESC ||
    profile.visitorMessage === CLAIM_BOILERPLATE_VISITOR
  );
}

function stageCopy(profile: CompanyProfile, owned: boolean, hqReady: boolean) {
  const tier = profile.tier && profile.tier in TIER_LABELS ? TIER_LABELS[profile.tier as CompanyTier] : null;
  const website = profile.website?.trim();
  if (hqReady) {
    return {
      kicker: owned ? "Your HQ" : "Company HQ",
      does:
        !isBoilerplate(profile) && profile.does.trim()
          ? profile.does
          : tier
            ? `${tier} headquarters on this lot.`
            : "Headquarters on this lot.",
      description:
        !isBoilerplate(profile) && profile.description.trim()
          ? profile.description
          : website
            ? `Built from ${website.replace(/^https?:\/\//i, "")} — brand colours and style locked in.`
            : "Your Silicon City HQ is on the map.",
      visitor:
        !isBoilerplate(profile) && profile.visitorMessage.trim()
          ? profile.visitorMessage
          : "Come say hello — the doors are open.",
    };
  }
  if (profile.buildingStatus === "building") {
    return {
      kicker: owned ? "Building HQ" : "On this lot",
      does: "HQ is generating in Blender…",
      description: "Hang tight — we’ll place it on this lot when the publish finishes.",
      visitor: null as string | null,
    };
  }
  return {
    kicker: owned ? "Your house" : "On this lot",
    does: profile.does.trim() || null,
    description: profile.description.trim() || null,
    visitor: profile.visitorMessage.trim() || null,
  };
}

export function CompanyProfileCard({
  profile,
  owned,
  onEnter,
  onVisit,
  onClose,
  onExportBrand,
  onBuildHq,
  exportBrandName,
  visitLabel = "Visit",
}: {
  profile: CompanyProfile;
  owned?: boolean;
  onEnter: () => void;
  onVisit?: () => void;
  onClose: () => void;
  /** Owners can download the Blender brand JSON for their house. */
  onExportBrand?: () => void;
  /** Place / retry HQ when the published GLB is missing from the lot. */
  onBuildHq?: () => void;
  exportBrandName?: string;
  visitLabel?: string;
}) {
  const mark = letterMark(profile.name || "Co");
  const hasLogo = Boolean(profile.logo.trim());
  const hqReady = Boolean(profile.buildingAssetId);
  const ownedLot = Boolean(owned);
  const copy = stageCopy(profile, ownedLot, hqReady);

  return (
    <div className="ns-plot-sheet ns-company-sheet" role="dialog" aria-labelledby="company-profile-name">
      <div className="ns-card">
        <div className="ns-plot-body ns-company-body">
          <div className="ns-company-top">
            <div className="ns-company-mark" aria-hidden>
              {hasLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.logo} alt="" />
              ) : (
                <span>{mark}</span>
              )}
            </div>
            <div className="ns-company-id">
              <p className="ns-plot-kicker">{copy.kicker}</p>
              <h3 id="company-profile-name">{profile.name || "Unnamed house"}</h3>
            </div>
            <button type="button" className="ns-icon-btn" aria-label="Close" onClick={onClose}>
              <X className="size-4" />
            </button>
          </div>

          {copy.does ? <p className="ns-company-does">{copy.does}</p> : null}
          {copy.description ? <p className="ns-company-desc">{copy.description}</p> : null}

          {ownedLot && !hqReady ? (
            <p className="ns-plot-hint">
              {profile.buildingStatus === "building"
                ? "HQ is still building in Blender…"
                : profile.buildingStatus === "failed"
                  ? "HQ build failed — place it again with Blender connected."
                  : "Company is set up — place your HQ on this lot."}
            </p>
          ) : null}

          {profile.founder || profile.team ? (
            <p className="ns-company-founder">
              <span>On the floor</span>
              {[profile.founder, profile.team].filter(Boolean).join(" · ")}
            </p>
          ) : null}

          {copy.visitor ? (
            <blockquote className="ns-company-note">
              <span>For visitors</span>
              {copy.visitor}
            </blockquote>
          ) : null}

          {ownedLot && onExportBrand && !hqReady ? (
            <div className="ns-brand-export">
              <button type="button" className="ns-ghost" onClick={onExportBrand}>
                <Download className="size-3.5" />
                Export brand JSON
              </button>
              <p className="ns-plot-hint">
                Feeds the Blender build:{" "}
                <code>build_company_from_brand.py -- --brand {exportBrandName ?? "brand.json"}</code>
              </p>
            </div>
          ) : null}

          <div className="ns-plot-actions ns-company-actions">
            {onVisit ? (
              <button type="button" className="ns-ghost" onClick={onVisit}>
                {visitLabel}
              </button>
            ) : (
              <button type="button" className="ns-ghost" onClick={onClose}>
                Close
              </button>
            )}
            {ownedLot && !hqReady && onBuildHq ? (
              <button type="button" className="ns-game-btn" onClick={onBuildHq}>
                Place HQ
              </button>
            ) : (
              <button type="button" className="ns-game-btn" onClick={onEnter}>
                <DoorOpen className="size-3.5" />
                Enter
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
