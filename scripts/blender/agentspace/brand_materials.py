"""Brand-aware toy-city PBR palette derivation.

The generator uses brand colours as accents, never as an all-over paint job.
Returned keys intentionally match the slots consumed by the existing recipes.
"""
from __future__ import annotations

from typing import Iterable


def _rgb(value: str, fallback=(0.32, 0.52, 0.72)) -> tuple[float, float, float]:
    raw = str(value or "").strip().lstrip("#")
    if len(raw) == 3:
        raw = "".join(ch * 2 for ch in raw)
    if len(raw) != 6:
        return fallback
    try:
        return tuple(round(int(raw[i : i + 2], 16) / 255.0, 4) for i in (0, 2, 4))
    except ValueError:
        return fallback


def _mix(a, b, amount: float):
    t = max(0.0, min(1.0, amount))
    return tuple(round(x * (1 - t) + y * t, 4) for x, y in zip(a, b))


def _lighten(c, amount=0.25):
    return _mix(c, (1.0, 1.0, 1.0), amount)


def _darken(c, amount=0.35):
    return _mix(c, (0.05, 0.06, 0.08), amount)


def _first_valid(values: Iterable[str], fallback):
    for value in values:
        candidate = _rgb(value, fallback)
        if candidate != fallback or str(value).strip().lower() in {
            "#5280b5",
            "5280b5",
        }:
            return candidate
    return fallback


def brand_material_defs(brand) -> dict[str, dict]:
    primary = _first_valid(getattr(brand, "primary_colours", []) or [], (0.32, 0.50, 0.72))
    secondary = _first_valid(getattr(brand, "secondary_colours", []) or [], _lighten(primary, 0.28))
    neutral = _mix((0.93, 0.89, 0.80), _lighten(primary, 0.6), 0.2)
    dark = _darken(primary, 0.38)
    glass = _mix(primary, (0.64, 0.86, 0.95), 0.68)
    return {
        "cream": {"kind": "albedo", "color": neutral, "rough": 0.52, "var": 0.035},
        "cream_dark": {"kind": "albedo", "color": _darken(neutral, 0.12), "rough": 0.58, "var": 0.03},
        "brand": {"kind": "albedo", "color": primary, "rough": 0.34, "var": 0.025, "emit": 0.08},
        "coral": {"kind": "albedo", "color": secondary, "rough": 0.38, "var": 0.025, "emit": 0.05},
        "charcoal": {"kind": "albedo", "color": dark, "rough": 0.46, "var": 0.025},
        "fin": {"kind": "albedo", "color": _darken(primary, 0.2), "rough": 0.4, "var": 0.02},
        "glass": {"kind": "albedo", "color": glass, "rough": 0.07, "var": 0.01, "emit": 0.2},
        "roof": {"kind": "albedo", "color": _darken(dark, 0.18), "rough": 0.74, "var": 0.03},
        "grass": {"kind": "albedo", "color": _mix(primary, (0.25, 0.55, 0.26), 0.75), "rough": 0.86, "var": 0.06},
        "paver": {"kind": "albedo", "color": _mix(neutral, (0.64, 0.66, 0.68), 0.4), "rough": 0.64, "var": 0.04},
        "canopy": {"kind": "albedo", "color": _darken(secondary, 0.18), "rough": 0.7, "var": 0.04},
        "bark": {"kind": "albedo", "color": (0.32, 0.2, 0.12), "rough": 0.82, "var": 0.05},
        "sign": {"kind": "emit", "color": _lighten(primary, 0.82), "emit": 0.7},
        "glow": {"kind": "emit", "color": _lighten(secondary, 0.55), "emit": 0.45},
    }