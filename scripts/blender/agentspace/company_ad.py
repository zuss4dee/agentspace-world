"""Standalone roadside company sign / mini-ad.

Separate from the building. Blender authors geometry and named animation
anchors; Three.js/R3F drives the motion at runtime.

Required node names:
  CompanyAdRoot, CompanyLogo, CompanyAdFrame, CompanyAdGlow, CompanyAdAccent
"""
from __future__ import annotations

from typing import Any

import bpy
from mathutils import Vector

from .export_pack import export_pack_asset
from .geom import box, cyl, ensure_collection, link
from .logo_ingestion import apply_logo_surface, inspect_logo, write_logo_manifest
from .plot_validator import ad_asset_id
from .pbr_library import ensure_mats
from .registry import tag

AD_KIND = "company_ad"


def _remove_asset(asset_id: str) -> None:
    for ob in list(bpy.data.objects):
        if ob.get("asw_assetId") == asset_id:
            bpy.data.objects.remove(ob, do_unlink=True)


def _hex_to_linear(hex_color: str, fallback=(0.15, 0.18, 0.16, 1.0)):
    text = (hex_color or "").strip().lstrip("#")
    if len(text) != 6:
        return fallback
    try:
        r = int(text[0:2], 16) / 255.0
        g = int(text[2:4], 16) / 255.0
        b = int(text[4:6], 16) / 255.0
    except ValueError:
        return fallback
    return (r ** 2.2, g ** 2.2, b ** 2.2, 1.0)


def _measure_local(asset_id: str) -> dict[str, float]:
    xs, ys, zs = [], [], []
    for ob in bpy.data.objects:
        if ob.get("asw_assetId") != asset_id or ob.type != "MESH":
            continue
        for corner in ob.bound_box:
            loc = ob.matrix_local @ Vector(corner)
            xs.append(loc.x)
            ys.append(loc.y)
            zs.append(loc.z)
    return {
        "w": round(max(xs) - min(xs), 3) if xs else 0,
        "d": round(max(ys) - min(ys), 3) if ys else 0,
        "h": round(max(zs) - min(zs), 3) if zs else 0,
    }


def build_company_ad(
    brand,
    *,
    asset_id: str | None = None,
    root_local: tuple[float, float, float] = (920.0, 24.0, 0.0),
) -> dict[str, Any]:
    """Author one roadside brand installation in the asset library."""
    company_id = getattr(brand, "company_id", None) or getattr(brand, "companyId", "company")
    aid = asset_id or ad_asset_id(company_id)
    _remove_asset(aid)

    scene = bpy.context.scene.collection
    lib_empty = bpy.data.objects.get("Agentspace_Asset_Library")
    if lib_empty is None:
        raise RuntimeError("Agentspace_Asset_Library empty missing — open agentspace-world-multitask.blend")
    lib_col = bpy.data.collections.get("Agentspace_Asset_Library") or ensure_collection(
        "Agentspace_Asset_Library", scene
    )
    ads_col = bpy.data.collections.get("CompanyAds") or ensure_collection("CompanyAds", lib_col)

    colours = list(getattr(brand, "primary_colours", None) or getattr(brand, "primaryColours", None) or [])
    secondary = list(getattr(brand, "secondary_colours", None) or getattr(brand, "secondaryColours", None) or [])
    primary = _hex_to_linear(colours[0] if colours else "#1a2e1a")
    accent = _hex_to_linear((secondary[0] if secondary else colours[1] if len(colours) > 1 else "#c8cfc2"), (0.72, 0.76, 0.68, 1.0))
    mats = ensure_mats(
        {
            f"asw.ad.{company_id}.primary": {"kind": "albedo", "color": primary[:3], "rough": 0.55, "var": 0.01},
            f"asw.ad.{company_id}.accent": {"kind": "emit", "color": accent[:3], "emit": 0.45},
            f"asw.ad.{company_id}.frame": {"kind": "metal", "color": (0.04, 0.045, 0.05), "rough": 0.48, "metal": 0.18},
            f"asw.ad.{company_id}.glow": {"kind": "emit", "color": accent[:3], "emit": 0.7},
        }
    )
    primary_mat = mats[f"asw.ad.{company_id}.primary"]
    accent_mat = mats[f"asw.ad.{company_id}.accent"]
    frame_mat = mats[f"asw.ad.{company_id}.frame"]
    glow_mat = mats[f"asw.ad.{company_id}.glow"]

    root = bpy.data.objects.new("CompanyAdRoot", None)
    root.empty_display_type = "PLAIN_AXES"
    root.empty_display_size = 1.4
    root.parent = lib_empty
    root.location = root_local
    bpy.context.scene.collection.objects.link(root)
    tag(root, asset_id=aid, component_id=f"{aid}/CompanyAdRoot", kind="library_root", runtime=False)
    root["asw_staging"] = 1
    root["asw_library"] = 1
    root["asw_libraryRoot"] = 1
    root.name = "CompanyAdRoot"
    link(root, ads_col)

    def _part(name, w, d, h, loc, mat, cid, *, kind=AD_KIND, bevel=0.04):
        ob = box(name, w, d, h, loc, mat, root, bevel=bevel)
        tag(ob, asset_id=aid, component_id=f"{aid}/{cid}", kind=kind, runtime=True)
        ob["asw_staging"] = 1
        ob["asw_library"] = 1
        link(ob, ads_col)
        return ob

    # Pedestal
    _part("CompanyAdBase", 0.72, 0.72, 0.16, (0.0, 0.0, 0.08), primary_mat, "base", bevel=0.03)
    _part("CompanyAdStem", 0.16, 0.16, 0.85, (0.0, 0.0, 0.58), frame_mat, "stem", bevel=0.02)

    frame = _part("CompanyAdFrame", 1.28, 0.10, 0.92, (0.0, 0.0, 1.28), frame_mat, "CompanyAdFrame", bevel=0.05)
    frame.name = "CompanyAdFrame"

    glow = _part("CompanyAdGlow", 1.12, 0.06, 0.76, (0.0, 0.06, 1.28), glow_mat, "CompanyAdGlow", kind="company_ad_glow", bevel=0.03)
    glow.name = "CompanyAdGlow"

    accent = cyl("CompanyAdAccent", 0.62, 0.045, (0.0, 0.0, 1.78), accent_mat, root, segs=28)
    tag(accent, asset_id=aid, component_id=f"{aid}/CompanyAdAccent", kind="company_ad_accent", runtime=True)
    accent["asw_staging"] = 1
    accent["asw_library"] = 1
    accent.name = "CompanyAdAccent"
    link(accent, ads_col)

    logo = getattr(brand, "logo", None)
    logo_info = inspect_logo(logo)
    logo_placement = {"placed": False}
    if logo_info.get("available"):
        logo_placement = apply_logo_surface(
            lambda name, w, d, h, loc, mat, parent, col, cid, **_k: _part(name, w, d, h, loc, mat, cid),
            "ad",
            logo,
            0.0,
            0.12,
            1.28,
            root,
            ads_col,
            width=0.86,
            depth=0.05,
            asset_id=aid,
            anchor_role="ad",
            extrude=0.035,
            object_name="CompanyLogo",
        )
        write_logo_manifest(logo, logo_info, company_id)
    if not logo_placement.get("placed"):
        plaque = _part("CompanyLogo", 0.86, 0.05, 0.42, (0.0, 0.12, 1.28), primary_mat, "CompanyLogo", kind="brand_logo")
        plaque.name = "CompanyLogo"

    for ob in bpy.data.objects:
        if ob.get("asw_assetId") == aid and "official_logo" in str(ob.get("asw_componentId") or ""):
            if ob.name != "CompanyLogo":
                ob.name = "CompanyLogo"
            break

    local = _measure_local(aid)
    return {
        "assetId": aid,
        "companyId": company_id,
        "localMeters": local,
        "logo": {**logo_info, "placement": logo_placement},
        "nodes": ["CompanyAdRoot", "CompanyLogo", "CompanyAdFrame", "CompanyAdGlow", "CompanyAdAccent"],
    }


def build_and_export_company_ad(brand, *, asset_id: str | None = None) -> dict[str, Any]:
    report = build_company_ad(brand, asset_id=asset_id)
    report["export"] = export_pack_asset(report["assetId"])
    return report
