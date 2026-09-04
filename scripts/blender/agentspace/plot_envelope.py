"""Plot envelope — constraints before procedural architecture.

Plot defines buildable width/depth/height/setbacks; the generator solves
massing inside that envelope. Tier defaults apply when plot_grid is absent.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from .plot_validator import TILE_METERS

# Private buildable inset from lot edge (metres) — matches runtime lot scaling.
SETBACK_M = 0.6
ROW_CLEARANCE_M = 0.12

TIER_PLOT_DEFAULTS: dict[str, dict[str, Any]] = {
    "enterprise": {"plot_tiles": (8, 6), "footprint": (54.0, 38.0), "scale": 1.8, "max_height": 48.0},
    "smb": {"plot_tiles": (4, 3), "footprint": (26.0, 18.0), "scale": 1.4, "max_height": 22.0},
    "startup": {"plot_tiles": (6, 4), "footprint": (40.0, 28.0), "scale": 1.6, "max_height": 36.0},
}


@dataclass(frozen=True)
class PlotEnvelope:
    plot_id: str
    plot_grid: dict[str, float]
    lot_w_m: float
    lot_d_m: float
    footprint_w: float
    footprint_d: float
    buildable_w: float
    buildable_d: float
    area_m2: float
    frontage_m: float
    max_height: float
    scale: float
    tier: str
    is_corner: bool = False
    abuts: tuple[bool, bool, bool, bool] = (False, False, False, False)

    @property
    def size_class(self) -> str:
        tiles = self.plot_grid.get("w", 0) * self.plot_grid.get("h", 0)
        if tiles < 16:
            return "small"
        if tiles < 32:
            return "medium"
        return "large"


def resolve_envelope(
    *,
    plot_id: str,
    tier: str,
    plot_grid: dict[str, float] | None = None,
    footprint: tuple[float, float] | None = None,
    scale: float | None = None,
    max_height: float | None = None,
    is_corner: bool = False,
    abuts: tuple[bool, bool, bool, bool] | None = None,
) -> PlotEnvelope:
    """Derive design envelope from plot allocation + tier defaults."""
    tier = tier if tier in TIER_PLOT_DEFAULTS else "smb"
    defaults = TIER_PLOT_DEFAULTS[tier]
    tw, th = defaults["plot_tiles"]
    grid = dict(plot_grid or {"x": 0, "y": 0, "w": tw, "h": th})
    w_t = float(grid.get("w") or tw)
    h_t = float(grid.get("h") or th)
    lot_w = w_t * TILE_METERS
    lot_d = h_t * TILE_METERS

    ab = abuts or (False, False, False, False)
    west, east, north, south = ab
    build_w = lot_w
    build_d = lot_d
    if west or east:
        build_w -= ROW_CLEARANCE_M * int(west) + ROW_CLEARANCE_M * int(east)
    if north or south:
        build_d -= ROW_CLEARANCE_M * int(north) + ROW_CLEARANCE_M * int(south)
    build_w = max(build_w - SETBACK_M * 2, lot_w * 0.72)
    build_d = max(build_d - SETBACK_M * 2, lot_d * 0.72)

    if footprint:
        fw, fd = float(footprint[0]), float(footprint[1])
        fw = min(fw, build_w)
        fd = min(fd, build_d)
    else:
        # Plot is the envelope: occupy the buildable land, not a tiny tier default.
        fw, fd = build_w, build_d

    mh = float(max_height if max_height is not None else defaults["max_height"])
    sc = float(scale if scale is not None else defaults["scale"])

    return PlotEnvelope(
        plot_id=plot_id,
        plot_grid={"x": float(grid.get("x", 0)), "y": float(grid.get("y", 0)), "w": w_t, "h": h_t},
        lot_w_m=lot_w,
        lot_d_m=lot_d,
        footprint_w=fw,
        footprint_d=fd,
        buildable_w=build_w,
        buildable_d=build_d,
        area_m2=fw * fd,
        frontage_m=min(fw, fd),
        max_height=mh,
        scale=sc,
        tier=tier,
        is_corner=is_corner or (west and north),
        abuts=ab,
    )


def grammar_weights_for_envelope(envelope: PlotEnvelope) -> dict[str, float]:
    """Bias architectural grammars by plot shape — stacked boxes stay rare."""
    from .building_architecture import recipe_weights_for_plot

    w = recipe_weights_for_plot(envelope.lot_w_m, envelope.lot_d_m, area_m2=envelope.lot_w_m * envelope.lot_d_m)
    # Keep every registered recipe present so weighted_choice stays defined.
    for recipe in (
        "bridge_complex",
        "tower_campus",
        "stepped_terrace",
        "courtyard_block",
        "pavilion",
        "stacked_volumes",
        "asymmetric_campus",
        "sculpture_hq",
        "vertical_landmark",
        "hybrid",
    ):
        w.setdefault(recipe, 0.08)
    if envelope.is_corner:
        w["courtyard_block"] = w.get("courtyard_block", 0.8) + 0.5
        w["asymmetric_campus"] = w.get("asymmetric_campus", 0.8) + 0.4
    if envelope.frontage_m < 20:
        w["pavilion"] = w.get("pavilion", 0.8) + 0.5
        w["vertical_landmark"] = w.get("vertical_landmark", 0.6) + 0.35
    w["_plot_w"] = envelope.lot_w_m
    w["_plot_d"] = envelope.lot_d_m
    return w
