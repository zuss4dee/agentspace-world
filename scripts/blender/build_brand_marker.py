"""Build reusable brand-marker base prop (logo applied at runtime in Three.js).

Usage:
  blender --background scripts/blender/agentspace-world-multitask.blend \\
    --python scripts/blender/build_brand_marker.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import bpy
from mathutils import Vector

ASSET_ID = "pack.agentspace.prop.brand-marker.base.01"
MARKER = "ASW_BRAND_MARKER_JSON:"


def _clear_staging():
    for o in list(bpy.data.objects):
        if o.name.startswith("brand_marker."):
            bpy.data.objects.remove(o, do_unlink=True)


def _mat(name: str, color, rough=0.55, emit=0.0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (*color, 1.0)
        bsdf.inputs["Roughness"].default_value = rough
        if emit > 0:
            bsdf.inputs["Emission Color"].default_value = (*color, 1.0)
            bsdf.inputs["Emission Strength"].default_value = emit
    return m


def build_brand_marker_base():
    _clear_staging()
    mat_body = _mat("asw.mat.brand-marker.body", (0.14, 0.16, 0.18), 0.62)
    mat_accent = _mat("asw.mat.brand-marker.accent", (0.38, 0.62, 0.52), 0.4, 0.35)
    mat_emit = _mat("asw.mat.brand-marker.emit", (0.72, 0.88, 0.78), 0.35, 0.55)

    # Pedestal
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.42, depth=0.22, location=(0, 0, 0.11))
    ped = bpy.context.active_object
    ped.name = "brand_marker.pedestal"
    ped.data.materials.append(mat_body)
    ped["asw_assetId"] = ASSET_ID
    ped["asw_kind"] = "prop"

    # Accent lip
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.46, depth=0.05, location=(0, 0, 0.24))
    lip = bpy.context.active_object
    lip.name = "brand_marker.lip"
    lip.data.materials.append(mat_accent)
    lip["asw_assetId"] = ASSET_ID
    lip["asw_kind"] = "prop"

    # Logo frame (thin plaque — texture mapped at runtime)
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.62))
    frame = bpy.context.active_object
    frame.name = "brand_marker.logo_frame"
    frame.scale = (0.78, 0.06, 0.52)
    frame.data.materials.append(mat_body)
    frame["asw_assetId"] = ASSET_ID
    frame["asw_kind"] = "brand"

    # Empty anchors for runtime animation
    for name, z in [("brand_marker.logo_anchor", 0.62), ("brand_marker.ring_anchor", 0.55), ("brand_marker.emit_anchor", 0.38)]:
        empty = bpy.data.objects.new(name, None)
        empty.empty_display_size = 0.15
        empty.location = (0, 0, z)
        bpy.context.collection.objects.link(empty)
        empty["asw_assetId"] = ASSET_ID
        empty["asw_kind"] = "prop"
        if "logo" in name:
            empty["asw_anchor"] = "logo"
        elif "ring" in name:
            empty["asw_anchor"] = "ring"
        else:
            empty["asw_anchor"] = "emit"

    # Emissive ring
    bpy.ops.mesh.primitive_torus_add(major_radius=0.48, minor_radius=0.03, location=(0, 0, 0.38))
    ring = bpy.context.active_object
    ring.name = "brand_marker.ring.emit"
    ring.data.materials.append(mat_emit)
    ring["asw_assetId"] = ASSET_ID
    ring["asw_kind"] = "brand"

    # Root empty at ground
    root = bpy.data.objects.new("brand_marker.root", None)
    root.empty_display_size = 0.2
    root.location = (0, 0, 0)
    bpy.context.collection.objects.link(root)
    root["asw_assetId"] = ASSET_ID
    root["asw_kind"] = "library_root"

    objs = [o for o in bpy.data.objects if o.get("asw_assetId") == ASSET_ID and o.type == "MESH"]
    xs, ys, zs = [], [], []
    for o in objs:
        for corner in o.bound_box:
            loc = o.matrix_world @ Vector(corner)
            xs.append(loc.x)
            ys.append(loc.y)
            zs.append(loc.z)

    return {
        "assetId": ASSET_ID,
        "meters": {
            "w": round(max(xs) - min(xs), 3) if xs else 0,
            "d": round(max(ys) - min(ys), 3) if ys else 0,
            "h": round(max(zs) - min(zs), 3) if zs else 0,
        },
        "anchors": ["logo_anchor", "ring_anchor", "emit_anchor"],
    }


def export_glb(dest: Path):
    from agentspace.export_pack import export_pack_asset

    return export_pack_asset(ASSET_ID, dest.parent.parent)


if __name__ == "__main__":
    report = build_brand_marker_base()
    repo = ROOT.parent.parent
    gltf_dir = repo / "public" / "assets" / "gltf"
    try:
        export_report = export_glb(gltf_dir / "props" / f"{ASSET_ID}.glb")
        report["export"] = export_report
    except Exception as exc:
        report["exportError"] = str(exc)
    print(MARKER + json.dumps(report))
