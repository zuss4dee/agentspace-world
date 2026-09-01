"""Handwritten Echt brand + building spec — first production company asset."""
from __future__ import annotations

from .company_building_spec import BrandLogoSpec, BrandSpec, GeneratedBuildingSpec

ECHT_BRAND = BrandSpec(
    company_id="echt",
    company_name="Echt",
    primary_colours=["#c8cfc2", "#6a8a4a", "#111827"],
    secondary_colours=["#5a6a54", "#e8eee4"],
    visual_style="premium stylized toy-city HQ, olive/teal/coral miniature",
    architectural_direction="unified connected masses on shared podium, bridge links",
    signage_direction="block lettermark at facade and entrance canopy",
    logo=BrandLogoSpec(wordmark="ECHT", asset_path=None),
)

ECHT_MAT_DEFS = {
    "asw.mat.echt.toy.cream": {"kind": "albedo", "color": (0.96, 0.91, 0.82), "rough": 0.52, "var": 0.03},
    "asw.mat.echt.toy.cream.dark": {"kind": "albedo", "color": (0.84, 0.78, 0.68), "rough": 0.58, "var": 0.03},
    "asw.mat.echt.toy.brand": {"kind": "albedo", "color": (0.38, 0.62, 0.52), "rough": 0.35, "var": 0.02, "emit": 0.15},
    "asw.mat.echt.toy.coral": {"kind": "albedo", "color": (0.92, 0.48, 0.40), "rough": 0.38, "var": 0.02, "emit": 0.1},
    "asw.mat.echt.toy.charcoal": {"kind": "albedo", "color": (0.14, 0.15, 0.17), "rough": 0.45, "var": 0.02},
    "asw.mat.echt.toy.glass": {"kind": "albedo", "color": (0.48, 0.72, 0.82), "rough": 0.06, "var": 0.01, "emit": 0.28},
    "asw.mat.echt.toy.roof": {"kind": "albedo", "color": (0.18, 0.19, 0.22), "rough": 0.72, "var": 0.03},
    "asw.mat.echt.toy.grass": {"kind": "albedo", "color": (0.38, 0.58, 0.32), "rough": 0.85, "var": 0.05},
    "asw.mat.echt.toy.paver": {"kind": "albedo", "color": (0.82, 0.76, 0.64), "rough": 0.6, "var": 0.04},
    "asw.mat.echt.toy.canopy": {"kind": "albedo", "color": (0.30, 0.50, 0.36), "rough": 0.7, "var": 0.04},
    "asw.mat.echt.toy.bark": {"kind": "albedo", "color": (0.40, 0.26, 0.16), "rough": 0.8, "var": 0.04},
    "asw.mat.echt.toy.sign": {"kind": "emit", "color": (1.0, 0.98, 0.92), "emit": 0.65},
    "asw.mat.echt.toy.glow": {"kind": "emit", "color": (1.0, 0.94, 0.80), "emit": 0.42},
}

_SCALE = 1.6

ECHT_BUILDING_SPEC = GeneratedBuildingSpec(
    asset_id="pack.agentspace.building.echt.02",
    building_id="loft",
    parcel_id="plot-b-loft",
    brand=ECHT_BRAND,
    recipe="bridge_complex",
    root_local=(180.0, 24.0, 0.0),
    scale=_SCALE,
    footprint_w=round(30.4 * _SCALE, 1),
    footprint_d=round(20.6 * _SCALE, 1),
    site_z=0.34,
    roof_kind="membrane",
    glass_ratio=0.62,
    mat_defs=ECHT_MAT_DEFS,
    recipe_params={"preset": "echt_v1"},
    plot_grid={"x": 26, "y": 0, "w": 7, "h": 5},
    runtime_export_kinds=[
        "structure",
        "facade",
        "window",
        "door",
        "roof",
        "canopy",
        "signage",
        "brand",
        "site",
        "landscape",
    ],
)
