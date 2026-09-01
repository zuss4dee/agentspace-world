"""Image-backed PBR materials that survive glTF export (packed images, no shader-only noise)."""
from __future__ import annotations

import math
import random

import bpy

ENV_MATS = {
    "asw.mat.road.asphalt": {"kind": "albedo", "color": (0.12, 0.12, 0.11), "rough": 0.88, "var": 0.045},
    "asw.mat.road.asphalt.worn": {"kind": "albedo", "color": (0.16, 0.15, 0.13), "rough": 0.82, "var": 0.06},
    "asw.mat.road.asphalt.wet": {"kind": "albedo", "color": (0.10, 0.10, 0.10), "rough": 0.28, "var": 0.03},
    "asw.mat.pavement.concrete": {"kind": "albedo", "color": (0.62, 0.60, 0.56), "rough": 0.74, "var": 0.05},
    "asw.mat.pavement.stone": {"kind": "albedo", "color": (0.58, 0.56, 0.50), "rough": 0.68, "var": 0.045},
    "asw.mat.terrain.grass": {"kind": "albedo", "color": (0.28, 0.38, 0.18), "rough": 0.86, "var": 0.07},
    "asw.mat.terrain.soil": {"kind": "albedo", "color": (0.28, 0.22, 0.14), "rough": 0.9, "var": 0.08},
    "asw.mat.water.ocean": {"kind": "water", "color": (0.10, 0.20, 0.26), "rough": 0.08},
    "asw.mat.metal.dark": {"kind": "metal", "color": (0.12, 0.13, 0.14), "rough": 0.28, "metal": 0.94},
    "asw.mat.metal.paint": {"kind": "metal", "color": (0.22, 0.23, 0.24), "rough": 0.42, "metal": 0.72},
    "asw.mat.wood.bench": {"kind": "albedo", "color": (0.34, 0.22, 0.12), "rough": 0.58, "var": 0.08},
    "asw.mat.glass.standard": {"kind": "glass", "color": (0.55, 0.62, 0.60, 1), "rough": 0.06, "trans": 0.88},
    "asw.mat.road.marking.white": {"kind": "albedo", "color": (0.86, 0.84, 0.76), "rough": 0.45, "var": 0.02},
    "asw.mat.road.marking.yellow": {"kind": "albedo", "color": (0.82, 0.68, 0.18), "rough": 0.48, "var": 0.02},
    "asw.mat.concrete.sidewalk": {"kind": "albedo", "color": (0.62, 0.60, 0.56), "rough": 0.74, "var": 0.05},
    "asw.mat.concrete.curb": {"kind": "albedo", "color": (0.55, 0.54, 0.50), "rough": 0.68, "var": 0.04},
    "asw.mat.grass.base": {"kind": "albedo", "color": (0.28, 0.38, 0.18), "rough": 0.86, "var": 0.07},
    "asw.mat.grass.worn": {"kind": "albedo", "color": (0.34, 0.36, 0.22), "rough": 0.84, "var": 0.06},
    "asw.mat.soil": {"kind": "albedo", "color": (0.28, 0.22, 0.14), "rough": 0.9, "var": 0.08},
    "asw.mat.metal.streetlight": {"kind": "metal", "color": (0.18, 0.18, 0.17), "rough": 0.42, "metal": 0.82},
    "asw.mat.glass": {"kind": "emit", "color": (1.0, 0.88, 0.70), "emit": 2.4},
    "asw.mat.wood": {"kind": "albedo", "color": (0.32, 0.2, 0.1), "rough": 0.62, "var": 0.08},
    "asw.mat.road.marking": {"kind": "albedo", "color": (0.86, 0.84, 0.76), "rough": 0.55, "var": 0.02},
    "asw.mat.water": {"kind": "water", "color": (0.18, 0.32, 0.36), "rough": 0.18},
    "asw.mat.signal.red": {"kind": "emit", "color": (0.85, 0.08, 0.06), "emit": 3.2},
    "asw.mat.signal.amber": {"kind": "emit", "color": (0.85, 0.45, 0.05), "emit": 2.6},
    "asw.mat.signal.green": {"kind": "emit", "color": (0.08, 0.62, 0.18), "emit": 2.8},
    "asw.mat.cloth.body": {"kind": "albedo", "color": (0.22, 0.24, 0.28), "rough": 0.78, "var": 0.04},
    "asw.mat.skin.neutral": {"kind": "albedo", "color": (0.62, 0.48, 0.38), "rough": 0.55, "var": 0.03},
    "asw.mat.vegetation.canopy": {"kind": "albedo", "color": (0.22, 0.36, 0.16), "rough": 0.88, "var": 0.08},
    "asw.mat.vegetation.bark": {"kind": "albedo", "color": (0.22, 0.14, 0.09), "rough": 0.86, "var": 0.06},
    "asw.mat.streetlight.metal": {"kind": "metal", "color": (0.18, 0.18, 0.17), "rough": 0.42, "metal": 0.82},
    "asw.mat.trafficlight.housing": {"kind": "metal", "color": (0.08, 0.08, 0.08), "rough": 0.38, "metal": 0.78},
    "asw.mat.paint.vehicle": {"kind": "metal", "color": (0.42, 0.18, 0.14), "rough": 0.32, "metal": 0.35},
}

ASSET_MATS = {
    "asw.mat.glass.clear": {"kind": "glass", "color": (0.55, 0.62, 0.60, 1), "rough": 0.04, "trans": 0.92},
    "asw.mat.glass.tinted": {"kind": "glass", "color": (0.42, 0.50, 0.38, 1), "rough": 0.06, "trans": 0.72},
    "asw.mat.concrete.raw": {"kind": "albedo", "color": (0.58, 0.56, 0.52), "rough": 0.72, "var": 0.08},
    "asw.mat.concrete.polished": {"kind": "albedo", "color": (0.72, 0.71, 0.68), "rough": 0.38, "var": 0.04},
    "asw.mat.metal.dark": {"kind": "metal", "color": (0.12, 0.13, 0.14), "rough": 0.28, "metal": 0.94},
    "asw.mat.metal.brushed": {"kind": "metal", "color": (0.42, 0.44, 0.46), "rough": 0.42, "metal": 0.88},
    "asw.mat.wood.natural": {"kind": "albedo", "color": (0.36, 0.22, 0.12), "rough": 0.55, "var": 0.1},
    "asw.mat.plaster.light": {"kind": "albedo", "color": (0.78, 0.80, 0.74), "rough": 0.58, "var": 0.06},
    "asw.mat.brand.primary": {"kind": "albedo", "color": (0.38, 0.50, 0.26), "rough": 0.32, "var": 0.02, "emit": 0.15},
    "asw.mat.brand.secondary": {"kind": "albedo", "color": (0.07, 0.08, 0.09), "rough": 0.35, "var": 0.02},
    "asw.mat.roof.dark": {"kind": "albedo", "color": (0.10, 0.11, 0.12), "rough": 0.78, "var": 0.05},
    "asw.mat.light.warm": {"kind": "emit", "color": (1.0, 0.88, 0.70), "emit": 4.5},
}


def _bsdf(mat):
    return next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")


def _noise_img(name: str, size: int, base, variation, roughness=False):
    img = bpy.data.images.get(name)
    if img is not None and (img.size[0] != size or img.size[1] != size):
        bpy.data.images.remove(img)
        img = None
    if img is None:
        img = bpy.data.images.new(name, width=size, height=size, alpha=False)
    rng = random.Random(hash(name) & 0xFFFFFFFF)
    px = [0.0] * (size * size * 4)
    br, bg, bb = base
    for y in range(size):
        for x in range(size):
            n = rng.random() * 2 - 1
            n += 0.35 * math.sin(x * 0.17 + y * 0.11)
            n += 0.2 * math.sin(x * 0.41 - y * 0.33)
            t = max(-1.0, min(1.0, n * 0.55))
            i = (y * size + x) * 4
            if roughness:
                v = max(0.05, min(0.95, variation + t * 0.12))
                px[i] = px[i + 1] = px[i + 2] = v
            else:
                px[i] = max(0, min(1, br + t * variation))
                px[i + 1] = max(0, min(1, bg + t * variation))
                px[i + 2] = max(0, min(1, bb + t * variation))
            px[i + 3] = 1.0
    try:
        img.pixels.foreach_set(px)
    except Exception:
        img.pixels[:] = px
    img.pack()
    img.colorspace_settings.name = "Non-Color" if roughness else "sRGB"
    return img


def _tex(nt, img, loc):
    node = nt.nodes.new("ShaderNodeTexImage")
    node.image = img
    node.location = loc
    uv = nt.nodes.new("ShaderNodeUVMap")
    uv.location = (loc[0] - 220, loc[1])
    nt.links.new(uv.outputs["UV"], node.inputs["Vector"])
    return node


def ensure_mats(specs: dict) -> dict:
    out = {}
    for mid, spec in specs.items():
        mat = bpy.data.materials.get(mid) or bpy.data.materials.new(mid)
        mat.use_nodes = True
        nt = mat.node_tree
        for n in list(nt.nodes):
            if n.type not in {"BSDF_PRINCIPLED", "OUTPUT_MATERIAL"}:
                nt.nodes.remove(n)
        b = _bsdf(mat)
        kind = spec["kind"]
        if kind == "glass":
            mat.blend_method = "BLEND"
            b.inputs["Base Color"].default_value = spec["color"]
            b.inputs["Roughness"].default_value = spec["rough"]
            b.inputs["Metallic"].default_value = 0.0
            b.inputs["Transmission Weight"].default_value = spec["trans"]
            b.inputs["IOR"].default_value = 1.52
            if "Alpha" in b.inputs:
                b.inputs["Alpha"].default_value = 0.22
            if "Coat Weight" in b.inputs:
                b.inputs["Coat Weight"].default_value = 1.0
                b.inputs["Coat Roughness"].default_value = 0.04
        elif kind == "water":
            c = spec["color"]
            b.inputs["Base Color"].default_value = (*c, 1)
            b.inputs["Roughness"].default_value = spec["rough"]
            b.inputs["Metallic"].default_value = 0.0
            if "IOR" in b.inputs:
                b.inputs["IOR"].default_value = 1.333
            if "Transmission Weight" in b.inputs:
                b.inputs["Transmission Weight"].default_value = 0.35
            if "Coat Weight" in b.inputs:
                b.inputs["Coat Weight"].default_value = 0.85
                b.inputs["Coat Roughness"].default_value = 0.06
            if "Specular IOR Level" in b.inputs:
                b.inputs["Specular IOR Level"].default_value = 0.85
            bump_img = _noise_img(f"{mid}.wave", 128, (0.5, 0.5, 0.55), 0.12, roughness=True)
            tb = _tex(nt, bump_img, (-420, -40))
            bump = nt.nodes.new("ShaderNodeBump")
            bump.inputs["Strength"].default_value = 0.08
            bump.location = (-180, -40)
            nt.links.new(tb.outputs["Color"], bump.inputs["Height"])
            nt.links.new(bump.outputs["Normal"], b.inputs["Normal"])
        elif kind == "metal":
            albedo = _noise_img(f"{mid}.albedo", 128, spec["color"], spec.get("var", 0.03))
            rough = _noise_img(f"{mid}.rough", 128, (spec["rough"],) * 3, spec["rough"], roughness=True)
            ta = _tex(nt, albedo, (-420, 220))
            tr = _tex(nt, rough, (-420, -40))
            nt.links.new(ta.outputs["Color"], b.inputs["Base Color"])
            nt.links.new(tr.outputs["Color"], b.inputs["Roughness"])
            b.inputs["Metallic"].default_value = spec.get("metal", 0.9)
        elif kind == "emit":
            c = spec["color"]
            b.inputs["Base Color"].default_value = (*c, 1)
            b.inputs["Emission Color"].default_value = (*c, 1)
            b.inputs["Emission Strength"].default_value = spec["emit"]
            b.inputs["Roughness"].default_value = 0.35
            if "Transmission Weight" in b.inputs:
                b.inputs["Transmission Weight"].default_value = 0.0
        else:
            albedo = _noise_img(f"{mid}.albedo", 128, spec["color"], spec.get("var", 0.05))
            rough = _noise_img(f"{mid}.rough", 128, (spec["rough"],) * 3, spec["rough"], roughness=True)
            ta = _tex(nt, albedo, (-420, 220))
            tr = _tex(nt, rough, (-420, -40))
            tr.image.colorspace_settings.name = "Non-Color"
            nt.links.new(ta.outputs["Color"], b.inputs["Base Color"])
            nt.links.new(tr.outputs["Color"], b.inputs["Roughness"])
            b.inputs["Metallic"].default_value = spec.get("metal", 0.0)
            if spec.get("emit"):
                b.inputs["Emission Color"].default_value = (*spec["color"], 1)
                b.inputs["Emission Strength"].default_value = spec["emit"]
        mat["asw_materialId"] = mid
        out[mid] = mat
    return out


def ensure_pbr_library() -> dict:
    return ensure_mats(ASSET_MATS)


def ensure_env_pbr() -> dict:
    return ensure_mats(ENV_MATS)
