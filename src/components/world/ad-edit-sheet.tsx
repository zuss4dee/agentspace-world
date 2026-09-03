"use client";

import { useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { BusinessAdView } from "@/components/world/business-ad-view";
import { useWorld } from "@/components/world/world-store";
import { AD_DESCRIPTION_MAX, AD_IMAGE_FRAME_LABELS, CLAIM_BOILERPLATE_DESC } from "@/lib/business-ad";
import { getPlot } from "@/lib/plots";
import { mergeProfile, type CompanyProfile } from "@/lib/company-profile";
import type { AdImageFrame } from "@/lib/building-spec";

const MAX_LABELS = 3;
const IMAGE_FRAMES = ["landscape", "square", "portrait"] as const satisfies readonly AdImageFrame[];

type LabelDraft = [string, string, string];

function labelDraftFrom(profile: CompanyProfile | undefined): LabelDraft {
  const kw = profile?.brand?.styleKeywords ?? [];
  return [kw[0] ?? "", kw[1] ?? "", kw[2] ?? ""];
}

function descriptionDraft(profile: CompanyProfile): string {
  const tagline = profile.brand?.tagline;
  if (typeof tagline === "string" && tagline.trim()) return tagline;
  const desc = profile.description;
  if (typeof desc === "string" && desc.trim() && desc !== CLAIM_BOILERPLATE_DESC) return desc;
  return "";
}

export function AdEditSheet({ plotId }: { plotId: string }) {
  const { buildingSpecs, updatePlotProfile, dismissAdEdit } = useWorld();
  const spec = buildingSpecs[plotId];
  const plot = getPlot(plotId);

  const [profile, setProfile] = useState<CompanyProfile>(() => mergeProfile(spec?.profile));
  const [labelDraft, setLabelDraft] = useState<LabelDraft>(() => labelDraftFrom(spec?.profile));
  const logoInputRef = useRef<HTMLInputElement>(null);
  const creativeInputRef = useRef<HTMLInputElement>(null);

  const previewProfile = useMemo(
    () =>
      mergeProfile(profile, {
        brand: {
          ...profile.brand,
          styleKeywords: labelDraft.map((s) => s.trim()).filter(Boolean).slice(0, MAX_LABELS),
        },
      }),
    [profile, labelDraft],
  );

  const setField = (patch: Partial<CompanyProfile>) =>
    setProfile((prev) => ({
      ...prev,
      ...patch,
      brand: patch.brand ? { ...prev.brand, ...patch.brand } : prev.brand,
    }));

  const setDescription = (value: string) => {
    setProfile((prev) => ({
      ...prev,
      description: value,
      brand: { ...prev.brand, tagline: value },
    }));
  };

  const setLabelAt = (index: number, value: string) => {
    setLabelDraft((prev) => {
      const next: LabelDraft = [...prev];
      next[index] = value;
      return next;
    });
  };

  const labelSlots = labelDraft;

  const onImageFile = (file: File | undefined, field: "logo" | "adImage") => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setField({ [field]: reader.result });
    };
    reader.readAsDataURL(file);
  };

  const save = () => {
    const name = profile.name.trim();
    if (!name) {
      toast.error("Company name is required.");
      return;
    }
    updatePlotProfile(plotId, previewProfile);
    toast.success("Ad updated.");
    dismissAdEdit();
  };

  return (
    <div className="ns-brand-ad-scrim ns-ad-edit-scrim" role="presentation" onClick={() => dismissAdEdit()}>
      <div
        className="ns-ad-edit-modal"
        role="dialog"
        aria-labelledby="ad-edit-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ns-ad-edit-head">
          <div>
            <p className="ns-bid-kicker">Your advertisement</p>
            <h2 id="ad-edit-title">Edit ad</h2>
            <p className="ns-ad-edit-sub">
              {plot?.groupLabel ?? "Your lot"} — what visitors see when they click your building.
            </p>
          </div>
          <button type="button" className="ns-icon-btn" aria-label="Close" onClick={() => dismissAdEdit()}>
            <X className="size-4" />
          </button>
        </div>

        <div className="ns-ad-edit-layout">
          <section className="ns-ad-edit-preview" aria-label="Live preview">
            <p className="ns-ad-edit-preview-label">Preview</p>
            <div className="ns-ad-edit-preview-frame">
              <BusinessAdView profile={previewProfile} mode="preview" />
            </div>
          </section>

          <section className="ns-ad-edit-form" aria-label="Ad fields">
            <div className="ns-studio-profile ns-claim-fields">
              <label>
                Company name
                <input
                  value={profile.name}
                  onChange={(e) => setField({ name: e.target.value })}
                  placeholder="Northwind Robotics"
                  autoFocus
                />
              </label>
              <label>
                Logo URL
                <input
                  value={profile.logo.startsWith("data:") ? "" : profile.logo}
                  onChange={(e) => setField({ logo: e.target.value })}
                  placeholder="https://… or upload below"
                />
              </label>
              <label className="ns-claim-upload">
                Upload logo
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => onImageFile(e.target.files?.[0], "logo")}
                />
              </label>
              <label>
                Headline
                <input
                  value={profile.adHeadline ?? ""}
                  onChange={(e) => setField({ adHeadline: e.target.value })}
                  placeholder="The big line visitors read first"
                />
              </label>
              <label>
                Description / value proposition
                <textarea
                  value={descriptionDraft(profile)}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="A short pitch — what you do and why someone should care."
                  rows={5}
                  maxLength={AD_DESCRIPTION_MAX}
                />
              </label>
              <label>
                Creative image URL
                <input
                  value={profile.adImage?.startsWith("data:") ? "" : (profile.adImage ?? "")}
                  onChange={(e) => setField({ adImage: e.target.value })}
                  placeholder="https://… or upload below"
                />
              </label>
              <label className="ns-claim-upload">
                Upload creative
                <input
                  ref={creativeInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => onImageFile(e.target.files?.[0], "adImage")}
                />
              </label>
              <fieldset className="ns-ad-edit-frame">
                <legend>Image frame</legend>
                <div className="ns-ad-edit-frame-options" role="group" aria-label="Image frame">
                  {IMAGE_FRAMES.map((frame) => {
                    const selected = (profile.adImageFrame ?? "landscape") === frame;
                    return (
                      <button
                        key={frame}
                        type="button"
                        className="ns-ad-edit-frame-chip"
                        data-selected={selected ? "1" : "0"}
                        aria-pressed={selected}
                        onClick={() => setField({ adImageFrame: frame })}
                      >
                        {AD_IMAGE_FRAME_LABELS[frame]}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              <label>
                CTA text
                <input
                  value={profile.ctaLabel ?? ""}
                  onChange={(e) => setField({ ctaLabel: e.target.value })}
                  placeholder="Explore Northwind"
                />
              </label>
              <label>
                CTA URL
                <input
                  value={profile.ctaUrl ?? ""}
                  onChange={(e) => setField({ ctaUrl: e.target.value })}
                  placeholder="https://yoursite.com — opens in new tab when set"
                />
              </label>
            </div>

            <fieldset className="ns-ad-edit-labels">
              <legend>Labels (up to {MAX_LABELS})</legend>
              {labelSlots.map((value, i) => (
                <label key={i}>
                  Label {i + 1}
                  <input
                    value={value}
                    onChange={(e) => setLabelAt(i, e.target.value)}
                    placeholder={i === 0 ? "e.g. minimal" : ""}
                  />
                </label>
              ))}
            </fieldset>

            <div className="ns-bid-actions ns-ad-edit-actions">
              <button type="button" className="ns-ghost" onClick={() => dismissAdEdit()}>
                Cancel
              </button>
              <button type="button" className="ns-game-btn" onClick={save}>
                Save ad
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
