"""Primitive builders that never join meshes."""
from __future__ import annotations

import bpy
import bmesh

from .registry import tag


def ensure_collection(name: str, parent=None):
    col = bpy.data.collections.get(name) or bpy.data.collections.new(name)
    root = parent or bpy.context.scene.collection
    if col.name not in {c.name for c in root.children}:
        root.children.link(col)
    return col


def empty(name: str, loc=(0, 0, 0), parent=None, collection=None):
    ob = bpy.data.objects.new(name, None)
    ob.empty_display_type = "PLAIN_AXES"
    ob.empty_display_size = 8
    ob.location = loc
    if parent:
        ob.parent = parent
    (collection or bpy.context.scene.collection).objects.link(ob)
    return ob


def link(ob, col):
    for c in list(ob.users_collection):
        c.objects.unlink(ob)
    col.objects.link(ob)
    return ob


def box(name, w, d, h, loc, mat, parent, *, bevel=0.0, uv=0.07, **tag_kw):
    mesh = bpy.data.meshes.new(name)
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
            offset=min(bevel, min(w, d, h) * 0.18),
            segments=2,
            affect="EDGES",
            profile=0.7,
        )
        bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=1e-4)
    uvl = bm.loops.layers.uv.new("UVMap")
    for f in bm.faces:
        n = f.normal
        for loop in f.loops:
            c = loop.vert.co
            if abs(n.z) >= abs(n.x) and abs(n.z) >= abs(n.y):
                loop[uvl].uv = (c.x * uv, c.y * uv)
            elif abs(n.y) >= abs(n.x):
                loop[uvl].uv = (c.x * uv, c.z * uv)
            else:
                loop[uvl].uv = (c.y * uv, c.z * uv)
        f.smooth = True
    bm.to_mesh(mesh)
    bm.free()
    ob = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(ob)
    ob.location = loc
    if parent:
        ob.parent = parent
    if mat:
        ob.data.materials.append(mat)
    if tag_kw:
        tag(ob, **tag_kw)
    return ob


def cyl(name, r, h, loc, mat, parent, *, segs=12, **tag_kw):
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=segs, radius1=r, radius2=r, depth=h)
    for f in bm.faces:
        f.smooth = True
    bm.to_mesh(mesh)
    bm.free()
    ob = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(ob)
    ob.location = loc
    if parent:
        ob.parent = parent
    if mat:
        ob.data.materials.append(mat)
    if tag_kw:
        tag(ob, **tag_kw)
    return ob


def prism(name, outline_xy, h, loc, mat, parent, **tag_kw):
    """Extrude a 2D outline (local XY, origin at loc) into a slab. Outline is a list of (x, y)."""
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    verts = [bm.verts.new((x, y, -h / 2)) for x, y in outline_xy]
    bm.verts.ensure_lookup_table()
    try:
        bm.faces.new(verts)
    except ValueError:
        bm.free()
        return box(name, 1, 1, h, loc, mat, parent, **tag_kw)
    geom = bmesh.ops.extrude_face_region(bm, geom=list(bm.faces))
    extruded = [v for v in geom["geom"] if isinstance(v, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, verts=extruded, vec=(0, 0, h))
    for f in bm.faces:
        f.smooth = False
    bm.to_mesh(mesh)
    bm.free()
    ob = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(ob)
    ob.location = loc
    if parent:
        ob.parent = parent
    if mat:
        ob.data.materials.append(mat)
    if tag_kw:
        tag(ob, **tag_kw)
    return ob


def linked_dup(src, name, loc, parent, **tag_kw):
    ob = src.copy()
    ob.data = src.data
    ob.name = name
    ob.location = loc
    ob.parent = parent
    bpy.context.scene.collection.objects.link(ob)
    for key in ("asw_staging", "asw_library", "asw_libraryRoot"):
        if key in ob:
            del ob[key]
    if tag_kw:
        tag(ob, **tag_kw)
    return ob


def linked_place(src, name, loc, parent, scale=(1, 1, 1), rotation_z=0.0, **tag_kw):
    ob = linked_dup(src, name, loc, parent, **tag_kw)
    ob.scale = scale
    ob.rotation_euler.z = rotation_z
    ob.hide_set(False)
    ob.hide_viewport = False
    ob.hide_render = False
    return ob


def greedy_rects(cells):
    """Merge grid cells into axis-aligned rectangles. cells is iterable of (x, y)."""
    pending = set(cells)
    rects = []
    while pending:
        x, y = min(pending)
        w = 1
        while (x + w, y) in pending:
            w += 1
        h = 1
        while all((x + dx, y + h) in pending for dx in range(w)):
            h += 1
        for dx in range(w):
            for dy in range(h):
                pending.discard((x + dx, y + dy))
        rects.append((x, y, w, h))
    return rects


def cone(name, r, h, loc, mat, parent, *, segs=10, **tag_kw):
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=segs, radius1=r, radius2=r * 0.08, depth=h)
    for f in bm.faces:
        f.smooth = True
    bm.to_mesh(mesh)
    bm.free()
    ob = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(ob)
    ob.location = loc
    if parent:
        ob.parent = parent
    if mat:
        ob.data.materials.append(mat)
    if tag_kw:
        tag(ob, **tag_kw)
    return ob


def ico(name, r, loc, mat, parent, *, subdiv=1, **tag_kw):
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=subdiv, radius=r)
    for f in bm.faces:
        f.smooth = True
    bm.to_mesh(mesh)
    bm.free()
    ob = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(ob)
    ob.location = loc
    if parent:
        ob.parent = parent
    if mat:
        ob.data.materials.append(mat)
    if tag_kw:
        tag(ob, **tag_kw)
    return ob
