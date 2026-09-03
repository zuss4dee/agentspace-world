"""Quality-bar gallery: 6 Silicon City buildings, library only (no publish).

Visual target: the authored SPARK / NOVA daylight toy-city buildings.
Does NOT write occupancy, WORLD_BUILDINGS, or runtime GLBs.

Usage:
  blender --background scripts/blender/agentspace-world-multitask.blend \\
    --python scripts/blender/build_quality_gallery.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from agentspace.brand_profile import derive_mat_defs, load_brand_profile, style_params, to_brand_spec, uniqueness_key
from agentspace.company_building_spec import GeneratedBuildingSpec
from agentspace.param_rng import ParamRNG, deterministic_seed
from agentspace.plot_envelope import resolve_envelope
from agentspace.plot_validator import TILE_METERS, validate_footprint
from agentspace.siliconcity.builder import build_from_spec
from agentspace.siliconcity.massing import (
    ARCHETYPE_FOOTPRINT,
    classify_plot,
    recipe_payload,
    volume_count_for_archetype,
)
from agentspace.uniqueness_registry import register_fingerprint, structural_fingerprint

MARKER = "ASW_QUALITY_GALLERY_JSON:"
BRANDS = ROOT / "brands"
# Dedicated inspection row — away from preview pads (Y=24 / Y=110) and Echt (X=180, Y=24).
GALLERY_Y = 240.0

# Six genuinely different envelopes → six different massing families.
CASES = (
    {
        "label": "spark-commercial",
        "brand": "spark.json",
        "recipe": "smb_block",
        "plot_id": "gallery-spark",
        "plot_grid": {"x": 0, "y": 0, "w": 5, "h": 4},
        "tier": "smb",
        "is_corner": True,
        "root": (0.0, GALLERY_Y, 0.0),
        "silhouette": "Low red shop block + blue/coral corner tower, storefront awnings, pole sign (SPARK language).",
        "max_height": 32.0,
    },
    {
        "label": "nova-hq",
        "brand": "nova.json",
        "recipe": "enterprise_hq",
        "plot_id": "gallery-nova",
        "plot_grid": {"x": 0, "y": 0, "w": 9, "h": 7},
        "tier": "enterprise",
        "is_corner": False,
        "root": (95.0, GALLERY_Y, 0.0),
        "silhouette": "L-podium + stacked setback tower, white fins/bands, sky bridge, roof greeble (NOVA language).",
        "max_height": 80.0,
    },
    {
        "label": "loft-studio",
        "brand": "loft.json",
        "recipe": "startup_loft",
        "plot_id": "gallery-loft",
        "plot_grid": {"x": 0, "y": 0, "w": 8, "h": 6},
        "tier": "startup",
        "is_corner": False,
        "root": (200.0, GALLERY_Y, 0.0),
        "silhouette": "Long warehouse volume + barrel/sawtooth vault + cantilevered glass box over a cream plinth.",
        "max_height": 48.0,
    },
    {
        "label": "orbit-courtyard",
        "brand": "orbit.json",
        "recipe": "courtyard_campus",
        "plot_id": "gallery-orbit",
        "plot_grid": {"x": 0, "y": 0, "w": 8, "h": 8},
        "tier": "enterprise",
        "is_corner": False,
        "root": (310.0, GALLERY_Y, 0.0),
        "silhouette": "U-shaped campus: 2-storey front bar, taller left wing, lower right wing, rear link, corner tower around a planted court.",
        "max_height": 56.0,
    },
    {
        "label": "corner-strip",
        "brand": "corner.json",
        "recipe": "low_rise_strip",
        "plot_id": "gallery-corner",
        "plot_grid": {"x": 0, "y": 0, "w": 10, "h": 4},
        "tier": "smb",
        "is_corner": True,
        "root": (430.0, GALLERY_Y, 0.0),
        "silhouette": "Wide shallow ribbon: long 2-storey retail frontage, taller end pavilion, rear service volume, bay awnings.",
        "max_height": 36.0,
    },
    {
        "label": "forge-hall",
        "brand": "forge.json",
        "recipe": "industrial_hall",
        "plot_id": "gallery-forge",
        "plot_grid": {"x": 0, "y": 0, "w": 5, "h": 10},
        "tier": "startup",
        "is_corner": False,
        "root": (545.0, GALLERY_Y, 0.0),
        "silhouette": "Narrow deep plot: 3-storey street office head attached to a long sawtooth hall with a side loading dock.",
        "max_height": 48.0,
    },
)


def _spec_for_case(case: dict) -> tuple:
    profile = load_brand_profile(BRANDS / case["brand"])
    recipe = case["recipe"]
    fw, fd = ARCHETYPE_FOOTPRINT[recipe]
    envelope = resolve_envelope(
        plot_id=case["plot_id"],
        tier=case["tier"],
        plot_grid=case["plot_grid"],
        footprint=(fw, fd),
        scale=None,
        max_height=case["max_height"],
        is_corner=bool(case.get("is_corner")),
    )
    # Keep the designed Silicon City footprint; plot tiles are sized to contain it.
    footprint_w, footprint_d = fw, fd
    aid = f"pack.agentspace.building.gallery.{profile.slug}.01"
    seed_key = f"{profile.company_id}+{case['plot_id']}+{aid}"
    seed = deterministic_seed(seed_key, aid)
    rng = ParamRNG(seed)
    params = style_params(profile, rng=rng)
    params["tier"] = case["tier"]
    params["wordmark"] = profile.wordmark()
    params["seed"] = seed
    params["massing_strategy"] = classify_plot(
        envelope.lot_w_m,
        envelope.lot_d_m,
        is_corner=bool(case.get("is_corner")),
    )
    params["volume_count"] = volume_count_for_archetype(recipe)
    fingerprint = structural_fingerprint(recipe, params)
    params["uniquenessKey"] = fingerprint
    params["structuralFingerprint"] = fingerprint
    params["architecturalFingerprint"] = uniqueness_key(profile.company_id, case["tier"], params, derive_mat_defs(profile))
    register_fingerprint(
        fingerprint,
        company_id=profile.company_id,
        plot_id=case["plot_id"],
        asset_id=aid,
        recipe=recipe,
    )
    spec = GeneratedBuildingSpec(
        asset_id=aid,
        building_id=f"{profile.slug}-{recipe}",
        parcel_id=case["plot_id"],
        brand=to_brand_spec(profile),
        recipe=recipe,
        root_local=tuple(case["root"]),
        scale=envelope.scale,
        footprint_w=footprint_w,
        footprint_d=footprint_d,
        site_z=0.34,
        max_height=case["max_height"],
        roof_kind=str(params.get("roof_module") or "membrane"),
        glass_ratio=float(params.get("glass_bias", 0.5)),
        mat_defs=derive_mat_defs(profile),
        recipe_params=params,
        plot_grid=dict(case["plot_grid"]),
        detail_density="HIGH",
        runtime_export_kinds=[
            "building",
            "facade",
            "window",
            "door",
            "roof",
            "canopy",
            "signage",
            "brand",
            "site",
            "landscape",
            "prop",
        ],
    )
    return profile, spec, envelope, recipe_payload(recipe, params)


def build_gallery() -> list[dict]:
    reports = []
    for case in CASES:
        profile, spec, envelope, payload = _spec_for_case(case)
        report = build_from_spec(profile, spec)
        metres = report["localMeters"]
        fp = validate_footprint(metres, spec)
        lot_w = float(case["plot_grid"]["w"]) * TILE_METERS
        lot_d = float(case["plot_grid"]["h"]) * TILE_METERS
        entry = {
            "label": case["label"],
            "companyId": profile.company_id,
            "companyName": profile.company_name,
            "recipe": spec.recipe,
            "massingStrategy": payload.get("massing_strategy"),
            "plotId": case["plot_id"],
            "plotTiles": case["plot_grid"],
            "plotMeters": {"w": lot_w, "d": lot_d},
            "designFootprint": {"w": spec.footprint_w, "d": spec.footprint_d},
            "measuredMeters": metres,
            "plotValidation": {"ok": fp["ok"], "issues": fp["issues"]},
            "heightLimit": spec.max_height,
            "seed": spec.recipe_params.get("seed"),
            "fingerprint": spec.recipe_params.get("structuralFingerprint"),
            "architecturalFingerprint": spec.recipe_params.get("architecturalFingerprint"),
            "recipeParams": {
                k: spec.recipe_params.get(k)
                for k in (
                    "storey_count",
                    "wing_offset_x",
                    "wing_offset_y",
                    "roof_module",
                    "entrance_side",
                    "window_cols",
                    "facade_style",
                    "tower_style",
                    "corner_style",
                    "logo_mode",
                    "volume_count",
                )
            },
            "brandColours": {
                "primary": list(profile.primary_colours),
                "secondary": list(profile.secondary_colours),
            },
            "wordmark": profile.wordmark(),
            "rootLocal": list(spec.root_local),
            "silhouette": case["silhouette"],
            "objects": report.get("objects"),
            "published": False,
        }
        reports.append(entry)
        print(
            "GALLERY_OK",
            case["label"],
            spec.recipe,
            metres,
            "plot",
            f"{lot_w}x{lot_d}",
            "valid" if fp["ok"] else fp["issues"],
        )
    return reports


def _frame_gallery_view():
    """Aim the viewport camera at the six-building row (inspection only)."""
    try:
        import bpy
        from mathutils import Vector

        xs = [c["root"][0] for c in CASES]
        mid = Vector(((min(xs) + max(xs)) / 2.0, GALLERY_Y, 8.0))
        cam_loc = Vector((mid.x - 40.0, GALLERY_Y - 140.0, 72.0))
        for area in bpy.context.screen.areas if bpy.context.screen else []:
            if area.type != "VIEW_3D":
                continue
            space = area.spaces.active
            r3d = space.region_3d
            r3d.view_location = mid
            r3d.view_distance = 220.0
            r3d.view_rotation = (cam_loc - mid).to_track_quat("-Z", "Y")
            space.shading.type = "MATERIAL"
            break
    except Exception as exc:
        print("GALLERY_VIEW_SKIP", exc)


if __name__ == "__main__":
    reports = build_gallery()
    _frame_gallery_view()
    print(MARKER + json.dumps(reports))
    print("GALLERY_ALL_OK", len(reports), "published=false")
