"""Public space from contract terrain. No buildings."""
from __future__ import annotations

from .contract import world_xy
from .geom import box, cyl, linked_place
from .roads import stamp_sidewalk, terrain_at


def park_clusters(c):
    grid = c["grid"]
    seen = set()
    clusters = []
    for y in range(grid):
        for x in range(grid):
            if (x, y) in seen:
                continue
            kind = terrain_at(c, x, y)
            if kind not in {"park", "plaza"}:
                continue
            stack = [(x, y)]
            cells = []
            while stack:
                cx, cy = stack.pop()
                if (cx, cy) in seen:
                    continue
                if terrain_at(c, cx, cy) != kind:
                    continue
                seen.add((cx, cy))
                cells.append((cx, cy))
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    stack.append((cx + dx, cy + dy))
            clusters.append((kind, cells))
    return clusters


def park_scale(cells):
    n = len(cells)
    xs = [c[0] for c in cells]
    ys = [c[1] for c in cells]
    w = max(xs) - min(xs) + 1
    h = max(ys) - min(ys) + 1
    linear = (min(w, h) == 1 and max(w, h) >= 3) or (min(w, h) == 2 and max(w, h) >= 6)
    if linear:
        return "park.linear"
    if n <= 3:
        return "park.pocket"
    if n <= 12:
        return "park.neighbourhood"
    return "park.large"


def _lot_cells(c):
    cells = set()
    for p in c["lots"]:
        g = p["grid"]
        for x in range(int(g["x"]), int(g["x"] + g["w"])):
            for y in range(int(g["y"]), int(g["y"] + g["h"])):
                cells.add((x, y))
    return cells


def pocket_sites(c, taken):
    """Small leftover grass/dirt between roads — extra pocket parks, contract tiles only.

    Sidewalk tiles occupy the cells immediately beside roads, so pockets sit
    two to three tiles off the centerline (still existing terrain, not new land).
    """
    grid = c["grid"]
    rxs, rys = c["roadXs"], c["roadYs"]
    lots = _lot_cells(c)
    found = []
    for y in range(grid):
        for x in range(grid):
            if (x, y) in taken or (x, y) in lots:
                continue
            if terrain_at(c, x, y) not in {"grass", "dirt"}:
                continue
            dmin = min([abs(x - rx) for rx in rxs] + [abs(y - ry) for ry in rys])
            if dmin not in (2, 3):
                continue
            if any(abs(x - px) + abs(y - py) <= 3 for px, py in found):
                continue
            found.append((x, y))
            if len(found) >= 8:
                return found
    return found


def _nearest_road(cx, cy, rxs, rys):
    best = None
    best_d = 1e9
    for rx in rxs:
        d = abs(cx - (rx + 0.5))
        if d < best_d:
            best_d = d
            best = ("x", rx + 0.5, cy)
    for ry in rys:
        d = abs(cy - (ry + 0.5))
        if d < best_d:
            best_d = d
            best = ("y", cx, ry + 0.5)
    return best, best_d


def build_parks(c, mats, groups, put, kw, veg_lib=None, prop_lib=None):
    tile = c["tile"]
    grid = c["grid"]
    rxs, rys = c["roadXs"], c["roadYs"]
    taken = set()
    clusters = park_clusters(c)
    for i, (kind, cells) in enumerate(clusters):
        for cell in cells:
            taken.add(cell)
        scale = "plaza" if kind == "plaza" else park_scale(cells)
        xs = [p[0] for p in cells]
        ys = [p[1] for p in cells]
        minx, maxx, miny, maxy = min(xs), max(xs), min(ys), max(ys)
        cx = (minx + maxx + 1) / 2
        cy = (miny + maxy + 1) / 2
        wx, wy = world_xy(cx, cy, grid, tile)
        ww = (maxx - minx + 1) * tile * 0.92
        wd = (maxy - miny + 1) * tile * 0.92
        mat = mats["plaza"] if kind == "plaza" else mats["park"]
        ob = box(
            f"Park_{i}",
            ww,
            wd,
            0.08,
            (wx, wy, 0.05),
            mat,
            groups["Parks"],
            **kw("terrain", f"park/{scale}/{i}", origin=(minx, miny), size=(maxx - minx + 1, maxy - miny + 1)),
        )
        ob["asw_parkScale"] = scale
        put("Parks", ob)
        if veg_lib and "grass_zone" in veg_lib:
            gz = linked_place(
                veg_lib["grass_zone"],
                f"ParkGrass_{i}",
                (wx, wy, 0.04),
                groups["Vegetation"],
                (max(1.0, ww / 2.4), max(1.0, wd / 2.4), 1),
                **kw("vegetation", f"grass_zone/park/{i}"),
            )
            gz["asw_vegKind"] = "grass_zone"
            put("Vegetation", gz)
        along_x = ww >= wd
        if scale != "park.pocket":
            path = box(
                f"ParkPath_{i}",
                ww * 0.72 if along_x else tile * 0.18,
                tile * 0.18 if along_x else wd * 0.72,
                0.06,
                (wx, wy, 0.09),
                mats["path"],
                groups["Sidewalks"],
                **kw("sidewalk", f"park/{i}/path"),
            )
            stamp_sidewalk(path, "plaza" if kind == "plaza" else "park_path")
            put("Sidewalks", path)
        if kind == "plaza":
            plaza_walk = box(
                f"PlazaWalk_{i}",
                ww * 0.55,
                wd * 0.55,
                0.07,
                (wx, wy, 0.1),
                mats["walk.wide"],
                groups["Sidewalks"],
                **kw("sidewalk", f"plaza/{i}/surface"),
            )
            stamp_sidewalk(plaza_walk, "plaza")
            put("Sidewalks", plaza_walk)
        if scale in {"park.neighbourhood", "park.large", "plaza", "park.linear"}:
            put(
                "Parks",
                box(
                    f"ParkBed_{i}",
                    min(6.0, ww * 0.18),
                    min(4.0, wd * 0.18),
                    0.14,
                    (wx + ww * 0.22, wy - wd * 0.18, 0.12),
                    mats["bed"],
                    groups["Parks"],
                    **kw("vegetation", f"park/{i}/bed"),
                ),
            )
            if veg_lib:
                bed = linked_place(
                    veg_lib["planting_bed"],
                    f"ParkPlant_{i}",
                    (wx - ww * 0.2, wy + wd * 0.16, 0.18),
                    groups["Vegetation"],
                    (1.2, 1.0, 1.0),
                    **kw("vegetation", f"planting_bed/park/{i}"),
                )
                put("Vegetation", bed)
        # pedestrian connection toward nearest contract road
        target, dist = _nearest_road(cx, cy, rxs, rys)
        if target and dist < 8:
            axis, tx, ty = target
            mx, my = (cx + tx) / 2, (cy + ty) / 2
            cwx, cwy = world_xy(mx, my, grid, tile)
            if axis == "x":
                cw, cd = abs(tx - cx) * tile * 0.7, tile * 0.14
            else:
                cw, cd = tile * 0.14, abs(ty - cy) * tile * 0.7
            conn = box(
                f"ParkConn_{i}",
                max(1.2, cw),
                max(1.2, cd),
                0.06,
                (cwx, cwy, 0.09),
                mats["path"],
                groups["Sidewalks"],
                **kw("sidewalk", f"park/{i}/connection"),
            )
            stamp_sidewalk(conn, "park_path")
            put("Sidewalks", conn)
        # park benches along the path
        if scale != "park.pocket":
            bx, by = world_xy(cx + (0.8 if along_x else 0), cy + (0 if along_x else 0.8), grid, tile)
            if prop_lib:
                put(
                    "Street_Furniture",
                    linked_place(
                        prop_lib["bench"],
                        f"ParkBench_{i}",
                        (bx, by, 0.42),
                        groups["Street_Furniture"],
                        **kw("street_furniture", f"bench/park/{i}"),
                    ),
                )
                put(
                    "Street_Furniture",
                    linked_place(
                        prop_lib["bench"],
                        f"ParkBenchB_{i}",
                        (bx + (2.2 if along_x else 0), by + (0 if along_x else 2.2), 0.42),
                        groups["Street_Furniture"],
                        **kw("street_furniture", f"bench/park/{i}/b"),
                    ),
                )
                put(
                    "Street_Furniture",
                    linked_place(
                        prop_lib["bin"],
                        f"ParkBin_{i}",
                        (bx + 1.1, by + 1.1, 0.35),
                        groups["Street_Furniture"],
                        **kw("street_furniture", f"bin/park/{i}"),
                    ),
                )
                if scale in {"plaza", "park.large"}:
                    put(
                        "Parks",
                        linked_place(
                            prop_lib["plaza_ring"],
                            f"ParkCourt_{i}",
                            (wx, wy, 0.12),
                            groups["Parks"],
                            (1.4 if scale == "park.large" else 1.0, 1.4 if scale == "park.large" else 1.0, 1),
                            **kw("terrain", f"park/{i}/court"),
                        ),
                    )
                    put(
                        "Street_Furniture",
                        linked_place(
                            prop_lib["bike"],
                            f"ParkBike_{i}",
                            (wx - ww * 0.28, wy - wd * 0.22, 0.28),
                            groups["Street_Furniture"],
                            **kw("street_furniture", f"bike_rack/park/{i}"),
                        ),
                    )
                if scale in {"park.neighbourhood", "park.large", "plaza"}:
                    put(
                        "Street_Furniture",
                        linked_place(
                            prop_lib["planter"],
                            f"ParkPlanter_{i}",
                            (wx + ww * 0.18, wy + wd * 0.12, 0.28),
                            groups["Street_Furniture"],
                            (1.4, 1.2, 1),
                            **kw("street_furniture", f"planter/park/{i}"),
                        ),
                    )
            else:
                put(
                    "Street_Furniture",
                    box(
                        f"ParkBench_{i}",
                        1.8,
                        0.48,
                        0.42,
                        (bx, by, 0.42),
                        mats["wood"],
                        groups["Street_Furniture"],
                        **kw("street_furniture", f"bench/park/{i}"),
                    ),
                )
        # authored park trees on cluster cells that are not the exact pad centre
        if veg_lib and scale in {"park.neighbourhood", "park.large", "park.linear"}:
            step = 3 if scale == "park.large" else 2
            n_trees = 0
            for ci, (gx, gy) in enumerate(cells):
                if ci % step:
                    continue
                if n_trees >= 6:
                    break
                twx, twy = world_xy(gx + 0.35, gy + 0.4, grid, tile)
                kind_key = "tree.canopy" if scale == "park.large" and n_trees == 0 else "tree.park"
                tree = linked_place(
                    veg_lib[kind_key],
                    f"ParkTree_{i}_{n_trees}",
                    (twx, twy, 3.2 if kind_key == "tree.canopy" else 2.4),
                    groups["Vegetation"],
                    (1.1, 1.1, 1.0),
                    **kw("vegetation", f"{kind_key}/park/{i}/{n_trees}"),
                )
                put("Vegetation", tree)
                n_trees += 1
        # park lights
        if scale in {"park.neighbourhood", "park.large", "plaza"}:
            lx, ly = world_xy(minx + 0.4, miny + 0.4, grid, tile)
            ht = 4.6
            post = cyl(
                f"ParkLamp_{i}_post",
                0.07,
                ht,
                (lx, ly, ht / 2),
                mats["metal"],
                groups["Lighting"],
                segs=8,
                **kw("street_furniture", f"street_light.park/park/{i}/post"),
            )
            post["asw_lightType"] = "street_light.park"
            put("Lighting", post)
            head = cyl(
                f"ParkLamp_{i}_head",
                0.16,
                0.14,
                (lx, ly, ht),
                mats["signal"],
                groups["Lighting"],
                segs=8,
                **kw("street_furniture", f"street_light.park/park/{i}"),
            )
            head["asw_lightType"] = "street_light.park"
            put("Lighting", head)

    for pi, (x, y) in enumerate(pocket_sites(c, taken)):
        wx, wy = world_xy(x + 0.5, y + 0.5, grid, tile)
        ob = box(
            f"PocketPark_{pi}",
            tile * 0.86,
            tile * 0.86,
            0.08,
            (wx, wy, 0.05),
            mats["park"],
            groups["Parks"],
            **kw("terrain", f"park/park.pocket/extra/{pi}", origin=(x, y), size=(1, 1)),
        )
        ob["asw_parkScale"] = "park.pocket"
        put("Parks", ob)
        if veg_lib:
            shrub = linked_place(
                veg_lib["shrub"],
                f"PocketShrub_{pi}",
                (wx, wy, 0.5),
                groups["Vegetation"],
                (1.0, 1.0, 0.9),
                **kw("vegetation", f"shrub/pocket/{pi}"),
            )
            put("Vegetation", shrub)
