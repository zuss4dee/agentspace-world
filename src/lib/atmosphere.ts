import { h } from "./coords";

export type AtmospherePresetId = "late-afternoon" | "day" | "sunrise" | "night";

export type AtmospherePreset = {
  id: AtmospherePresetId;
  label: string;
  /** Canvas / scene clear color — matches fog at the horizon. */
  background: string;
  fog: {
    color: string;
    /** Base near plane in legacy world units (scaled via h()). */
    near: number;
    /** Base far plane in legacy world units. */
    far: number;
    /** Multiplier applied at max zoom / map overview. */
    overviewFarMul: number;
  };
  sky: {
    zenith: string;
    mid: string;
    horizon: string;
    haze: string;
  };
  hemisphere: { sky: string; ground: string; intensity: number };
  ambient: number;
  sun: { warm: boolean };
};

/** Default slice — subtle late-afternoon warmth without heavy sunset. */
export const DEFAULT_ATMOSPHERE: AtmospherePresetId = "late-afternoon";

export const ATMOSPHERE_PRESETS: Record<AtmospherePresetId, AtmospherePreset> = {
  "late-afternoon": {
    id: "late-afternoon",
    label: "Late afternoon",
    background: "#c9c0b0",
    fog: { color: "#d4cbb8", near: 260, far: 920, overviewFarMul: 2.35 },
    sky: {
      zenith: "#8fa8c4",
      mid: "#c4b8a4",
      horizon: "#e8d4b8",
      haze: "#ddd2c0",
    },
    hemisphere: { sky: "#e8e0d4", ground: "#5a6458", intensity: 0.55 },
    ambient: 0.18,
    sun: { warm: true },
  },
  day: {
    id: "day",
    label: "Day",
    background: "#b8c4d0",
    fog: { color: "#c8d4e0", near: 300, far: 1100, overviewFarMul: 2.1 },
    sky: {
      zenith: "#6a9fd4",
      mid: "#a8c4e0",
      horizon: "#dce8f0",
      haze: "#d0dce8",
    },
    hemisphere: { sky: "#e8f0f8", ground: "#586858", intensity: 0.62 },
    ambient: 0.22,
    sun: { warm: false },
  },
  sunrise: {
    id: "sunrise",
    label: "Sunrise",
    background: "#d8c4b0",
    fog: { color: "#e8d0b8", near: 220, far: 880, overviewFarMul: 2.3 },
    sky: {
      zenith: "#7a98b8",
      mid: "#d8b898",
      horizon: "#f0c898",
      haze: "#ecd8c0",
    },
    hemisphere: { sky: "#f0e4d8", ground: "#5a5850", intensity: 0.58 },
    ambient: 0.2,
    sun: { warm: true },
  },
  night: {
    id: "night",
    label: "Night",
    background: "#1a2030",
    fog: { color: "#222838", near: 180, far: 720, overviewFarMul: 2.5 },
    sky: {
      zenith: "#0a1020",
      mid: "#182030",
      horizon: "#283848",
      haze: "#1e2838",
    },
    hemisphere: { sky: "#283848", ground: "#101820", intensity: 0.35 },
    ambient: 0.08,
    sun: { warm: false },
  },
};

export function atmospherePreset(id: AtmospherePresetId = DEFAULT_ATMOSPHERE) {
  return ATMOSPHERE_PRESETS[id];
}

/** Fog planes scaled to world pixels; overview stretches the far plane toward the horizon pad. */
export function fogDistances(preset: AtmospherePreset, viewDist: number, overview: boolean) {
  const near = h(preset.fog.near);
  const baseFar = h(preset.fog.far);
  if (overview) {
    return { near: h(140), far: baseFar * preset.fog.overviewFarMul };
  }
  const t = Math.min(1, viewDist / h(34));
  return {
    near: Math.max(h(120), viewDist * 2.8),
    far: Math.max(baseFar, Math.min(baseFar * 1.85, viewDist * 8.5 + baseFar * t * 0.35)),
  };
}
