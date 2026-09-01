"""Apple 3D Maps night palette for preview/test buildings — do not use on Echt.

Visual target: docs/BUILDING_VISUAL_STYLE.md
"""
from __future__ import annotations

# Slot-keyed defs — resolved directly by company_building._resolve_mat_palette
PREVIEW_MAT_DEFS: dict[str, dict] = {
    "cream": {"kind": "albedo", "color": (0.72, 0.58, 0.48), "rough": 0.58, "var": 0.018},
    "cream_dark": {"kind": "albedo", "color": (0.22, 0.26, 0.34), "rough": 0.68, "var": 0.015},
    "brand": {"kind": "albedo", "color": (0.52, 0.58, 0.68), "rough": 0.55, "var": 0.012},
    "coral": {"kind": "albedo", "color": (0.48, 0.32, 0.72), "rough": 0.42, "var": 0.01, "emit": 0.35},
    "charcoal": {"kind": "albedo", "color": (0.14, 0.16, 0.22), "rough": 0.72, "var": 0.015},
    "fin": {"kind": "albedo", "color": (0.18, 0.20, 0.28), "rough": 0.65, "var": 0.012},
    "glass": {"kind": "emit", "color": (1.0, 0.82, 0.48), "emit": 4.2},
    "roof": {"kind": "albedo", "color": (0.10, 0.11, 0.15), "rough": 0.78, "var": 0.02},
    "grass": {"kind": "albedo", "color": (0.16, 0.36, 0.38), "rough": 0.88, "var": 0.03},
    "paver": {"kind": "albedo", "color": (0.28, 0.30, 0.34), "rough": 0.65, "var": 0.025},
    "canopy": {"kind": "albedo", "color": (0.12, 0.32, 0.28), "rough": 0.82, "var": 0.04},
    "bark": {"kind": "albedo", "color": (0.18, 0.14, 0.10), "rough": 0.85, "var": 0.03},
    "sign": {"kind": "emit", "color": (0.95, 0.96, 1.0), "emit": 0.55},
    "glow": {"kind": "emit", "color": (1.0, 0.94, 0.78), "emit": 5.0},
}
