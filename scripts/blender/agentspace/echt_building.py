"""Stylized Apple-Maps-like Echt office. Library only — never instanced into the city."""
from __future__ import annotations

import bpy
from mathutils import Vector

from .geom import box, ensure_collection, link
from .pbr_library import ensure_mats
from .registry import tag

AID = "pack.agentspace.building.echt.01"
KIND = "building"
LIBRARY_ORIGIN = Vector((-6000.0, -6000.0, 0.0))
ROOT_LOCAL = (80.0, 24.0, 0.0)

# Real-world metres. Origin = footprint centre, Z-up, entrance on -Y.
W = 30.0
D = 14.0
SLAB_W = 4.4
WING_W = 7.0
CENTER_W = W - 2 * SLAB_W - 2 * WING_W  # 8.8
WING_H = 10.4
CENTER_H = 14.8
SLAB_H = 11.6
ROOF_T = 0.32
PARAPET = 0.38

MATS = {
    "asw.mat.building.echt.facade": {"kind": "albedo", "color": (0.78, 0.74, 0.66), "rough": 0.62, "var": 0.02},
    "asw.mat.building.echt.glass": {"kind": "glass", "color": (0.62, 0.74, 0.78, 1), "rough": 0.18, "trans": 0.22},
    "asw.mat.building.echt.roof": {"kind": "albedo", "color": (0.38, 0.40, 0.42), "rough": 0.55, "var": 0.015},
    "asw.mat.building.echt.frame": {"kind": "albedo", "color": (0.12, 0.13, 0.14), "rough": 0.48, "var": 0.01},
}


def _tag_lib(ob, cid, *, kind=KIND, extra=None, runtime=True):
    tag(ob, asset_id=AID, component_id=f"{AID}/{cid}", kind=kind, runtime=runtime)
    ob["asw_staging"] = 1
    ob["asw_library"] = 1
    if extra:
        for k, v in extra.items():
            ob[k] = v
    return ob


def _remove_existing():
    for ob in list(bpy.data.objects):
        if ob.get("asw_assetId") == AID:
            bpy.data.objects.remove(ob, do_unlink=True)


def _part(name, w, d, h, loc, mat, parent, col, cid, *, bevel=0.0):
    ob = box(name, w, d, h, loc, mat, parent, bevel=bevel)
    _tag_lib(ob, cid)
    link(ob, col)
    return ob


def build_echt_building():
    mats = ensure_mats(MATS)
    facade = mats["asw.mat.building.echt.facade"]
    glass = mats["asw.mat.building.echt.glass"]
    roof = mats["asw.mat.building.echt.roof"]
    frame = mats["asw.mat.building.echt.frame"]
    _remove_existing()

    scene = bpy.context.scene.collection
    lib_empty = bpy.data.objects.get("Agentspace_Asset_Library")
    if lib_empty is None:
        raise RuntimeError("Agentspace_Asset_Library empty missing")
    lib_col = bpy.data.collections.get("Agentspace_Asset_Library") or ensure_collection(
        "Agentspace_Asset_Library", scene
    )
    bcol = bpy.data.collections.get("Buildings") or ensure_collection("Buildings", lib_col)

    root = bpy.data.objects.new(AID, None)
    root.empty_display_type = "PLAIN_AXES"
    root.empty_display_size = 8
    root.parent = lib_empty
    root.location = ROOT_LOCAL
    bpy.context.scene.collection.objects.link(root)
    _tag_lib(root, "root", kind="library_root", runtime=False, extra={"asw_libraryRoot": 1})
    link(root, bcol)

    hx = W / 2
    slab_x = hx - SLAB_W / 2
    left_wing_x = -hx + SLAB_W + WING_W / 2

    _part(f"{AID}.slab.left", SLAB_W, D, SLAB_H, (-slab_x, 0, SLAB_H / 2), facade, root, bcol, "slab.left", bevel=0.08)
    _part(f"{AID}.slab.right", SLAB_W, D, SLAB_H, (slab_x, 0, SLAB_H / 2), facade, root, bcol, "slab.right", bevel=0.08)
    # Layout from -hx: [slab][wing][center][wing][slab]
    right_wing_x = hx - SLAB_W - WING_W / 2

    _part(f"{AID}.wing.left", WING_W, D * 0.92, WING_H, (left_wing_x, 0.15, WING_H / 2), glass, root, bcol, "wing.left.glass")
    _part(f"{AID}.wing.right", WING_W, D * 0.92, WING_H, (right_wing_x, 0.15, WING_H / 2), glass, root, bcol, "wing.right.glass")
    _part(f"{AID}.volume.center", CENTER_W, D, CENTER_H, (0, 0, CENTER_H / 2), glass, root, bcol, "volume.center.glass")

    # Facade divisions — floor bands + a few verticals (not a pane-per-window mesh).
    for i, z in enumerate((2.4, 5.2, 8.0)):
        _part(
            f"{AID}.mullion.h.left.{i}",
            WING_W * 0.96,
            0.12,
            0.18,
            (left_wing_x, -D * 0.46, z),
            frame,
            root,
            bcol,
            f"mullion.left.h.{i}",
        )
        _part(
            f"{AID}.mullion.h.right.{i}",
            WING_W * 0.96,
            0.12,
            0.18,
            (right_wing_x, -D * 0.46, z),
            frame,
            root,
            bcol,
            f"mullion.right.h.{i}",
        )
    for i, xoff in enumerate((-WING_W * 0.28, WING_W * 0.28)):
        _part(
            f"{AID}.mullion.v.left.{i}",
            0.16,
            0.12,
            WING_H * 0.92,
            (left_wing_x + xoff, -D * 0.46, WING_H / 2),
            frame,
            root,
            bcol,
            f"mullion.left.v.{i}",
        )
        _part(
            f"{AID}.mullion.v.right.{i}",
            0.16,
            0.12,
            WING_H * 0.92,
            (right_wing_x + xoff, -D * 0.46, WING_H / 2),
            frame,
            root,
            bcol,
            f"mullion.right.v.{i}",
        )
    for i, z in enumerate((3.2, 6.6, 10.2, 13.2)):
        _part(
            f"{AID}.mullion.h.center.{i}",
            CENTER_W * 0.92,
            0.12,
            0.2,
            (0, -D / 2 + 0.08, z),
            frame,
            root,
            bcol,
            f"mullion.center.h.{i}",
        )

    _part(
        f"{AID}.roof.left",
        WING_W + 0.3,
        D * 0.94,
        ROOF_T,
        (left_wing_x, 0.1, WING_H + ROOF_T / 2),
        roof,
        root,
        bcol,
        "roof.left",
    )
    _part(
        f"{AID}.roof.right",
        WING_W + 0.3,
        D * 0.94,
        ROOF_T,
        (right_wing_x, 0.1, WING_H + ROOF_T / 2),
        roof,
        root,
        bcol,
        "roof.right",
    )
    _part(
        f"{AID}.roof.center",
        CENTER_W + 0.25,
        D + 0.15,
        ROOF_T,
        (0, 0, CENTER_H + ROOF_T / 2),
        roof,
        root,
        bcol,
        "roof.center",
    )
    _part(
        f"{AID}.parapet.center",
        CENTER_W + 0.4,
        D + 0.35,
        PARAPET,
        (0, 0, CENTER_H + ROOF_T + PARAPET / 2),
        frame,
        root,
        bcol,
        "parapet.center",
        bevel=0.04,
    )

    _part(
        f"{AID}.entrance",
        6.2,
        1.6,
        6.4,
        (0, -D / 2 - 0.55, 3.2),
        frame,
        root,
        bcol,
        "entrance",
        bevel=0.14,
    )
    _part(
        f"{AID}.entrance.glass",
        4.4,
        0.2,
        2.4,
        (0, -D / 2 - 1.28, 2.0),
        glass,
        root,
        bcol,
        "entrance.glass",
    )
    _part(
        f"{AID}.plinth",
        W * 0.98,
        D * 0.98,
        0.28,
        (0, 0, 0.14),
        roof,
        root,
        bcol,
        "plinth",
    )

    return {"assetId": AID, "objects": len([o for o in bpy.data.objects if o.get("asw_assetId") == AID])}
