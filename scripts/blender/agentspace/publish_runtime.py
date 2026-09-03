"""Read-only inspect + incremental pack export for the publish CLI.

Does not save the .blend. Restores selection and hide flags after export.
"""
from __future__ import annotations

import hashlib
import json

import bpy
from mathutils import Vector

from .contract import load_contract
from .export_pack import _folder_for, export_pack_asset
from .validate_world import validate
from export_world import MASTER_GLB_NAME, export_world

LIBRARY_ORIGIN = Vector((-6000.0, -6000.0, 0.0))
MARKER = "ASW_PUBLISH_JSON:"


def _dims(ob):
    return [round(ob.dimensions.x, 4), round(ob.dimensions.y, 4), round(ob.dimensions.z, 4)]


def _loc(ob):
    t = ob.matrix_world.translation
    return [round(t.x, 4), round(t.y, 4), round(t.z, 4)]


def _scale(ob):
    return [round(ob.scale.x, 4), round(ob.scale.y, 4), round(ob.scale.z, 4)]


def _rot(ob):
    e = ob.matrix_world.to_euler("XYZ")
    return [round(e.x, 4), round(e.y, 4), round(e.z, 4)]


def pack_signature(asset_id: str) -> dict:
    objs = [o for o in bpy.data.objects if o.get("asw_assetId") == asset_id]
    parts = []
    errors = []
    root = None
    kinds = set()
    for ob in objs:
        if not ob.get("asw_componentId"):
            errors.append(f"{ob.name}: missing asw_componentId")
        if ob.get("asw_kind") is None:
            errors.append(f"{ob.name}: missing asw_kind")
        kinds.add(str(ob.get("asw_kind")))
        if ob.get("asw_libraryRoot"):
            root = ob
        if ob.type == "MESH" and ob.data:
            n = len(ob.data.vertices)
        else:
            n = 0
        parts.append(
            {
                "componentId": str(ob.get("asw_componentId") or ""),
                "kind": str(ob.get("asw_kind") or ""),
                "type": ob.type,
                "dims": _dims(ob) if ob.type == "MESH" else [0, 0, 0],
                "loc": _loc(ob),
                "scale": _scale(ob),
                "rot": _rot(ob),
                "verts": n,
                "runtimeExport": int(ob.get("asw_runtimeExport", 0)),
            }
        )
    parts.sort(key=lambda p: p["componentId"])
    cids = [p["componentId"] for p in parts if p["componentId"]]
    if len(cids) != len(set(cids)):
        errors.append("duplicate componentIds")
    kind = next((k for k in kinds if k not in {"library_root", "staging"}), "props")
    folder = _folder_for(asset_id, kind)
    raw = json.dumps(parts, sort_keys=True)
    sig = hashlib.sha1(raw.encode()).hexdigest()[:16]
    origin_ok = True
    if root:
        d = (Vector(root.matrix_world.translation) - LIBRARY_ORIGIN).length
        # Gallery pads sit along +X of the library origin; allow the Silicon City row.
        origin_ok = d < 550.0
        if not origin_ok:
            errors.append("library root far from staging origin")
    return {
        "assetId": asset_id,
        "kind": kind,
        "folder": folder,
        "url": f"/assets/gltf/{folder}/{asset_id}.glb",
        "components": parts,
        "componentIds": cids,
        "signature": sig,
        "origin": _loc(root) if root else None,
        "scale": _scale(root) if root else None,
        "rotation": _rot(root) if root else None,
        "originOk": origin_ok,
        "errors": errors,
        "ok": not errors,
    }


def world_signature() -> dict:
    items = []
    for ob in bpy.data.objects:
        if ob.get("asw_assetId") != "agentspace.world" or ob.type != "MESH":
            continue
        if ob.get("asw_staging") or ob.get("asw_library"):
            continue
        items.append(
            (
                str(ob.get("asw_componentId") or ob.name),
                tuple(_loc(ob)),
                tuple(_dims(ob)),
            )
        )
    items.sort()
    raw = json.dumps(items)
    return {
        "count": len(items),
        "signature": hashlib.sha1(raw.encode()).hexdigest()[:16],
        "sample": {
            n: _loc(bpy.data.objects[n])
            for n in ("Agentspace_World", "TerrainCampus", "OceanWest", "Road_primary_14")
            if n in bpy.data.objects
        },
    }


def inspect_scene() -> dict:
    blend = bpy.data.filepath
    packs = sorted({str(o.get("asw_assetId")) for o in bpy.data.objects if o.get("asw_libraryRoot")})
    packs = [a for a in packs if a.startswith("pack.agentspace")]
    assets = [pack_signature(a) for a in packs]
    report = validate(load_contract())
    return {
        "blend": blend,
        "objectCount": len(bpy.data.objects),
        "assets": assets,
        "assetCount": len(assets),
        "world": world_signature(),
        "worldValidation": {"ok": report["ok"], "errors": report.get("errors"), "lotsFound": report.get("lotsFound")},
    }


def compatible(prev: dict | None, cur: dict, force: bool) -> tuple[bool, str]:
    if prev is None:
        return True, "new"
    if prev.get("assetId") != cur.get("assetId"):
        return False, "assetId mismatch"
    old = set(prev.get("componentIds") or [])
    new = set(cur.get("componentIds") or [])
    if old - new:
        if not force:
            return False, f"removed components: {sorted(old - new)[:6]}"
    if prev.get("signature") == cur.get("signature"):
        return True, "unchanged"
    return True, "updated"


def run_publish(asset_ids: list[str], *, world: bool, world_name: str, force: bool) -> dict:
    inspected = inspect_scene()
    by_id = {a["assetId"]: a for a in inspected["assets"]}
    exported = []
    skipped = []
    failed = []
    for aid in asset_ids:
        cur = by_id.get(aid)
        if not cur:
            failed.append({"assetId": aid, "error": "not in scene"})
            continue
        if not cur["ok"] and not force:
            failed.append({"assetId": aid, "error": cur["errors"]})
            continue
        try:
            exported.append({**export_pack_asset(aid), "signature": cur["signature"], "kind": cur["kind"], "url": cur["url"], "folder": cur["folder"], "componentIds": cur["componentIds"]})
        except Exception as e:
            failed.append({"assetId": aid, "error": str(e)})
    world_out = None
    if world:
        if world_name == MASTER_GLB_NAME:
            failed.append({"assetId": "agentspace.world", "error": "refusing master world GLB"})
        else:
            from pathlib import Path
            from .contract import GLTF_DIR

            path = export_world(GLTF_DIR / world_name)
            world_out = {"path": str(path), "bytes": path.stat().st_size, "signature": inspected["world"]["signature"]}
    out = {
        "inspect": {
            "blend": inspected["blend"],
            "assetCount": inspected["assetCount"],
            "world": inspected["world"],
            "worldValidation": inspected["worldValidation"],
        },
        "exported": exported,
        "skipped": skipped,
        "failed": failed,
        "world": world_out,
        "assets": inspected["assets"],
    }
    print(MARKER + json.dumps(out))
    return out
