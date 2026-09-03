/**
 * Branded 3D advertising objects beside company buildings.
 * Variant selection is deterministic from companyId + buildingAssetId.
 */
import { TILE_METERS, TILE_PX } from "@/lib/units";
import { TILE, wx, wz } from "@/lib/coords";
import {
  isPublicRightOfWay,
  lotBuildingFootprint,
  type TileRect,
  claimedBuildingPlacementFromPlot,
} from "@/lib/lot-footprint";
import { placementMetersForAssetId } from "@/lib/building-gltf";
import { ECHT_ASSET_ID } from "@/lib/arch-viz";
import type { CompanyProfile, LogoPose } from "@/lib/company-profile";
import { adLogoUrl } from "@/lib/business-ad";
import { cleanPalette } from "@/lib/brand-profile";

export const BRAND_MARKER_BASE_ASSET_ID = "pack.agentspace.prop.brand-marker.base.01" as const;

/** Meters → world pixels (1 tile = TILE px = TILE_METERS m). */
export const METERS_TO_PX = TILE_PX / TILE_METERS;

export const BRAND_MARKER_VARIANTS = [
  "floating_logo",
  "logo_pedestal",
  "vertical_monument",
  "rotating_sculpture",
  "illuminated_sign",
  "orbiting_logo",
  "stacked_sculpture",
] as const;

export type BrandMarkerVariant = (typeof BRAND_MARKER_VARIANTS)[number];

export type BrandMarkerSide = "east" | "west" | "south" | "north";

export type BuildingShell = { cx: number; cz: number; w: number; d: number };

export type BrandMarkerPlacement = {
  x: number;
  z: number;
  y: number;
  rotationY: number;
  side: BrandMarkerSide;
};

export type BrandMarkerConfig = {
  /** Plot or building id used for click → ad flow. */
  targetId: string;
  companyId: string;
  /** Optional 2D logo texture; empty when only a 3D logo GLB is available. */
  logoUrl?: string;
  colours: string[];
  variant: BrandMarkerVariant;
  placement: BrandMarkerPlacement;
  /** Visual scale multiplier (default 1). */
  scale?: number;
  /** Optional transparent building hit proxy (world px). */
  buildingHit?: { cx: number; cz: number; w: number; d: number; h: number };
};

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic variant from hash(companyId:assetId). */
export function brandMarkerVariant(companyId: string, assetId?: string | null): BrandMarkerVariant {
  const idx = hashString(`${companyId}:${assetId ?? ""}`) % BRAND_MARKER_VARIANTS.length;
  return BRAND_MARKER_VARIANTS[idx]!;
}

function sidePref(lot: TileRect): BrandMarkerSide[] {
  const scores: Array<[BrandMarkerSide, number]> = [
    ["east", 0],
    ["west", 0],
    ["south", 0],
    ["north", 0],
  ];
  for (const [side, score] of scores) {
    let s = score;
    if (side === "north") {
      for (let x = lot.x; x < lot.x + lot.w; x++) if (isPublicRightOfWay(x, lot.y - 1)) s += 3;
    }
    if (side === "south") {
      for (let x = lot.x; x < lot.x + lot.w; x++) if (isPublicRightOfWay(x, lot.y + lot.h)) s += 3;
    }
    if (side === "west") {
      for (let y = lot.y; y < lot.y + lot.h; y++) if (isPublicRightOfWay(lot.x - 1, y)) s += 3;
    }
    if (side === "east") {
      for (let y = lot.y; y < lot.y + lot.h; y++) if (isPublicRightOfWay(lot.x + lot.w, y)) s += 3;
    }
    scores[scores.findIndex(([k]) => k === side)] = [side, s];
  }
  return scores.sort((a, b) => a[1] - b[1]).map(([side]) => side);
}

/** Standoff beyond the building shell — marker must sit outside the GLB footprint. */
const MARKER_BUILDING_STANDOFF = 1.35;
const LOGO_LOT_INSET = 0.35;
const LOGO_BUILDING_PAD = 0.45;

export function lotCenter(lot: TileRect) {
  return { cx: wx(lot.x + lot.w / 2), cz: wz(lot.y + lot.h / 2) };
}

export function normalizeYaw(deg: number): number {
  const n = deg % 360;
  return n < 0 ? n + 360 : n;
}

/** Measured building shell inside a lot (world px). */
export function buildingShellForLot(lot: TileRect, assetId: string | undefined, fill = 0.96): BuildingShell | null {
  const meters = placementMetersForAssetId(assetId);
  if (!meters) return null;
  const place = claimedBuildingPlacementFromPlot({ x: lot.x, y: lot.y, w: lot.w, h: lot.h }, meters, fill);
  if (!place) return null;
  return { cx: place.cx, cz: place.cz, w: place.w, d: place.d };
}

function yawToSide(yaw: number): BrandMarkerSide {
  const y = normalizeYaw(yaw);
  if (y >= 315 || y < 45) return "south";
  if (y < 135) return "west";
  if (y < 225) return "north";
  return "east";
}

/** Keep logo offsets inside the lot and outside the building shell. */
export function clampLogoPoseInLot(lot: TileRect, shell: BuildingShell | null, pose: LogoPose): LogoPose {
  const inset = hPx(LOGO_LOT_INSET);
  const halfW = (lot.w * TILE) / 2 - inset;
  const halfD = (lot.h * TILE) / 2 - inset;
  let x = Math.max(-halfW, Math.min(halfW, pose.x));
  let z = Math.max(-halfD, Math.min(halfD, pose.z));

  if (shell) {
    const { cx: lotCx, cz: lotCz } = lotCenter(lot);
    const pad = hPx(LOGO_BUILDING_PAD);
    const bx0 = shell.cx - shell.w / 2 - pad;
    const bx1 = shell.cx + shell.w / 2 + pad;
    const bz0 = shell.cz - shell.d / 2 - pad;
    const bz1 = shell.cz + shell.d / 2 + pad;
    let wxPos = lotCx + x;
    let wzPos = lotCz + z;

    if (wxPos >= bx0 && wxPos <= bx1 && wzPos >= bz0 && wzPos <= bz1) {
      const candidates = [
        { x: bx0 - wxPos, z: 0 },
        { x: bx1 - wxPos, z: 0 },
        { x: 0, z: bz0 - wzPos },
        { x: 0, z: bz1 - wzPos },
      ];
      let best = candidates[0]!;
      for (const c of candidates.slice(1)) {
        if (Math.hypot(c.x, c.z) < Math.hypot(best.x, best.z)) best = c;
      }
      x += best.x;
      z += best.z;
      wxPos = lotCx + x;
      wzPos = lotCz + z;
      if (wxPos >= bx0 && wxPos <= bx1 && wzPos >= bz0 && wzPos <= bz1) {
        const toWest = wxPos - bx0;
        const toEast = bx1 - wxPos;
        const toNorth = wzPos - bz0;
        const toSouth = bz1 - wzPos;
        const min = Math.min(toWest, toEast, toNorth, toSouth);
        if (min === toWest) x -= toWest + pad * 0.25;
        else if (min === toEast) x += toEast + pad * 0.25;
        else if (min === toNorth) z -= toNorth + pad * 0.25;
        else z += toSouth + pad * 0.25;
      }
      x = Math.max(-halfW, Math.min(halfW, x));
      z = Math.max(-halfD, Math.min(halfD, z));
    }
  }

  return { x, z, yaw: normalizeYaw(pose.yaw) };
}

export function logoPoseFromPlacement(lot: TileRect, placement: BrandMarkerPlacement): LogoPose {
  const { cx, cz } = lotCenter(lot);
  return {
    x: placement.x - cx,
    z: placement.z - cz,
    yaw: normalizeYaw((placement.rotationY * 180) / Math.PI),
  };
}

export function placementFromLogoPose(lot: TileRect, pose: LogoPose): BrandMarkerPlacement {
  const { cx, cz } = lotCenter(lot);
  const yaw = normalizeYaw(pose.yaw);
  return {
    x: cx + pose.x,
    z: cz + pose.z,
    y: hPx(0.04),
    rotationY: (yaw * Math.PI) / 180,
    side: yawToSide(yaw),
  };
}

export function defaultLogoPoseForLot(lot: TileRect, assetId: string | undefined): LogoPose | null {
  const placement = brandMarkerPlacementForLot(lot, assetId);
  if (!placement) return null;
  return logoPoseFromPlacement(lot, placement);
}

export function logoPoseFromWorldPoint(
  lot: TileRect,
  shell: BuildingShell | null,
  worldX: number,
  worldZ: number,
  yaw: number,
): LogoPose {
  const { cx, cz } = lotCenter(lot);
  return clampLogoPoseInLot(lot, shell, { x: worldX - cx, z: worldZ - cz, yaw });
}

export function yardCellsForLot(lot: TileRect, shell: BuildingShell | null) {
  const cells: Array<{ col: number; row: number }> = [];
  const pad = hPx(LOGO_BUILDING_PAD);
  for (let row = 0; row < lot.h; row++) {
    for (let col = 0; col < lot.w; col++) {
      const tileX = lot.x + col;
      const tileY = lot.y + row;
      if (isPublicRightOfWay(tileX, tileY)) continue;
      const px = wx(tileX + 0.5);
      const pz = wz(tileY + 0.5);
      if (
        shell &&
        px >= shell.cx - shell.w / 2 - pad &&
        px <= shell.cx + shell.w / 2 + pad &&
        pz >= shell.cz - shell.d / 2 - pad &&
        pz <= shell.cz + shell.d / 2 + pad
      ) {
        continue;
      }
      cells.push({ col, row });
    }
  }
  return cells;
}

export function resolveBrandMarkerPlacement(
  lot: TileRect,
  assetId: string | undefined,
  logoPose?: LogoPose | null,
): BrandMarkerPlacement | null {
  const shell = buildingShellForLot(lot, assetId);
  if (logoPose) {
    const clamped = clampLogoPoseInLot(lot, shell, logoPose);
    return placementFromLogoPose(lot, clamped);
  }
  return brandMarkerPlacementForLot(lot, assetId);
}

function markerOffset(side: BrandMarkerSide, buildingW: number, buildingD: number) {
  const standoff = hPx(MARKER_BUILDING_STANDOFF);
  const lateral = hPx(0.35);
  switch (side) {
    case "east":
      return {
        x: buildingW / 2 + standoff,
        z: lateral * 0.25,
        rotationY: -Math.PI / 2,
      };
    case "west":
      return {
        x: -buildingW / 2 - standoff,
        z: -lateral * 0.2,
        rotationY: Math.PI / 2,
      };
    case "south":
      return {
        x: buildingW * 0.18,
        z: buildingD / 2 + standoff,
        rotationY: 0,
      };
    case "north":
      return {
        x: -buildingW * 0.12,
        z: -buildingD / 2 - standoff,
        rotationY: Math.PI,
      };
  }
}

/** Legacy h() lift for marker clearance distances. */
function hPx(legacy: number) {
  return legacy * (TILE_PX / 1.2);
}

/**
 * Place a brand marker beside a building footprint inside a lot.
 * Returns world-space x/z (Three.js) relative to lot centre.
 */
export function brandMarkerPlacementForLot(
  lot: TileRect,
  assetId: string | undefined,
  fill = 0.96,
): BrandMarkerPlacement | null {
  const fp = lotBuildingFootprint(lot);
  if (!fp) return null;
  const meters = placementMetersForAssetId(assetId);
  if (!meters) return null;
  const place = claimedBuildingPlacementFromPlot(
    { x: lot.x, y: lot.y, w: lot.w, h: lot.h },
    meters,
    fill,
  );
  if (!place) return null;

  const lotCx = wx(lot.x + lot.w / 2);
  const lotCz = wz(lot.y + lot.h / 2);
  const sides = sidePref(lot);
  const side = sides[0] ?? "south";
  const off = markerOffset(side, place.w, place.d);

  return {
    x: lotCx + off.x,
    z: lotCz + off.z,
    y: hPx(0.04),
    rotationY: off.rotationY,
    side,
  };
}

export function coloursFromProfile(profile: CompanyProfile | undefined, fallback: string[] = ["#6a8a4a", "#111827"]): string[] {
  const fromPalette = cleanPalette(profile?.palette, 4);
  if (fromPalette.length) return fromPalette;
  const brand = cleanPalette(profile?.brand?.primaryColours, 4);
  if (brand.length) return brand;
  return fallback;
}

export function brandMarkerFromClaim(
  plotId: string,
  lot: TileRect,
  profile: CompanyProfile,
): BrandMarkerConfig | null {
  if (!profile?.name?.trim()) return null;
  const logoUrl = adLogoUrl(profile) || undefined;
  const assetId = profile.buildingAssetId;
  const placement = resolveBrandMarkerPlacement(lot, assetId, profile.logoPose);
  if (!placement) return null;
  const companyId = profile.brand?.companyId ?? plotId;
  return {
    targetId: plotId,
    companyId,
    ...(logoUrl ? { logoUrl } : {}),
    colours: coloursFromProfile(profile, ["#4c8f48", "#1a2e1a"]),
    variant: brandMarkerVariant(companyId, assetId),
    placement,
  };
}

export function brandMarkerWithLogoPose(cfg: BrandMarkerConfig, lot: TileRect, assetId: string | undefined, logoPose?: LogoPose | null) {
  if (!logoPose) return cfg;
  const placement = resolveBrandMarkerPlacement(lot, assetId, logoPose);
  if (!placement) return cfg;
  return { ...cfg, placement };
}

/** Authored-world businesses (Echt House on Startup Row). */
export const WORLD_BRAND_MARKERS: BrandMarkerConfig[] = [
  (() => {
    const lot: TileRect = { x: 26, y: 6, w: 5, h: 4 };
    const placement = brandMarkerPlacementForLot(lot, ECHT_ASSET_ID);
    const meters = placementMetersForAssetId(ECHT_ASSET_ID)!;
    const place = claimedBuildingPlacementFromPlot({ x: 26, y: 6, w: 5, h: 4 }, meters)!;
    const lotCx = wx(26 + 5 / 2);
    const lotCz = wz(6 + 4 / 2);
    const standoff = hPx(MARKER_BUILDING_STANDOFF);
    return {
      targetId: "incubator",
      companyId: "echt",
      logoUrl: "/assets/brands/echt/logo.svg",
      colours: ["#22a94f", "#c8cfc2", "#111827"],
      variant: "illuminated_sign" as const,
      scale: 2.15,
      placement: placement ?? {
        x: lotCx + place.w * 0.18,
        z: lotCz + place.d / 2 + standoff,
        y: hPx(0.04),
        rotationY: 0,
        side: "south" as const,
      },
      buildingHit: {
        cx: lotCx,
        cz: lotCz,
        w: place.w,
        d: place.d,
        h: hPx(8.5),
      },
    };
  })(),
];
