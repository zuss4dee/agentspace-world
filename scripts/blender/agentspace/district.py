"""Echt Yard surroundings reconstructed from the 64×64 world contract. Authoring only."""
from __future__ import annotations

import bpy

from .contract import building_height, lot_world_origin, world_xy
from .geom import box, cyl, ico, link

WORLD_AID = "agentspace.world.district.startup"


def kw(kind: str, name: str, runtime=False, origin=None, size=None):
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


def build_surroundings(groups, cols, mats, contract):
    tile = contract["tile"]
    b = contract["building"]
    ox, oy, _ = lot_world_origin(b, contract["grid"], tile)
    lot_w = b["size"]["x"] * tile
    lot_d = b["size"]["y"] * tile
    asphalt = mats["asw.mat.asphalt.carriage"]
    curb_m = mats["asw.mat.stone.curb"]
    walk = mats["asw.mat.paving.sidewalk"]
    pave = mats["asw.mat.paving.lot"]
    conc = mats["asw.mat.concrete.structural"]
    metal = mats["asw.mat.metal.panel"]
    dark = mats["asw.mat.metal.mullion"]
    leaf = mats["asw.mat.vegetation.hedge"]
    canopy = mats["asw.mat.vegetation.canopy"]
    bark = mats["asw.mat.vegetation.bark"]
    soil = mats["asw.mat.vegetation.soil"]
    wood = mats["asw.mat.wood.furniture"]
    accent = mats["asw.mat.accent.brand"]
    glow = mats["asw.mat.light.warm"]
    grass = mats["asw.mat.vegetation.canopy"]
    ctx = mats["asw.mat.massing.context"]
    line = mats["asw.mat.paint.line"]
    gutter_m = mats["asw.mat.asphalt.gutter"]

    def put(col_key, ob):
        link(ob, cols[col_key])
        return ob

    gnd = groups["Echt_Ground"]
    put(
        "Echt_Ground",
        box(
            "LotPad",
            lot_w * 0.995,
            lot_d * 0.995,
            0.22,
            (0, 0, 0.11),
            pave,
            gnd,
            bevel=0.04,
            uv=0.04,
            **kw("pavement", "LotPad", origin=(b["origin"]["x"], b["origin"]["y"]), size=(b["size"]["x"], b["size"]["y"])),
        ),
    )
    for i in range(1, 4):
        put(
            "Echt_Ground",
            box(
                f"LotJointX{i}",
                0.06,
                lot_d * 0.98,
                0.04,
                (-lot_w / 2 + i * tile, 0, 0.23),
                gutter_m,
                gnd,
                **kw("pavement", f"LotJointX{i}"),
            ),
        )
    for i in range(1, 3):
        put(
            "Echt_Ground",
            box(
                f"LotJointY{i}",
                lot_w * 0.98,
                0.06,
                0.04,
                (0, -lot_d / 2 + i * tile, 0.23),
                gutter_m,
                gnd,
                **kw("pavement", f"LotJointY{i}"),
            ),
        )

    carriage = tile * contract["carriageTiles"]
    walk_w = tile * contract["walkTiles"]
    curb_w = max(0.45, tile * contract["curbTiles"])

    # Vertical road x=24, window y=0..12
    rx, _ = world_xy(24.5, 0)
    _, y0 = world_xy(0, 0)
    _, y1 = world_xy(0, 12)
    put(
        "Echt_Road",
        box(
            "RoadWest",
            carriage,
            abs(y1 - y0),
            0.16,
            (rx, (y0 + y1) / 2, 0.08),
            asphalt,
            groups["Echt_Road"],
            bevel=0.02,
            uv=0.035,
            **kw("road", "RoadWest", origin=(24, 0), size=(1, 12)),
        ),
    )
    put(
        "Echt_Road",
        box(
            "RoadWestGutter",
            0.55,
            abs(y1 - y0),
            0.08,
            (rx + carriage / 2 + 0.22, (y0 + y1) / 2, 0.05),
            gutter_m,
            groups["Echt_Road"],
            **kw("road", "RoadWestGutter"),
        ),
    )
    put(
        "Echt_Road",
        box(
            "RoadWestEdge",
            0.12,
            abs(y1 - y0) * 0.92,
            0.03,
            (rx + carriage / 2 - 0.35, (y0 + y1) / 2, 0.17),
            line,
            groups["Echt_Road"],
            **kw("road", "RoadWestEdge"),
        ),
    )
    # Horizontal road y=6, window x=20..36
    _, ry = world_xy(0, 6.5)
    x0, _ = world_xy(20, 0)
    x1, _ = world_xy(36, 0)
    put(
        "Echt_Road",
        box(
            "RoadSouth",
            abs(x1 - x0),
            carriage,
            0.16,
            ((x0 + x1) / 2, ry, 0.08),
            asphalt,
            groups["Echt_Road"],
            bevel=0.02,
            uv=0.035,
            **kw("road", "RoadSouth", origin=(20, 6), size=(16, 1)),
        ),
    )
    put(
        "Echt_Road",
        box(
            "RoadSouthGutter",
            abs(x1 - x0),
            0.55,
            0.08,
            ((x0 + x1) / 2, ry + carriage / 2 + 0.22, 0.05),
            gutter_m,
            groups["Echt_Road"],
            **kw("road", "RoadSouthGutter"),
        ),
    )
    put(
        "Echt_Road",
        box(
            "RoadSouthEdge",
            abs(x1 - x0) * 0.92,
            0.12,
            0.03,
            ((x0 + x1) / 2, ry + carriage / 2 - 0.35, 0.17),
            line,
            groups["Echt_Road"],
            **kw("road", "RoadSouthEdge"),
        ),
    )
    ix, iy = world_xy(24.5, 6.5)
    for i in range(6):
        put(
            "Echt_Road",
            box(
                f"Crosswalk{i}",
                1.35,
                carriage * 0.85,
                0.04,
                (ix + (i - 2.5) * 2.1, iy, 0.18),
                walk,
                groups["Echt_Road"],
                bevel=0.01,
                **kw("road", f"Crosswalk{i}"),
            ),
        )

    # Curbs / walks around the loft lot, local to ground empty
    put("Echt_Curb", box("CurbWest", 0.22, lot_d + 6, 0.42, (-lot_w / 2 - 1.35, 0, 0.28), curb_m, gnd, bevel=0.03, **kw("curb", "CurbWest")))
    put("Echt_Curb", box("CurbWestCap", 0.32, lot_d + 6, 0.08, (-lot_w / 2 - 1.3, 0, 0.5), curb_m, gnd, bevel=0.02, **kw("curb", "CurbWestCap")))
    put("Echt_Curb", box("CurbEast", 0.22, lot_d, 0.4, (lot_w / 2 + 1.05, 0, 0.28), curb_m, gnd, bevel=0.03, **kw("curb", "CurbEast")))
    put("Echt_Curb", box("CurbSouth", lot_w + 3, 0.22, 0.42, (0, -lot_d / 2 - 1.2, 0.28), curb_m, gnd, bevel=0.03, **kw("curb", "CurbSouth")))
    put("Echt_Curb", box("CurbSouthCap", lot_w + 3, 0.32, 0.08, (0, -lot_d / 2 - 1.15, 0.5), curb_m, gnd, bevel=0.02, **kw("curb", "CurbSouthCap")))
    put("Echt_Curb", box("CurbNorth", lot_w, 0.22, 0.38, (0, lot_d / 2 + 1.05, 0.26), curb_m, gnd, bevel=0.03, **kw("curb", "CurbNorth")))

    put("Echt_Sidewalk", box("WalkWest", walk_w, lot_d + 2, 0.14, (-lot_w / 2 - 4.2, 0, 0.15), walk, gnd, bevel=0.03, uv=0.05, **kw("pavement", "WalkWest")))
    put("Echt_Sidewalk", box("WalkSouth", lot_w + 1, walk_w, 0.14, (0, -lot_d / 2 - 4.0, 0.15), walk, gnd, bevel=0.03, uv=0.05, **kw("pavement", "WalkSouth")))
    put("Echt_Sidewalk", box("WalkNorth", lot_w, walk_w * 0.8, 0.12, (0, lot_d / 2 + 3.6, 0.14), walk, gnd, bevel=0.03, uv=0.05, **kw("pavement", "WalkNorth")))
    put("Echt_Ground", box("Drive", 10.5, 14, 0.12, (-18, -lot_d / 2 - 2, 0.14), walk, gnd, bevel=0.04, uv=0.08, **kw("pavement", "Drive")))

    put("Echt_Landscape", box("SetbackEast", 6.2, lot_d - 10, 0.1, (lot_w / 2 - 6, 4, 0.12), grass, groups["Echt_Landscape"], bevel=0.04, **kw("landscape", "SetbackEast")))
    put("Echt_Landscape", box("SetbackNorth", lot_w - 16, 5, 0.1, (-4, lot_d / 2 - 8, 0.12), grass, groups["Echt_Landscape"], bevel=0.04, **kw("landscape", "SetbackNorth")))
    put("Echt_Landscape", box("PlanterW", 6.2, lot_d * 0.42, 0.85, (-lot_w / 2 + 10, 6, 0.52), conc, groups["Echt_Landscape"], bevel=0.1, **kw("landscape", "PlanterW")))
    put("Echt_Vegetation", box("SoilW", 5.4, lot_d * 0.38, 0.22, (-lot_w / 2 + 10, 6, 0.98), soil, groups["Echt_Vegetation"], **kw("vegetation", "SoilW")))
    put("Echt_Vegetation", box("HedgeW", 4.6, lot_d * 0.34, 2.4, (-lot_w / 2 + 10, 6, 2.2), leaf, groups["Echt_Vegetation"], bevel=0.3, **kw("vegetation", "HedgeW")))
    put("Echt_Landscape", box("PlanterE", 5.0, 16, 0.8, (lot_w / 2 - 10, 14, 0.5), conc, groups["Echt_Landscape"], bevel=0.1, **kw("landscape", "PlanterE")))
    put("Echt_Vegetation", box("HedgeE", 3.4, 12, 1.8, (lot_w / 2 - 10, 14, 1.9), leaf, groups["Echt_Vegetation"], bevel=0.28, **kw("vegetation", "HedgeE")))

    def tree(tag, x, y, s, parent):
        put("Echt_Vegetation", cyl(f"{tag}Tr", 0.28 * s, 4.4 * s, (x, y, 2.3 * s), bark, parent, segs=14, **kw("vegetation", f"{tag}Tr")))
        put("Echt_Vegetation", cyl(f"{tag}Tr2", 0.16 * s, 2.2 * s, (x + 0.35 * s, y - 0.15 * s, 4.6 * s), bark, parent, segs=10, **kw("vegetation", f"{tag}Tr2")))
        for nm, r, ox, oy, oz, sd in (
            (f"{tag}A", 3.4 * s, 0, 0, 6.6 * s, 2),
            (f"{tag}B", 2.5 * s, 1.4 * s, -0.8 * s, 7.4 * s, 2),
            (f"{tag}C", 2.2 * s, -1.2 * s, 0.9 * s, 7.6 * s, 2),
            (f"{tag}D", 1.7 * s, 0.4 * s, 1.2 * s, 8.4 * s, 1),
        ):
            ob = ico(nm, r, (x + ox, y + oy, oz), canopy, parent, subdiv=sd, **kw("vegetation", nm))
            ob.scale = (1.0, 1.0, 0.7)
            put("Echt_Vegetation", ob)

    veg = groups["Echt_Vegetation"]
    tree("LotT1", -lot_w / 2 + 18, -lot_d / 2 + 16, 1.0, veg)
    tree("LotT2", lot_w / 2 - 20, -lot_d / 2 + 14, 0.85, veg)
    tree("StT0", -lot_w / 2 + 8, lot_d / 2 + 10, 0.7, veg)
    tree("StT1", lot_w / 2 - 10, lot_d / 2 + 10, 0.7, veg)

    furn = groups["Echt_StreetFurniture"]
    bx, by = -24, -lot_d / 2 - 9
    put("Echt_StreetFurniture", box("EntryBenchL", 0.12, 1.15, 1.15, (bx - 2.7, by, 0.7), dark, furn, **kw("furniture", "EntryBenchL")))
    put("Echt_StreetFurniture", box("EntryBenchR", 0.12, 1.15, 1.15, (bx + 2.7, by, 0.7), dark, furn, **kw("furniture", "EntryBenchR")))
    for i in range(5):
        put("Echt_StreetFurniture", box(f"EntrySlat{i}", 5.2, 0.16, 0.08, (bx, by - 0.35 + i * 0.22, 1.38), wood, furn, bevel=0.02, **kw("furniture", f"EntrySlat{i}")))
    sx, sy = 22, -lot_d / 2 - 7
    put("Echt_StreetFurniture", box("StreetBenchL", 0.12, 1.05, 1.1, (sx - 2.4, sy, 0.65), dark, furn, **kw("furniture", "StreetBenchL")))
    put("Echt_StreetFurniture", box("StreetBenchR", 0.12, 1.05, 1.1, (sx + 2.4, sy, 0.65), dark, furn, **kw("furniture", "StreetBenchR")))
    for i in range(4):
        put("Echt_StreetFurniture", box(f"StreetSlat{i}", 4.6, 0.15, 0.07, (sx, sy - 0.28 + i * 0.2, 1.32), wood, furn, bevel=0.02, **kw("furniture", f"StreetSlat{i}")))

    lit = groups["Echt_Lighting"]
    for i, gy in enumerate((-lot_d / 2 + 8, 0, lot_d / 2 - 8)):
        x = -lot_w / 2 - 14
        put("Echt_Lighting", cyl(f"LampBase{i}", 0.22, 0.18, (x, gy, 0.2), dark, lit, segs=12, **kw("lighting", f"LampBase{i}")))
        put("Echt_Lighting", cyl(f"LampPost{i}", 0.09, 7.2, (x, gy, 3.7), dark, lit, segs=12, **kw("lighting", f"LampPost{i}")))
        put("Echt_Lighting", box(f"LampArm{i}", 1.85, 0.08, 0.08, (x + 0.85, gy, 7.15), metal, lit, bevel=0.02, **kw("lighting", f"LampArm{i}")))
        put("Echt_Lighting", box(f"LampHead{i}", 0.7, 0.42, 0.16, (x + 1.7, gy, 7.02), dark, lit, bevel=0.03, **kw("lighting", f"LampHead{i}")))
        put("Echt_Lighting", cyl(f"LampLens{i}", 0.22, 0.06, (x + 1.7, gy, 6.9), glow, lit, segs=12, **kw("lighting", f"LampLens{i}")))

    signs = groups["Echt_Signs"]
    put("Echt_Signs", box("StreetSignPost", 0.12, 0.12, 4.8, (-lot_w / 2 - 6, -lot_d / 2 - 10, 2.5), dark, signs, **kw("signage", "StreetSignPost")))
    put("Echt_Signs", box("StreetSignBlade", 2.8, 0.08, 0.7, (-lot_w / 2 - 4.6, -lot_d / 2 - 10, 4.6), accent, signs, bevel=0.03, **kw("signage", "StreetSignBlade")))

    ctxp = groups["Echt_Context"]
    put("Echt_Context", box("ServiceBay", 6.5, 10, 0.12, (-lot_w / 2 - 18, -8, 0.18), asphalt, ctxp, **kw("context", "ServiceBay")))
    put("Echt_Context", box("BollardA", 0.22, 0.22, 1.1, (-lot_w / 2 - 10, -16, 0.7), metal, ctxp, bevel=0.04, **kw("context", "BollardA")))
    put("Echt_Context", box("BollardB", 0.22, 0.22, 1.1, (-lot_w / 2 - 10, 0, 0.7), metal, ctxp, bevel=0.04, **kw("context", "BollardB")))
    put("Echt_Context", box("ContextHedge", 2.4, 18, 2.1, (lot_w / 2 + 2, 2, 1.2), leaf, ctxp, bevel=0.25, **kw("context", "ContextHedge")))

    # Neighbor lots as authoring massing (not runtime GLBs)
    for n in contract["neighbors"]:
        nx, ny, _ = lot_world_origin(n, contract["grid"], tile)
        nw, nd = n["size"]["x"] * tile * 0.72, n["size"]["y"] * tile * 0.62
        nh = building_height(n["height"], tile) * 0.92
        # world-space parent is district origin; convert to world loc
        # Context empty is at lot origin of Echt; offset from Echt lot centre
        loc = (nx - ox, ny - oy, nh / 2)
        put(
            "Echt_Context",
            box(
                f"Massing_{n['id']}",
                nw,
                nd,
                nh,
                loc,
                ctx,
                ctxp,
                bevel=0.18,
                **kw("context", f"Massing_{n['id']}", origin=(n["origin"]["x"], n["origin"]["y"]), size=(n["size"]["x"], n["size"]["y"])),
            ),
        )
        put(
            "Echt_Context",
            box(
                f"MassingBand_{n['id']}",
                nw * 0.92,
                0.12,
                nh * 0.55,
                (loc[0], loc[1] - nd / 2 + 0.08, nh * 0.48),
                dark,
                ctxp,
                **kw("context", f"MassingBand_{n['id']}"),
            ),
        )

    # Parent ground-local groups: landscape/veg/furniture/lighting/signs/context share Echt lot origin
    for key in (
        "Echt_Landscape",
        "Echt_Vegetation",
        "Echt_StreetFurniture",
        "Echt_Lighting",
        "Echt_Signs",
        "Echt_Context",
        "Echt_Curb",
        "Echt_Sidewalk",
        "Echt_Ground",
    ):
        groups[key].location = (ox, oy, 0)

    groups["Echt_Road"].location = (0, 0, 0)
    return ox, oy
