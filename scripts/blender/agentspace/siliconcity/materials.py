"""Brand palette → Blender materials (packed PBR) + logo texture material."""
from __future__ import annotations

from pathlib import Path
from typing import Any

import bpy

from ..pbr_library import ensure_mats

# Every slot the archetypes may ask for. Missing slots fall back to these
# (linear RGB) so a partial mat_defs never crashes a build.
SLOT_FALLBACKS: dict[str, dict[str, Any]] = {
    "cream": {"kind": "albedo", "color": (0.85, 0.83, 0.79), "rough": 0.48, "var": 0.012},
    "cream_dark": {"kind": "albedo", "color": (0.60, 0.57, 0.52), "rough": 0.55, "var": 0.012},
    "brand": {"kind": "albedo", "color": (0.10, 0.10, 0.65), "rough": 0.38, "var": 0.01},
    "coral": {"kind": "albedo", "color": (0.85, 0.22, 0.12), "rough": 0.40, "var": 0.01},
    "charcoal": {"kind": "albedo", "color": (0.02, 0.022, 0.026), "rough": 0.45, "var": 0.012},
    "fin": {"kind": "albedo", "color": (0.033, 0.036, 0.046), "rough": 0.45, "var": 0.012},
    "glass": {"kind": "albedo", "color": (0.073, 0.12, 0.20), "rough": 0.08, "var": 0.006, "metal": 0.22, "emit": 0.1},
    "roof": {"kind": "albedo", "color": (0.51, 0.51, 0.48), "rough": 0.62, "var": 0.015},
    "grass": {"kind": "albedo", "color": (0.11, 0.34, 0.075), "rough": 0.85, "var": 0.03},
    "paver": {"kind": "albedo", "color": (0.66, 0.62, 0.54), "rough": 0.62, "var": 0.02},
    "canopy": {"kind": "albedo", "color": (0.073, 0.26, 0.065), "rough": 0.78, "var": 0.035},
    "bark": {"kind": "albedo", "color": (0.11, 0.047, 0.018), "rough": 0.8, "var": 0.03},
    "sign": {"kind": "emit", "color": (0.93, 0.93, 0.91), "emit": 0.28},
    "glow": {"kind": "emit", "color": (1.0, 0.83, 0.48), "emit": 1.1},
    "solar": {"kind": "albedo", "color": (0.013, 0.027, 0.107), "rough": 0.14, "var": 0.006, "metal": 0.35},
    "metal": {"kind": "albedo", "color": (0.34, 0.36, 0.39), "rough": 0.38, "var": 0.01, "metal": 0.6},
    "rubber": {"kind": "albedo", "color": (0.007, 0.007, 0.008), "rough": 0.7, "var": 0.01},
}

SLOTS = tuple(SLOT_FALLBACKS.keys())


def mat_name(slug: str, slot: str) -> str:
    return f"asw.mat.sc.{slug}.{slot}"


def ensure_brand_mats(slug: str, mat_defs: dict[str, dict[str, Any]] | None) -> dict[str, Any]:
    """Slot → bpy Material for one company (materials are per-company so brands never collide)."""
    defs = dict(mat_defs or {})
    spec: dict[str, dict[str, Any]] = {}
    for slot in SLOTS:
        spec[mat_name(slug, slot)] = dict(defs.get(slot) or SLOT_FALLBACKS[slot])
    raw = ensure_mats(spec)
    return {slot: raw[mat_name(slug, slot)] for slot in SLOTS}


def _principled(mat):
    return next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")


def logo_material(slug: str, image_path: str | None):
    """Image-textured, non-emissive plaque material (packed so it survives glTF export).

    Returns None when the path is missing / unreadable / an SVG (cannot rasterise
    without external deps) — callers then fall back to the wordmark monogram.
    """
    if not image_path:
        return None
    p = Path(image_path)
    if not p.exists() or p.suffix.lower() == ".svg":
        return None
    try:
        img = bpy.data.images.load(str(p), check_existing=True)
    except Exception:
        return None
    if img.size[0] == 0 or img.size[1] == 0:
        return None
    try:
        img.colorspace_settings.name = "sRGB"
    except Exception:
        pass
    if not img.packed_file:
        try:
            img.pack()
        except Exception:
            pass

    name = mat_name(slug, "logo")
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    for n in list(nt.nodes):
        if n.type not in {"BSDF_PRINCIPLED", "OUTPUT_MATERIAL"}:
            nt.nodes.remove(n)
    b = _principled(mat)
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = img
    tex.interpolation = "Linear"
    tex.extension = "CLIP"
    tex.location = (-420, 200)
    uv = nt.nodes.new("ShaderNodeUVMap")
    uv.location = (-640, 200)
    nt.links.new(uv.outputs["UV"], tex.inputs["Vector"])
    nt.links.new(tex.outputs["Color"], b.inputs["Base Color"])
    nt.links.new(tex.outputs["Alpha"], b.inputs["Alpha"])
    b.inputs["Roughness"].default_value = 0.42
    b.inputs["Metallic"].default_value = 0.0
    if "Emission Strength" in b.inputs:
        b.inputs["Emission Strength"].default_value = 0.0
    for attr, val in (("surface_render_method", "BLENDED"), ("blend_method", "BLEND")):
        if hasattr(mat, attr):
            try:
                setattr(mat, attr, val)
            except Exception:
                pass
    if hasattr(mat, "use_backface_culling"):
        mat.use_backface_culling = False
    mat["asw_materialId"] = name
    mat["asw_logoSource"] = str(p)
    return mat
