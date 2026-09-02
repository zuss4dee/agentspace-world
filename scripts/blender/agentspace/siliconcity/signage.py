"""Signage: toy_font block wordmarks + logo plaques (roof + facade) + placeholder logos."""
from __future__ import annotations

import math
from pathlib import Path

import bmesh
import bpy

from ..toy_font import GLYPH_H, GLYPH_W, glyph_advance, glyph_rects, sanitize_wordmark, wordmark_width
from .primitives import Face, Mass

GAP = 0.14


def fit_scale(text: str, max_w: float, *, s: float, gap: float = GAP) -> float:
    """Largest glyph scale ≤ s so the wordmark fits `max_w`."""
    if not text:
        return s
    adv = sum(glyph_advance(ch) for ch in text)
    if adv <= 0:
        return s
    fit = (max_w - gap * (len(text) - 1)) / adv
    return max(0.2, min(s, fit))


def wordmark_on_face(ctx, name: str, text: str, face: Face, u_center: float, z_base: float, mat, *, s: float = 1.0, depth: float = 0.26, max_w: float | None = None, kind="signage", out: float = 0.0):
    """Block-letter wordmark standing proud of a wall, centred on `u_center`. Returns (scale, width)."""
    text = sanitize_wordmark(text)
    if not text:
        return s, 0.0
    if max_w is not None:
        s = fit_scale(text, max_w, s=s)
    width = wordmark_width(text, s=s, gap=GAP)
    cursor = u_center - width / 2
    for li, ch in enumerate(text):
        if ch != " ":
            for bi, (lx, lz, lw, lh) in enumerate(glyph_rects(ch)):
                u = cursor + (lx + lw / 2) * s
                z = z_base + (lz + lh / 2) * s
                loc, dims = face.place(u, z, lw * s, depth, lh * s, out=out)
                ctx.box(f"{name}.{ch.lower()}{li}.{bi}", *dims, loc, mat, kind=kind)
        cursor += glyph_advance(ch) * s + GAP
    return s, width


def wordmark_flat(ctx, name: str, text: str, x: float, y: float, z: float, mat, *, s: float = 1.0, thick: float = 0.22, max_w: float | None = None, kind="signage"):
    """Wordmark lying flat on a roof, read from the street (-Y): letters advance +X, glyph-up = +Y."""
    text = sanitize_wordmark(text)
    if not text:
        return s, 0.0
    if max_w is not None:
        s = fit_scale(text, max_w, s=s)
    width = wordmark_width(text, s=s, gap=GAP)
    cursor = x - width / 2
    y0 = y - GLYPH_H * s / 2
    for li, ch in enumerate(text):
        if ch != " ":
            for bi, (lx, lz, lw, lh) in enumerate(glyph_rects(ch)):
                ctx.box(f"{name}.{ch.lower()}{li}.{bi}", lw * s, lh * s, thick, (cursor + (lx + lw / 2) * s, y0 + (lz + lh / 2) * s, z + thick / 2), mat, kind=kind)
        cursor += glyph_advance(ch) * s + GAP
    return s, width


def monogram_flat(ctx, name: str, letter: str, x: float, y: float, z: float, size: float, mat, *, thick=0.22):
    s = size / GLYPH_H
    wordmark_flat(ctx, name, letter, x, y, z, mat, s=s, thick=thick, kind="brand")


# ---------------------------------------------------------------------------
# Textured plaque (image-mapped 0..1 on the big faces)
# ---------------------------------------------------------------------------


def _uv_box(ctx, name: str, w: float, d: float, h: float, loc, mat, *, thin_axis: str, kind="brand", rot=None):
    """Box whose two large faces carry 0..1 UVs (logo image), side faces map to the centre pixel."""
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co.x *= w
        v.co.y *= d
        v.co.z *= h
    uvl = bm.loops.layers.uv.new("UVMap")
    for f in bm.faces:
        n = f.normal
        big = (thin_axis == "z" and abs(n.z) > 0.5) or (thin_axis == "y" and abs(n.y) > 0.5) or (thin_axis == "x" and abs(n.x) > 0.5)
        for loop in f.loops:
            c = loop.vert.co
            if not big:
                loop[uvl].uv = (0.5, 0.5)
            elif thin_axis == "z":
                # roof plaque viewed from above with the street at -Y: right=+X, up=+Y
                u = c.x / w + 0.5
                v = c.y / d + 0.5
                loop[uvl].uv = (u if n.z > 0 else 1 - u, v)
            elif thin_axis == "y":
                # wall plaque built facing -Y: right=+X, up=+Z (mirrored on the back face)
                u = c.x / w + 0.5
                v = c.z / h + 0.5
                loop[uvl].uv = (u if n.y < 0 else 1 - u, v)
            else:
                u = c.y / d + 0.5
                v = c.z / h + 0.5
                loop[uvl].uv = (u if n.x < 0 else 1 - u, v)
        f.smooth = False
    bm.to_mesh(mesh)
    bm.free()
    ob = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(ob)
    ob.location = loc
    ob.parent = ctx.root
    ob.data.materials.append(ctx.mat(mat))
    return ctx.adopt(ob, name, kind, rot=rot)


def logo_flat(ctx, name: str, x: float, y: float, z: float, size: float, *, backing_mat="cream", letter_mat=None, yaw: float = 0.0):
    """Roof logo: bevelled backing plaque + textured image (or brand monogram fallback), lying flat."""
    thick = 0.3
    rot = (0.0, 0.0, yaw) if yaw else None
    ctx.box(f"{name}.plaque", size, size, thick, (x, y, z + thick / 2), backing_mat, bevel=0.14, kind="brand", rot=rot)
    if ctx.logo_mat is not None:
        _uv_box(ctx, f"{name}.image", size * 0.86, size * 0.86, 0.06, (x, y, z + thick + 0.03), ctx.logo_mat, thin_axis="z", rot=rot)
    else:
        inner = size * 0.72
        ctx.box(f"{name}.tile", inner, inner, 0.14, (x, y, z + thick + 0.07), "brand", bevel=0.1, kind="brand", rot=rot)
        monogram_flat(ctx, f"{name}.mono", ctx.profile.initial(), x, y, z + thick + 0.14, inner * 0.62, letter_mat or ctx.letters_on_brand, thick=0.16)
    return z + thick + 0.2


def logo_on_face(ctx, name: str, face: Face, u: float, z_center: float, size: float, *, backing_mat="cream", letter_mat=None, out: float = 0.0):
    """Facade logo plaque centred at (u, z_center) on a wall face."""
    thick = 0.3
    loc, dims = face.place(u, z_center, size, thick, size, out=out)
    ctx.box(f"{name}.plaque", *dims, loc, backing_mat, bevel=0.14, kind="brand")
    if ctx.logo_mat is not None:
        iloc, _ = face.place(u, z_center, 0.0, 0.06, 0.0, out=out + thick + 0.005)
        _uv_box(ctx, f"{name}.image", size * 0.86, 0.06, size * 0.86, iloc, ctx.logo_mat, thin_axis="y", rot=(0.0, 0.0, face.yaw))
    else:
        inner = size * 0.72
        tloc, tdims = face.place(u, z_center, inner, 0.14, inner, out=out + thick)
        ctx.box(f"{name}.tile", *tdims, tloc, "brand", bevel=0.1, kind="brand")
        s = inner * 0.62 / GLYPH_H
        wordmark_on_face(ctx, f"{name}.mono", ctx.profile.initial(), face, u, z_center - inner * 0.31, letter_mat or ctx.letters_on_brand, s=s, depth=0.16, out=out + thick + 0.14, kind="brand")


def fascia_sign(ctx, name: str, face: Face, u: float, z: float, span: float, h: float, band_mat, letter_mat, text: str, *, out: float = 0.0, letter_depth=0.2):
    """Shop fascia band with the wordmark centred on it."""
    loc, dims = face.place(u, z, span, 0.34, h, out=out)
    ctx.box(f"{name}.band", *dims, loc, band_mat, bevel=0.06, kind="signage")
    s = (h * 0.6) / GLYPH_H
    wordmark_on_face(ctx, f"{name}.text", text, face, u, z - h * 0.3, letter_mat, s=s, depth=letter_depth, max_w=span * 0.86, out=out + 0.34)


# ---------------------------------------------------------------------------
# Placeholder logo PNGs (no PIL in Blender's Python — pure pixel fill)
# ---------------------------------------------------------------------------


def _srgb(v: float) -> float:
    v = max(0.0, min(1.0, v))
    return v * 12.92 if v <= 0.0031308 else 1.055 * (v ** (1 / 2.4)) - 0.055


def make_placeholder_logo_png(path: str | Path, letter: str, bg_linear, fg_linear, *, size: int = 256, radius_frac: float = 0.22) -> str:
    """Rounded brand-coloured square + bold toy_font initial, saved as RGBA PNG.

    Colours are LINEAR RGB (Blender convention); converted to sRGB bytes on write.
    """
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    name = f"asw.tmp.logo.{path.stem}"
    old = bpy.data.images.get(name)
    if old is not None:
        bpy.data.images.remove(old)
    img = bpy.data.images.new(name, width=size, height=size, alpha=True)
    bg = tuple(_srgb(c) for c in bg_linear[:3])
    fg = tuple(_srgb(c) for c in fg_linear[:3])
    rad = size * radius_frac
    # letter cells (glyph space 0..0.72 × 0..1) mapped into a centred 58% box
    rects = glyph_rects((letter or "A")[0])
    box_h = size * 0.58
    box_w = box_h * GLYPH_W / GLYPH_H
    ox = (size - box_w) / 2
    oy = (size - box_h) / 2
    px = [0.0] * (size * size * 4)
    for y in range(size):
        for x in range(size):
            # rounded square mask
            dx = max(rad - x, x - (size - 1 - rad), 0.0)
            dy = max(rad - y, y - (size - 1 - rad), 0.0)
            inside = (dx * dx + dy * dy) <= rad * rad
            i = (y * size + x) * 4
            if not inside:
                px[i + 3] = 0.0
                continue
            gx = (x - ox) / box_h  # glyph units (height-normalised)
            gy = (y - oy) / box_h
            in_letter = any(lx <= gx < lx + lw and lz <= gy < lz + lh for (lx, lz, lw, lh) in rects)
            c = fg if in_letter else bg
            px[i], px[i + 1], px[i + 2], px[i + 3] = c[0], c[1], c[2], 1.0
    try:
        img.pixels.foreach_set(px)
    except Exception:
        img.pixels[:] = px
    img.filepath_raw = str(path)
    img.file_format = "PNG"
    img.save()
    bpy.data.images.remove(img)
    return str(path)


def rad(deg: float) -> float:
    return math.radians(deg)
