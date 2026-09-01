"""Instance existing Agentspace_Asset_Library assets into company buildings (linked mesh data)."""
from __future__ import annotations

from typing import Any

import bpy
from mathutils import Matrix, Vector

from .geom import link
from .registry import tag


def find_library_root(library_asset_id: str):
    for ob in bpy.data.objects:
        if ob.get("asw_libraryRoot") and ob.get("asw_assetId") == library_asset_id:
            return ob
    return None


def _sanitize_local_matrix(m: Matrix) -> Matrix:
    """Strip library-shelf world coords erroneously stored in matrix_local."""
    out = m.copy()
    t = out.translation
    if abs(t.x) > 200 or abs(t.y) > 200:
        out.translation = Vector((0.0, 0.0, t.z))
    return out


def _local_to_root(src, lib_root) -> Matrix:
    """Pose of src relative to library asset root (sanitizes baked shelf coords)."""
    if src == lib_root:
        return Matrix.Identity(4)
    chain: list = []
    cur = src
    while cur and cur != lib_root:
        chain.append(cur)
        cur = cur.parent
    if cur != lib_root:
        return _sanitize_local_matrix(src.matrix_local.copy())
    m = Matrix.Identity(4)
    for ob in reversed(chain):
        m = m @ _sanitize_local_matrix(ob.matrix_local.copy())
    return m


def _asset_footprint_z(library_asset_id: str) -> float:
    root = find_library_root(library_asset_id)
    if root is None:
        return 0.0
    zs = [0.0]
    for ch in root.children_recursive:
        if ch.type != "MESH":
            continue
        rel = _local_to_root(ch, root)
        for corner in ch.bound_box:
            loc = rel @ Vector(corner)
            zs.append(loc.z)
    return min(zs)


def instance_library_asset(
    library_asset_id: str,
    parent,
    col,
    *,
    building_asset_id: str,
    cid_prefix: str,
    kind: str,
    location: tuple[float, float, float],
    rotation_z: float = 0.0,
    uniform_scale: float = 1.0,
) -> list[Any]:
    """Place a linked instance of a library asset under a building root."""
    lib_root = find_library_root(library_asset_id)
    if lib_root is None:
        raise KeyError(f"library asset not found: {library_asset_id}")

    inst = bpy.data.objects.new(f"{cid_prefix}.root", None)
    inst.empty_display_type = "PLAIN_AXES"
    inst.empty_display_size = 0.5
    inst.parent = parent
    inst.location = location
    inst.rotation_euler = (0.0, 0.0, rotation_z)
    inst.scale = (uniform_scale, uniform_scale, uniform_scale)
    link(inst, col)

    created: list[Any] = [inst]
    meshes = [o for o in lib_root.children_recursive if o.type == "MESH"]
    for i, src in enumerate(meshes):
        dup = src.copy()
        dup.data = src.data
        link(dup, col)
        rel = _local_to_root(src, lib_root)
        dup.parent = inst
        # copy() keeps source world coords — set pose via world matrix so parent does not preserve shelf offset
        dup.matrix_world = inst.matrix_world @ rel
        cid = f"{cid_prefix}.{i}.{src.name.split('.')[-1]}"
        tag(dup, asset_id=building_asset_id, component_id=f"{building_asset_id}/{cid}", kind=kind, runtime=True)
        dup["asw_staging"] = 1
        dup["asw_library"] = 1
        dup["asw_libraryInstance"] = 1
        dup["asw_librarySource"] = lib_root.get("asw_assetId")
        created.append(dup)
    return created
