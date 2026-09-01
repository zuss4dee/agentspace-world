"""Production Tesla-inspired EV sedan for the isolated asset library.

Master only. Never instanced into the runtime world. Never joins meshes.
"""
from __future__ import annotations

import math

import bmesh
import bpy
from mathutils import Vector

from .geom import ensure_collection, link
from .pbr_library import ensure_mats
from .registry import tag

AID = "pack.agentspace.vehicle.car.tesla.sedan.01"
KIND = "vehicle"
LIBRARY_ORIGIN = Vector((-6000.0, -6000.0, 0.0))
# Local offset from Agentspace_Asset_Library empty so world stays within 400 m of staging.
ROOT_LOCAL = (18.0, 12.0, 0.12)

L = 4.79
W = 1.848
H = 1.44
WB = 2.875
TRACK = 1.58
TYRE_R = 0.335
TYRE_W = 0.225
RIM_R = 0.248

TESLA_MATS = {
    "asw.mat.paint.tesla.pearl": {"kind": "metal", "color": (0.82, 0.83, 0.85), "rough": 0.18, "metal": 0.28, "var": 0.012},
    "asw.mat.rubber.tyre": {"kind": "albedo", "color": (0.045, 0.045, 0.048), "rough": 0.82, "var": 0.035},
    "asw.mat.glass.tesla": {"kind": "glass", "color": (0.18, 0.22, 0.24, 1), "rough": 0.04, "trans": 0.86},
    "asw.mat.glass.tesla.roof": {"kind": "glass", "color": (0.10, 0.12, 0.14, 1), "rough": 0.05, "trans": 0.72},
    "asw.mat.light.tesla.head": {"kind": "emit", "color": (0.92, 0.96, 1.0), "emit": 6.5},
    "asw.mat.light.tesla.tail": {"kind": "emit", "color": (0.85, 0.06, 0.05), "emit": 4.8},
    "asw.mat.trim.tesla": {"kind": "metal", "color": (0.04, 0.04, 0.045), "rough": 0.38, "metal": 0.55, "var": 0.01},
}


def _tag_lib(ob, cid, *, kind=KIND, extra=None):
    tag(ob, asset_id=AID, component_id=f"{AID}/{cid}", kind=kind, runtime=False)
    ob["asw_staging"] = 1
    ob["asw_library"] = 1
    if extra:
        for k, v in extra.items():
            ob[k] = v
    return ob


def _uv(bm, scale=0.4):
    uvl = bm.loops.layers.uv.get("UVMap") or bm.loops.layers.uv.new("UVMap")
    for f in bm.faces:
        n = f.normal
        for loop in f.loops:
            c = loop.vert.co
            if abs(n.z) >= abs(n.x) and abs(n.z) >= abs(n.y):
                loop[uvl].uv = (c.x * scale, c.y * scale)
            elif abs(n.y) >= abs(n.x):
                loop[uvl].uv = (c.x * scale, c.z * scale)
            else:
                loop[uvl].uv = (c.y * scale, c.z * scale)
        f.smooth = True


def _object_from_bm(name, bm, loc, mat, parent, cid, col, *, extra=None):
    _uv(bm)
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()
    ob = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(ob)
    ob.parent = parent
    ob.location = loc
    ob.scale = (1.0, 1.0, 1.0)
    ob.rotation_euler = (0.0, 0.0, 0.0)
    if mat:
        ob.data.materials.append(mat)
    _tag_lib(ob, cid, extra=extra)
    link(ob, col)
    return ob


def _empty(name, loc, parent, cid, col, *, kind="vehicle", extra=None, size=0.4):
    ob = bpy.data.objects.new(name, None)
    ob.empty_display_type = "PLAIN_AXES"
    ob.empty_display_size = size
    ob.parent = parent
    ob.location = loc
    bpy.context.scene.collection.objects.link(ob)
    _tag_lib(ob, cid, kind=kind, extra=extra)
    link(ob, col)
    return ob


def _box_mesh(w, d, h, *, bevel=0.0, segs=2):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co.x *= w
        v.co.y *= d
        v.co.z *= h
    if bevel > 0:
        bmesh.ops.bevel(
            bm,
            geom=list(bm.edges),
            offset=min(bevel, min(w, d, h) * 0.22),
            segments=segs,
            affect="EDGES",
            profile=0.72,
        )
        bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=1e-4)
    return bm


def _cyl_mesh(r, depth, segs=24, axis="z"):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=segs, radius1=r, radius2=r, depth=depth)
    if axis == "y":
        bmesh.ops.rotate(bm, verts=list(bm.verts), cent=(0, 0, 0), matrix=_rot_x(math.pi / 2))
    elif axis == "x":
        bmesh.ops.rotate(bm, verts=list(bm.verts), cent=(0, 0, 0), matrix=_rot_y(math.pi / 2))
    return bm


def _rot_x(a):
    from mathutils import Matrix

    return Matrix.Rotation(a, 3, "X")


def _rot_y(a):
    from mathutils import Matrix

    return Matrix.Rotation(a, 3, "Y")


def _rot_z(a):
    from mathutils import Matrix

    return Matrix.Rotation(a, 3, "Z")


def _smoothstep(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3.0 - 2.0 * t)


def _lerp(a, b, t):
    return a + (b - a) * t


def _roof_z(xn):
    """xn in [-1, 1], -1 = nose (front)."""
    if xn < -0.62:
        t = _smoothstep((xn + 1.0) / 0.38)
        return _lerp(0.56, 0.86, t)
    if xn < -0.18:
        t = _smoothstep((xn + 0.62) / 0.44)
        return _lerp(0.86, 1.405, t)
    if xn < 0.34:
        t = (xn + 0.18) / 0.52
        return _lerp(1.405, 1.375, t)
    if xn < 0.70:
        t = _smoothstep((xn - 0.34) / 0.36)
        return _lerp(1.375, 0.96, t)
    t = _smoothstep((xn - 0.70) / 0.30)
    return _lerp(0.98, 0.74, t)


def _half_width(xn, zh):
    nose = max(0.0, -xn)
    tail = max(0.0, xn)
    w = 1.0 - 0.18 * nose**1.55 - 0.11 * tail**1.85
    w *= 1.0 - 0.28 * max(0.0, zh - 0.52) ** 1.15
    return w


def _section_ring(x, n=24):
    xn = (2.0 * x) / L
    z_top = _roof_z(xn)
    z_belt = min(0.86, z_top * 0.62 + 0.12)
    z0 = 0.145
    hw = (W * 0.5) * _half_width(xn, 0.38)
    hw_roof = (W * 0.5) * _half_width(xn, 0.92) * 0.72
    well = 0.0
    for sx in (-WB / 2.0, WB / 2.0):
        dx = abs(x - sx)
        if dx < 0.40:
            well = max(well, math.sqrt(max(0.0, 0.38**2 - dx * dx)))
    z_side0 = z0 + 0.10 + well * 0.92
    keys = [
        (0.0, z0 + well * 0.08),
        (hw * 0.55, z0 + well * 0.18),
        (hw * 0.92, z_side0),
        (hw, z_belt * 0.55),
        (hw * 0.99, z_belt),
        (hw_roof * 1.05, z_belt + (z_top - z_belt) * 0.45),
        (hw_roof, z_top - 0.03),
        (hw_roof * 0.45, z_top),
        (0.0, z_top + 0.004),
    ]
    # Mirror to full loop: right side already, then left returning along bottom
    right = keys
    left = [(-y, z) for y, z in keys[-2:0:-1]]
    loop = right + left
    # Resample to n points
    pts = []
    m = len(loop)
    for i in range(n):
        t = i * m / n
        i0 = int(t) % m
        i1 = (i0 + 1) % m
        f = t - int(t)
        y = loop[i0][0] + (loop[i1][0] - loop[i0][0]) * f
        z = loop[i0][1] + (loop[i1][1] - loop[i0][1]) * f
        pts.append((y, z))
    return pts


def _build_body_hull():
    bm = bmesh.new()
    ns, nr = 28, 24
    xs = [-L * 0.5 + i * (L / (ns - 1)) for i in range(ns)]
    rings = []
    for x in xs:
        ring = []
        for y, z in _section_ring(x, nr):
            ring.append(bm.verts.new((x, y, z)))
        rings.append(ring)
    bm.verts.ensure_lookup_table()
    for i in range(ns - 1):
        a, b = rings[i], rings[i + 1]
        for j in range(nr):
            j2 = (j + 1) % nr
            try:
                bm.faces.new((a[j], a[j2], b[j2], b[j]))
            except ValueError:
                pass
    try:
        bm.faces.new(list(reversed(rings[0])))
    except ValueError:
        pass
    try:
        bm.faces.new(rings[-1])
    except ValueError:
        pass
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bmesh.ops.smooth_vert(bm, verts=list(bm.verts), factor=0.55, use_axis_x=True, use_axis_y=True, use_axis_z=True)
    try:
        bmesh.ops.solidify(bm, geom=list(bm.faces), thickness=0.045)
    except Exception:
        pass
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    return bm


def _panel(w, d, h, bevel=0.018):
    return _box_mesh(w, d, h, bevel=bevel, segs=3)


def _remove_existing():
    for ob in list(bpy.data.objects):
        if ob.get("asw_assetId") == AID:
            bpy.data.objects.remove(ob, do_unlink=True)
    for ob in list(bpy.data.objects):
        if ob.name.startswith(f"{AID}.cutter"):
            bpy.data.objects.remove(ob, do_unlink=True)


def _coat(mat):
    try:
        b = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
        if "Coat Weight" in b.inputs:
            b.inputs["Coat Weight"].default_value = 1.0
            b.inputs["Coat Roughness"].default_value = 0.06
        if "Specular IOR Level" in b.inputs:
            b.inputs["Specular IOR Level"].default_value = 0.55
    except StopIteration:
        pass
    return mat


def _add_subsurf(ob, levels=2):
    mod = ob.modifiers.new("asw_subsurf", "SUBSURF")
    mod.levels = 1
    mod.render_levels = levels
    mod.quality = 3
    return mod


def _boolean_wells(body, parent, col):
    cutters = []
    for i, (sx, sy) in enumerate(((-WB / 2, -TRACK / 2), (-WB / 2, TRACK / 2), (WB / 2, -TRACK / 2), (WB / 2, TRACK / 2))):
        name = f"{AID}.cutter.well{i}"
        bm = _cyl_mesh(0.405, 0.42, segs=28, axis="y")
        mesh = bpy.data.meshes.new(name)
        bm.to_mesh(mesh)
        bm.free()
        ob = bpy.data.objects.new(name, mesh)
        bpy.context.scene.collection.objects.link(ob)
        ob.parent = parent
        ob.location = (sx, sy, TYRE_R)
        ob.hide_viewport = True
        ob.hide_render = True
        ob.display_type = "BOUNDS"
        link(ob, col)
        cutters.append(ob)
        mod = body.modifiers.new(f"well{i}", "BOOLEAN")
        mod.operation = "DIFFERENCE"
        mod.object = ob
        try:
            mod.solver = "EXACT"
        except TypeError:
            pass
    return cutters


def _tyre_mesh():
    bm = bmesh.new()
    r_outer = TYRE_R
    r_inner = RIM_R + 0.012
    w = TYRE_W / 2
    # Cross-section in XY (radius, width), spin around Y → vertical wheel, axle along Y.
    pts = [
        (r_inner, -w * 0.90),
        (r_outer - 0.016, -w),
        (r_outer, -w * 0.70),
        (r_outer, w * 0.70),
        (r_outer - 0.016, w),
        (r_inner, w * 0.90),
    ]
    verts = [bm.verts.new((p[0], p[1], 0.0)) for p in pts]
    bm.verts.ensure_lookup_table()
    edges = [bm.edges.new((verts[i], verts[i + 1])) for i in range(len(verts) - 1)]
    edges.append(bm.edges.new((verts[-1], verts[0])))
    bmesh.ops.spin(
        bm,
        geom=list(verts) + edges,
        angle=math.tau,
        steps=36,
        axis=(0.0, 1.0, 0.0),
        cent=(0.0, 0.0, 0.0),
    )
    bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=0.0005)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    return bm


def _new_verts(bm, before):
    return [v for v in bm.verts if v not in before]


def _add_cyl_y(bm, r1, r2, depth, segs, y_off):
    before = set(bm.verts)
    bmesh.ops.create_cone(bm, cap_ends=True, segments=segs, radius1=r1, radius2=r2, depth=depth)
    verts = _new_verts(bm, before)
    bmesh.ops.rotate(bm, verts=verts, cent=(0, 0, 0), matrix=_rot_x(math.pi / 2))
    bmesh.ops.translate(bm, verts=verts, vec=(0.0, y_off, 0.0))
    return verts


def _rim_mesh():
    bm = bmesh.new()
    # Barrel (axle along Y)
    _add_cyl_y(bm, RIM_R, RIM_R * 0.90, TYRE_W * 0.70, 32, 0.0)
    # Outer lip
    _add_cyl_y(bm, RIM_R * 0.99, RIM_R * 0.93, 0.018, 32, TYRE_W * 0.28)
    # Aero face disc
    _add_cyl_y(bm, RIM_R * 0.92, 0.07, 0.016, 32, TYRE_W * 0.30)
    # Hub cap
    _add_cyl_y(bm, 0.055, 0.048, 0.03, 16, TYRE_W * 0.33)
    # Five turbine vanes
    for i in range(5):
        a = i * (math.tau / 5.0) + 0.18
        sx, sz = math.cos(a), math.sin(a)
        before = set(bm.verts)
        bmesh.ops.create_cube(bm, size=1.0)
        verts = _new_verts(bm, before)
        for v in verts:
            v.co.x *= 0.155
            v.co.y *= 0.012
            v.co.z *= 0.028
            v.co.x += 0.125
            v.co.y += TYRE_W * 0.325
            x, z = v.co.x, v.co.z
            v.co.x = x * sx - z * sz
            v.co.z = x * sz + z * sx
    bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=0.0008)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    return bm


def _brake_mesh():
    bm = _cyl_mesh(0.16, 0.018, segs=20, axis="y")
    return bm


def build_tesla_sedan():
    mats = ensure_mats(TESLA_MATS)
    env = ensure_mats(
        {
            "asw.mat.metal.dark": {"kind": "metal", "color": (0.12, 0.13, 0.14), "rough": 0.28, "metal": 0.94, "var": 0.02},
            "asw.mat.metal.brushed": {"kind": "metal", "color": (0.42, 0.44, 0.46), "rough": 0.42, "metal": 0.88, "var": 0.03},
            "asw.mat.glass.tinted": {"kind": "glass", "color": (0.42, 0.50, 0.38, 1), "rough": 0.06, "trans": 0.72},
        }
    )
    paint = _coat(mats["asw.mat.paint.tesla.pearl"])
    glass = mats["asw.mat.glass.tesla"]
    glass_roof = mats["asw.mat.glass.tesla.roof"]
    rubber = mats["asw.mat.rubber.tyre"]
    trim = mats["asw.mat.trim.tesla"]
    head = mats["asw.mat.light.tesla.head"]
    tail = mats["asw.mat.light.tesla.tail"]
    metal = env["asw.mat.metal.dark"]
    brushed = env["asw.mat.metal.brushed"]

    _remove_existing()

    lib = bpy.data.objects.get("Agentspace_Asset_Library")
    if lib is None:
        raise RuntimeError("Agentspace_Asset_Library empty missing")
    scene = bpy.context.scene.collection
    lib_col = bpy.data.collections.get("Agentspace_Asset_Library") or ensure_collection("Agentspace_Asset_Library", scene)
    veh = bpy.data.collections.get("Vehicles") or ensure_collection("Vehicles", lib_col)

    root = _empty(AID, ROOT_LOCAL, lib, "root", veh, kind="library_root", extra={"asw_libraryRoot": 1}, size=1.2)
    root.empty_display_size = 2.4

    # --- painted body ---
    body = _object_from_bm(f"{AID}.body", _build_body_hull(), (0, 0, 0), paint, root, "body", veh)
    _add_subsurf(body, 2)
    _boolean_wells(body, root, veh)

    under = _object_from_bm(
        f"{AID}.underbody",
        _box_mesh(L * 0.88, W * 0.62, 0.06, bevel=0.02),
        (0.04, 0, 0.155),
        metal,
        root,
        "underbody",
        veh,
    )

    hood = _object_from_bm(
        f"{AID}.hood",
        _box_mesh(1.28, 1.52, 0.045, bevel=0.04, segs=3),
        (-1.22, 0, 0.84),
        paint,
        root,
        "hood",
        veh,
    )
    hood.rotation_euler[1] = math.radians(6.5)
    _add_subsurf(hood, 1)

    trunk = _object_from_bm(
        f"{AID}.trunk",
        _box_mesh(0.78, 1.46, 0.04, bevel=0.035, segs=3),
        (1.72, 0, 0.90),
        paint,
        root,
        "trunk",
        veh,
    )
    trunk.rotation_euler[1] = math.radians(-8.0)
    _add_subsurf(trunk, 1)

    bumper_f = _object_from_bm(
        f"{AID}.bumper.front",
        _box_mesh(0.28, 1.72, 0.38, bevel=0.08, segs=3),
        (-2.28, 0, 0.42),
        paint,
        root,
        "bumper.front",
        veh,
    )
    _add_subsurf(bumper_f, 1)

    bumper_r = _object_from_bm(
        f"{AID}.bumper.rear",
        _box_mesh(0.26, 1.68, 0.36, bevel=0.07, segs=3),
        (2.26, 0, 0.40),
        paint,
        root,
        "bumper.rear",
        veh,
    )
    _add_subsurf(bumper_r, 1)

    lip = _object_from_bm(
        f"{AID}.diffuser",
        _box_mesh(0.18, 1.22, 0.08, bevel=0.02),
        (2.32, 0, 0.20),
        trim,
        root,
        "diffuser",
        veh,
    )

    # --- glass ---
    windshield = _object_from_bm(
        f"{AID}.windshield",
        _box_mesh(1.05, 1.38, 0.028, bevel=0.04, segs=2),
        (-0.52, 0, 1.16),
        glass,
        root,
        "windshield",
        veh,
    )
    windshield.rotation_euler[1] = math.radians(32.0)

    roof = _object_from_bm(
        f"{AID}.roof",
        _box_mesh(1.55, 1.22, 0.022, bevel=0.06, segs=3),
        (0.18, 0, 1.388),
        glass_roof,
        root,
        "roof",
        veh,
    )
    roof.rotation_euler[1] = math.radians(-1.8)

    backlight = _object_from_bm(
        f"{AID}.glass.rear",
        _box_mesh(0.82, 1.28, 0.024, bevel=0.03),
        (1.12, 0, 1.18),
        glass,
        root,
        "glass.rear",
        veh,
    )
    backlight.rotation_euler[1] = math.radians(-38.0)

    for side, ys in (("left", -0.78), ("right", 0.78)):
        g1 = _object_from_bm(
            f"{AID}.glass.side.front.{side}",
            _box_mesh(0.78, 0.018, 0.38, bevel=0.02),
            (-0.18, ys, 1.08),
            glass,
            root,
            f"glass.side.front.{side}",
            veh,
        )
        g1.rotation_euler[1] = math.radians(8.0)
        g2 = _object_from_bm(
            f"{AID}.glass.side.rear.{side}",
            _box_mesh(0.62, 0.018, 0.34, bevel=0.02),
            (0.62, ys, 1.10),
            glass,
            root,
            f"glass.side.rear.{side}",
            veh,
        )
        g2.rotation_euler[1] = math.radians(-12.0)

    # A / C pillars
    for side, ys in (("left", -0.72), ("right", 0.72)):
        a = _object_from_bm(
            f"{AID}.pillar.a.{side}",
            _box_mesh(0.06, 0.05, 0.52, bevel=0.012),
            (-0.78, ys, 1.10),
            trim,
            root,
            f"pillar.a.{side}",
            veh,
        )
        a.rotation_euler[1] = math.radians(28.0)
        c = _object_from_bm(
            f"{AID}.pillar.c.{side}",
            _box_mesh(0.08, 0.05, 0.42, bevel=0.012),
            (0.98, ys, 1.12),
            trim,
            root,
            f"pillar.c.{side}",
            veh,
        )
        c.rotation_euler[1] = math.radians(-32.0)

    # --- doors / handles ---
    for side, ys in (("left", -0.918), ("right", 0.918)):
        df = _object_from_bm(
            f"{AID}.door.front.{side}",
            _box_mesh(1.05, 0.018, 0.62, bevel=0.02, segs=2),
            (-0.12, ys, 0.58),
            paint,
            root,
            f"door.front.{side}",
            veh,
        )
        _add_subsurf(df, 1)
        dr = _object_from_bm(
            f"{AID}.door.rear.{side}",
            _box_mesh(0.82, 0.018, 0.58, bevel=0.02, segs=2),
            (0.82, ys, 0.56),
            paint,
            root,
            f"door.rear.{side}",
            veh,
        )
        _add_subsurf(dr, 1)
        _object_from_bm(
            f"{AID}.handle.front.{side}",
            _box_mesh(0.16, 0.018, 0.022, bevel=0.006),
            (0.18, ys * 1.018, 0.78),
            trim,
            root,
            f"handle.front.{side}",
            veh,
        )
        _object_from_bm(
            f"{AID}.handle.rear.{side}",
            _box_mesh(0.14, 0.018, 0.022, bevel=0.006),
            (0.98, ys * 1.018, 0.76),
            trim,
            root,
            f"handle.rear.{side}",
            veh,
        )

    # --- mirrors ---
    for side, ys in (("left", -0.96), ("right", 0.96)):
        arm = _object_from_bm(
            f"{AID}.mirror.{side}",
            _box_mesh(0.10, 0.16, 0.09, bevel=0.03, segs=2),
            (-0.62, ys, 0.96),
            paint,
            root,
            f"mirror.{side}",
            veh,
        )
        _add_subsurf(arm, 1)
        _object_from_bm(
            f"{AID}.mirror.glass.{side}",
            _box_mesh(0.02, 0.13, 0.07, bevel=0.008),
            (-0.68, ys * 1.01, 0.96),
            glass,
            root,
            f"mirror.glass.{side}",
            veh,
        )

    # --- lights ---
    for side, ys in (("left", -0.68), ("right", 0.68)):
        hl = _object_from_bm(
            f"{AID}.headlight.{side}",
            _box_mesh(0.16, 0.34, 0.08, bevel=0.04, segs=3),
            (-2.30, ys, 0.68),
            head,
            root,
            f"headlight.{side}",
            veh,
        )
        _add_subsurf(hl, 1)
        tl = _object_from_bm(
            f"{AID}.taillight.{side}",
            _box_mesh(0.08, 0.38, 0.07, bevel=0.03, segs=3),
            (2.34, ys, 0.78),
            tail,
            root,
            f"taillight.{side}",
            veh,
        )
        _add_subsurf(tl, 1)

    _object_from_bm(
        f"{AID}.headlight.bar",
        _box_mesh(0.04, 1.42, 0.018, bevel=0.006),
        (-2.355, 0, 0.70),
        head,
        root,
        "headlight.bar",
        veh,
    )
    _object_from_bm(
        f"{AID}.taillight.bar",
        _box_mesh(0.04, 1.52, 0.028, bevel=0.008),
        (2.36, 0, 0.80),
        tail,
        root,
        "taillight.bar",
        veh,
    )

    _object_from_bm(
        f"{AID}.charge.port",
        _box_mesh(0.08, 0.04, 0.12, bevel=0.01),
        (1.55, -0.92, 0.72),
        trim,
        root,
        "charge.port",
        veh,
    )

    # --- wheels ---
    corners = {
        "front.left": (-WB / 2, -TRACK / 2),
        "front.right": (-WB / 2, TRACK / 2),
        "rear.left": (WB / 2, -TRACK / 2),
        "rear.right": (WB / 2, TRACK / 2),
    }
    for key, (wx, wy) in corners.items():
        wempty = _empty(f"{AID}.wheel.{key}", (wx, wy, TYRE_R), root, f"wheel.{key}", veh, size=0.3)
        tyre = _object_from_bm(f"{AID}.tyre.{key}", _tyre_mesh(), (0, 0, 0), rubber, wempty, f"tyre.{key}", veh)
        rim = _object_from_bm(f"{AID}.rim.{key}", _rim_mesh(), (0, 0, 0), brushed, wempty, f"rim.{key}", veh)
        brake = _object_from_bm(f"{AID}.brake.{key}", _brake_mesh(), (0, 0, 0), metal, wempty, f"brake.{key}", veh)
        # Mirror right-side rims so the aero face points outward
        if wy < 0:
            rim.rotation_euler[2] = math.pi
            brake.rotation_euler[2] = math.pi

    # Origin sanity: root local, children relative, scale 1
    root.scale = (1.0, 1.0, 1.0)
    root.rotation_euler = (0.0, 0.0, 0.0)

    comps = [o for o in bpy.data.objects if o.get("asw_assetId") == AID]
    bb = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9]
    for ob in comps:
        if ob.type != "MESH":
            continue
        for corner in ob.bound_box:
            wco = ob.matrix_world @ Vector(corner)
            bb[0] = min(bb[0], wco.x)
            bb[1] = min(bb[1], wco.y)
            bb[2] = min(bb[2], wco.z)
            bb[3] = max(bb[3], wco.x)
            bb[4] = max(bb[4], wco.y)
            bb[5] = max(bb[5], wco.z)
    dims = (bb[3] - bb[0], bb[4] - bb[1], bb[5] - bb[2])
    origin_d = (root.matrix_world.translation - LIBRARY_ORIGIN).length
    return {
        "assetId": AID,
        "components": len(comps),
        "rootWorld": list(root.matrix_world.translation),
        "originDistance": round(origin_d, 4),
        "dims": [round(v, 4) for v in dims],
        "blend": bpy.data.filepath,
    }


def frame_tesla_viewport():
    root = bpy.data.objects.get(AID)
    if root is None:
        return False
    target = root.matrix_world.translation + Vector((0.0, 0.0, 0.72))
    for window in bpy.context.window_manager.windows:
        screen = window.screen
        for area in screen.areas:
            if area.type != "VIEW_3D":
                continue
            space = area.spaces.active
            space.shading.type = "MATERIAL"
            space.overlay.show_overlays = False
            rv3d = space.region_3d
            rv3d.view_perspective = "PERSP"
            rv3d.view_location = target
            rv3d.view_distance = 7.4
            from mathutils import Euler, Quaternion

            rv3d.view_rotation = Euler((math.radians(68.0), 0.0, math.radians(48.0)), "XYZ").to_quaternion()
            # Hide distant world clutter in this viewport only
            space.clip_start = 0.05
            space.clip_end = 80.0
            return True
    return False
