"""Handwritten Echt brand + building spec — first production company asset."""
from __future__ import annotations

from pathlib import Path

from .company_building_spec import BrandLogoSpec, BrandSpec, GeneratedBuildingSpec

_REPO_ROOT = Path(__file__).resolve().parents[3]
_ECHT_LOGO = _REPO_ROOT / "public/assets/brands/echt/logo.svg"

ECHT_BRAND = BrandSpec(
    company_id="echt",
    company_name="Echt",
    website="https://www.useecht.com",
    primary_colours=["#22a94f", "#22c55e", "#0f1211"],
    secondary_colours=["#f4f6f5", "#cdd6d1", "#5a6a54"],
    visual_style="quiet contemporary studio, white plaster, olive green, dark metal",
    architectural_direction="unified connected masses on shared podium, bridge links",
    signage_direction="official eye logo at facade, entrance canopy, and roof beacon",
    logo=BrandLogoSpec(
        wordmark="ECHT",
        asset_path=str(_ECHT_LOGO),
        source_url="https://www.useecht.com/icon.svg?icon.0dies.oh8h0xt.svg",
        fetched_at="2026-09-03T06:17:02.295Z",
    ),
)

# useecht.com palette — white/off-white walls, green accents, dark neutrals (no coral/blue toy paint).
ECHT_MAT_DEFS = {
    "asw.mat.echt.toy.cream": {"kind": "albedo", "color": (0.957, 0.965, 0.961), "rough": 0.52, "var": 0.03},
    "asw.mat.echt.toy.cream.dark": {"kind": "albedo", "color": (0.804, 0.839, 0.820), "rough": 0.58, "var": 0.03},
    "asw.mat.echt.toy.brand": {"kind": "albedo", "color": (0.133, 0.663, 0.310), "rough": 0.35, "var": 0.02, "emit": 0.08},
    "asw.mat.echt.toy.coral": {"kind": "albedo", "color": (0.373, 0.851, 0.541), "rough": 0.38, "var": 0.02, "emit": 0.05},
    "asw.mat.echt.toy.charcoal": {"kind": "albedo", "color": (0.059, 0.071, 0.067), "rough": 0.45, "var": 0.02},
    "asw.mat.echt.toy.glass": {"kind": "albedo", "color": (0.72, 0.80, 0.76), "rough": 0.08, "var": 0.01, "emit": 0.12},
    "asw.mat.echt.toy.roof": {"kind": "albedo", "color": (0.12, 0.13, 0.14), "rough": 0.72, "var": 0.03},
    "asw.mat.echt.toy.grass": {"kind": "albedo", "color": (0.133, 0.663, 0.310), "rough": 0.85, "var": 0.05},
    "asw.mat.echt.toy.paver": {"kind": "albedo", "color": (0.804, 0.839, 0.820), "rough": 0.6, "var": 0.04},
    "asw.mat.echt.toy.canopy": {"kind": "albedo", "color": (0.051, 0.420, 0.173), "rough": 0.7, "var": 0.04},
    "asw.mat.echt.toy.bark": {"kind": "albedo", "color": (0.32, 0.22, 0.14), "rough": 0.8, "var": 0.04},
    "asw.mat.echt.toy.sign": {"kind": "emit", "color": (0.957, 0.965, 0.961), "emit": 0.55},
    "asw.mat.echt.toy.glow": {"kind": "emit", "color": (0.373, 0.851, 0.541), "emit": 0.32},
}

_SCALE = 1.6

ECHT_BUILDING_SPEC = GeneratedBuildingSpec(
    asset_id="pack.agentspace.building.echt.02",
    building_id="loft",
    parcel_id="plot-b-incubator",
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
    plot_grid={"x": 26, "y": 6, "w": 7, "h": 5},
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
