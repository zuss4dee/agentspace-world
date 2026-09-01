"""Widen carriageways, shrink sidewalks, replace placeholder junctions.

Does not rebuild the world, move lots, or change road centerlines.
Idempotent via asw_streetPass.
"""
from __future__ import annotations

import re

import bpy
from mathutils import Vector

from .geom import box, cyl, link
from .registry import tag

PASS = "v1"
ASSET = "agentspace.world"

# Blender units match runtime pixels (1 tile = 32). Cars are ~5.3 wide.
CARRIAGE = {"primary": 26.0, "secondary": 22.0, "local": 18.0, "service": 16.0}
WALK_W = 2.2
CURB_W = 0.62
SHOULDER_W = 0.55
FILLET_R = 3.4

DIR_FULL = {"n": "north", "s": "south", "e": "east", "w": "west"}
DIR_DELTA = {"n": (0, -1), "s": (0, 1), "e": (1, 0), "w": (-1, 0)}


def _world(ob) -> Vector:
    return ob.matrix_world.translation.copy()


def _along_x(ob) -> bool:
    return ob.dimensions.x >= ob.dimensions.y * 0.92


def _set_axis_dim(ob, axis: str, value: float):
    d = ob.dimensions.x if axis == "x" else ob.dimensions.y
    if d < 1e-4 or abs(d - value) < 0.02:
        return
    if axis == "x":
        ob.scale.x *= value / d
    else:
        ob.scale.y *= value / d


def _unlink_remove(ob):
    mesh = ob.data if ob.type == "MESH" else None
    bpy.data.objects.remove(ob, do_unlink=True)
    if mesh and mesh.users == 0:
        bpy.data.meshes.remove(mesh)


def _mat(*names):
    for n in names:
        m = bpy.data.materials.get(n)
        if m:
            return m
    return None


def _road_surfs():
    return [
        o
        for o in bpy.data.objects
        if o.type == "MESH"
        and o.name.startswith("Road_")
        and o.get("asw_roadClass")
        and not o.get("asw_staging")
    ]


def _index_of_road(name: str) -> str | None:
    m = re.search(r"_(\d+)$", name)
    return m.group(1) if m else None


def widen_corridors():
    roads = _road_surfs()
    by_idx = {}
    for r in roads:
        idx = _index_of_road(r.name)
        if idx is None:
            continue
        cls = str(r.get("asw_roadClass") or "local")
        old_w = min(r.dimensions.x, r.dimensions.y)
        new_w = CARRIAGE.get(cls, 18.0)
        along = _along_x(r)
        width_axis = "y" if along else "x"
        _set_axis_dim(r, width_axis, new_w)
        by_idx[idx] = {
            "road": r,
            "cls": cls,
            "along": along,
            "old_w": old_w,
            "new_w": new_w,
            "cx": r.location.x,
            "cy": r.location.y,
            "half": new_w / 2,
        }
    bpy.context.view_layer.update()

    def place_side(ob, info, sign: int, offset: float, width: float):
        along = info["along"]
        if along:
            ob.location.x = info["cx"]
            ob.location.y = info["cy"] + sign * offset
            _set_axis_dim(ob, "y", width)
        else:
            ob.location.y = info["cy"]
            ob.location.x = info["cx"] + sign * offset
            _set_axis_dim(ob, "x", width)

    prefixes = (
        ("Walk_", WALK_W / 2 + 0, WALK_W, "walk"),
        ("Curb_", 0, CURB_W, "curb"),
        ("Shoulder_", 0, SHOULDER_W, "shoulder"),
        ("Verge_", WALK_W + 0.55, max(0.7, WALK_W * 0.4), "verge"),
    )
    # offsets filled per type below
    for ob in list(bpy.data.objects):
        if ob.type != "MESH" or ob.get("asw_staging"):
            continue
        m = re.match(r"(Walk|Curb|Shoulder|Verge)_(\d+)_(-?1)$", ob.name)
        if not m:
            continue
        kind, idx, sign_s = m.group(1), m.group(2), int(m.group(3))
        info = by_idx.get(idx)
        if not info:
            continue
        half = info["half"]
        if kind == "Walk":
            place_side(ob, info, sign_s, half + WALK_W / 2, WALK_W)
        elif kind == "Curb":
            place_side(ob, info, sign_s, half, CURB_W)
        elif kind == "Shoulder":
            place_side(ob, info, sign_s, half - SHOULDER_W * 0.55, SHOULDER_W)
        elif kind == "Verge":
            place_side(ob, info, sign_s, half + WALK_W + 0.45, 0.8)

    # medians / lane marks stay centered; keep thin
    for ob in bpy.data.objects:
        if ob.type != "MESH" or ob.get("asw_staging"):
            continue
        if ob.name.startswith("Median_"):
            along = _along_x(ob)
            _set_axis_dim(ob, "y" if along else "x", 0.55)
        if ob.name.startswith("Lane_"):
            along = _along_x(ob)
            _set_axis_dim(ob, "y" if along else "x", 0.18)
    return by_idx


def _iid_from_name(name: str) -> str | None:
    m = re.search(r"(?:JctRing|JctIsland|Jct|CurbReturn|Turn|CornerWalk|Zebra|RbtBarrier)_(\d+_\d+)", name)
    return m.group(1) if m else None


def _ixn_centers():
    centers = {}
    for o in bpy.data.objects:
        iid = _iid_from_name(o.name)
        if not iid:
            continue
        kind = str(o.get("asw_intersectionType") or "")
        loc = _world(o)
        rec = centers.setdefault(iid, {"x": loc.x, "y": loc.y, "kind": kind, "carriage": 22.0})
        if kind:
            rec["kind"] = kind
        if o.name.startswith("Jct_") and o.name.endswith("_pad"):
            rec["x"], rec["y"] = loc.x, loc.y
            rec["carriage"] = max(o.dimensions.x, o.dimensions.y)
        if o.name.startswith("JctRing_"):
            rec["x"], rec["y"] = loc.x, loc.y
    # carriage from adjacent classified roads: use max primary-ish
    for iid, rec in centers.items():
        rec["kind"] = rec["kind"] or "intersection.standard"
        rec["carriage"] = 26.0 if "arterial" in rec["kind"] or rec["kind"].endswith("roundabout") else (
            22.0 if rec["kind"] == "intersection.standard" else 18.0
        )
        if rec["kind"].endswith("roundabout"):
            rec["kind"] = "intersection.arterial"
            rec["carriage"] = 26.0
    return centers


def rebuild_junctions():
    parent = bpy.data.objects.get("Intersections")
    col = bpy.data.collections.get("Intersections")
    curb_parent = bpy.data.objects.get("Curbs")
    curb_col = bpy.data.collections.get("Curbs")
    walk_parent = bpy.data.objects.get("Sidewalks")
    walk_col = bpy.data.collections.get("Sidewalks")
    xwalk_parent = bpy.data.objects.get("Crosswalks")
    xwalk_col = bpy.data.collections.get("Crosswalks")
    asphalt = _mat("asw.mat.road.asphalt", "asw.mat.road.asphalt.worn")
    curb_mat = _mat("asw.mat.pavement.stone", "asw.mat.concrete.curb")
    walk_mat = _mat("asw.mat.pavement.concrete")
    mark = _mat("asw.mat.road.marking.white")

    centers = _ixn_centers()
    for o in bpy.data.objects:
        m = re.match(r"TL_(\d+_\d+)_", o.name)
        if m and m.group(1) not in centers:
            loc = _world(o)
            centers[m.group(1)] = {"x": loc.x, "y": loc.y, "kind": "intersection.standard", "carriage": 22.0}

    drop_prefix = ("JctRing_", "JctIsland_", "RbtBarrier_")
    drop_exact = []
    for o in list(bpy.data.objects):
        if o.get("asw_staging"):
            continue
        if o.name.startswith(drop_prefix):
            drop_exact.append(o)
        elif o.name.startswith("Jct_") and (o.name.endswith("_pad") or o.name.endswith("_ns") or o.name.endswith("_ew")):
            drop_exact.append(o)
        elif o.name.startswith("Turn_"):
            drop_exact.append(o)
        elif o.name.startswith("CurbReturn_"):
            drop_exact.append(o)
    for o in drop_exact:
        _unlink_remove(o)

    for iid, rec in centers.items():

        ix, iy = rec["x"], rec["y"]
        carriage = rec["carriage"]
        kind = rec["kind"]
        half = carriage / 2
        span = carriage + FILLET_R * 0.85

        def put_road(name, w, d, loc, cid):
            ob = box(
                name,
                w,
                d,
                0.13,
                loc,
                asphalt,
                parent,
                asset_id=ASSET,
                component_id=cid,
                kind="road",
                runtime=True,
            )
            ob["asw_intersectionType"] = kind
            if col:
                link(ob, col)
            return ob

        put_road(f"Jct_{iid}_ns", carriage, span, (ix, iy, 0.07), f"{ASSET}/road/intersection/{iid}/surface/ns")
        put_road(f"Jct_{iid}_ew", span, carriage, (ix, iy, 0.07), f"{ASSET}/road/intersection/{iid}/surface/ew")

        for qi, (dx, dy) in enumerate(((-1, -1), (1, -1), (1, 1), (-1, 1))):
            t = cyl(
                f"Turn_{iid}_{qi}",
                FILLET_R,
                0.1,
                (ix + dx * (half - FILLET_R * 0.35), iy + dy * (half - FILLET_R * 0.35), 0.075),
                asphalt,
                parent,
                segs=10,
                asset_id=ASSET,
                component_id=f"{ASSET}/road/intersection/{iid}/turning/{qi}",
                kind="road",
                runtime=True,
            )
            t["asw_intersectionType"] = kind
            if col:
                link(t, col)
            cr = cyl(
                f"CurbReturn_{iid}_{qi}",
                0.48,
                0.28,
                (ix + dx * (half + 0.28), iy + dy * (half + 0.28), 0.16),
                curb_mat,
                curb_parent,
                segs=8,
                asset_id=ASSET,
                component_id=f"{ASSET}/curb/intersection/{iid}/return/{qi}",
                kind="curb",
                runtime=True,
            )
            if curb_col:
                link(cr, curb_col)
            cw = bpy.data.objects.get(f"CornerWalk_{iid}_{qi}")
            if cw:
                cw.location = (ix + dx * (half + WALK_W * 0.55), iy + dy * (half + WALK_W * 0.55), 0.11)
                _set_axis_dim(cw, "x", WALK_W * 1.15)
                _set_axis_dim(cw, "y", WALK_W * 1.15)
            elif walk_parent is not None:
                nw = box(
                    f"CornerWalk_{iid}_{qi}",
                    WALK_W * 1.15,
                    WALK_W * 1.15,
                    0.1,
                    (ix + dx * (half + WALK_W * 0.55), iy + dy * (half + WALK_W * 0.55), 0.11),
                    walk_mat,
                    walk_parent,
                    asset_id=ASSET,
                    component_id=f"{ASSET}/sidewalk/sidewalk/corner/{iid}/{qi}",
                    kind="sidewalk",
                    runtime=True,
                )
                nw["asw_sidewalkType"] = "corner_crossing"
                if walk_col:
                    link(nw, walk_col)

        # zebras: sit on the asphalt, connecting sidewalks
        for name, (dx, dy) in DIR_DELTA.items():
            axis_ew = name in ("e", "w")
            for b in range(5):
                ob = bpy.data.objects.get(f"Zebra_{iid}_{name}_{b}")
                off = (b - 2) * 0.62
                if axis_ew:
                    loc = (ix + dx * (half - 1.15), iy + off, 0.14)
                    if ob:
                        ob.location = loc
                        _set_axis_dim(ob, "x", 1.7)
                        _set_axis_dim(ob, "y", 0.32)
                else:
                    loc = (ix + off, iy + dy * (half - 1.15), 0.14)
                    if ob:
                        ob.location = loc
                        _set_axis_dim(ob, "x", 0.32)
                        _set_axis_dim(ob, "y", 1.7)
                if ob is None and mark and xwalk_parent:
                    ww, dd = (1.7, 0.32) if axis_ew else (0.32, 1.7)
                    zb = box(
                        f"Zebra_{iid}_{name}_{b}",
                        ww,
                        dd,
                        0.03,
                        loc,
                        mark,
                        xwalk_parent,
                        asset_id=ASSET,
                        component_id=f"{ASSET}/crosswalk/crosswalk/{iid}/{name}/{b}",
                        kind="crosswalk",
                        runtime=True,
                    )
                    if xwalk_col:
                        link(zb, xwalk_col)

        # traffic lights: sidewalk corners, facing the approach
        for name, (dx, dy) in DIR_DELTA.items():
            compass = DIR_FULL[name]
            # right-hand corner of the approach
            if name == "n":
                px, py = ix + (half + 0.85), iy - (half + 0.7)
            elif name == "s":
                px, py = ix - (half + 0.85), iy + (half + 0.7)
            elif name == "e":
                px, py = ix + (half + 0.7), iy + (half + 0.85)
            else:
                px, py = ix - (half + 0.7), iy - (half + 0.85)
            pole = bpy.data.objects.get(f"TL_{iid}_{compass}_pole")
            if not pole:
                continue
            old = Vector(pole.location)
            delta = Vector((px, py, old.z)) - old
            for suffix in ("pole", "arm", "head", "red", "amber", "green", "ped"):
                part = bpy.data.objects.get(f"TL_{iid}_{compass}_{suffix}")
                if part:
                    part.location += delta
                    if suffix in {"red", "amber", "green"}:
                        part["asw_signal"] = suffix if suffix != "amber" else "amber"
                        part["asw_signalGroup"] = f"TrafficLight_{compass.title()}"

    return centers


def alias_main_signals(centers: dict):
    """Readable names on the former roundabout (36_36) for later animation."""
    iid = "36_36" if "36_36" in centers else (sorted(centers)[len(centers) // 2] if centers else None)
    if not iid:
        return None
    for compass, label in (("north", "North"), ("south", "South"), ("east", "East"), ("west", "West")):
        pole = bpy.data.objects.get(f"TL_{iid}_{compass}_pole")
        if not pole:
            continue
        empty = bpy.data.objects.get(f"TrafficLight_{label}")
        if empty is None:
            empty = bpy.data.objects.new(f"TrafficLight_{label}", None)
            empty.empty_display_type = "PLAIN_AXES"
            empty.empty_display_size = 2
            bpy.context.scene.collection.objects.link(empty)
            lighting = bpy.data.objects.get("Lighting")
            if lighting:
                empty.parent = lighting
        empty.location = pole.location.copy()
        empty["asw_assetId"] = ASSET
        empty["asw_componentId"] = f"{ASSET}/traffic_light/intersection/{iid}/{compass}"
        empty["asw_kind"] = "traffic_light"
        empty["asw_runtimeExport"] = 0
        empty["asw_signalRoot"] = 1
        for suffix, nice in (("red", "Red"), ("amber", "Amber"), ("green", "Green")):
            part = bpy.data.objects.get(f"TL_{iid}_{compass}_{suffix}")
            if part:
                part["asw_controlName"] = f"TrafficLight_{label}_{nice}"
    return iid


def nudge_street_furniture(by_idx: dict):
    """Keep lamps/bollards/bus stops on the new sidewalk, not in the carriageway."""
    roads = _road_surfs()
    if not roads:
        return 0
    n = 0
    keys = (
        "roadlamp",
        "Bollard",
        "BusStop",
        "BusSign",
        "Poster",
        "SignPost",
        "ParkingMeter",
        "Gutter",
        "LifeSign",
        "LifePoster",
        "LifeMeter",
    )
    for ob in bpy.data.objects:
        if ob.type not in {"MESH", "EMPTY"} or ob.get("asw_staging"):
            continue
        if ob.get("asw_streetPass") == PASS:
            continue
        if not any(ob.name.startswith(k) for k in keys):
            continue
        loc = ob.location
        best = None
        best_d = 1e9
        for r in roads:
            along = _along_x(r)
            if along:
                if abs(loc.x - r.location.x) > r.dimensions.x / 2 + 12:
                    continue
                d = abs(loc.y - r.location.y)
            else:
                if abs(loc.y - r.location.y) > r.dimensions.y / 2 + 12:
                    continue
                d = abs(loc.x - r.location.x)
            if d < best_d:
                best_d = d
                best = r
        if best is None or best_d > 22:
            continue
        cls = str(best.get("asw_roadClass") or "local")
        half = CARRIAGE.get(cls, 18.0) / 2
        target = half + WALK_W * 0.45
        along = _along_x(best)
        if along:
            sign = 1 if loc.y >= best.location.y else -1
            ob.location.y = best.location.y + sign * target
        else:
            sign = 1 if loc.x >= best.location.x else -1
            ob.location.x = best.location.x + sign * target
        n += 1
    return n


def refine_streets():
    if any(o.get("asw_streetPass") == PASS for o in bpy.data.objects if o.name.startswith("Road_")):
        return {"ok": True, "skipped": True}
    lots = [tuple(o.location) for o in bpy.data.objects if o.get("asw_lotId")]
    fp = {
        n: tuple(bpy.data.objects[n].location)
        for n in ("Agentspace_World", "TerrainCampus", "OceanWest")
        if n in bpy.data.objects
    }
    by_idx = widen_corridors()
    bpy.context.view_layer.update()
    centers = rebuild_junctions()
    bpy.context.view_layer.update()
    main = alias_main_signals(centers)
    furn = nudge_street_furniture(by_idx)
    for r in _road_surfs():
        r["asw_streetPass"] = PASS
    fp2 = {
        n: tuple(bpy.data.objects[n].location)
        for n in fp
    }
    lots2 = [tuple(o.location) for o in bpy.data.objects if o.get("asw_lotId")]
    return {
        "ok": True,
        "roads": len(by_idx),
        "junctions": len(centers),
        "furniture": furn,
        "mainSignals": main,
        "worldUnchanged": fp == fp2,
        "lotsUnchanged": lots == lots2,
        "primaryWidth": next((round(r.dimensions.x if not _along_x(r) else r.dimensions.y, 2) for r in _road_surfs() if r.get("asw_roadClass") == "primary"), None),
        "walkWidth": next((round(min(o.dimensions.x, o.dimensions.y), 2) for o in bpy.data.objects if o.name.startswith("Walk_")), None),
    }
