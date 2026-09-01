import { wx, wz } from "@/lib/coords";

export const ECHT_ASSET_ID = "pack.agentspace.building.echt.02";
export const ECHT_BUILDING_ID = "loft";
export const ECHT_FOCUS = { x: 28, y: 3.5 } as const;

export type ArchView = "street" | "three-quarter" | "elevated" | "facade";

export const ARCH_VIEW_LABEL: Record<ArchView, string> = {
  street: "Street",
  "three-quarter": "¾",
  elevated: "Elevated",
  facade: "Facade",
};

/** Eye-level and framing in world units (1 tile = 32). */
export function archCameraWorld(view: ArchView) {
  const tx = wx(ECHT_FOCUS.x);
  const tz = wz(ECHT_FOCUS.y);
  switch (view) {
    case "street":
      return {
        position: [tx + 10, 18, tz - 92] as const,
        target: [tx, 16, tz - 20] as const,
        fov: 32,
      };
    case "three-quarter":
      return {
        position: [tx + 95, 52, tz - 120] as const,
        target: [tx, 28, tz] as const,
        fov: 32,
      };
    case "elevated":
      return {
        position: [tx + 40, 130, tz - 140] as const,
        target: [tx, 20, tz] as const,
        fov: 36,
      };
    case "facade":
      return {
        position: [tx + 6, 28, tz - 150] as const,
        target: [tx, 24, tz - 10] as const,
        fov: 30,
      };
  }
}

export function sunFromHour(hour: number) {
  const t = ((hour % 24) + 24) % 24;
  const day = Math.max(0, Math.min(1, (t - 5.5) / 13));
  const elevation = Math.sin(day * Math.PI) * 1.05;
  const azimuth = Math.PI * 0.15 + day * Math.PI * 0.95;
  const dusk = elevation < 0.22;
  return {
    elevation: Math.max(0.08, elevation),
    azimuth,
    intensity: 0.55 + Math.max(0, elevation) * 1.15,
    color: dusk ? "#ffd4a8" : "#fff4e6",
  };
}

export const ARCH_EXPOSURE = 1.15;
export const ENV_INTENSITY = 1.25;
export const HDRI_URL = "/assets/env/potsdamer_platz_1k.hdr";
