"""Export startup-district environment in world coordinates (not lot-local)."""
from __future__ import annotations

from pathlib import Path

import bpy

from .contract import GLTF_DIR
from .registry import list_components

AID = "agentspace.env.startup"


def export_env(path: Path | None = None) -> Path:
    path = path or (GLTF_DIR / f"{AID}.glb")
    path.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")
    count = 0
    for ob in bpy.data.objects:
        if ob.get("asw_assetId") != AID:
            continue
        if not ob.get("asw_runtimeExport"):
            continue
        if ob.type != "MESH":
            continue
        ob.hide_set(False)
        ob.hide_viewport = False
        ob.hide_render = False
        ob.select_set(True)
        count += 1
    root = bpy.data.objects.get("Env_Startup")
    if root:
        root.select_set(True)
        bpy.context.view_layer.objects.active = root
    if count == 0:
        raise RuntimeError("no runtime env meshes to export")
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
    return path


def env_report() -> dict:
    comps = list_components(AID)
    kinds = {}
    runtime = 0
    for c in comps:
        kinds[c["kind"]] = kinds.get(c["kind"], 0) + 1
        if c["runtimeExport"]:
            runtime += 1
    return {"assetId": AID, "components": len(comps), "runtime": runtime, "kinds": kinds}
