"""Export the tagged Blender environment as the runtime city GLB."""
from __future__ import annotations

import sys
from pathlib import Path

import bpy

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from agentspace.contract import GLTF_DIR, load_contract
from agentspace.registry import list_components
from agentspace.validate_world import validate

ASSET_ID = "agentspace.world"
LIB_COL = "Agentspace_Asset_Library"
MASTER_GLB_NAME = "agentspace-world.glb"
MASTER_BLEND_NAME = "agentspace-world.blend"


def _excluded(ob) -> bool:
    if ob.get("asw_staging") or ob.get("asw_library"):
        return True
    aid = str(ob.get("asw_assetId") or "")
    if aid.startswith("pack.agentspace") or aid.startswith("agentspace.staging"):
        return True
    if ob.name.startswith(("Lib_", "Pad_", "Asset_Test_Ground", "Agentspace_Asset_Library", "ASSET_LIBRARY", "MatSwatch_", "Agentspace_Materials")):
        return True
    return False


def export_world(path: Path | None = None) -> Path:
    """Export the runtime city. Never defaults to the original master GLB."""
    path = path or (GLTF_DIR / "agentspace-world-current.glb")
    if path.name == MASTER_GLB_NAME:
        raise RuntimeError("refusing to overwrite the original master GLB; pass a versioned path")
    path.parent.mkdir(parents=True, exist_ok=True)

    bpy.ops.object.select_all(action="DESELECT")
    selected = []
    for ob in bpy.data.objects:
        if ob.get("asw_assetId") != ASSET_ID:
            continue
        if ob.type != "MESH":
            continue
        if _excluded(ob):
            continue
        ob.hide_set(False)
        ob.hide_viewport = False
        ob.hide_render = False
        ob.select_set(True)
        selected.append(ob)

    root = bpy.data.objects.get("Agentspace_World")
    if root:
        bpy.context.view_layer.objects.active = root
    if not selected:
        raise RuntimeError("no tagged Agentspace world objects to export")

    bpy.ops.export_scene.gltf(
        filepath=str(path),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_cameras=False,
        export_lights=False,
        export_extras=True,
        export_yup=True,
        export_normals=True,
        export_texcoords=True,
        export_materials="EXPORT",
    )
    return path


if __name__ == "__main__":
    contract = load_contract()
    report = validate(contract)
    if not report["ok"]:
        raise SystemExit(f"WORLD CONTRACT VALIDATION FAILED: {report['errors']}")
    path = export_world(GLTF_DIR / "agentspace-world-current.glb")
    print("WORLD_EXPORT", path)
    print("WORLD_COMPONENTS", len(list_components(ASSET_ID)))
    print("WORLD_GLB_BYTES", path.stat().st_size)
    print("WORLD_VALIDATION", report)
