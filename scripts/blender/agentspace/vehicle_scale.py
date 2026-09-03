"""Shared vehicle dimensions — road traffic Tesla is the canonical world scale.

Runtime road cars use TILE_PX / TILE_METERS (see src/lib/units.ts, vehicle-gltf.tsx).
Building GLBs are fit to lots with scale ≈ (plot_tiles × TILE_PX) / footprint_m, which
oversizes embedded site props vs road vehicles unless corrected at authoring time.
"""
from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .siliconcity.builder import Ctx

# Keep in sync with src/lib/units.ts and TeslaTrafficCar scale.
TILE_PX = 32.0
TILE_METERS = 8.0
ROAD_PX_PER_M = TILE_PX / TILE_METERS

# Modest road-traffic bump — keep in sync with ROAD_VEHICLE_SCALE_BOOST in vehicle-gltf.tsx.
ROAD_VEHICLE_SCALE_BOOST = 1.2

# pack.agentspace.vehicle.car.tesla.sedan.01 — road traffic reference (tesla_sedan.py).
CANONICAL_CAR_LENGTH_M = 4.79
CANONICAL_CAR_WIDTH_M = 1.848
CANONICAL_CAR_BODY_H_M = 0.72
CANONICAL_CAR_WHEEL_R_M = 0.335
CANONICAL_CAR_WHEEL_W_M = 0.22


def lot_fit_px_per_m(plot_w: float, footprint_w: float) -> float:
    """Pixels-per-meter when a building GLB is lot-fit to a plot at runtime."""
    if footprint_w <= 0:
        footprint_w = 40.0
    return (plot_w * TILE_PX) / footprint_w


def site_vehicle_fit_for_plot(
    plot_w: float,
    footprint_w: float,
    *,
    road_boost: float = ROAD_VEHICLE_SCALE_BOOST,
) -> float:
    """Blender-side scale for embedded site cars.

    Compensates downward when a GLB is lot-shrunk at runtime, but never scales
    above 1.0 — enlarging site cars in the GLB makes them dominate doors/entrances.
    """
    if footprint_w <= 0:
        footprint_w = 40.0
    raw = (ROAD_PX_PER_M * road_boost) / lot_fit_px_per_m(plot_w, footprint_w)
    return min(raw, 1.0)


def building_px_per_m(ctx: "Ctx") -> float:
    """Pixels-per-meter applied when this building GLB is lot-fit at runtime."""
    grid = getattr(ctx.spec, "plot_grid", None) or {}
    plot_w = float(grid.get("w") or 6.0)
    footprint_w = float(ctx.W) or 40.0
    return lot_fit_px_per_m(plot_w, footprint_w)


def site_vehicle_scale(ctx: "Ctx") -> float:
    """Scale site vehicles in Blender so post–lot-fit size matches road traffic."""
    grid = getattr(ctx.spec, "plot_grid", None) or {}
    plot_w = float(grid.get("w") or 6.0)
    footprint_w = float(ctx.W) or 40.0
    return site_vehicle_fit_for_plot(plot_w, footprint_w)
