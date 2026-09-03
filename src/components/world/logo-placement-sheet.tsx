"use client";

import { X } from "lucide-react";
import { toast } from "sonner";
import { useWorld } from "@/components/world/world-store";
import { getPlot } from "@/lib/plots";
import { normalizeYaw } from "@/lib/brand-marker";

const FACING_PRESETS = [
  { label: "N", yaw: 180 },
  { label: "E", yaw: 270 },
  { label: "S", yaw: 0 },
  { label: "W", yaw: 90 },
] as const;

export function LogoPlacementSheet() {
  const {
    logoEditPlotId,
    logoEditDraft,
    setLogoEditDraft,
    dismissLogoEdit,
    saveLogoPose,
    updatePlotProfile,
  } = useWorld();

  if (!logoEditPlotId || !logoEditDraft) return null;

  const plot = getPlot(logoEditPlotId);
  const yaw = Math.round(normalizeYaw(logoEditDraft.yaw));

  const setYaw = (next: number) => {
    setLogoEditDraft({ ...logoEditDraft, yaw: normalizeYaw(next) });
  };

  const resetAuto = () => {
    updatePlotProfile(logoEditPlotId, { logoPose: null });
    toast.success("Logo placement reset to automatic.");
    dismissLogoEdit();
  };

  return (
    <div className="ns-logo-place-scrim" role="presentation">
      <aside
        className="ns-logo-place-panel"
        role="dialog"
        aria-labelledby="logo-place-title"
      >
        <div className="ns-logo-place-head">
          <div>
            <p className="ns-bid-kicker">Your lot</p>
            <h2 id="logo-place-title">Place logo</h2>
            <p className="ns-logo-place-sub">
              {plot?.groupLabel ?? "Your plot"} — click yard tiles on the map, then set which way it faces.
            </p>
          </div>
          <button type="button" className="ns-icon-btn" aria-label="Close" onClick={() => dismissLogoEdit()}>
            <X className="size-4" />
          </button>
        </div>

        <label className="ns-logo-place-field">
          <span>Facing · {yaw}°</span>
          <input
            type="range"
            min={0}
            max={359}
            step={1}
            value={yaw}
            onChange={(e) => setYaw(Number(e.target.value))}
          />
        </label>

        <div className="ns-logo-place-compass" role="group" aria-label="Face direction">
          {FACING_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              className="ns-logo-place-compass-btn"
              data-selected={Math.round(normalizeYaw(logoEditDraft.yaw)) === preset.yaw ? "1" : "0"}
              aria-pressed={Math.round(normalizeYaw(logoEditDraft.yaw)) === preset.yaw}
              onClick={() => setYaw(preset.yaw)}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <p className="ns-logo-place-hint">
          Green tiles are valid yard spots. The marker stays outside your building footprint.
        </p>

        <div className="ns-bid-actions ns-logo-place-actions">
          <button type="button" className="ns-ghost" onClick={() => dismissLogoEdit()}>
            Cancel
          </button>
          <button type="button" className="ns-ghost" onClick={resetAuto}>
            Reset auto
          </button>
          <button type="button" className="ns-game-btn" onClick={() => {
            saveLogoPose();
            toast.success("Logo placement saved.");
          }}>
            Save
          </button>
        </div>
      </aside>
    </div>
  );
}
