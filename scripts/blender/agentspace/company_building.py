"""Reusable company building generator — library assets, exterior-only.

Entry: build_from_spec(brand_spec, generated_spec)
       build_company_building(brand_spec, generated_spec)
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable

import bpy
from mathutils import Vector

from .company_building_spec import BrandSpec, GeneratedBuildingSpec
from .geom import box, ensure_collection, link
from .param_rng import deterministic_seed
from .plot_validator import assert_no_interior_kinds, validate_footprint
from .pbr_library import ensure_mats
from .building_composition import apply_toy_composition
from .recipe_templates import compose
from .registry import tag
from .spec_compiler import compile_spec

KIND = "building"

DEFAULT_MAT_KEYS = (
    "cream",
    "cream_dark",
    "brand",
    "coral",
    "charcoal",
    "fin",
    "glass",
    "roof",
    "grass",
    "paver",
    "canopy",
    "bark",
    "sign",
    "glow",
)


@dataclass
class BuildingContext:
    asset_id: str
    brand: BrandSpec
    spec: GeneratedBuildingSpec
    seed: int
    scale: float
    W: float
    D: float
    site_z: float
    root: Any
    col: Any
    mats: dict[str, Any]
    part: Callable[..., Any]
    params: dict[str, Any] = field(default_factory=dict)
    anchors: dict[str, Any] = field(default_factory=dict)


def _remove_asset(asset_id: str) -> None:
    for ob in list(bpy.data.objects):
        if ob.get("asw_assetId") == asset_id:
            bpy.data.objects.remove(ob, do_unlink=True)


def _resolve_mat_palette(mat_defs: dict[str, dict[str, Any]]) -> dict[str, Any]:
    raw = ensure_mats(mat_defs)
    aliases = {
        "cream": "asw.mat.echt.toy.cream",
        "cream_dark": "asw.mat.echt.toy.cream.dark",
        "brand": "asw.mat.echt.toy.brand",
        "coral": "asw.mat.echt.toy.coral",
        "charcoal": "asw.mat.echt.toy.charcoal",
        "fin": "asw.mat.echt.toy.charcoal",
        "glass": "asw.mat.echt.toy.glass",
        "roof": "asw.mat.echt.toy.roof",
        "grass": "asw.mat.echt.toy.grass",
        "paver": "asw.mat.echt.toy.paver",
        "canopy": "asw.mat.echt.toy.canopy",
        "bark": "asw.mat.echt.toy.bark",
        "sign": "asw.mat.echt.toy.sign",
        "glow": "asw.mat.echt.toy.glow",
    }
    out: dict[str, Any] = {}
    keys = list(mat_defs.keys())
    for slot in DEFAULT_MAT_KEYS:
        if slot in raw:
            out[slot] = raw[slot]
            continue
        alias = aliases.get(slot)
        if alias and alias in raw:
            out[slot] = raw[alias]
            continue
        for k in keys:
            if slot.replace("_", ".") in k or slot in k:
                out[slot] = raw[k]
                break
    if len(out) < len(DEFAULT_MAT_KEYS):
        ordered = [raw[k] for k in keys]
        for i, slot in enumerate(DEFAULT_MAT_KEYS):
            if slot not in out and i < len(ordered):
                out[slot] = ordered[i % len(ordered)]
    return out


def _measure_local_bbox(asset_id: str, fallback_w: float, fallback_d: float) -> dict:
    root = bpy.data.objects.get(asset_id)
    root_inv = root.matrix_world.inverted() if root else None
    meshes = [o for o in bpy.data.objects if o.get("asw_assetId") == asset_id and o.type == "MESH"]
    xs, ys, zs = [], [], []
    for o in meshes:
        for corner in o.bound_box:
            world = o.matrix_world @ Vector(corner)
            loc = root_inv @ world if root_inv else o.matrix_local @ Vector(corner)
            xs.append(loc.x)
            ys.append(loc.y)
            zs.append(loc.z)
    return {
        "assetId": asset_id,
        "objects": len([o for o in bpy.data.objects if o.get("asw_assetId") == asset_id]),
        "meshes": len(meshes),
        "localMeters": {
            "w": round(max(xs) - min(xs), 3) if xs else fallback_w,
            "d": round(max(ys) - min(ys), 3) if ys else fallback_d,
            "h": round(max(zs) - min(zs), 3) if zs else 0,
            "z0": round(min(zs), 3) if zs else 0,
        },
    }


def build_from_spec(brand: BrandSpec, spec: GeneratedBuildingSpec) -> dict:
    """Build one exterior company HQ in the asset library."""
    compiled = compile_spec(brand, spec)

    _remove_asset(compiled.asset_id)

    scene = bpy.context.scene.collection
    lib_empty = bpy.data.objects.get("Agentspace_Asset_Library")
    if lib_empty is None:
        raise RuntimeError("Agentspace_Asset_Library empty missing — open agentspace-world-multitask.blend")
    lib_col = bpy.data.collections.get("Agentspace_Asset_Library") or ensure_collection(
        "Agentspace_Asset_Library", scene
    )
    bcol = bpy.data.collections.get("Buildings") or ensure_collection("Buildings", lib_col)

    root = bpy.data.objects.new(compiled.asset_id, None)
    root.empty_display_type = "PLAIN_AXES"
    root.empty_display_size = 10
    root.parent = lib_empty
    root.location = compiled.root_local
    bpy.context.scene.collection.objects.link(root)
    tag(
        root,
        asset_id=compiled.asset_id,
        component_id=f"{compiled.asset_id}/root",
        kind="library_root",
        runtime=False,
    )
    root["asw_staging"] = 1
    root["asw_library"] = 1
    root["asw_libraryRoot"] = 1
    link(root, bcol)

    mats = _resolve_mat_palette(compiled.mat_defs)

    def _tag_part(ob, cid: str, *, kind=KIND, runtime=True):
        tag(ob, asset_id=compiled.asset_id, component_id=f"{compiled.asset_id}/{cid}", kind=kind, runtime=runtime)
        ob["asw_staging"] = 1
        ob["asw_library"] = 1
        return ob

    def part(name, w, d, h, loc, mat, parent, col, cid, *, bevel=0.0, uv=0.05):
        ob = box(name, w, d, h, loc, mat, parent, bevel=bevel, uv=uv)
        _tag_part(ob, cid)
        link(ob, col)
        return ob

    seed = deterministic_seed(brand.company_id, compiled.asset_id)
    ctx = BuildingContext(
        asset_id=compiled.asset_id,
        brand=brand,
        spec=compiled,
        seed=seed,
        scale=compiled.scale,
        W=compiled.footprint_w,
        D=compiled.footprint_d,
        site_z=compiled.site_z,
        root=root,
        col=bcol,
        mats=mats,
        part=part,
        params=dict(compiled.recipe_params or {}),
        anchors={},
    )

    compose(compiled.recipe, ctx)
    composition = apply_toy_composition(ctx)

    interior_check = assert_no_interior_kinds(compiled.asset_id)
    if not interior_check["ok"]:
        raise RuntimeError(f"interior geometry forbidden: {interior_check['interiorComponents'][:6]}")

    report = _measure_local_bbox(compiled.asset_id, compiled.footprint_w, compiled.footprint_d)
    footprint_check = validate_footprint(report["localMeters"], compiled)
    report["footprintValidation"] = {
        "ok": footprint_check["ok"],
        "issues": footprint_check["issues"],
        "measured": footprint_check["measured"],
        "bounds": (
            {
                "max_w": footprint_check["bounds"].max_w,
                "max_d": footprint_check["bounds"].max_d,
                "plot_id": footprint_check["bounds"].plot_id,
            }
            if footprint_check.get("bounds")
            else None
        ),
    }
    if not footprint_check["ok"]:
        raise RuntimeError(f"plot footprint validation failed: {footprint_check['issues']}")

    report["recipe"] = compiled.recipe
    report["preset"] = compiled.recipe_params.get("preset")
    report["composition"] = composition
    return report


def build_company_building(brand: BrandSpec, spec: GeneratedBuildingSpec) -> dict:
    """Public entry — compatible with MCP publish workflow."""
    return build_from_spec(brand, spec)
