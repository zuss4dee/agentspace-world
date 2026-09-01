"""Road hierarchy on contract centerlines. Does not move ROAD_XS / ROAD_YS."""
from __future__ import annotations

import math

from .contract import world_xy
from .geom import box, cyl, empty as empty_ob, linked_place

# Width multipliers vs contract carriageTiles. Centerline stays the contract lane.
CLASS_MUL = {"primary": 1.32, "secondary": 1.0, "local": 0.78, "service": 0.55}
WALK_MUL = {"primary": 1.25, "secondary": 1.0, "local": 0.85, "service": 0.7}
DIR_FULL = {"n": "north", "s": "south", "e": "east", "w": "west"}


def classify_lane(lane: int, lanes: list[int]) -> str:
    if not lanes:
        return "local"
    order = sorted(lanes)
    n = len(order)
    i = order.index(lane) if lane in order else 0
    if n >= 4 and i in {n // 2 - 1, n // 2}:
        return "primary"
    if i in {1, n - 2} and n >= 4:
        return "secondary"
    if i == n - 1:
        return "service"
    return "local"


def terrain_at(c, x, y):
    rows = [r.split(",") for r in c["terrainRows"]]
    g = c["grid"]
    if y < 0 or y >= g or x < 0 or x >= g:
        return None
    return rows[y][x]


def is_ixn(c, x, y):
    return x in c["roadXs"] and y in c["roadYs"] and terrain_at(c, x, y) == "road"


def approaches(c, rx, ry):
    n = terrain_at(c, rx, ry - 1) == "road"
    s = terrain_at(c, rx, ry + 1) == "road"
    w = terrain_at(c, rx - 1, ry) == "road"
    e = terrain_at(c, rx + 1, ry) == "road"
    return {"n": n, "s": s, "e": e, "w": w}


def intersection_type(c, rx, ry):
    """Component class for a contract crossing.

    Every ROAD_XS×ROAD_YS cell is 4-way in the terrain (roads continue to the
    map edge). True 3-way T / map-border corners cannot be created without
    deleting contract road arms. Closest allowed: lattice corners of the
    street grid, and non-arterial outer-ring crossings, as typed components.
    """
    ap = approaches(c, rx, ry)
    count = sum(1 for k in ("n", "s", "e", "w") if ap[k])
    rxs, rys = c["roadXs"], c["roadYs"]
    xmin, xmax = min(rxs), max(rxs)
    ymin, ymax = min(rys), max(rys)
    cls_x = classify_lane(rx, rxs)
    cls_y = classify_lane(ry, rys)
    arterial = cls_x == "primary" or cls_y == "primary"
    outer = rx in (xmin, xmax) or ry in (ymin, ymax)
    if rx in (xmin, xmax) and ry in (ymin, ymax):
        return "intersection.corner"
    if count <= 3 or (outer and not arterial):
        return "intersection.t"
    if arterial and rx == rxs[len(rxs) // 2] and ry == rys[len(rys) // 2]:
        return "intersection.roundabout"
    if arterial:
        return "intersection.arterial"
    return "intersection.standard"


def merge_road_segs(c):
    grid = c["grid"]
    rxs, rys = c["roadXs"], c["roadYs"]
    cells = {(x, y) for y in range(grid) for x in range(grid) if terrain_at(c, x, y) == "road" and not is_ixn(c, x, y)}
    segs = []
    for rx in rxs:
        run = None

        def flush(end, lane=rx):
            nonlocal run
            if run is None:
                return
            length = end - run + 1
            segs.append({"cx": lane + 0.5, "cy": run + length / 2, "alongX": False, "len": length, "lane": lane, "cls": classify_lane(lane, rxs)})
            run = None

        for y in range(grid):
            if (rx, y) in cells:
                if run is None:
                    run = y
            else:
                flush(y - 1)
        flush(grid - 1)
    for ry in rys:
        run = None

        def flushx(end, lane=ry):
            nonlocal run
            if run is None:
                return
            length = end - run + 1
            segs.append({"cx": run + length / 2, "cy": lane + 0.5, "alongX": True, "len": length, "lane": lane, "cls": classify_lane(lane, rys)})
            run = None

        for x in range(grid):
            if (x, ry) in cells:
                if run is None:
                    run = x
            else:
                flushx(x - 1)
        flushx(grid - 1)
    return segs


def _walk_type(cls: str) -> str:
    if cls == "primary":
        return "wide"
    if cls == "service":
        return "standard"
    return "standard"


def stamp_sidewalk(ob, typ: str):
    ob["asw_sidewalkType"] = typ


def build_roads(c, mats, groups, cols, put, kw, prop_lib=None):
    tile = c["tile"]
    grid = c["grid"]
    carriage0 = tile * c["carriageTiles"]
    walk0 = tile * c["walkTiles"]
    curb_w = max(0.45, tile * c["curbTiles"] * 1.6)

    for i, s in enumerate(merge_road_segs(c)):
        cls = s["cls"]
        carriage = carriage0 * CLASS_MUL[cls]
        walk_w = walk0 * WALK_MUL[cls]
        along = s["alongX"]
        length = s["len"] * tile
        cx, cy = world_xy(s["cx"], s["cy"], grid, tile)
        w, d = (length, carriage) if along else (carriage, length)
        road = box(
            f"Road_{cls}_{i}",
            w,
            d,
            0.14,
            (cx, cy, 0.07),
            mats[f"road.{cls}"],
            groups["Roads"],
            **kw("road", f"road/{cls}/{i}/surface"),
        )
        road["asw_roadClass"] = cls
        put("Roads", road)
        sh = 0.55 if cls == "primary" else 0.38 if cls == "secondary" else 0.22
        curb_off = (c["carriageTiles"] * CLASS_MUL[cls]) / 2
        walk_off = curb_off + (c["walkTiles"] * WALK_MUL[cls]) / 2
        walk_typ = _walk_type(cls)
        walk_mat = mats["walk.wide"] if cls == "primary" else mats["walk"]
        for sign in (-1, 1):
            gx = s["cx"] if along else s["cx"] + sign * (curb_off - 0.02)
            gy = s["cy"] + sign * (curb_off - 0.02) if along else s["cy"]
            wx, wy = world_xy(gx, gy, grid, tile)
            gw, gd = (length, sh) if along else (sh, length)
            put(
                "Roads",
                box(
                    f"Shoulder_{i}_{sign}",
                    gw,
                    gd,
                    0.06,
                    (wx, wy, 0.055),
                    mats["road.service"],
                    groups["Roads"],
                    **kw("road", f"road/{cls}/{i}/shoulder/{sign}"),
                ),
            )
            gx = s["cx"] if along else s["cx"] + sign * curb_off
            gy = s["cy"] + sign * curb_off if along else s["cy"]
            wx, wy = world_xy(gx, gy, grid, tile)
            cw, cd = (length, curb_w) if along else (curb_w, length)
            put(
                "Curbs",
                box(
                    f"Curb_{i}_{sign}",
                    cw,
                    cd,
                    0.32,
                    (wx, wy, 0.18),
                    mats["curb"],
                    groups["Curbs"],
                    **kw("curb", f"curb/{cls}/{i}/{sign}"),
                ),
            )
            gx = s["cx"] if along else s["cx"] + sign * walk_off
            gy = s["cy"] + sign * walk_off if along else s["cy"]
            wx, wy = world_xy(gx, gy, grid, tile)
            ww, wd = (length, walk_w) if along else (walk_w, length)
            walk = box(
                f"Walk_{i}_{sign}",
                ww,
                wd,
                0.1,
                (wx, wy, 0.11),
                walk_mat,
                groups["Sidewalks"],
                **kw("sidewalk", f"sidewalk/{cls}/{i}/{sign}"),
            )
            stamp_sidewalk(walk, walk_typ)
            put("Sidewalks", walk)
            if prop_lib:
                verge_off = walk_off + (c["walkTiles"] * WALK_MUL[cls]) * 0.55
                gx = s["cx"] if along else s["cx"] + sign * verge_off
                gy = s["cy"] + sign * verge_off if along else s["cy"]
                vx, vy = world_xy(gx, gy, grid, tile)
                if along:
                    vs = (length, max(0.6, walk_w * 0.35), 1)
                    rot = 0
                else:
                    vs = (length, max(0.6, walk_w * 0.35), 1)
                    rot = math.pi / 2
                put(
                    "Parks",
                    linked_place(
                        prop_lib["verge"],
                        f"Verge_{i}_{sign}",
                        (vx, vy, 0.06),
                        groups["Parks"],
                        vs if along else (vs[1], vs[0], 1),
                        0 if along else math.pi / 2,
                        **kw("vegetation", f"verge/{cls}/{i}/{sign}"),
                    ),
                )
        if cls == "primary" and prop_lib:
            mx, my = world_xy(s["cx"], s["cy"], grid, tile)
            if along:
                put(
                    "Roads",
                    linked_place(
                        prop_lib["median"],
                        f"Median_{i}",
                        (mx, my, 0.16),
                        groups["Roads"],
                        (length * 0.92, 0.7, 1),
                        **kw("road", f"road/{cls}/{i}/median"),
                    ),
                )
                put(
                    "Roads",
                    linked_place(
                        prop_lib["lane"],
                        f"Lane_{i}",
                        (mx, my, 0.15),
                        groups["Roads"],
                        (length * 0.88, 1, 1),
                        **kw("road", f"road/{cls}/{i}/lane"),
                    ),
                )
            else:
                put(
                    "Roads",
                    linked_place(
                        prop_lib["median"],
                        f"Median_{i}",
                        (mx, my, 0.16),
                        groups["Roads"],
                        (0.7, length * 0.92, 1),
                        **kw("road", f"road/{cls}/{i}/median"),
                    ),
                )
                put(
                    "Roads",
                    linked_place(
                        prop_lib["lane"],
                        f"Lane_{i}",
                        (mx, my, 0.15),
                        groups["Roads"],
                        (1, length * 0.88, 1),
                        math.pi / 2,
                        **kw("road", f"road/{cls}/{i}/lane"),
                    ),
                )


def _ixn_road_pieces(kind, ap, carriage):
    """Approach boxes for T/corner so the junction is not one covering square."""
    arm = carriage * 0.72
    pieces = []
    if kind in {"intersection.t", "intersection.corner"}:
        if ap["n"] or ap["s"]:
            depth = (arm if ap["n"] else 0) + (arm if ap["s"] else 0) + carriage * 0.2
            oy = ((-arm if ap["n"] else 0) + (arm if ap["s"] else 0)) * 0.5
            pieces.append(("ns", carriage, max(carriage, depth), 0.0, oy))
        if ap["e"] or ap["w"]:
            width = (arm if ap["e"] else 0) + (arm if ap["w"] else 0) + carriage * 0.2
            ox = ((arm if ap["e"] else 0) + (-arm if ap["w"] else 0)) * 0.5
            pieces.append(("ew", max(carriage, width), carriage, ox, 0.0))
        return pieces
    pad = carriage * (1.18 if "arterial" in kind else 1.06)
    pieces.append(("pad", pad, pad, 0.0, 0.0))
    return pieces


def build_intersections(c, mats, groups, put, kw, prop_lib=None):
    tile = c["tile"]
    grid = c["grid"]
    carriage0 = tile * c["carriageTiles"]
    walk0 = tile * c["walkTiles"]
    for rx in c["roadXs"]:
        for ry in c["roadYs"]:
            if not is_ixn(c, rx, ry):
                continue
            kind = intersection_type(c, rx, ry)
            cls_x = classify_lane(rx, c["roadXs"])
            cls_y = classify_lane(ry, c["roadYs"])
            carriage = carriage0 * max(CLASS_MUL[cls_x], CLASS_MUL[cls_y])
            ix, iy = world_xy(rx + 0.5, ry + 0.5, grid, tile)
            iid = f"{rx}_{ry}"
            ap = approaches(c, rx, ry)
            mat = mats["road.primary"] if "arterial" in kind or kind.endswith("roundabout") else mats["road.secondary"]
            if kind == "intersection.roundabout":
                r = carriage * 0.72
                ring = cyl(
                    f"JctRing_{iid}",
                    r,
                    0.12,
                    (ix, iy, 0.07),
                    mats["road.primary"],
                    groups["Intersections"],
                    segs=16,
                    **kw("road", f"intersection/{iid}/ring"),
                )
                ring["asw_intersectionType"] = kind
                put("Intersections", ring)
                put(
                    "Intersections",
                    cyl(
                        f"JctIsland_{iid}",
                        r * 0.38,
                        0.16,
                        (ix, iy, 0.1),
                        mats["lot.park"],
                        groups["Intersections"],
                        segs=12,
                        **kw("terrain", f"intersection/{iid}/island"),
                    ),
                )
            else:
                for pi, (name, pw, pd, ox, oy) in enumerate(_ixn_road_pieces(kind, ap, carriage)):
                    surface = box(
                        f"Jct_{iid}_{name}",
                        pw,
                        pd,
                        0.13,
                        (ix + ox, iy + oy, 0.07),
                        mat,
                        groups["Intersections"],
                        **kw("road", f"intersection/{iid}/surface/{name}", origin=(rx, ry), size=(1, 1)),
                    )
                    surface["asw_intersectionType"] = kind
                    put("Intersections", surface)
            # curb returns + turning fillets (not a second covering plane)
            r = walk0 * 0.5
            corners = [(-1, -1), (1, -1), (1, 1), (-1, 1)]
            for qi, (dx, dy) in enumerate(corners):
                put(
                    "Curbs",
                    cyl(
                        f"CurbReturn_{iid}_{qi}",
                        r,
                        0.32,
                        (ix + dx * (carriage * 0.52 + r * 0.1), iy + dy * (carriage * 0.52 + r * 0.1), 0.18),
                        mats["curb"],
                        groups["Curbs"],
                        segs=8,
                        **kw("curb", f"intersection/{iid}/return/{qi}"),
                    ),
                )
                put(
                    "Intersections",
                    cyl(
                        f"Turn_{iid}_{qi}",
                        carriage * 0.22,
                        0.1,
                        (ix + dx * carriage * 0.38, iy + dy * carriage * 0.38, 0.08),
                        mat,
                        groups["Intersections"],
                        segs=10,
                        **kw("road", f"intersection/{iid}/turning/{qi}"),
                    ),
                )
            dirs = [("n", 0, -1, "y"), ("s", 0, 1, "y"), ("e", 1, 0, "x"), ("w", -1, 0, "x")]
            for name, dx, dy, axis in dirs:
                if not ap[name]:
                    continue
                rot = 0 if axis == "x" else math.pi / 2
                for b in range(5):
                    off = (b - 2) * 0.5
                    if axis == "x":
                        loc = (ix + dx * carriage * 0.62, iy + off, 0.14)
                    else:
                        loc = (ix + off, iy + dy * carriage * 0.62, 0.14)
                    if prop_lib:
                        put(
                            "Crosswalks",
                            linked_place(
                                prop_lib["zebra"],
                                f"Zebra_{iid}_{name}_{b}",
                                loc,
                                groups["Crosswalks"],
                                (1, 1, 1),
                                rot,
                                **kw("crosswalk", f"crosswalk/{iid}/{name}/{b}"),
                            ),
                        )
                    else:
                        ww, dd = (1.4, 0.28) if axis == "x" else (0.28, 1.4)
                        put(
                            "Crosswalks",
                            box(
                                f"Zebra_{iid}_{name}_{b}",
                                ww,
                                dd,
                                0.03,
                                loc,
                                mats["mark"],
                                groups["Crosswalks"],
                                **kw("crosswalk", f"crosswalk/{iid}/{name}/{b}"),
                            ),
                        )
            for qi, (dx, dy) in enumerate(corners):
                corner = box(
                    f"CornerWalk_{iid}_{qi}",
                    walk0 * 1.4,
                    walk0 * 1.4,
                    0.1,
                    (ix + dx * carriage * 0.78, iy + dy * carriage * 0.78, 0.11),
                    mats["walk"],
                    groups["Sidewalks"],
                    **kw("sidewalk", f"sidewalk/corner/{iid}/{qi}"),
                )
                stamp_sidewalk(corner, "corner_crossing")
                put("Sidewalks", corner)
            for name, dx, dy, _axis in dirs:
                if not ap[name]:
                    continue
                compass = DIR_FULL[name]
                px = ix + dx * carriage * 0.7
                py = iy + dy * carriage * 0.7
                cid = f"traffic_light/intersection/{iid}/{compass}"
                arm_rot = 0 if name in ("e", "w") else math.pi / 2
                if prop_lib:
                    pole = linked_place(
                        prop_lib["tl_pole"],
                        f"TL_{iid}_{compass}_pole",
                        (px, py, 2.1),
                        groups["Lighting"],
                        **kw("street_furniture", cid + "/pole"),
                    )
                    arm = linked_place(
                        prop_lib["tl_arm"],
                        f"TL_{iid}_{compass}_arm",
                        (px - dx * 0.55, py - dy * 0.55, 4.05),
                        groups["Lighting"],
                        (1, 1, 1),
                        arm_rot,
                        **kw("street_furniture", cid + "/arm"),
                    )
                    head = linked_place(
                        prop_lib["tl_head"],
                        f"TL_{iid}_{compass}_head",
                        (px - dx * 1.05, py - dy * 1.05, 3.7),
                        groups["Lighting"],
                        **kw("street_furniture", cid),
                    )
                else:
                    pole = cyl(
                        f"TL_{iid}_{compass}_pole",
                        0.08,
                        4.2,
                        (px, py, 2.1),
                        mats["metal"],
                        groups["Lighting"],
                        segs=8,
                        **kw("street_furniture", cid + "/pole"),
                    )
                    arm = box(
                        f"TL_{iid}_{compass}_arm",
                        1.1 if name in ("e", "w") else 0.1,
                        0.1 if name in ("e", "w") else 1.1,
                        0.1,
                        (px - dx * 0.55, py - dy * 0.55, 4.05),
                        mats["metal"],
                        groups["Lighting"],
                        **kw("street_furniture", cid + "/arm"),
                    )
                    head = box(
                        f"TL_{iid}_{compass}_head",
                        0.28,
                        0.18,
                        0.7,
                        (px - dx * 1.05, py - dy * 1.05, 3.7),
                        mats["signal"],
                        groups["Lighting"],
                        **kw("street_furniture", cid),
                    )
                pole["asw_componentId"] = cid + "/pole"
                pole["asw_trafficLightId"] = cid
                put("Lighting", pole)
                arm["asw_componentId"] = cid + "/arm"
                arm["asw_trafficLightId"] = cid
                put("Lighting", arm)
                head["asw_componentId"] = cid
                head["asw_trafficLightId"] = cid
                put("Lighting", head)
            if prop_lib:
                for qi, (dx, dy) in enumerate(corners):
                    put(
                        "Street_Furniture",
                        linked_place(
                            prop_lib["bollard"],
                            f"Bollard_{iid}_{qi}",
                            (ix + dx * carriage * 0.55, iy + dy * carriage * 0.55, 0.42),
                            groups["Street_Furniture"],
                            **kw("street_furniture", f"bollard/{iid}/{qi}"),
                        ),
                    )
                if kind == "intersection.roundabout":
                    for bi in range(8):
                        ang = bi * math.tau / 8
                        put(
                            "Street_Furniture",
                            linked_place(
                                prop_lib["barrier"],
                                f"RbtBarrier_{iid}_{bi}",
                                (ix + math.cos(ang) * carriage * 0.42, iy + math.sin(ang) * carriage * 0.42, 0.4),
                                groups["Street_Furniture"],
                                (1, 1, 1),
                                ang,
                                **kw("street_furniture", f"barrier/roundabout/{iid}/{bi}"),
                            ),
                        )
            loc = empty_ob(f"JctType_{iid}", loc=(ix, iy, 0.4), parent=groups["Intersections"])
            loc["asw_intersectionType"] = kind
            loc["asw_assetId"] = "agentspace.world"
            loc["asw_componentId"] = f"agentspace.world/intersection/{iid}"
            loc["asw_kind"] = "road"
            loc["asw_runtimeExport"] = 0
            put("Intersections", loc)
