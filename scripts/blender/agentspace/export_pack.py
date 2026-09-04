"""Export pack.* library roots. Never exports the staging ground or the world."""
from __future__ import annotations

from pathlib import Path

import bpy

from .contract import GLTF_DIR

PACK_DIRS = {
    "character": "characters",
    "vehicle": "vehicles",
    "street_light": "street",
    "traffic_light": "street",
    "street_furniture": "street",
    "sign": "props",
    "clothing": "props",
    "library_root": None,
}

SKIP_PREFIX = ("agentspace.staging",)


def _measure_asset_bbox(asset_id: str) -> dict:
    from mathutils import Vector

    xs, ys, zs = [], [], []
    for o in bpy.data.objects:
        if o.get("asw_assetId") != asset_id or o.type != "MESH":
            continue
        for corner in o.bound_box:
            loc = o.matrix_local @ Vector(corner)
            xs.append(loc.x)
            ys.append(loc.y)
            zs.append(loc.z)
    return {
        "w": round(max(xs) - min(xs), 3) if xs else 0,
        "d": round(max(ys) - min(ys), 3) if ys else 0,
        "h": round(max(zs) - min(zs), 3) if zs else 0,
    }


def _folder_for(asset_id: str, kind: str) -> str:
    if asset_id.startswith("pack.agentspace.character"):
        return "characters"
    if asset_id.startswith("pack.agentspace.logo"):
        return "logos"
    if asset_id.startswith("pack.agentspace.ad"):
        return "ads"
    if asset_id.startswith("pack.agentspace.building"):
        return "buildings"
    if asset_id.startswith("pack.agentspace.vehicle"):
        return "vehicles"
    if asset_id.startswith("pack.agentspace.streetlight") or asset_id.startswith("pack.agentspace.trafficlight"):
        return "street"
    if kind in {"street_furniture", "sign"} or asset_id.startswith("pack.agentspace.bench") or asset_id.startswith("pack.agentspace.bin"):
        return "street"
    if asset_id.startswith("pack.agentspace.gutter"):
        return "environment"
    if asset_id.startswith("pack.agentspace.hydrant") or asset_id.startswith("pack.agentspace.street"):
        return "street"
    return PACK_DIRS.get(kind) or "props"


def export_pack_asset(asset_id: str, root: Path | None = None) -> dict:
    """Export one pack.* library root. Does not export the world."""
    root = root or GLTF_DIR
    if not asset_id.startswith("pack.agentspace"):
        raise RuntimeError(f"not a pack asset: {asset_id}")
    dest_name = f"{asset_id}.glb"
    if dest_name == "agentspace-world.glb":
        raise RuntimeError("refusing master world GLB")
    objs = [o for o in bpy.data.objects if o.get("asw_assetId") == asset_id]
    if not objs:
        raise RuntimeError(f"no objects for {asset_id}")
    kind = next((str(o.get("asw_kind")) for o in objs if o.get("asw_kind") not in {"library_root", "staging"}), "props")
    folder = _folder_for(asset_id, kind)
    dest = root / folder
    dest.mkdir(parents=True, exist_ok=True)
    path = dest / dest_name
    prev = list(bpy.context.view_layer.objects.selected)
    hide_state = [(o, o.hide_get(), o.hide_viewport, o.hide_render) for o in objs]
    bpy.ops.object.select_all(action="DESELECT")
    n = 0
    try:
        for ob in objs:
            if ob.type not in {"MESH", "EMPTY"}:
                continue
            if ob.get("asw_kind") == "staging":
                continue
            ob.hide_set(False)
            ob.hide_viewport = False
            ob.hide_render = False
            try:
                ob.select_set(True)
                n += 1
            except RuntimeError:
                bpy.context.scene.collection.objects.link(ob)
                ob.select_set(True)
                n += 1
        if n == 0:
            raise RuntimeError(f"nothing selectable for {asset_id}")
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
    finally:
        bpy.ops.object.select_all(action="DESELECT")
        for ob, hg, hv, hr in hide_state:
            try:
                ob.hide_set(hg)
                ob.hide_viewport = hv
                ob.hide_render = hr
            except Exception:
                pass
        for ob in prev:
            try:
                ob.select_set(True)
            except Exception:
                pass
    return {"assetId": asset_id, "folder": folder, "path": str(path), "bytes": path.stat().st_size, "objects": n, "localMeters": _measure_asset_bbox(asset_id)}


def export_pack_assets(root: Path | None = None) -> list[dict]:
    exported = []
    assets = sorted({str(o.get("asw_assetId")) for o in bpy.data.objects if o.get("asw_libraryRoot")})
    for aid in assets:
        if not aid.startswith("pack.agentspace"):
            continue
        exported.append(export_pack_asset(aid, root))
    return exported
