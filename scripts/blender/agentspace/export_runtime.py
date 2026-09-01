"""Export only runtime-tagged building meshes. Surroundings stay in the .blend."""
from __future__ import annotations

from pathlib import Path

import bpy
from mathutils import Matrix, Vector

from .contract import GLTF_DIR, building_height, load_contract, lot_world_origin
from .registry import list_components

ASSET = "pack.northshore.building.studio.loft"


def mesh_world_bbox(objects):
    mn = Vector((1e9, 1e9, 1e9))
    mx = Vector((-1e9, -1e9, -1e9))
    n = 0
    for ob in objects:
        if ob.type != "MESH":
            continue
        n += 1
        for c in ob.bound_box:
            w = ob.matrix_world @ Vector(c)
            mn.x, mn.y, mn.z = min(mn.x, w.x), min(mn.y, w.y), min(mn.z, w.z)
            mx.x, mx.y, mx.z = max(mx.x, w.x), max(mx.y, w.y), max(mx.z, w.z)
    return mn, mx, n


def loft_footprint(contract: dict) -> dict:
    return next(b for b in contract["buildingFootprints"] if b["id"] == "loft")


def verify_placement(building_root) -> dict:
    c = load_contract()
    b = loft_footprint(c)
    expected = (*lot_world_origin(b, c["grid"], c["tile"])[:2], 0.12)
    got = tuple(building_root.matrix_world.translation)
    err = max(abs(got[i] - expected[i]) for i in range(3))
    lot_w = b["size"]["x"] * c["tile"]
    lot_d = b["size"]["y"] * c["tile"]
    h = building_height(float(b.get("height") or 48), c["tile"])
    runtime = [o for o in bpy.data.objects if o.get("asw_runtimeExport") and o.get("asw_assetId") == ASSET]
    mw = building_root.matrix_world.copy()
    parent = building_root.parent
    building_root.parent = None
    building_root.matrix_world = Matrix.Identity(4)
    bpy.context.view_layer.update()
    mn, mx, nmesh = mesh_world_bbox(runtime)
    building_root.parent = parent
    building_root.matrix_world = mw
    bpy.context.view_layer.update()
    span_x = float(mx.x - mn.x)
    span_y = float(mx.y - mn.y)
    ok_foot = span_x <= lot_w * 1.02 and span_y <= lot_d * 1.02
    return {
        "expectedOrigin": list(expected),
        "gotOrigin": list(got),
        "originError": err,
        "originOk": err < 0.05,
        "lot": [lot_w, lot_d],
        "heightContract": h,
        "localBBoxMin": list(mn),
        "localBBoxMax": list(mx),
        "localSpan": [span_x, span_y, float(mx.z - mn.z)],
        "footprintOk": ok_foot,
        "runtimeMeshes": nmesh,
        "yUpExport": True,
        "componentCount": len(list_components(ASSET)),
    }


def export_runtime_building(building_root, path: Path | None = None) -> Path:
    path = path or (GLTF_DIR / f"{ASSET}.glb")
    path.parent.mkdir(parents=True, exist_ok=True)
    parent = building_root.parent
    mw = building_root.matrix_world.copy()
    building_root.parent = None
    building_root.matrix_world = Matrix.Identity(4)
    bpy.context.view_layer.update()

    bpy.ops.object.select_all(action="DESELECT")

    def walk(o):
        if o.get("asw_runtimeExport") or o == building_root:
            o.select_set(True)
        for ch in o.children:
            walk(ch)

    walk(building_root)
    bpy.context.view_layer.objects.active = building_root
    bpy.ops.export_scene.gltf(
        filepath=str(path),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_cameras=False,
        export_extras=True,
        export_yup=True,
        export_normals=True,
        export_texcoords=True,
        export_materials="EXPORT",
    )
    building_root.parent = parent
    building_root.matrix_world = mw
    bpy.context.view_layer.update()
    return path
