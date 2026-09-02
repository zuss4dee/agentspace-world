"use client";

import { DoorOpen, Download, X } from "lucide-react";
import { letterMark, type CompanyProfile } from "@/lib/company-profile";

export function CompanyProfileCard({
  profile,
  owned,
  onEnter,
  onVisit,
  onClose,
  onExportBrand,
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
  exportBrandName?: string;
  visitLabel?: string;
}) {
  const mark = letterMark(profile.name || "Co");
  const hasLogo = Boolean(profile.logo.trim());

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
              <p className="ns-plot-kicker">{owned ? "Your house" : "On this lot"}</p>
              <h3 id="company-profile-name">{profile.name || "Unnamed house"}</h3>
            </div>
            <button type="button" className="ns-icon-btn" aria-label="Close" onClick={onClose}>
              <X className="size-4" />
            </button>
          </div>

          {profile.does ? <p className="ns-company-does">{profile.does}</p> : null}
          {profile.description ? <p className="ns-company-desc">{profile.description}</p> : null}

          {profile.founder || profile.team ? (
            <p className="ns-company-founder">
              <span>On the floor</span>
              {[profile.founder, profile.team].filter(Boolean).join(" · ")}
            </p>
          ) : null}

          {profile.visitorMessage ? (
            <blockquote className="ns-company-note">
              <span>For visitors</span>
              {profile.visitorMessage}
            </blockquote>
          ) : null}

          {owned && onExportBrand ? (
            <div className="ns-brand-export">
              <button type="button" className="ns-ghost" onClick={onExportBrand}>
                <Download className="size-3.5" />
                Export brand JSON
              </button>
              <p className="ns-plot-hint">
                Feeds the Blender build: <code>build_company_from_brand.py -- --brand {exportBrandName ?? "brand.json"}</code>
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
            <button type="button" className="ns-game-btn" onClick={onEnter}>
              <DoorOpen className="size-3.5" />
              Enter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
