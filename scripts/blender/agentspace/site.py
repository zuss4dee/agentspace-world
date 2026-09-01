"""Echt Studio development site — parcel, verge, landscape. No building massing."""
from __future__ import annotations

import math
import random

import bpy
from mathutils import Vector

from .contract import load_contract
from .geom import box, cyl, empty, ensure_collection, ico, link
from .registry import dump_registry, tag
from .validate_world import FORBIDDEN_KINDS, validate

ASSET = "pack.northshore.building.studio.loft"
LOT_ID = "plot-b-loft"
SITE_COL = "Echt_Site"
SUBS = ("Lot", "Road", "Pavement", "Landscape", "Furniture")

SITE_MATS = {
    "asw.mat.asphalt": {"color": (0.07, 0.07, 0.075, 1), "rough": 0.88, "spec": 0.12},
    "asw.mat.concrete": {"color": (0.62, 0.60, 0.56, 1), "rough": 0.58, "spec": 0.18},
    "asw.mat.paving": {"color": (0.72, 0.70, 0.66, 1), "rough": 0.64, "spec": 0.16},
    "asw.mat.kerb": {"color": (0.78, 0.76, 0.72, 1), "rough": 0.42, "spec": 0.22},
    "asw.mat.grass": {"color": (0.22, 0.34, 0.14, 1), "rough": 0.82, "spec": 0.08},
    "asw.mat.soil": {"color": (0.16, 0.11, 0.07, 1), "rough": 0.94, "spec": 0.04},
    "asw.mat.landscape": {"color": (0.18, 0.28, 0.12, 1), "rough": 0.78, "spec": 0.08},
    "asw.mat.metal": {"color": (0.18, 0.19, 0.20, 1), "rough": 0.28, "metal": 0.92},
    "asw.mat.glass": {"color": (0.55, 0.62, 0.60, 1), "rough": 0.04, "trans": 0.9, "alpha": 0.28},
    "asw.mat.bark": {"color": (0.22, 0.13, 0.08, 1), "rough": 0.9, "spec": 0.06},
    "asw.mat.foliage": {"color": (0.20, 0.36, 0.12, 1), "rough": 0.74, "spec": 0.1},
    "asw.mat.wood": {"color": (0.32, 0.20, 0.11, 1), "rough": 0.5, "spec": 0.12},
    "asw.mat.signage": {"color": (0.10, 0.11, 0.11, 1), "rough": 0.32, "metal": 0.35},
}


def cid(path: str) -> str:
    return f"{ASSET}/{path}"


def _bsdf(mat):
    return next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")


def ensure_site_materials() -> dict:
    out = {}
    for mid, spec in SITE_MATS.items():
        mat = bpy.data.materials.get(mid)
        if mat is None:
            mat = bpy.data.materials.new(mid)
        mat.use_nodes = True
        nt = mat.node_tree
        for n in list(nt.nodes):
            if n.type not in {"BSDF_PRINCIPLED", "OUTPUT_MATERIAL"}:
                nt.nodes.remove(n)
        b = _bsdf(mat)
        b.inputs["Base Color"].default_value = spec["color"]
        b.inputs["Roughness"].default_value = spec["rough"]
        b.inputs["Metallic"].default_value = spec.get("metal", 0.0)
        if spec.get("trans"):
            mat.blend_method = "BLEND"
            b.inputs["Transmission Weight"].default_value = spec["trans"]
            b.inputs["Alpha"].default_value = spec.get("alpha", 0.3)
            b.inputs["IOR"].default_value = 1.52
        noise = nt.nodes.new("ShaderNodeTexNoise")
        noise.inputs["Scale"].default_value = 28.0 if "paving" in mid or "asphalt" in mid else 12.0
        noise.inputs["Detail"].default_value = 8.0
        bump = nt.nodes.new("ShaderNodeBump")
        bump.inputs["Strength"].default_value = 0.08 if mid in {"asw.mat.grass", "asw.mat.soil"} else 0.035
        mix = nt.nodes.new("ShaderNodeMix")
        mix.data_type = "FLOAT"
        mix.inputs["Factor"].default_value = 0.16
        mix.inputs["A"].default_value = spec["rough"]
        nt.links.new(noise.outputs["Fac"], mix.inputs["B"])
        nt.links.new(mix.outputs["Result"], b.inputs["Roughness"])
        nt.links.new(noise.outputs["Fac"], bump.inputs["Height"])
        nt.links.new(bump.outputs["Normal"], b.inputs["Normal"])
        if "Specular IOR Level" in b.inputs and "spec" in spec:
            b.inputs["Specular IOR Level"].default_value = spec["spec"]
        mat["asw_materialId"] = mid
        out[mid] = mat
    return out


def _kw(kind: str, path: str, origin=(26.0, 2.0), size=(4.0, 3.0)):
    return dict(
        asset_id=ASSET,
        component_id=cid(path),
        kind=kind,
        runtime=False,
        grid_origin=origin,
        grid_size=size,
    )


def _clear_site():
    col = bpy.data.collections.get(SITE_COL)
    if col is None:
        return
    for ob in list(col.all_objects):
        bpy.data.objects.remove(ob, do_unlink=True)
    for child in list(col.children):
        bpy.data.collections.remove(child)
    bpy.data.collections.remove(col)


def _collections(world_root):
    world_col = bpy.data.collections.get("Agentspace_World") or bpy.context.scene.collection
    site = ensure_collection(SITE_COL, world_col)
    groups = {name: ensure_collection(f"{SITE_COL}_{name}", site) for name in SUBS}
    # Sit above the district reference plane (z=0.28) without moving locked lots.
    root = bpy.data.objects.get("Echt_Site") or empty("Echt_Site", (0, 0, 0.24), world_root, site)
    root.location = (0.0, 0.0, 0.24)
    tag(root, **_kw("group", "site"))
    return site, groups, root


def _put(col, ob):
    return link(ob, col)


def _tree(name, loc, rng, mats, parent, groups, height):
    """Trunk + branch stubs + several ellipsoidal leaf masses — not a single sphere."""
    hx, hy, hz = loc
    trunk_h = height * 0.42
    trunk_r = 0.18 + rng.random() * 0.08
    _put(
        groups["Landscape"],
        cyl(
            f"{name}_trunk",
            trunk_r,
            trunk_h,
            (hx, hy, hz + trunk_h / 2),
            mats["asw.mat.bark"],
            parent,
            segs=16,
            **_kw("vegetation", f"site/landscape/{name}/trunk"),
        ),
    )
    for i in range(3):
        ang = rng.uniform(0, math.tau)
        br = cyl(
            f"{name}_branch_{i+1:02d}",
            trunk_r * 0.28,
            height * 0.16,
            (
                hx + math.cos(ang) * trunk_r * 1.4,
                hy + math.sin(ang) * trunk_r * 1.4,
                hz + trunk_h * (0.55 + i * 0.12),
            ),
            mats["asw.mat.bark"],
            parent,
            segs=10,
            **_kw("vegetation", f"site/landscape/{name}/branch-{i+1:02d}"),
        )
        br.rotation_euler = (rng.uniform(0.4, 0.9), 0, ang)
        _put(groups["Landscape"], br)
    clumps = 7 + rng.randint(0, 3)
    for i in range(clumps):
        ang = (i / clumps) * math.tau + rng.uniform(-0.2, 0.2)
        rad = height * rng.uniform(0.12, 0.28)
        z = hz + trunk_h * 0.72 + rng.uniform(0.4, height * 0.48)
        r = height * rng.uniform(0.18, 0.32)
        leaf = ico(
            f"{name}_canopy_{i+1:02d}",
            r,
            (hx + math.cos(ang) * rad, hy + math.sin(ang) * rad * 0.85, z),
            mats["asw.mat.foliage"],
            parent,
            subdiv=2,
            **_kw("vegetation", f"site/landscape/{name}/canopy-{i+1:02d}"),
        )
        leaf.scale = (
            rng.uniform(0.85, 1.25),
            rng.uniform(0.75, 1.15),
            rng.uniform(0.55, 0.9),
        )
        tint = mats["asw.mat.landscape"] if i % 3 == 0 else mats["asw.mat.foliage"]
        leaf.data.materials.clear()
        leaf.data.materials.append(tint)
        _put(groups["Landscape"], leaf)


def _shrub(name, loc, rng, mats, parent, groups):
    hx, hy, hz = loc
    _put(
        groups["Landscape"],
        cyl(
            f"{name}_base",
            0.22,
            0.12,
            (hx, hy, hz + 0.06),
            mats["asw.mat.soil"],
            parent,
            segs=10,
            **_kw("vegetation", f"site/landscape/{name}/soil"),
        ),
    )
    for i in range(4):
        leaf = ico(
            f"{name}_mass_{i+1:02d}",
            rng.uniform(0.38, 0.62),
            (
                hx + rng.uniform(-0.28, 0.28),
                hy + rng.uniform(-0.28, 0.28),
                hz + 0.45 + rng.uniform(0.0, 0.25),
            ),
            mats["asw.mat.landscape"] if i else mats["asw.mat.foliage"],
            parent,
            subdiv=2,
            **_kw("vegetation", f"site/landscape/{name}/mass-{i+1:02d}"),
        )
        leaf.scale = (rng.uniform(0.9, 1.3), rng.uniform(0.9, 1.2), rng.uniform(0.55, 0.85))
        _put(groups["Landscape"], leaf)


def build_echt_site():
    c = load_contract()
    loft = next(p for p in c["lots"] if p["id"] == LOT_ID)
    gx, gy, gw, gh = loft["grid"]["x"], loft["grid"]["y"], loft["grid"]["w"], loft["grid"]["h"]
    cx, cy = loft["world"]["x"], loft["world"]["y"]
    lw, ld = loft["world"]["w"], loft["world"]["d"]
    assert (cx, cy) == (-128.0, -912.0)
    assert (gx, gy, gw, gh) == (26, 2, 4, 3)

    pad = bpy.data.objects.get(LOT_ID)
    if pad is None:
        raise RuntimeError("plot-b-loft missing — world base is not loaded")
    for name in (LOT_ID, f"{LOT_ID}_edgeN", f"{LOT_ID}_edgeS", f"{LOT_ID}_edgeE", f"{LOT_ID}_edgeW"):
        ob = bpy.data.objects.get(name)
        if ob:
            ob.hide_viewport = True
            ob.hide_render = True

    _clear_site()
    world_root = bpy.data.objects.get("Agentspace_World")
    _, groups, root = _collections(world_root)
    mats = ensure_site_materials()
    rng = random.Random(26 * 100 + 2)

    x0, y0 = cx - lw / 2, cy - ld / 2  # -192, -960
    x1, y1 = cx + lw / 2, cy + ld / 2  # -64, -864
    tile = float(c["tile"])
    setback = 6.4

    # --- lot: tile-aligned finished pads + setback lawn ---
    for ix in range(int(gw)):
        for iy in range(int(gh)):
            px = x0 + (ix + 0.5) * tile
            py = y0 + (iy + 0.5) * tile
            _put(
                groups["Lot"],
                box(
                    f"EchtGround_{ix}_{iy}",
                    tile - 0.22,
                    tile - 0.22,
                    0.14,
                    (px, py, 0.14),
                    mats["asw.mat.concrete"],
                    root,
                    bevel=0.04,
                    uv=0.04,
                    **_kw("lot", f"site/ground/tile-{ix}-{iy}"),
                ),
            )

    # inner setback (keep-out for the future building — surface only)
    _put(
        groups["Lot"],
        box(
            "EchtSetback",
            lw - setback * 2,
            ld - setback * 2,
            0.04,
            (cx, cy, 0.22),
            mats["asw.mat.paving"],
            root,
            bevel=0.03,
            uv=0.05,
            **_kw("lot", "site/setback"),
        ),
    )

    rails = (
        ("N", lw + 0.4, 0.28, cx, y1, 0.28),
        ("S", lw + 0.4, 0.28, cx, y0, 0.28),
        ("E", 0.28, ld + 0.4, x1, cy, 0.28),
        ("W", 0.28, ld + 0.4, x0, cy, 0.28),
    )
    for name, w, d, lx, ly, h in rails:
        _put(
            groups["Lot"],
            box(
                f"EchtBound_{name}",
                w,
                d,
                h,
                (lx, ly, 0.2),
                mats["asw.mat.kerb"],
                root,
                bevel=0.03,
                uv=0.2,
                **_kw("curb", f"site/boundary/{name.lower()}"),
            ),
        )

    # grade bands along the north street edge of the lot
    _put(
        groups["Lot"],
        box(
            "EchtGradeNorth",
            lw - 1.2,
            2.4,
            0.08,
            (cx, y1 - 1.2, 0.16),
            mats["asw.mat.concrete"],
            root,
            bevel=0.02,
            **_kw("lot", "site/grade/north"),
        ),
    )

    # --- road connection (overlay only; do not move Road_6) ---
    # existing walk south of Road_6 sits at y≈-825.9; lot north edge y=-864
    verge_y0, verge_y1 = y1, -822.7
    verge_cy = (verge_y0 + verge_y1) / 2
    verge_d = abs(verge_y1 - verge_y0)
    drive_w = 9.6
    drive_x = cx + 28.0  # east-of-center studio entry, still on parcel

    _put(
        groups["Road"],
        box(
            "EchtAsphaltOverlay",
            lw + 24.0,
            13.6,
            0.05,
            (cx, -816.0, 0.11),
            mats["asw.mat.asphalt"],
            root,
            bevel=0.01,
            uv=0.03,
            **_kw("road", "site/road/asphalt"),
        ),
    )
    _put(
        groups["Road"],
        box(
            "EchtGutterS",
            lw + 20.0,
            0.42,
            0.04,
            (cx, -821.4, 0.1),
            mats["asw.mat.asphalt"],
            root,
            **_kw("road", "site/road/gutter"),
        ),
    )
    _put(
        groups["Road"],
        box(
            "EchtKerbS",
            lw + 20.0,
            0.38,
            0.22,
            (cx, -822.85, 0.18),
            mats["asw.mat.kerb"],
            root,
            bevel=0.04,
            **_kw("curb", "site/road/kerb"),
        ),
    )
    _put(
        groups["Road"],
        box(
            "EchtDriveway",
            drive_w,
            abs(-822.7 - (y1 - 0.2)),
            0.1,
            (drive_x, ( -822.7 + y1) / 2, 0.17),
            mats["asw.mat.asphalt"],
            root,
            bevel=0.03,
            uv=0.04,
            **_kw("road", "site/driveway"),
        ),
    )
    _put(
        groups["Road"],
        box(
            "EchtDriveApron",
            drive_w + 1.6,
            2.2,
            0.08,
            (drive_x, y1 + 0.4, 0.18),
            mats["asw.mat.concrete"],
            root,
            bevel=0.04,
            **_kw("road", "site/driveway/apron"),
        ),
    )

    # --- pavement: separate slabs, not one mesh ---
    slab = 2.0
    gap = 0.07
    walk_y0, walk_y1 = -831.0, -824.4
    px = x0 + 0.8
    si = 1
    while px < x1 - 0.4:
        py = walk_y0 + slab / 2
        while py < walk_y1:
            shade = mats["asw.mat.paving"] if (si + int(py)) % 3 else mats["asw.mat.concrete"]
            _put(
                groups["Pavement"],
                box(
                    f"EchtPaver_{si:03d}",
                    slab - gap,
                    min(slab, walk_y1 - py + slab / 2) - gap,
                    0.07,
                    (px, py, 0.155),
                    shade,
                    root,
                    bevel=0.012,
                    uv=0.6,
                    **_kw("pavement", f"site/pavement/slab-{si:03d}"),
                ),
            )
            si += 1
            py += slab
        px += slab

    # entrance approach into the lot (still paving, not architecture)
    approach_y0, approach_y1 = y1 - 14.0, y1 - 0.4
    ax = drive_x - drive_w / 2 + 0.4
    while ax < drive_x + drive_w / 2 - 0.2:
        ay = approach_y0 + 0.8
        while ay < approach_y1:
            _put(
                groups["Pavement"],
                box(
                    f"EchtApproach_{si:03d}",
                    1.12,
                    1.12,
                    0.06,
                    (ax, ay, 0.24),
                    mats["asw.mat.paving"],
                    root,
                    bevel=0.01,
                    uv=0.7,
                    **_kw("pavement", f"site/pavement/approach-{si:03d}"),
                ),
            )
            si += 1
            ay += 1.22
        ax += 1.22

    kerb_drop = box(
        "EchtKerbDrop",
        drive_w + 0.8,
        0.5,
        0.1,
        (drive_x, -823.2, 0.14),
        mats["asw.mat.kerb"],
        root,
        bevel=0.05,
        **_kw("curb", "site/pavement/kerb-drop"),
    )
    _put(groups["Pavement"], kerb_drop)

    # --- landscape ---
    _put(
        groups["Landscape"],
        box(
            "EchtVergeGrass",
            lw - drive_w - 4.0,
            verge_d - 1.2,
            0.08,
            (cx - 8.0, verge_cy - 0.2, 0.13),
            mats["asw.mat.grass"],
            root,
            bevel=0.02,
            uv=0.08,
            **_kw("vegetation", "site/landscape/verge-grass"),
        ),
    )
    _put(
        groups["Landscape"],
        box(
            "EchtRearLawn",
            lw - 8.0,
            10.5,
            0.08,
            (cx, y0 + 6.2, 0.16),
            mats["asw.mat.grass"],
            root,
            bevel=0.02,
            uv=0.07,
            **_kw("vegetation", "site/landscape/rear-lawn"),
        ),
    )
    _put(
        groups["Landscape"],
        box(
            "EchtWestBed",
            4.8,
            ld - 16.0,
            0.16,
            (x0 + 4.2, cy + 2.0, 0.18),
            mats["asw.mat.soil"],
            root,
            bevel=0.04,
            **_kw("vegetation", "site/landscape/bed-west"),
        ),
    )
    _put(
        groups["Landscape"],
        box(
            "EchtEastBed",
            4.2,
            38.0,
            0.16,
            (x1 - 4.0, cy - 12.0, 0.18),
            mats["asw.mat.soil"],
            root,
            bevel=0.04,
            **_kw("vegetation", "site/landscape/bed-east"),
        ),
    )
    _put(
        groups["Landscape"],
        box(
            "EchtFrontBed",
            42.0,
            3.6,
            0.16,
            (cx - 22.0, y1 - 4.4, 0.18),
            mats["asw.mat.soil"],
            root,
            bevel=0.04,
            **_kw("vegetation", "site/landscape/bed-front"),
        ),
    )

    trees = [
        ("tree-01", (x0 + 7.5, y1 - 10.0, 0.12), 9.4),
        ("tree-02", (x0 + 11.0, cy + 8.0, 0.12), 11.2),
        ("tree-03", (x0 + 8.0, y0 + 14.0, 0.12), 8.6),
        ("tree-04", (x1 - 8.5, y0 + 16.0, 0.12), 10.1),
        ("tree-05", (cx - 18.0, y1 - 8.5, 0.12), 7.8),
        ("tree-06", (cx + 8.0, y0 + 11.0, 0.12), 9.0),
    ]
    for name, loc, h in trees:
        _tree(name, loc, rng, mats, root, groups, h)

    for i, loc in enumerate(
        (
            (x0 + 4.2, y1 - 8.0, 0.12),
            (x0 + 4.4, cy, 0.12),
            (x0 + 4.0, y0 + 18.0, 0.12),
            (x1 - 4.0, cy - 18.0, 0.12),
            (cx - 30.0, y1 - 4.4, 0.12),
            (cx - 14.0, y1 - 4.2, 0.12),
        ),
        start=1,
    ):
        _shrub(f"shrub-{i:02d}", loc, rng, mats, root, groups)

    for i in range(8):
        t = i / 7
        _put(
            groups["Landscape"],
            ico(
                f"EchtLowPlant_{i+1:02d}",
                0.28 + (i % 3) * 0.06,
                (x0 + 3.6 + (i % 2) * 1.1, y0 + 20 + t * 48, 0.42),
                mats["asw.mat.landscape"],
                root,
                subdiv=2,
                **_kw("vegetation", f"site/landscape/low-{i+1:02d}"),
            ),
        )

    # --- street furniture ---
    lamp_pts = (
        (x0 + 6.0, -828.4),
        (cx - 12.0, -828.4),
        (x1 - 8.0, -828.4),
        (drive_x + drive_w / 2 + 1.8, y1 - 2.0),
    )
    for i, (lx, ly) in enumerate(lamp_pts, start=1):
        _put(
            groups["Furniture"],
            cyl(
                f"EchtLamp_{i:02d}_pole",
                0.07,
                4.6,
                (lx, ly, 2.4),
                mats["asw.mat.metal"],
                root,
                segs=14,
                **_kw("furniture", f"site/street/lamp-{i:02d}/pole"),
            ),
        )
        _put(
            groups["Furniture"],
            box(
                f"EchtLamp_{i:02d}_arm",
                0.7,
                0.08,
                0.06,
                (lx + 0.28, ly, 4.62),
                mats["asw.mat.metal"],
                root,
                bevel=0.01,
                **_kw("furniture", f"site/street/lamp-{i:02d}/arm"),
            ),
        )
        _put(
            groups["Furniture"],
            cyl(
                f"EchtLamp_{i:02d}_head",
                0.16,
                0.12,
                (lx + 0.52, ly, 4.52),
                mats["asw.mat.glass"],
                root,
                segs=12,
                **_kw("furniture", f"site/street/lamp-{i:02d}/head"),
            ),
        )

    for i, (bx, by) in enumerate(((cx - 36.0, -828.8), (cx - 24.0, -828.8)), start=1):
        _put(
            groups["Furniture"],
            box(
                f"EchtBench_{i:02d}_seat",
                1.9,
                0.48,
                0.08,
                (bx, by, 0.46),
                mats["asw.mat.wood"],
                root,
                bevel=0.02,
                **_kw("furniture", f"site/street/bench-{i:02d}/seat"),
            ),
        )
        _put(
            groups["Furniture"],
            box(
                f"EchtBench_{i:02d}_back",
                1.9,
                0.08,
                0.42,
                (bx, by + 0.22, 0.72),
                mats["asw.mat.wood"],
                root,
                bevel=0.015,
                **_kw("furniture", f"site/street/bench-{i:02d}/back"),
            ),
        )
        for j, ox in enumerate((-0.7, 0.7), start=1):
            _put(
                groups["Furniture"],
                box(
                    f"EchtBench_{i:02d}_leg{j}",
                    0.08,
                    0.4,
                    0.4,
                    (bx + ox, by, 0.22),
                    mats["asw.mat.metal"],
                    root,
                    **_kw("furniture", f"site/street/bench-{i:02d}/leg-{j}"),
                ),
            )

    for i in range(6):
        side = -1 if i < 3 else 1
        _put(
            groups["Furniture"],
            cyl(
                f"EchtBollard_{i+1:02d}",
                0.09,
                0.72,
                (drive_x + side * (drive_w / 2 + 0.45), y1 - 3.2 - (i % 3) * 2.4, 0.48),
                mats["asw.mat.metal"],
                root,
                segs=12,
                **_kw("furniture", f"site/street/bollard-{i+1:02d}"),
            ),
        )

    for i, (wx, wy, label) in enumerate(
        ((cx - 40.0, -829.2, "waste"), (cx - 38.2, -829.2, "recycle")),
        start=1,
    ):
        _put(
            groups["Furniture"],
            cyl(
                f"EchtBin_{label}",
                0.28,
                0.78,
                (wx, wy, 0.51),
                mats["asw.mat.metal"],
                root,
                segs=14,
                **_kw("furniture", f"site/street/bin-{label}"),
            ),
        )
        _put(
            groups["Furniture"],
            cyl(
                f"EchtBin_{label}_lid",
                0.3,
                0.06,
                (wx, wy, 0.94),
                mats["asw.mat.signage"],
                root,
                segs=14,
                **_kw("furniture", f"site/street/bin-{label}-lid"),
            ),
        )

    _put(
        groups["Furniture"],
        box(
            "EchtSignPlinth",
            1.6,
            0.28,
            0.18,
            (x0 + 5.5, y1 - 1.4, 0.28),
            mats["asw.mat.concrete"],
            root,
            bevel=0.03,
            **_kw("furniture", "site/street/sign/plinth"),
        ),
    )
    _put(
        groups["Furniture"],
        box(
            "EchtSignPanel",
            1.4,
            0.08,
            1.1,
            (x0 + 5.5, y1 - 1.4, 0.95),
            mats["asw.mat.signage"],
            root,
            bevel=0.02,
            **_kw("furniture", "site/street/sign/panel"),
        ),
    )
    _put(
        groups["Furniture"],
        box(
            "EchtSignGlyph",
            0.9,
            0.03,
            0.22,
            (x0 + 5.5, y1 - 1.34, 1.15),
            mats["asw.mat.landscape"],
            root,
            **_kw("furniture", "site/street/sign/glyph"),
        ),
    )

    for lamp in bpy.data.lights:
        if hasattr(lamp, "use_contact_shadow"):
            lamp.use_contact_shadow = True
            lamp.contact_shadow_distance = 2.5
            lamp.contact_shadow_thickness = 0.04

    dump_registry()
    report = validate(c)
    comps = [
        o
        for o in bpy.data.objects
        if o.get("asw_assetId") == ASSET and o.get("asw_kind") not in {"group"}
    ]
    kinds = sorted({o.get("asw_kind") for o in comps})
    forbidden = [
        o.name
        for o in bpy.data.objects
        if o.get("asw_kind") in FORBIDDEN_KINDS
    ]
    return {
        "lot": loft,
        "validate": report,
        "newComponents": len(comps),
        "kinds": kinds,
        "materials": sorted(mats),
        "forbidden": forbidden,
        "componentIds": sorted(o.get("asw_componentId") for o in comps),
    }
