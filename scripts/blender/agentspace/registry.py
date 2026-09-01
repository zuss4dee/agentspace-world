"""Semantic Agentspace component registry (Blender custom properties + JSON)."""
from __future__ import annotations

import json
from pathlib import Path

import bpy

from .contract import REG_PATH

KEYS = (
    "asw_assetId",
    "asw_componentId",
    "asw_kind",
    "asw_runtimeExport",
    "asw_gridOriginX",
    "asw_gridOriginY",
    "asw_gridSizeX",
    "asw_gridSizeY",
)


def tag(
    ob,
    *,
    asset_id: str,
    component_id: str,
    kind: str,
    runtime: bool = False,
    grid_origin=None,
    grid_size=None,
):
    ob["asw_assetId"] = asset_id
    ob["asw_componentId"] = component_id
    ob["asw_kind"] = kind
    ob["asw_runtimeExport"] = 1 if runtime else 0
    if grid_origin:
        ob["asw_gridOriginX"] = float(grid_origin[0])
        ob["asw_gridOriginY"] = float(grid_origin[1])
    if grid_size:
        ob["asw_gridSizeX"] = float(grid_size[0])
        ob["asw_gridSizeY"] = float(grid_size[1])
    return ob


def _entry(ob) -> dict:
    return {
        "object": ob.name,
        "assetId": ob.get("asw_assetId", ""),
        "componentId": ob.get("asw_componentId", ""),
        "kind": ob.get("asw_kind", ""),
        "runtimeExport": bool(ob.get("asw_runtimeExport", 0)),
        "location": [round(ob.location.x, 4), round(ob.location.y, 4), round(ob.location.z, 4)],
        "type": ob.type,
    }


def list_components(asset_id: str | None = None, kind: str | None = None) -> list[dict]:
    out = []
    for ob in bpy.data.objects:
        if "asw_componentId" not in ob:
            continue
        if asset_id and ob.get("asw_assetId") != asset_id:
            continue
        if kind and ob.get("asw_kind") != kind:
            continue
        out.append(_entry(ob))
    out.sort(key=lambda e: (e["assetId"], e["componentId"]))
    return out


def get_component(asset_id: str, component_id: str):
    for ob in bpy.data.objects:
        if ob.get("asw_assetId") == asset_id and ob.get("asw_componentId") == component_id:
            return ob
    return None


def set_component(asset_id: str, component_id: str, **props):
    ob = get_component(asset_id, component_id)
    if ob is None:
        raise KeyError(f"{asset_id} / {component_id}")
    if "location" in props:
        ob.location = props.pop("location")
    for k, v in props.items():
        ob[k] = v
    return ob


def dump_registry(path: Path | None = None) -> Path:
    path = path or REG_PATH
    data = {
        "materials": [
            {"name": m.name, "materialId": m.get("asw_materialId", m.name)}
            for m in bpy.data.materials
            if m.get("asw_materialId")
        ],
        "components": list_components(),
    }
    path.write_text(json.dumps(data, indent=2))
    bpy.context.scene["asw_registry_path"] = str(path)
    return path
