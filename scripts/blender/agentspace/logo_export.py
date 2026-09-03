"""Standalone official logo → pack.agentspace.logo.* GLB export.

SVG curves are preferred; PNG/JPG become image-backed planes. No invented logos.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any

import bpy
from mathutils import Vector

from .export_pack import export_pack_asset
from .geom import ensure_collection, link
from .logo_ingestion import apply_logo_surface, inspect_logo, write_logo_manifest
from .plot_validator import logo_asset_id
from .registry import tag

LOGO_KIND = "brand_logo"


def _remove_asset(asset_id: str) -> None:
    for ob in list(bpy.data.objects):
        if ob.get("asw_assetId") == asset_id:
            bpy.data.objects.remove(ob, do_unlink=True)


def _measure_local(asset_id: str) -> dict[str, float]:
    xs, ys, zs = [], [], []
    for ob in bpy.data.objects:
        if ob.get("asw_assetId") != asset_id:
            continue
        if ob.type != "MESH":
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


def build_logo_glb(
    logo,
    *,
    company_id: str,
    asset_id: str | None = None,
    width: float = 2.4,
    root_local: tuple[float, float, float] = (900.0, 24.0, 0.0),
) -> dict[str, Any]:
    """Author one logo root in the asset library. Caller may export with export_pack_asset."""
    info = inspect_logo(logo)
    if not info.get("available"):
        raise RuntimeError(info.get("reason") or "official logo asset required for GLB export")

    aid = asset_id or logo_asset_id(company_id)
    _remove_asset(aid)

    scene = bpy.context.scene.collection
    lib_empty = bpy.data.objects.get("Agentspace_Asset_Library")
    if lib_empty is None:
        raise RuntimeError("Agentspace_Asset_Library empty missing — open agentspace-world-multitask.blend")
    lib_col = bpy.data.collections.get("Agentspace_Asset_Library") or ensure_collection(
        "Agentspace_Asset_Library", scene
    )
    logos_col = bpy.data.collections.get("Logos") or ensure_collection("Logos", lib_col)

    root = bpy.data.objects.new(aid, None)
    root.empty_display_type = "PLAIN_AXES"
    root.empty_display_size = 2
    root.parent = lib_empty
    root.location = root_local
    bpy.context.scene.collection.objects.link(root)
    tag(root, asset_id=aid, component_id=f"{aid}/root", kind="library_root", runtime=False)
    root["asw_staging"] = 1
    root["asw_library"] = 1
    root["asw_libraryRoot"] = 1
    link(root, logos_col)

    def part(name, w, d, h, loc, mat, parent, col, cid, *, bevel=0.0, uv=0.05):
        from .geom import box

        ob = box(name, w, d, h, loc, mat, parent, bevel=bevel, uv=uv)
        tag(ob, asset_id=aid, component_id=f"{aid}/{cid}", kind=LOGO_KIND, runtime=True)
        ob["asw_staging"] = 1
        ob["asw_library"] = 1
        link(ob, col)
        return ob

    from .pbr_library import ensure_mats

    mats = ensure_mats({"sign": {"base_color": (0.9, 0.9, 0.88, 1.0), "roughness": 0.45}})
    sign_mat = mats.get("sign") or list(mats.values())[0]

    anchor = bpy.data.objects.new(f"{aid}.logo_anchor", None)
    anchor.parent = root
    anchor.location = (0.0, 0.0, 0.0)
    anchor.empty_display_type = "SPHERE"
    anchor.empty_display_size = 0.15
    bpy.context.scene.collection.objects.link(anchor)
    tag(anchor, asset_id=aid, component_id=f"{aid}/logo_anchor", kind="brand_logo_anchor", runtime=True)
    anchor["asw_logoAnchorRole"] = "landmark"
    link(anchor, logos_col)

    placement = apply_logo_surface(
        part,
        "facade",
        logo,
        0.0,
        0.0,
        0.0,
        root,
        logos_col,
        width=width,
        depth=0.08,
        asset_id=aid,
    )
    if not placement.get("placed"):
        raise RuntimeError(placement.get("reason") or "logo surface placement failed")

    manifest = write_logo_manifest(logo, info, company_id)
    local = _measure_local(aid)
    if local["w"] <= 0 or local["h"] <= 0:
        raise RuntimeError("logo GLB measured zero footprint")

    return {
        "assetId": aid,
        "companyId": company_id,
        "localMeters": local,
        "logo": {**info, "manifest": manifest, "placement": placement},
        "anchors": ["logo_anchor"],
    }


def build_and_export_logo(
    logo,
    *,
    company_id: str,
    asset_id: str | None = None,
    width: float = 2.4,
    root_local: tuple[float, float, float] = (900.0, 24.0, 0.0),
) -> dict[str, Any]:
    report = build_logo_glb(
        logo,
        company_id=company_id,
        asset_id=asset_id,
        width=width,
        root_local=root_local,
    )
    exported = export_pack_asset(report["assetId"])
    report["export"] = exported
    return report
