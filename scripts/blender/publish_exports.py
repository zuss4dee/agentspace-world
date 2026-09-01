"""Cursor-operated Blender publish: validate, export pack + world GLBs, save a NEW blend.

Never overwrites the original master scene or master world GLB.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import bpy

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from agentspace.contract import GLTF_DIR, load_contract
from agentspace.export_pack import export_pack_assets
from agentspace.validate_world import validate
from export_world import MASTER_BLEND_NAME, MASTER_GLB_NAME, export_world

WATCH = ("Agentspace_World", "TerrainCampus", "OceanWest", "Road_primary_14")


def fingerprint():
    out = {}
    for name in WATCH:
        ob = bpy.data.objects.get(name)
        if ob:
            t = ob.matrix_world.translation
            out[name] = [round(t.x, 5), round(t.y, 5), round(t.z, 5)]
    return out


def _include_all_collections():
    def walk(lc):
        lc.exclude = False
        if hasattr(lc, "hide_viewport"):
            lc.hide_viewport = False
        for child in lc.children:
            walk(child)

    walk(bpy.context.view_layer.layer_collection)


def publish(
    *,
    blend_name: str,
    world_glb_name: str,
    packs: bool = True,
    world: bool = True,
) -> dict:
    if blend_name == MASTER_BLEND_NAME:
        raise RuntimeError("refusing to overwrite the original master .blend")
    if world_glb_name == MASTER_GLB_NAME:
        raise RuntimeError("refusing to overwrite the original master world GLB")

    _include_all_collections()
    report = validate(load_contract())
    if not report["ok"]:
        raise RuntimeError(f"WORLD CONTRACT VALIDATION FAILED: {report['errors']}")

    pack_list = export_pack_assets() if packs else []
    world_path = None
    if world:
        world_path = export_world(GLTF_DIR / world_glb_name)
    blend_path = ROOT / blend_name
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))

    result = {
        "ok": True,
        "fingerprint": fingerprint(),
        "validation": {"ok": report["ok"], "lotsFound": report.get("lotsFound"), "errors": report.get("errors")},
        "blend": str(blend_path),
        "blendBytes": blend_path.stat().st_size,
        "worldGlb": str(world_path) if world_path else None,
        "worldBytes": world_path.stat().st_size if world_path else 0,
        "packs": [{"assetId": p["assetId"], "path": p["path"], "bytes": p["bytes"]} for p in pack_list],
        "packCount": len(pack_list),
    }
    return result


if __name__ == "__main__":
    out = publish(blend_name="agentspace-world-multitask.blend", world_glb_name="agentspace-world-multitask.glb")
    print(json.dumps(out, indent=2))
