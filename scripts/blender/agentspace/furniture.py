"""Street furniture and lighting. Shared library meshes, linked duplicates only."""
from __future__ import annotations

import math

from .contract import world_xy
from .geom import box, cyl, linked_place
from .roads import CLASS_MUL, WALK_MUL, classify_lane, is_ixn, merge_road_segs, terrain_at


def _hide_lib(ob, kind):
    ob.hide_set(True)
    ob.hide_render = True
    ob.hide_viewport = True
    ob["asw_runtimeExport"] = 0
    ob["asw_propKind"] = kind
    return ob


def build_prop_library(mats, parent):
    lib = {
        "zebra": box("Lib_Zebra", 1.4, 0.28, 0.03, (0, 0, -90), mats["mark"], parent),
        "bench": box("Lib_Bench", 1.8, 0.48, 0.42, (0, 0, -90), mats["wood"], parent),
        "bin": cyl("Lib_Bin", 0.22, 0.7, (0, 0, -90), mats["metal"], parent, segs=8),
        "bollard": cyl("Lib_Bollard", 0.09, 0.85, (0, 0, -90), mats["metal"], parent, segs=6),
        "barrier": box("Lib_Barrier", 1.6, 0.12, 0.7, (0, 0, -90), mats["metal"], parent),
        "bike": box("Lib_BikeRack", 1.6, 0.35, 0.55, (0, 0, -90), mats["metal"], parent),
        "bus": box("Lib_BusShelter", 3.2, 1.1, 2.4, (0, 0, -90), mats["metal"], parent),
        "sign": box("Lib_Sign", 0.12, 0.7, 2.2, (0, 0, -90), mats["metal"], parent),
        "lamp_post": cyl("Lib_LampPost", 0.09, 1.0, (0, 0, -90), mats["metal"], parent, segs=8),
        "lamp_head": cyl("Lib_LampHead", 0.16, 0.14, (0, 0, -90), mats["signal"], parent, segs=8),
        "tl_pole": cyl("Lib_TlPole", 0.08, 4.2, (0, 0, -90), mats["metal"], parent, segs=8),
        "tl_arm": box("Lib_TlArm", 1.1, 0.1, 0.1, (0, 0, -90), mats["metal"], parent),
        "tl_head": box("Lib_TlHead", 0.28, 0.18, 0.7, (0, 0, -90), mats["signal"], parent),
        "planter": box("Lib_PlanterBox", 1.2, 0.5, 0.4, (0, 0, -90), mats["curb"], parent),
        "plaza_ring": cyl("Lib_PlazaRing", 2.2, 0.08, (0, 0, -90), mats["plaza"], parent, segs=12),
        "verge": box("Lib_Verge", 1.0, 1.0, 0.08, (0, 0, -90), mats["park"], parent),
        "median": box("Lib_Median", 1.0, 1.0, 0.16, (0, 0, -90), mats["lot.park"], parent),
        "lane": box("Lib_LaneMark", 1.0, 0.18, 0.02, (0, 0, -90), mats["mark"], parent),
    }
    for key, ob in lib.items():
        _hide_lib(ob, key)
    return lib


def lamp_type(s, c) -> str:
    gx, gy = s.get("x", 0), s.get("y", 0)
    if terrain_at(c, int(gx), int(gy)) in {"park", "plaza"}:
        return "street_light.park"
    rxs, rys = c["roadXs"], c["roadYs"]
    near_x = min((abs(gx - rx) for rx in rxs), default=9)
    near_y = min((abs(gy - ry) for ry in rys), default=9)
    if near_x <= near_y:
        lane = min(rxs, key=lambda rx: abs(gx - rx))
        cls = classify_lane(lane, rxs)
    else:
        lane = min(rys, key=lambda ry: abs(gy - ry))
        cls = classify_lane(lane, rys)
    if cls == "primary":
        return "street_light.arterial"
    if near_x > 1.2 and near_y > 1.2:
        return "street_light.pedestrian"
    return "street_light.local"


def place_lamp(lib, lt, sid, wx, wy, mats, groups, put, kw):
    ht = 7.2 if lt.endswith("arterial") else 4.6 if lt.endswith("park") else 5.4 if lt.endswith("local") else 3.8
    post = linked_place(
        lib["lamp_post"],
        sid + "_post",
        (wx, wy, ht / 2),
        groups["Lighting"],
        (1, 1, ht),
        **kw("street_furniture", f"{lt}/{sid}/post"),
    )
    post["asw_lightType"] = lt
    put("Lighting", post)
    head = linked_place(
        lib["lamp_head"],
        sid + "_head",
        (wx, wy, ht),
        groups["Lighting"],
        **kw("street_furniture", f"{lt}/{sid}"),
    )
    head["asw_lightType"] = lt
    put("Lighting", head)


def _near(existing, wx, wy, min_d):
    d2 = min_d * min_d
    return any((wx - ex) ** 2 + (wy - ey) ** 2 < d2 for ex, ey in existing)


def build_furniture(c, mats, groups, put, kw, lib=None):
    if lib is None:
        lib = build_prop_library(mats, groups["Street_Furniture"])
    tile = c["tile"]
    grid = c["grid"]
    existing = []
    lamp_pts = []

    for s in c["scenery"]:
        kind = s["kind"]
        wx, wy = s["world"]["x"], s["world"]["y"]
        if kind == "lamp":
            lt = lamp_type(s, c)
            place_lamp(lib, lt, s["id"], wx, wy, mats, groups, put, kw)
            existing.append((wx, wy))
            lamp_pts.append((wx, wy, lt))
        elif kind == "bench":
            put(
                "Street_Furniture",
                linked_place(lib["bench"], s["id"], (wx, wy, 0.42), groups["Street_Furniture"], **kw("street_furniture", f"bench/{s['id']}")),
            )
            existing.append((wx, wy))
        elif kind == "planter":
            put(
                "Street_Furniture",
                linked_place(lib["planter"], s["id"], (wx, wy, 0.28), groups["Street_Furniture"], **kw("street_furniture", f"planter/{s['id']}")),
            )
            existing.append((wx, wy))
        elif kind == "sign":
            put(
                "Street_Furniture",
                linked_place(lib["sign"], s["id"], (wx, wy, 1.1), groups["Street_Furniture"], **kw("street_furniture", f"sign/{s['id']}")),
            )
            existing.append((wx, wy))

    segs = merge_road_segs(c)
    for si, s in enumerate(segs):
        cls = s["cls"]
        walk_off = (c["carriageTiles"] * CLASS_MUL[cls]) / 2 + (c["walkTiles"] * WALK_MUL[cls])
        along = s["alongX"]
        length = s["len"]
        step = 4 if cls == "primary" else 5 if cls == "secondary" else 6
        sides = (-1, 1) if cls in {"primary", "secondary"} else (1,)
        n = max(1, int(length // step))
        for sign in sides:
            for k in range(n):
                t = (k + 0.5) / n
                if along:
                    gx = (s["cx"] - s["len"] / 2) + t * s["len"]
                    gy = s["cy"] + sign * walk_off
                    rot = 0
                else:
                    gx = s["cx"] + sign * walk_off
                    gy = (s["cy"] - s["len"] / 2) + t * s["len"]
                    rot = math.pi / 2
                if is_ixn(c, int(gx), int(gy)):
                    continue
                wx, wy = world_xy(gx, gy, grid, tile)
                if _near(existing, wx, wy, tile * 2.2):
                    continue
                if cls == "primary":
                    lt = "street_light.arterial"
                elif cls == "service" or k % 4 == 3:
                    lt = "street_light.pedestrian"
                else:
                    lt = "street_light.local"
                sid = f"roadlamp_{si}_{sign}_{k}"
                place_lamp(lib, lt, sid, wx, wy, mats, groups, put, kw)
                existing.append((wx, wy))
                lamp_pts.append((wx, wy, lt))

                if k % 3 == 1:
                    bx, by = wx + (0.9 if along else 0), wy + (0 if along else 0.9)
                    if not _near(existing, bx, by, tile * 1.4):
                        put(
                            "Street_Furniture",
                            linked_place(
                                lib["bin"],
                                f"Bin_{si}_{sign}_{k}",
                                (bx, by, 0.35),
                                groups["Street_Furniture"],
                                **kw("street_furniture", f"bin/{si}/{sign}/{k}"),
                            ),
                        )
                        existing.append((bx, by))
                if cls in {"primary", "secondary"} and k % 5 == 2:
                    put(
                        "Street_Furniture",
                        linked_place(
                            lib["bench"],
                            f"WalkBench_{si}_{sign}_{k}",
                            (wx - (0.7 if along else 0), wy - (0 if along else 0.7), 0.42),
                            groups["Street_Furniture"],
                            (1, 1, 1),
                            rot,
                            **kw("street_furniture", f"bench/walk/{si}/{sign}/{k}"),
                        ),
                    )
                if cls == "primary" and k % 7 == 4:
                    put(
                        "Street_Furniture",
                        linked_place(
                            lib["bike"],
                            f"Bike_{si}_{sign}_{k}",
                            (wx, wy + 1.1, 0.28),
                            groups["Street_Furniture"],
                            (1, 1, 1),
                            rot,
                            **kw("street_furniture", f"bike_rack/{si}/{sign}/{k}"),
                        ),
                    )

    for si, s in enumerate(segs):
        if s["cls"] != "primary":
            continue
        along = s["alongX"]
        walk_off = (c["carriageTiles"] * CLASS_MUL["primary"]) / 2 + (c["walkTiles"] * WALK_MUL["primary"])
        gx = s["cx"] if along else s["cx"] + walk_off
        gy = s["cy"] + walk_off if along else s["cy"]
        wx, wy = world_xy(gx, gy, grid, tile)
        rot = 0 if along else math.pi / 2
        put(
            "Street_Furniture",
            linked_place(
                lib["bus"],
                f"BusStop_{si}",
                (wx, wy, 1.2),
                groups["Street_Furniture"],
                (1, 1, 1),
                rot,
                **kw("street_furniture", f"bus_stop/{si}"),
            ),
        )
        put(
            "Street_Furniture",
            linked_place(
                lib["sign"],
                f"BusSign_{si}",
                (wx + (2.0 if along else 0), wy + (0 if along else 2.0), 1.1),
                groups["Street_Furniture"],
                **kw("street_furniture", f"sign/bus/{si}"),
            ),
        )

    return lib
