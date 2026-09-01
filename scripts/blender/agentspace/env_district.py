"""High-quality environment for the startup (Echt Yard) district. No buildings."""
from __future__ import annotations

import math
import random

import bpy
from mathutils import Vector

from .contract import load_contract, world_xy
from .geom import box, cyl, empty, ensure_collection, ico, link
from .pbr_library import ensure_env_pbr
from .registry import dump_registry, tag
from .viz import setup_eevee, setup_sun, setup_world_sky

AID = "agentspace.env.startup"
# Inclusive tiles: west road 24, east road 36, north campus edge, south road 12.
X0, Y0, X1, Y1 = 24, 0, 36, 12

COL_NAMES = [
    "Terrain",
    "Lots",
    "Roads",
    "Intersections",
    "Curbs",
    "Sidewalks",
    "Crosswalks",
    "Driveways",
    "Street_Furniture",
    "Lighting",
    "Vegetation",
    "Water",
    "Environment_Props",
    "Reference",
]


def h2(a, b):
    return (math.sin(a * 12.9898 + b * 78.233) * 43758.5453) % 1.0


def kw(kind, cid, origin=None, size=None, runtime=True):
    d = dict(asset_id=AID, component_id=f"{AID}/{cid}", kind=kind, runtime=runtime)
    if origin:
        d["grid_origin"] = origin
    if size:
        d["grid_size"] = size
    return d


def in_bounds(x, y):
    return X0 <= x <= X1 and Y0 <= y <= Y1


def world_aabb(tile=32):
    x0, y0 = world_xy(X0, Y0, 64, tile)
    x1, y1 = world_xy(X1 + 1, Y1 + 1, 64, tile)
    return min(x0, x1), min(y0, y1), max(x0, x1), max(y0, y1)


def hide_buildings():
    for ob in bpy.data.objects:
        aid = ob.get("asw_assetId", "")
        if str(aid).startswith("pack.northshore.building"):
            ob.hide_set(True)
            ob.hide_render = True
            ob.hide_viewport = True
    for col in bpy.data.collections:
        if col.name.startswith("Echt"):
            col.hide_viewport = True
            col.hide_render = True


def purge_env_and_primitives(replace_lot_ids: set[str] | None = None):
    """Remove previous env export meshes and primitive world pieces inside the district."""
    xmin, ymin, xmax, ymax = world_aabb()
    pad = 4.0
    replace_lot_ids = replace_lot_ids or set()
    for ob in list(bpy.data.objects):
        aid = ob.get("asw_assetId", "")
        if aid == AID:
            bpy.data.objects.remove(ob, do_unlink=True)
            continue
        if aid != "agentspace.world":
            continue
        if ob.name in {"Agentspace_World", "TerrainCampus", "SouthField"}:
            continue
        if ob.name.startswith("District_"):
            continue
        loc = ob.matrix_world.translation
        if xmin - pad <= loc.x <= xmax + pad and ymin - pad <= loc.y <= ymax + pad:
            kind = ob.get("asw_kind", "")
            if kind == "lot":
                lid = ob.get("asw_lotId")
                if lid and lid not in replace_lot_ids:
                    continue
            if kind in {"road", "curb", "pavement", "lot", "vegetation", "furniture", "terrain"}:
                bpy.data.objects.remove(ob, do_unlink=True)


def ensure_hierarchy():
    world = bpy.data.collections.get("Agentspace_World") or ensure_collection("Agentspace_World")
    cols = {}
    for n in COL_NAMES:
        cols[n] = bpy.data.collections.get(n) or ensure_collection(n, world)
    root = bpy.data.objects.get("Agentspace_World")
    if root is None:
        root = empty("Agentspace_World")
        tag(root, asset_id="agentspace.world", component_id="agentspace.world/root", kind="world", runtime=False)
        link(root, world)
    env = bpy.data.objects.get("Env_Startup")
    if env:
        bpy.data.objects.remove(env, do_unlink=True)
    env = empty("Env_Startup", parent=root)
    tag(env, **kw("group", "root", origin=(X0, Y0), size=(X1 - X0 + 1, Y1 - Y0 + 1), runtime=True))
    link(env, world)
    groups = {}
    for n in COL_NAMES:
        g = empty(f"Env_{n}", parent=env)
        tag(g, **kw("group", n.lower(), runtime=False))
        link(g, cols[n])
        groups[n] = g
    return env, cols, groups


def terrain_at(c, x, y):
    rows = [r.split(",") for r in c["terrainRows"]]
    if y < 0 or y >= c["grid"] or x < 0 or x >= c["grid"]:
        return None
    return rows[y][x]


def is_ixn(c, x, y):
    return x in c["roadXs"] and y in c["roadYs"] and terrain_at(c, x, y) == "road"


def lot_covers(lots, x, y):
    for p in lots:
        g = p["grid"]
        if g["x"] <= x < g["x"] + g["w"] and g["y"] <= y < g["y"] + g["h"]:
            return p
    return None


def put(cols, name, ob):
    link(ob, cols[name])
    return ob


def linked_dup(src, name, loc, parent, cols, colname, **tag_kw):
    ob = src.copy()
    ob.data = src.data
    ob.name = name
    ob.location = loc
    ob.parent = parent
    bpy.context.scene.collection.objects.link(ob)
    tag(ob, **tag_kw)
    link(ob, cols[colname])
    return ob


def build_prototypes(mats, parent):
    trunk = cyl("EnvLib_Trunk", 0.28, 3.6, (0, 0, -80), mats["asw.mat.wood"], parent, segs=8, **kw("vegetation", "lib/trunk", runtime=False))
    canopy = ico("EnvLib_Canopy", 1.85, (0, 0, -80), mats["asw.mat.grass.base"], parent, subdiv=1, **kw("vegetation", "lib/canopy", runtime=False))
    shrub = ico("EnvLib_Shrub", 0.7, (0, 0, -80), mats["asw.mat.grass.base"], parent, subdiv=1, **kw("vegetation", "lib/shrub", runtime=False))
    slab = box("EnvLib_Slab", 2.05, 6.2, 0.09, (0, 0, -80), mats["asw.mat.concrete.sidewalk"], parent, bevel=0.02, **kw("sidewalk", "lib/slab", runtime=False))
    grass = ico("EnvLib_Grass", 0.22, (0, 0, -80), mats["asw.mat.grass.base"], parent, subdiv=0, **kw("vegetation", "lib/grass", runtime=False))
    trunk.hide_render = True
    canopy.hide_render = True
    shrub.hide_render = True
    slab.hide_render = True
    grass.hide_render = True
    trunk.hide_viewport = True
    canopy.hide_viewport = True
    shrub.hide_viewport = True
    slab.hide_viewport = True
    grass.hide_viewport = True
    return {"trunk": trunk, "canopy": canopy, "shrub": shrub, "slab": slab, "grass": grass}


def build_cameras(ox, oy):
    views = {
        "Cam_AerialDistrict": ((ox + 40, oy - 90, 220), (math.radians(55), 0, math.radians(18))),
        "Cam_StreetRoad": ((ox - 18, oy - 72, 14), (math.radians(78), 0, math.radians(12))),
        "Cam_Intersection": ((ox - 8, oy + 8, 12), (math.radians(72), 0, math.radians(-28))),
        "Cam_SidewalkLot": ((ox + 22, oy - 48, 11), (math.radians(75), 0, math.radians(32))),
        "Cam_EchtSurroundings": ((-128 + 36, -912 - 70, 13), (math.radians(74), 0, math.radians(8))),
    }
    for name, (loc, rot) in views.items():
        cam = bpy.data.objects.get(name)
        if cam is None:
            data = bpy.data.cameras.new(name)
            data.lens = 35
            cam = bpy.data.objects.new(name, data)
            bpy.context.scene.collection.objects.link(cam)
        cam.location = loc
        cam.rotation_euler = rot
        tag(cam, **kw("group", f"camera/{name}", runtime=False))
    scene_cam = bpy.data.objects.get("Cam_StreetRoad")
    if scene_cam:
        bpy.context.scene.camera = scene_cam


def build_env():
    c = load_contract()
    tile = c["tile"]
    grid = c["grid"]
    lots_here = [
        p
        for p in c["lots"]
        if in_bounds(p["grid"]["x"], p["grid"]["y"])
        or in_bounds(p["grid"]["x"] + p["grid"]["w"] - 1, p["grid"]["y"] + p["grid"]["h"] - 1)
    ]
    hide_buildings()
    purge_env_and_primitives({p["id"] for p in lots_here})
    mats = ensure_env_pbr()
    env, cols, groups = ensure_hierarchy()
    proto = build_prototypes(mats, groups["Environment_Props"])
    carriage = tile * c["carriageTiles"]
    walk_w = tile * c["walkTiles"]
    curb_w = max(0.55, tile * c["curbTiles"] * 1.8)
    curb_off = c["carriageTiles"] / 2
    walk_off = curb_off + c["walkTiles"] / 2

    # Terrain tiles (skip roads; lots get their own pads)
    for y in range(Y0, Y1 + 1):
        for x in range(X0, X1 + 1):
            kind = terrain_at(c, x, y)
            if kind == "road":
                continue
            if lot_covers(lots_here, x, y):
                continue
            wx, wy = world_xy(x + 0.5, y + 0.5, grid, tile)
            z = 0.04 + h2(x, y) * 0.08
            mat = mats["asw.mat.grass.worn"] if kind in ("lot", "dirt", "plaza") else mats["asw.mat.grass.base"]
            if kind == "water":
                mat = mats["asw.mat.water"]
                z = -0.08
            put(
                cols,
                "Water" if kind == "water" else "Terrain",
                box(
                    f"EnvTile_{x}_{y}",
                    tile * 0.995,
                    tile * 0.995,
                    0.16 if kind != "water" else 0.1,
                    (wx, wy, z),
                    mat,
                    groups["Water" if kind == "water" else "Terrain"],
                    **kw("terrain" if kind != "water" else "terrain", f"terrain/{x}/{y}", origin=(x, y), size=(1, 1)),
                ),
            )

    # Lots — exact contract positions
    for p in lots_here:
        g, wld = p["grid"], p["world"]
        soil = mats["asw.mat.soil"] if p["kind"] == "sale" else mats["asw.mat.grass.worn"]
        ob = box(
            f"EnvLot_{p['id']}",
            wld["w"] * 0.97,
            wld["d"] * 0.97,
            0.14,
            (wld["x"], wld["y"], 0.12),
            soil,
            groups["Lots"],
            **kw("lot", f"lot/{p['id']}", origin=(g["x"], g["y"]), size=(g["w"], g["h"])),
        )
        ob["asw_lotId"] = p["id"]
        ob["asw_plotKind"] = p["kind"]
        put(cols, "Lots", ob)
        hw, hd = wld["w"] / 2, wld["d"] / 2
        for name, ww, dd, lx, ly in (
            ("N", wld["w"], 0.12, 0, hd),
            ("S", wld["w"], 0.12, 0, -hd),
            ("E", 0.12, wld["d"], hw, 0),
            ("W", 0.12, wld["d"], -hw, 0),
        ):
            put(
                cols,
                "Lots",
                box(
                    f"EnvLot_{p['id']}_edge{name}",
                    ww,
                    dd,
                    0.2,
                    (wld["x"] + lx, wld["y"] + ly, 0.18),
                    mats["asw.mat.concrete.curb"],
                    groups["Lots"],
                    bevel=0.03,
                    **kw("lot", f"lot/{p['id']}/edge/{name}", origin=(g["x"], g["y"]), size=(g["w"], g["h"])),
                ),
            )
        rng = random.Random(hash(p["id"]) & 0xFFFFFFFF)
        for i in range(6):
            lx = wld["x"] + (rng.random() - 0.5) * wld["w"] * 0.55
            ly = wld["y"] + (rng.random() - 0.5) * wld["d"] * 0.55
            linked_dup(
                proto["grass"],
                f"EnvLotGrass_{p['id']}_{i}",
                (lx, ly, 0.22),
                groups["Vegetation"],
                cols,
                "Vegetation",
                **kw("vegetation", f"lot/{p['id']}/grass/{i}"),
            )

    # Road segments (non-intersection cells merged)
    cells = {(x, y) for y in range(Y0, Y1 + 1) for x in range(X0, X1 + 1) if terrain_at(c, x, y) == "road" and not is_ixn(c, x, y)}
    segs = []
    for rx in c["roadXs"]:
        run = None

        def flush(end, lane=rx):
            nonlocal run
            if run is None:
                return
            length = end - run + 1
            segs.append({"cx": lane + 0.5, "cy": run + length / 2, "alongX": False, "len": length, "lane": lane})
            run = None

        for y in range(Y0, Y1 + 1):
            if (rx, y) in cells:
                if run is None:
                    run = y
            else:
                flush(y - 1)
        flush(Y1)
    for ry in c["roadYs"]:
        run = None

        def flushx(end, lane=ry):
            nonlocal run
            if run is None:
                return
            length = end - run + 1
            segs.append({"cx": run + length / 2, "cy": lane + 0.5, "alongX": True, "len": length, "lane": lane})
            run = None

        for x in range(X0, X1 + 1):
            if (x, ry) in cells:
                if run is None:
                    run = x
            else:
                flushx(x - 1)
        flushx(X1)

    for i, s in enumerate(segs):
        cx, cy = world_xy(s["cx"], s["cy"], grid, tile)
        along = s["alongX"]
        length = s["len"] * tile
        w, d = (length, carriage) if along else (carriage, length)
        put(
            cols,
            "Roads",
            box(
                f"EnvRoad_{i}",
                w,
                d,
                0.12,
                (cx, cy, 0.07),
                mats["asw.mat.road.asphalt"],
                groups["Roads"],
                **kw("road", f"road/{i}/surface"),
            ),
        )
        # worn edge / gutter
        for sign, off in ((-1, -curb_off + 0.04), (1, curb_off - 0.04)):
            gx = s["cx"] if along else s["cx"] + off
            gy = s["cy"] + off if along else s["cy"]
            wx, wy = world_xy(gx, gy, grid, tile)
            gw, gd = (length, 0.55) if along else (0.55, length)
            put(
                cols,
                "Roads",
                box(
                    f"EnvGutter_{i}_{sign}",
                    gw,
                    gd,
                    0.06,
                    (wx, wy, 0.055),
                    mats["asw.mat.road.asphalt.worn"],
                    groups["Roads"],
                    **kw("road", f"road/{i}/gutter/{sign}"),
                ),
            )
        # dashed center line
        dash_n = max(1, int(s["len"] * 2))
        for k in range(dash_n):
            t = (k + 0.5) / dash_n
            if along:
                mx, my = world_xy(s["cx"] - s["len"] / 2 + t * s["len"], s["cy"], grid, tile)
                mw, md = 1.4, 0.14
            else:
                mx, my = world_xy(s["cx"], s["cy"] - s["len"] / 2 + t * s["len"], grid, tile)
                mw, md = 0.14, 1.4
            put(
                cols,
                "Roads",
                box(
                    f"EnvMark_{i}_{k}",
                    mw,
                    md,
                    0.03,
                    (mx, my, 0.135),
                    mats["asw.mat.road.marking"],
                    groups["Roads"],
                    **kw("road", f"road/{i}/mark/{k}"),
                ),
            )
        for sign, off in ((-1, -curb_off), (1, curb_off)):
            gx = s["cx"] if along else s["cx"] + off
            gy = s["cy"] + off if along else s["cy"]
            wx, wy = world_xy(gx, gy, grid, tile)
            cw, cd = (length, curb_w) if along else (curb_w, length)
            put(
                cols,
                "Curbs",
                box(
                    f"EnvCurb_{i}_{sign}",
                    cw,
                    cd,
                    0.34,
                    (wx, wy, 0.2),
                    mats["asw.mat.concrete.curb"],
                    groups["Curbs"],
                    bevel=0.06,
                    **kw("curb", f"curb/{i}/{sign}"),
                ),
            )
        for sign, off in ((-1, -walk_off), (1, walk_off)):
            gx = s["cx"] if along else s["cx"] + off
            gy = s["cy"] + off if along else s["cy"]
            wx, wy = world_xy(gx, gy, grid, tile)
            ww, wd = (length, walk_w) if along else (walk_w, length)
            put(
                cols,
                "Sidewalks",
                box(
                    f"EnvWalk_{i}_{sign}",
                    ww,
                    wd,
                    0.1,
                    (wx, wy, 0.11),
                    mats["asw.mat.concrete.sidewalk"],
                    groups["Sidewalks"],
                    bevel=0.03,
                    **kw("sidewalk", f"sidewalk/{i}/{sign}"),
                ),
            )

    # Intersections
    for rx in c["roadXs"]:
        for ry in c["roadYs"]:
            if not in_bounds(rx, ry) or not is_ixn(c, rx, ry):
                continue
            ix, iy = world_xy(rx + 0.5, ry + 0.5, grid, tile)
            pad = carriage * 1.08
            put(
                cols,
                "Intersections",
                box(
                    f"EnvJct_{rx}_{ry}",
                    pad,
                    pad,
                    0.12,
                    (ix, iy, 0.07),
                    mats["asw.mat.road.asphalt.worn"],
                    groups["Intersections"],
                    **kw("road", f"intersection/{rx}/{ry}/surface", origin=(rx, ry), size=(1, 1)),
                ),
            )
            # curb returns
            r = walk_w * 0.55
            for qi, (dx, dy) in enumerate(((-1, -1), (1, -1), (1, 1), (-1, 1))):
                put(
                    cols,
                    "Curbs",
                    cyl(
                        f"EnvCurbReturn_{rx}_{ry}_{qi}",
                        r,
                        0.34,
                        (ix + dx * (carriage * 0.52 + r * 0.15), iy + dy * (carriage * 0.52 + r * 0.15), 0.2),
                        mats["asw.mat.concrete.curb"],
                        groups["Curbs"],
                        segs=10,
                        **kw("curb", f"intersection/{rx}/{ry}/return/{qi}"),
                    ),
                )
            # zebra crossings — four approaches
            for axis, nsign in (("x", -1), ("x", 1), ("y", -1), ("y", 1)):
                for b in range(6):
                    off = (b - 2.5) * 0.55
                    if axis == "x":
                        loc = (ix + nsign * carriage * 0.62, iy + off, 0.14)
                        ww, dd = 1.5, 0.32
                    else:
                        loc = (ix + off, iy + nsign * carriage * 0.62, 0.14)
                        ww, dd = 0.32, 1.5
                    put(
                        cols,
                        "Crosswalks",
                        box(
                            f"EnvZebra_{rx}_{ry}_{axis}_{nsign}_{b}",
                            ww,
                            dd,
                            0.03,
                            loc,
                            mats["asw.mat.road.marking"],
                            groups["Crosswalks"],
                            **kw("crosswalk", f"crosswalk/{rx}/{ry}/{axis}/{nsign}/{b}"),
                        ),
                    )

    # Driveways for lots facing a road
    for p in lots_here:
        g = p["grid"]
        south = g["y"] + g["h"]
        if terrain_at(c, g["x"] + g["w"] // 2, south) == "road" or (south <= Y1 and south in c["roadYs"]):
            cx = g["x"] + g["w"] / 2
            wx, wy = world_xy(cx, south + 0.15, grid, tile)
            put(
                cols,
                "Driveways",
                box(
                    f"EnvDrive_{p['id']}",
                    min(8.0, g["w"] * tile * 0.35),
                    3.2,
                    0.1,
                    (wx, wy, 0.08),
                    mats["asw.mat.road.asphalt.worn"],
                    groups["Driveways"],
                    **kw("road", f"driveway/{p['id']}"),
                ),
            )

    # Scenery in bounds
    for s in c["scenery"]:
        gx, gy = s["x"], s["y"]
        if not in_bounds(math.floor(gx), math.floor(gy)):
            continue
        wx, wy = s["world"]["x"], s["world"]["y"]
        kind = s["kind"]
        if kind == "lamp":
            put(cols, "Lighting", cyl(s["id"] + "_post", 0.09, 5.8, (wx, wy, 2.9), mats["asw.mat.metal.streetlight"], groups["Lighting"], segs=8, **kw("street_furniture", f"lamp/{s['id']}/post")))
            put(cols, "Lighting", box(s["id"] + "_arm", 0.9, 0.12, 0.1, (wx + 0.35, wy, 5.7), mats["asw.mat.metal.streetlight"], groups["Lighting"], **kw("street_furniture", f"lamp/{s['id']}/arm")))
            put(cols, "Lighting", cyl(s["id"] + "_head", 0.2, 0.16, (wx + 0.7, wy, 5.55), mats["asw.mat.glass"], groups["Lighting"], segs=8, **kw("street_furniture", f"lamp/{s['id']}/head")))
        elif kind == "bench":
            put(cols, "Street_Furniture", box(s["id"] + "_seat", 1.9, 0.48, 0.1, (wx, wy, 0.48), mats["asw.mat.wood"], groups["Street_Furniture"], bevel=0.03, **kw("street_furniture", f"bench/{s['id']}/seat")))
            put(cols, "Street_Furniture", box(s["id"] + "_legL", 0.1, 0.42, 0.42, (wx - 0.7, wy, 0.22), mats["asw.mat.metal.streetlight"], groups["Street_Furniture"], **kw("street_furniture", f"bench/{s['id']}/leg-l")))
            put(cols, "Street_Furniture", box(s["id"] + "_legR", 0.1, 0.42, 0.42, (wx + 0.7, wy, 0.22), mats["asw.mat.metal.streetlight"], groups["Street_Furniture"], **kw("street_furniture", f"bench/{s['id']}/leg-r")))
        elif kind in ("planter", "sign"):
            put(cols, "Street_Furniture", cyl(s["id"], 0.45 if kind == "planter" else 0.08, 0.7 if kind == "planter" else 2.4, (wx, wy, 0.35 if kind == "planter" else 1.2), mats["asw.mat.concrete.curb"] if kind == "planter" else mats["asw.mat.metal.streetlight"], groups["Street_Furniture"], segs=10, **kw("street_furniture", f"{kind}/{s['id']}")))
        elif kind == "tree":
            sc = 0.75 + h2(gx, gy) * 0.55
            rot = h2(gy, gx) * math.tau
            t = linked_dup(proto["trunk"], s["id"] + "_trunk", (wx, wy, 1.8 * sc), groups["Vegetation"], cols, "Vegetation", **kw("vegetation", f"tree/{s['id']}/trunk"))
            t.scale = (sc, sc, sc)
            t.rotation_euler.z = rot
            cap = linked_dup(proto["canopy"], s["id"] + "_canopy", (wx, wy, 3.4 * sc), groups["Vegetation"], cols, "Vegetation", **kw("vegetation", f"tree/{s['id']}/canopy"))
            cap.scale = (sc * (0.85 + h2(gx, 2) * 0.3), sc, sc * (0.85 + h2(2, gy) * 0.3))
            cap.rotation_euler.z = rot * 0.5
        elif kind in ("bush", "hedge"):
            sc = 0.7 + h2(gx * 2, gy) * 0.5
            b = linked_dup(proto["shrub"], s["id"], (wx, wy, 0.55 * sc), groups["Vegetation"], cols, "Vegetation", **kw("vegetation", f"shrub/{s['id']}"))
            b.scale = (sc, sc, sc * 0.8)
            b.rotation_euler.z = h2(gx, gy) * math.tau

    # Roadside grass tufts
    n = 0
    for y in range(Y0, Y1 + 1):
        for x in range(X0, X1 + 1):
            if terrain_at(c, x, y) != "grass" and terrain_at(c, x, y) != "park":
                continue
            if lot_covers(lots_here, x, y):
                continue
            if h2(x, y) < 0.55:
                continue
            wx, wy = world_xy(x + 0.3 + h2(x, 1) * 0.4, y + 0.3 + h2(2, y) * 0.4, grid, tile)
            g = linked_dup(proto["grass"], f"EnvTuft_{x}_{y}", (wx, wy, 0.18), groups["Vegetation"], cols, "Vegetation", **kw("vegetation", f"grass/{x}/{y}"))
            sc = 0.8 + h2(x, y) * 0.7
            g.scale = (sc, sc, sc)
            n += 1
            if n > 80:
                break
        if n > 80:
            break

    # Bollards near intersections
    for rx in c["roadXs"]:
        for ry in c["roadYs"]:
            if not in_bounds(rx, ry) or not is_ixn(c, rx, ry):
                continue
            ix, iy = world_xy(rx + 0.5, ry + 0.5, grid, tile)
            for i, (dx, dy) in enumerate(((1.1, 1.1), (-1.1, 1.1), (1.1, -1.1), (-1.1, -1.1))):
                put(
                    cols,
                    "Street_Furniture",
                    cyl(
                        f"EnvBollard_{rx}_{ry}_{i}",
                        0.09,
                        0.7,
                        (ix + dx * carriage * 0.7, iy + dy * carriage * 0.7, 0.4),
                        mats["asw.mat.metal.streetlight"],
                        groups["Street_Furniture"],
                        segs=8,
                        **kw("street_furniture", f"bollard/{rx}/{ry}/{i}"),
                    ),
                )

    ox, oy = world_xy(X0 + (X1 - X0) / 2, Y0 + (Y1 - Y0) / 2, grid, tile)
    setup_world_sky()
    setup_sun(ox, oy)
    setup_eevee()
    build_cameras(ox, oy)
    dump_registry()
    return env, c
