"""Fit a generated building's XY footprint to its plot envelope.

Plot is the constraint. Recipes and visual design stay unchanged; if the
measured footprint overshoots the lot, scale X/Y uniformly (never upscale,
never squash Z unless an explicit height cap already exists).
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from .plot_validator import plot_bounds_from_spec

# Comfort margin so the fitted bbox sits inside the lot instead of on 32.000 m.
# Validation still uses the full tile rect + 0.05 m; this is only the fit target.
# 0.35 m absorbs typical procedural overshoot (e.g. 32.27 vs 32.0) before publish.
FIT_SAFETY_M = 0.35

FROZEN_PRESETS = frozenset({"echt_v1"})
FROZEN_ASSET_MARKERS = (".building.echt.",)

_XY_EPS = 1e-12


@dataclass(frozen=True)
class PlotFit:
    xy_scale: float
    z_scale: float
    generated_w: float
    generated_d: float
    generated_h: float | None
    plot_max_w: float
    plot_max_d: float
    usable_w: float
    usable_d: float
    fitted_w: float
    fitted_d: float
    fitted_h: float | None
    skipped: bool = False
    reason: str = ""

    @property
    def applied(self) -> bool:
        if self.skipped:
            return False
        return self.xy_scale < 1.0 - _XY_EPS or self.z_scale < 1.0 - _XY_EPS


def is_frozen_building(spec: Any) -> bool:
    """Authored assets (Echt) must never be resized by plot fit."""
    aid = str(getattr(spec, "asset_id", "") or "")
    if any(marker in aid for marker in FROZEN_ASSET_MARKERS):
        return True
    params = getattr(spec, "recipe_params", None) or {}
    return str(params.get("preset") or "") in FROZEN_PRESETS


def _usable_span(plot_max: float, safety_m: float) -> float:
    return max(float(plot_max) - float(safety_m), 0.01)


def _axis_scale(generated: float, usable: float) -> float:
    gen = float(generated)
    if gen <= 0:
        return 1.0
    if gen <= usable + _XY_EPS:
        return 1.0
    return min(usable / gen, 1.0)


def fit_building_to_plot(
    generated_w: float,
    generated_d: float,
    plot_max_w: float,
    plot_max_d: float,
    *,
    generated_h: float | None = None,
    max_height: float | None = None,
    safety_m: float = FIT_SAFETY_M,
) -> PlotFit:
    """Return the uniform XY (and optional Z) scale that fits the plot.

    Never upscales. Preserves footprint aspect ratio. Leaves already-fitting
    buildings at 1.0. Z is untouched unless `max_height` is an explicit cap.
    """
    plot_w = float(plot_max_w)
    plot_d = float(plot_max_d)
    usable_w = _usable_span(plot_w, safety_m)
    usable_d = _usable_span(plot_d, safety_m)
    sx = _axis_scale(generated_w, usable_w)
    sy = _axis_scale(generated_d, usable_d)
    xy_scale = min(sx, sy, 1.0)

    z_scale = 1.0
    h = None if generated_h is None else float(generated_h)
    if max_height is not None and h is not None and h > 0:
        usable_h = _usable_span(float(max_height), safety_m)
        z_scale = _axis_scale(h, usable_h)

    fitted_h = None if h is None else h * z_scale
    return PlotFit(
        xy_scale=xy_scale,
        z_scale=z_scale,
        generated_w=float(generated_w),
        generated_d=float(generated_d),
        generated_h=h,
        plot_max_w=plot_w,
        plot_max_d=plot_d,
        usable_w=usable_w,
        usable_d=usable_d,
        fitted_w=float(generated_w) * xy_scale,
        fitted_d=float(generated_d) * xy_scale,
        fitted_h=fitted_h,
    )


def fit_spec_to_plot(spec: Any, local_meters: dict[str, float], *, safety_m: float = FIT_SAFETY_M) -> PlotFit:
    """Resolve plot envelope from the spec, then compute the fit scale."""
    w = float(local_meters.get("w", 0))
    d = float(local_meters.get("d", 0))
    h_raw = local_meters.get("h")
    h = None if h_raw is None else float(h_raw)

    if is_frozen_building(spec):
        return PlotFit(
            xy_scale=1.0,
            z_scale=1.0,
            generated_w=w,
            generated_d=d,
            generated_h=h,
            plot_max_w=0.0,
            plot_max_d=0.0,
            usable_w=0.0,
            usable_d=0.0,
            fitted_w=w,
            fitted_d=d,
            fitted_h=h,
            skipped=True,
            reason="frozen_asset",
        )

    bounds = plot_bounds_from_spec(spec)
    if bounds is None:
        return PlotFit(
            xy_scale=1.0,
            z_scale=1.0,
            generated_w=w,
            generated_d=d,
            generated_h=h,
            plot_max_w=0.0,
            plot_max_d=0.0,
            usable_w=0.0,
            usable_d=0.0,
            fitted_w=w,
            fitted_d=d,
            fitted_h=h,
            skipped=True,
            reason="no_plot_bounds",
        )

    max_height = getattr(spec, "max_height", None)
    return fit_building_to_plot(
        w,
        d,
        bounds.max_w,
        bounds.max_d,
        generated_h=h,
        max_height=max_height,
        safety_m=safety_m,
    )


def apply_plot_fit(root: Any, xy_scale: float, z_scale: float = 1.0) -> None:
    """Scale generated parts about the library root. Nested children inherit."""
    import bpy

    if xy_scale >= 1.0 - _XY_EPS and z_scale >= 1.0 - _XY_EPS:
        return
    for ob in list(bpy.data.objects):
        if ob.parent is not root:
            continue
        if xy_scale < 1.0 - _XY_EPS:
            ob.location.x *= xy_scale
            ob.location.y *= xy_scale
            ob.scale.x *= xy_scale
            ob.scale.y *= xy_scale
        if z_scale < 1.0 - _XY_EPS:
            ob.location.z *= z_scale
            ob.scale.z *= z_scale
    bpy.context.view_layer.update()


def plot_fit_report(fit: PlotFit) -> dict[str, Any]:
    return {
        "xy_scale": fit.xy_scale,
        "z_scale": fit.z_scale,
        "applied": fit.applied,
        "skipped": fit.skipped,
        "reason": fit.reason,
        "generated": {"w": fit.generated_w, "d": fit.generated_d, "h": fit.generated_h},
        "usable": {"w": fit.usable_w, "d": fit.usable_d},
        "fitted": {"w": fit.fitted_w, "d": fit.fitted_d, "h": fit.fitted_h},
    }


def ensure_building_fits_plot(spec: Any, local_meters: dict[str, float], root: Any) -> PlotFit:
    """Compute fit, apply XY (and optional Z) to generated geometry, return the result."""
    fit = fit_spec_to_plot(spec, local_meters)
    if not fit.applied:
        return fit
    apply_plot_fit(root, fit.xy_scale, fit.z_scale)
    return fit
