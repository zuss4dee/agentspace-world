"""Semantic materials with Poly Haven maps, roughness variation, and archviz glass."""
from __future__ import annotations

import bpy

PH_ALIASES = {
    "asw.mat.concrete.plaster": ("grey_plaster.001", "grey_plaster"),
    "asw.mat.concrete.olive": ("grey_plaster.001", "grey_plaster"),
    "asw.mat.concrete.structural": ("concrete.001", "concrete"),
    "asw.mat.concrete.floor": ("concrete.001", "concrete"),
    "asw.mat.metal.mullion": (),
    "asw.mat.metal.panel": (),
    "asw.mat.asphalt.carriage": ("asphalt_02",),
    "asw.mat.paving.sidewalk": ("concrete.001", "concrete"),
    "asw.mat.paving.lot": ("concrete.001", "concrete"),
    "asw.mat.stone.curb": ("concrete.001", "concrete"),
    "asw.mat.vegetation.canopy": ("aerial_grass_rock.001", "aerial_grass_rock"),
    "asw.mat.vegetation.hedge": ("aerial_grass_rock.001", "aerial_grass_rock"),
    "asw.mat.roof.membrane": ("concrete.001", "concrete"),
}

TINT = {
    "asw.mat.concrete.plaster": ((0.82, 0.84, 0.78, 1), 0.38),
    "asw.mat.concrete.olive": ((0.32, 0.38, 0.30, 1), 0.55),
    "asw.mat.concrete.structural": ((0.78, 0.76, 0.72, 1), 0.22),
    "asw.mat.paving.lot": ((0.88, 0.86, 0.82, 1), 0.18),
    "asw.mat.paving.sidewalk": ((0.76, 0.74, 0.70, 1), 0.12),
    "asw.mat.asphalt.carriage": ((0.22, 0.22, 0.21, 1), 0.35),
    "asw.mat.vegetation.canopy": ((0.28, 0.42, 0.16, 1), 0.42),
    "asw.mat.vegetation.hedge": ((0.18, 0.32, 0.12, 1), 0.5),
    "asw.mat.metal.mullion": ((0.12, 0.13, 0.14, 1), 0.55),
    "asw.mat.metal.panel": ((0.42, 0.44, 0.46, 1), 0.28),
    "asw.mat.roof.membrane": ((0.14, 0.145, 0.15, 1), 0.62),
    "asw.mat.stone.curb": ((0.62, 0.60, 0.56, 1), 0.28),
}

FALLBACK = {
    "asw.mat.concrete.plaster": {"color": (0.78, 0.81, 0.76, 1), "rough": 0.52, "metal": 0.02},
    "asw.mat.concrete.olive": {"color": (0.32, 0.38, 0.30, 1), "rough": 0.58, "metal": 0.04},
    "asw.mat.concrete.structural": {"color": (0.72, 0.70, 0.66, 1), "rough": 0.64, "metal": 0.0},
    "asw.mat.concrete.floor": {"color": (0.84, 0.81, 0.75, 1), "rough": 0.42, "metal": 0.0},
    "asw.mat.glass.vision": None,
    "asw.mat.glass.warm": None,
    "asw.mat.metal.mullion": {"color": (0.14, 0.15, 0.16, 1), "rough": 0.22, "metal": 0.94},
    "asw.mat.metal.panel": {"color": (0.48, 0.50, 0.52, 1), "rough": 0.32, "metal": 0.88},
    "asw.mat.roof.membrane": {"color": (0.13, 0.14, 0.15, 1), "rough": 0.78, "metal": 0.06},
    "asw.mat.asphalt.carriage": {"color": (0.14, 0.14, 0.135, 1), "rough": 0.86, "metal": 0.0},
    "asw.mat.stone.curb": {"color": (0.58, 0.56, 0.52, 1), "rough": 0.48, "metal": 0.0},
    "asw.mat.paving.sidewalk": {"color": (0.72, 0.70, 0.66, 1), "rough": 0.68, "metal": 0.0},
    "asw.mat.paving.lot": {"color": (0.80, 0.78, 0.74, 1), "rough": 0.62, "metal": 0.0},
    "asw.mat.vegetation.canopy": {"color": (0.20, 0.34, 0.12, 1), "rough": 0.72, "metal": 0.0},
    "asw.mat.vegetation.hedge": {"color": (0.16, 0.28, 0.10, 1), "rough": 0.78, "metal": 0.0},
    "asw.mat.vegetation.soil": {"color": (0.18, 0.12, 0.07, 1), "rough": 0.92, "metal": 0.0},
    "asw.mat.vegetation.bark": {"color": (0.20, 0.12, 0.07, 1), "rough": 0.88, "metal": 0.0},
    "asw.mat.wood.furniture": {"color": (0.34, 0.22, 0.12, 1), "rough": 0.48, "metal": 0.0},
    "asw.mat.fabric.seating": {"color": (0.16, 0.18, 0.17, 1), "rough": 0.82, "metal": 0.0},
    "asw.mat.accent.brand": {"color": (0.38, 0.50, 0.26, 1), "rough": 0.28, "metal": 0.22, "emit": (0.38, 0.50, 0.26, 1), "emit_str": 0.25},
    "asw.mat.sign.letter": {"color": (0.07, 0.08, 0.09, 1), "rough": 0.22, "metal": 0.4, "emit": (0.42, 0.55, 0.28, 1), "emit_str": 0.55},
    "asw.mat.light.warm": {"color": (1.0, 0.88, 0.70, 1), "rough": 0.35, "metal": 0.0, "emit": (1.0, 0.88, 0.70, 1), "emit_str": 6.5},
    "asw.mat.massing.context": {"color": (0.42, 0.42, 0.40, 1), "rough": 0.7, "metal": 0.02},
    "asw.mat.paint.line": {"color": (0.92, 0.90, 0.84, 1), "rough": 0.45, "metal": 0.0},
    "asw.mat.asphalt.gutter": {"color": (0.10, 0.10, 0.10, 1), "rough": 0.9, "metal": 0.0},
}


def _bsdf(mat):
    return next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")


def _find_ph(names):
    for n in names:
        m = bpy.data.materials.get(n)
        if m and m.use_nodes:
            return m
    return None


def _add_rough_noise(mat, scale=18.0, amount=0.12):
    nt = mat.node_tree
    bsdf = _bsdf(mat)
    rough = bsdf.inputs.get("Roughness")
    if rough is None:
        return
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = scale
    noise.inputs["Detail"].default_value = 6.0
    noise.inputs["Roughness"].default_value = 0.55
    noise.location = (-420, -80)
    mix = nt.nodes.new("ShaderNodeMix")
    mix.data_type = "FLOAT"
    mix.inputs["Factor"].default_value = amount
    mix.location = (-200, -40)
    if rough.is_linked:
        link = rough.links[0]
        nt.links.new(link.from_socket, mix.inputs["A"])
        nt.links.remove(link)
    else:
        mix.inputs["A"].default_value = rough.default_value
    nt.links.new(noise.outputs["Fac"], mix.inputs["B"])
    nt.links.new(mix.outputs["Result"], rough)


def _tint(mat, color, fac):
    nt = mat.node_tree
    bsdf = _bsdf(mat)
    cin = bsdf.inputs["Base Color"]
    mix = nt.nodes.new("ShaderNodeMix")
    mix.data_type = "RGBA"
    mix.blend_type = "MULTIPLY"
    mix.inputs["Factor"].default_value = fac
    mix.inputs["B"].default_value = color
    mix.location = (-220, 220)
    if cin.is_linked:
        lk = cin.links[0]
        nt.links.new(lk.from_socket, mix.inputs["A"])
        nt.links.remove(lk)
    else:
        mix.inputs["A"].default_value = cin.default_value
    nt.links.new(mix.outputs["Result"], cin)


def _glass(name, color, trans, alpha, rough, emit=None, emit_str=0.0):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes = True
    mat.blend_method = "BLEND"
    if hasattr(mat, "use_screen_refraction"):
        mat.use_screen_refraction = True
    if hasattr(mat, "use_sss_translucency"):
        mat.use_sss_translucency = True
    b = _bsdf(mat)
    b.inputs["Base Color"].default_value = color
    b.inputs["Metallic"].default_value = 0.0
    b.inputs["Roughness"].default_value = rough
    b.inputs["IOR"].default_value = 1.52
    b.inputs["Transmission Weight"].default_value = trans
    b.inputs["Alpha"].default_value = alpha
    if "Specular IOR Level" in b.inputs:
        b.inputs["Specular IOR Level"].default_value = 1.0
    if "Coat Weight" in b.inputs:
        b.inputs["Coat Weight"].default_value = 1.0
        b.inputs["Coat Roughness"].default_value = 0.03
    if emit is not None:
        b.inputs["Emission Color"].default_value = emit
        b.inputs["Emission Strength"].default_value = emit_str
    return mat


def _simple(name, spec):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes = True
    b = _bsdf(mat)
    b.inputs["Base Color"].default_value = spec["color"]
    b.inputs["Roughness"].default_value = spec["rough"]
    b.inputs["Metallic"].default_value = spec.get("metal", 0.0)
    if spec.get("emit") is not None:
        b.inputs["Emission Color"].default_value = spec["emit"]
        b.inputs["Emission Strength"].default_value = spec["emit_str"]
    return mat


def ensure_library() -> dict[str, bpy.types.Material]:
    out = {}
    out["asw.mat.glass.vision"] = _glass(
        "asw.mat.glass.vision",
        (0.42, 0.52, 0.50, 1),
        trans=0.92,
        alpha=0.22,
        rough=0.018,
    )
    out["asw.mat.glass.warm"] = _glass(
        "asw.mat.glass.warm",
        (0.92, 0.78, 0.58, 1),
        trans=0.55,
        alpha=0.38,
        rough=0.04,
        emit=(0.95, 0.80, 0.58, 1),
        emit_str=0.45,
    )
    for mid, spec in FALLBACK.items():
        if spec is None:
            continue
        src = _find_ph(PH_ALIASES.get(mid, ()))
        if src is not None:
            mat = src.copy()
            mat.name = mid
        else:
            mat = _simple(mid, spec)
        mat["asw_materialId"] = mid
        tint = TINT.get(mid)
        if tint and src is not None:
            _tint(mat, tint[0], tint[1])
        if mid.startswith("asw.mat.metal"):
            b = _bsdf(mat)
            if "Metallic" in b.inputs and not b.inputs["Metallic"].is_linked:
                b.inputs["Metallic"].default_value = 0.92 if "mullion" in mid else 0.86
        if mid not in ("asw.mat.light.warm", "asw.mat.accent.brand", "asw.mat.sign.letter"):
            _add_rough_noise(mat, scale=22 if "asphalt" in mid or "paving" in mid else 14, amount=0.14)
        out[mid] = mat
    for m in out.values():
        m["asw_materialId"] = m.name
    return out
