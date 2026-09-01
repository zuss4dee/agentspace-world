"""STEP 1: Agentspace planning map. No buildings. Contract coordinates only."""
from __future__ import annotations

import bpy

from .contract import load_contract, world_xy
from .furniture import build_furniture, build_prop_library
from .geom import box, empty, ensure_collection, greedy_rects, link
from .map_style import library as clay_library
from .parcels import build_parcels
from .parks import build_parks
from .registry import dump_registry, tag
from .roads import build_intersections, build_roads, terrain_at
from .vegetation import build_veg_library, build_vegetation

WORLD_AID = "agentspace.world"
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
    "Parks",
    "Land",
    "Reference",
]


def kw(kind, name, origin=None, size=None, extra=None, runtime=True):
    d = dict(
        asset_id=WORLD_AID,
        component_id=f"{WORLD_AID}/{kind}/{name}",
        kind=kind,
        runtime=runtime,
    )
    if origin:
        d["grid_origin"] = origin
    if size:
        d["grid_size"] = size
    return d


def clear_scene():
    keep = {"Camera", "Light"}
    for ob in list(bpy.data.objects):
        if ob.name in keep:
            continue
        bpy.data.objects.remove(ob, do_unlink=True)
    for mesh in list(bpy.data.meshes):
        if mesh.users == 0:
            bpy.data.meshes.remove(mesh)
    for col in list(bpy.data.collections):
        if col.name == "Collection":
            continue
        bpy.data.collections.remove(col)


def region_spec(c):
    """First authored region = 64×64 campus. Land marketplace is a later region using the same IDs."""
    land = c["land"]
    return {
        "id": "region.campus.startup",
        "kind": "region.campus",
        "grid": c["grid"],
        "tile": c["tile"],
        "landMarketplace": {
            "id": "region.land.marketplace",
            "origin": land["origin"],
            "cell": land["cell"],
            "cols": land["cols"],
            "rows": land["rows"],
            "parcelCount": land["cols"] * land["rows"],
        },
    }


def build_world():
    clear_scene()
    c = load_contract()
    tile = c["tile"]
    grid = c["grid"]
    span = grid * tile
    mats = clay_library()
    section = ensure_collection("Agentspace_World")
    cols = {n: ensure_collection(n, section) for n in COL_NAMES}
    root = empty("Agentspace_World")
    tag(root, **kw("world", "root", runtime=False))
    link(root, section)
    groups = {n: empty(n, parent=root) for n in COL_NAMES}
    for n, g in groups.items():
        link(g, cols[n])
        tag(g, **kw("group", n, runtime=False))

    def put(col, ob):
        return link(ob, cols[col])

    spec = region_spec(c)
    root["asw_regionId"] = spec["id"]
    root["asw_landParcelCount"] = spec["landMarketplace"]["parcelCount"]

    put(
        "Terrain",
        box(
            "TerrainCampus",
            span,
            span,
            0.12,
            (0, 0, -0.06),
            mats["grass"],
            groups["Terrain"],
            **kw("terrain", "TerrainCampus", origin=(0, 0), size=(grid, grid)),
        ),
    )
    campus_loc = empty("Region_CampusStartup", loc=(0, 0, 8), parent=groups["Reference"])
    tag(campus_loc, **kw("world", "region.campus.startup", origin=(0, 0), size=(grid, grid), runtime=False))
    campus_loc["asw_regionId"] = spec["id"]
    campus_loc["asw_regionKind"] = "region.campus"
    put("Reference", campus_loc)

    water_cells = []
    sand_cells = []
    for y in range(grid):
        for x in range(grid):
            kind = terrain_at(c, x, y)
            if kind == "water":
                water_cells.append((x, y))
            elif kind == "sand":
                sand_cells.append((x, y))
    for i, (x, y, w, h) in enumerate(greedy_rects(water_cells)):
        wx, wy = world_xy(x + w / 2, y + h / 2, grid, tile)
        put(
            "Water",
            box(
                f"Water_{i}",
                w * tile * 0.98,
                h * tile * 0.98,
                0.1,
                (wx, wy, -0.04),
                mats["water"],
                groups["Water"],
                **kw("terrain", f"water/{i}", origin=(x, y), size=(w, h)),
            ),
        )
    for i, (x, y, w, h) in enumerate(greedy_rects(sand_cells)):
        wx, wy = world_xy(x + w / 2, y + h / 2, grid, tile)
        put(
            "Terrain",
            box(
                f"Shore_{i}",
                w * tile * 0.98,
                h * tile * 0.98,
                0.1,
                (wx, wy, 0.02),
                mats["sand"],
                groups["Terrain"],
                **kw("terrain", f"sand/{i}", origin=(x, y), size=(w, h)),
            ),
        )
    # Ocean shelves that continue the west inlet and south-east harbour off the campus grid.
    ocean_specs = [
        ("OceanWest", (-10, 24), (18, 52), -0.06),
        ("OceanHarbour", (70, 54), (22, 28), -0.06),
        ("OceanMarsh", (58, 70), (24, 22), -0.05),
    ]
    for name, (cx, cy), (span_x, span_y), z in ocean_specs:
        wx, wy = world_xy(cx, cy, grid, tile)
        put(
            "Water",
            box(
                name,
                span_x * tile,
                span_y * tile,
                0.12,
                (wx, wy, z),
                mats["water"],
                groups["Water"],
                **kw("terrain", f"ocean/{name}", origin=(cx - span_x / 2, cy - span_y / 2), size=(span_x, span_y)),
            ),
        )
    shore_specs = [
        ("CoastWest", (1.2, 24), (3.2, 48), 0.03),
        ("CoastHarbour", (61, 50), (6, 16), 0.03),
        ("CoastMarsh", (52, 62), (8, 10), 0.03),
    ]
    for name, (cx, cy), (span_x, span_y), z in shore_specs:
        wx, wy = world_xy(cx, cy, grid, tile)
        put(
            "Terrain",
            box(
                name,
                span_x * tile,
                span_y * tile,
                0.1,
                (wx, wy, z),
                mats["sand"],
                groups["Terrain"],
                **kw("terrain", f"shore/{name}", origin=(cx - span_x / 2, cy - span_y / 2), size=(span_x, span_y)),
            ),
        )

    veg_lib = build_veg_library(mats, groups["Vegetation"])
    prop_lib = build_prop_library(mats, groups["Street_Furniture"])
    build_roads(c, mats, groups, cols, put, kw, prop_lib)
    build_intersections(c, mats, groups, put, kw, prop_lib)
    build_parcels(c, mats, groups, cols, put, kw)
    build_parks(c, mats, groups, put, kw, veg_lib, prop_lib)
    build_vegetation(c, mats, groups, cols, put, kw, veg_lib)
    build_furniture(c, mats, groups, put, kw, prop_lib)

    land_b = c["land"]["bounds"]
    lx0, ly0 = world_xy(land_b["x0"], land_b["y0"], grid, tile)
    field = empty("SouthField", loc=(lx0, ly0, 4), parent=groups["Land"])
    tag(
        field,
        **kw("lot", "SouthField", origin=(land_b["x0"], land_b["y0"]), size=(land_b["x1"] - land_b["x0"], land_b["y1"] - land_b["y0"])),
    )
    field["asw_regionId"] = spec["landMarketplace"]["id"]
    field["asw_regionKind"] = "region.land.marketplace"
    field["asw_parcelCount"] = spec["landMarketplace"]["parcelCount"]
    field["asw_sizeClass"] = "parcel.estate"
    field["asw_previewOnly"] = 1
    put("Land", field)
    # Scalable preview of marketplace cells (not 100,000 unique meshes).
    cell = c["land"]["cell"]
    ox, oy = c["land"]["origin"]["x"], c["land"]["origin"]["y"]
    preview_cols, preview_rows = 8, 6
    pcx, pcy = ox + preview_cols * cell / 2, oy + preview_rows * cell / 2
    pwx, pwy = world_xy(pcx, pcy, grid, tile)
    land_pad = box(
        "LandPreviewBase",
        preview_cols * cell * tile,
        preview_rows * cell * tile,
        0.06,
        (pwx, pwy, 0.03),
        mats["land"],
        groups["Land"],
        **kw("terrain", "land.preview/base", origin=(ox, oy), size=(preview_cols * cell, preview_rows * cell)),
    )
    land_pad["asw_previewOnly"] = 1
    land_pad["asw_parcelCount"] = spec["landMarketplace"]["parcelCount"]
    put("Land", land_pad)
    for j in range(preview_rows):
        for i in range(preview_cols):
            gx, gy = ox + i * cell, oy + j * cell
            wx, wy = world_xy(gx + cell / 2, gy + cell / 2, grid, tile)
            preview = box(
                f"LandPreview_{i}_{j}",
                cell * tile * (0.82 if (i + j) % 3 else 0.7),
                cell * tile * (0.7 if (i + j) % 5 == 0 else 0.84),
                0.08,
                (wx, wy, 0.08),
                mats["lot.small"] if (i + j) % 4 == 0 else mats["lot.medium"],
                groups["Land"],
                **kw("lot", f"land.preview/{i}/{j}", origin=(gx, gy), size=(cell, cell)),
            )
            preview["asw_sizeClass"] = "parcel.small" if (i + j) % 4 == 0 else "parcel.medium"
            preview["asw_shape"] = "narrow" if (i + j) % 5 == 0 else "rectangle"
            preview["asw_previewOnly"] = 1
            put("Land", preview)

    for d in c["districts"]:
        o, s = d["origin"], d["size"]
        cx, cy = world_xy(o["x"] + s["x"] / 2, o["y"] + s["y"] / 2, grid, tile)
        loc = empty(f"District_{d['id']}", loc=(cx, cy, 8), parent=groups["Reference"])
        tag(loc, **kw("lot", f"district.{d['id']}", origin=(o["x"], o["y"]), size=(s["x"], s["y"]), runtime=False))
        loc.empty_display_size = max(s["x"], s["y"]) * tile * 0.15
        put("Reference", loc)

    dump_registry()
    return root, c
