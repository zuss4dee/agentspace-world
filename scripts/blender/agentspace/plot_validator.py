"""Validate authored building bbox against plot private footprint (metres)."""
from __future__ import annotations

from dataclasses import dataclass

from .company_building_spec import GeneratedBuildingSpec

# Matches src/lib/units.ts TILE_METERS
TILE_METERS = 8.0
ROW_EDGE_CLEARANCE = 0.12


@dataclass
class PlotBoundsMeters:
    max_w: float
    max_d: float
    plot_id: str


def _inset_tiles(w: float, h: float, abuts: tuple[bool, bool, bool, bool]) -> tuple[float, float]:
    x, y, tw, th = 0.0, 0.0, w, h
    west, east, north, south = abuts
    if west:
        x += ROW_EDGE_CLEARANCE
        tw -= ROW_EDGE_CLEARANCE
    if east:
        tw -= ROW_EDGE_CLEARANCE
    if north:
        y += ROW_EDGE_CLEARANCE
        th -= ROW_EDGE_CLEARANCE
    if south:
        th -= ROW_EDGE_CLEARANCE
    return max(tw, 0.5), max(th, 0.5)


def plot_bounds_from_spec(spec: GeneratedBuildingSpec) -> PlotBoundsMeters | None:
    """Compute max horizontal metres from plot grid on spec."""
    grid = spec.plot_grid
    if not grid:
        return None
    w_t = float(grid.get("w", 0))
    h_t = float(grid.get("h", 0))
    if w_t < 0.5 or h_t < 0.5:
        return None
    # Conservative: full lot tile rect × tile metres (runtime scales GLB to private inset).
    max_w = w_t * TILE_METERS
    max_d = h_t * TILE_METERS
    return PlotBoundsMeters(max_w=max_w, max_d=max_d, plot_id=spec.parcel_id)


def validate_footprint(
    local_meters: dict[str, float],
    spec: GeneratedBuildingSpec,
    *,
    tolerance: float = 0.05,
) -> dict:
    """Fail if horizontal bbox exceeds plot allocation."""
    bounds = plot_bounds_from_spec(spec)
    w = float(local_meters.get("w", 0))
    d = float(local_meters.get("d", 0))
    issues: list[str] = []

    if bounds:
        # Design bbox must fit within lot tile extent (runtime uniform-scales to private footprint).
        if w > bounds.max_w + tolerance:
            issues.append(f"width {w}m exceeds plot max {bounds.max_w}m ({bounds.plot_id})")
        if d > bounds.max_d + tolerance:
            issues.append(f"depth {d}m exceeds plot max {bounds.max_d}m ({bounds.plot_id})")

    h = float(local_meters.get("h", 0))
    if w <= 0 or d <= 0 or h <= 0:
        issues.append("invalid measured footprint")
    if spec.max_height is not None and h > float(spec.max_height) + tolerance:
        issues.append(f"height {h}m exceeds plot max {spec.max_height}m ({spec.parcel_id})")

    return {"ok": not issues, "issues": issues, "bounds": bounds, "measured": {"w": w, "d": d, "h": h}}


def assert_no_interior_kinds(asset_id: str) -> dict:
    """Reject interior-tagged components on building assets."""
    import bpy

    forbidden = {"interior", "furniture", "room"}
    bad: list[str] = []
    for ob in bpy.data.objects:
        if ob.get("asw_assetId") != asset_id:
            continue
        kind = str(ob.get("asw_kind") or "")
        if kind in forbidden:
            bad.append(f"{ob.name}:{kind}")
    return {"ok": not bad, "interiorComponents": bad}


def validate_asset_id(asset_id: str) -> dict:
    """Pack ids are the stable contract consumed by R3F and publish."""
    import re

    ok = bool(re.fullmatch(r"pack\.agentspace\.building\.[a-z0-9][a-z0-9._-]*", asset_id))
    return {"ok": ok, "assetId": asset_id, "reason": None if ok else "invalid building asset id"}
