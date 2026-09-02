"""Chunky toy-architecture primitives (Silicon City daylight diorama).

Coordinate conventions: root at plot centre, street/front is -Y, Z up.
Every helper takes `ctx` (siliconcity.builder.Ctx) first and returns nothing
useful except geometry — archetypes compose these.
"""
from __future__ import annotations

import math
from dataclasses import dataclass

from mathutils import Matrix

SIDES = ("front", "back", "left", "right")

# Prism outlines live in local XY and extrude along local Z. This rotation maps
# local X→world Y, local Y→world Z, local Z→world X, i.e. a profile drawn in the
# YZ plane extruded along the building length (X).
_PROFILE_ALONG_X = Matrix(((0, 0, 1), (1, 0, 0), (0, 1, 0))).to_euler()
# Profile drawn in XZ, extruded along Y (local X→world X, local Y→world Z, local Z→world -Y).
_PROFILE_ALONG_Y = Matrix(((1, 0, 0), (0, 0, -1), (0, 1, 0))).to_euler()


@dataclass
class Mass:
    """Axis-aligned block: centre (x, y), base z0, size w×d×h."""

    x: float
    y: float
    z0: float
    w: float
    d: float
    h: float

    @property
    def top(self) -> float:
        return self.z0 + self.h

    @property
    def cz(self) -> float:
        return self.z0 + self.h / 2

    @property
    def loc(self) -> tuple[float, float, float]:
        return (self.x, self.y, self.cz)

    def face(self, side: str) -> "Face":
        return Face(self, side)

    @property
    def x0(self) -> float:
        return self.x - self.w / 2

    @property
    def x1(self) -> float:
        return self.x + self.w / 2

    @property
    def y0(self) -> float:
        return self.y - self.d / 2

    @property
    def y1(self) -> float:
        return self.y + self.d / 2


@dataclass
class Face:
    """One vertical face of a Mass. `u` runs along the face, positive = viewer's right."""

    mass: Mass
    side: str

    @property
    def length(self) -> float:
        return self.mass.w if self.side in ("front", "back") else self.mass.d

    @property
    def yaw(self) -> float:
        """Z rotation turning a -Y-facing object to face outward from this side."""
        return {"front": 0.0, "right": math.pi / 2, "back": math.pi, "left": -math.pi / 2}[self.side]

    def place(self, u: float, z: float, size_u: float, thick: float, h: float, *, out: float = 0.0):
        """(loc, (w, d, h)) for a box of `size_u` along the face, `thick` outward, starting at the face plane + out."""
        m = self.mass
        off = thick / 2 + out
        if self.side == "front":
            return (m.x + u, m.y0 - off, z), (size_u, thick, h)
        if self.side == "back":
            return (m.x - u, m.y1 + off, z), (size_u, thick, h)
        if self.side == "left":
            return (m.x0 - off, m.y - u, z), (thick, size_u, h)
        return (m.x1 + off, m.y + u, z), (thick, size_u, h)

    def point(self, u: float, z: float, out: float = 0.0) -> tuple[float, float, float]:
        (loc, _dims) = self.place(u, z, 0.0, 0.0, 0.0, out=out)
        return loc


# ---------------------------------------------------------------------------
# Masses, trims, roofs
# ---------------------------------------------------------------------------


def block(ctx, name: str, m: Mass, mat, *, bevel: float | None = None, kind="structure", rot_z: float = 0.0):
    rot = (0.0, 0.0, rot_z) if rot_z else None
    return ctx.box(name, m.w, m.d, m.h, m.loc, mat, bevel=ctx.bevel if bevel is None else bevel, kind=kind, rot=rot)


def floor_lines(ctx, name: str, m: Mass, levels, mat="cream", *, thick=0.34, proud=0.22):
    """Horizontal trim slabs wrapping the mass at each floor level (visible floor lines)."""
    for i, z in enumerate(levels):
        ctx.box(f"{name}.floorline.{i}", m.w + proud * 2, m.d + proud * 2, thick, (m.x, m.y, z), mat, bevel=0.06, kind="facade")


def parapet(ctx, name: str, m: Mass, mat="cream", *, h=0.62, t=0.42, proud=0.16, z=None):
    """Four chunky parapet bars around the roof edge (white lip crowded roofs sit inside)."""
    z0 = m.top if z is None else z
    cz = z0 + h / 2
    w, d = m.w + proud * 2, m.d + proud * 2
    ctx.box(f"{name}.parapet.f", w, t, h, (m.x, m.y - d / 2 + t / 2, cz), mat, bevel=0.08, kind="roof")
    ctx.box(f"{name}.parapet.b", w, t, h, (m.x, m.y + d / 2 - t / 2, cz), mat, bevel=0.08, kind="roof")
    ctx.box(f"{name}.parapet.l", t, d - t * 2, h, (m.x - w / 2 + t / 2, m.y, cz), mat, bevel=0.08, kind="roof")
    ctx.box(f"{name}.parapet.r", t, d - t * 2, h, (m.x + w / 2 - t / 2, m.y, cz), mat, bevel=0.08, kind="roof")
    return z0 + h


def roof_slab(ctx, name: str, m: Mass, mat="roof", *, inset=0.35, t=0.16):
    ctx.box(f"{name}.roofslab", m.w - inset * 2, m.d - inset * 2, t, (m.x, m.y, m.top + t / 2), mat, kind="roof")
    return m.top + t


def flat_roof(ctx, name: str, m: Mass, *, parapet_mat="cream", roof_mat="roof", parapet_h=0.62):
    """Roof slab + parapet lip; returns the roof deck z where props sit."""
    z = roof_slab(ctx, name, m, roof_mat)
    parapet(ctx, name, m, parapet_mat, h=parapet_h)
    return z


def trim_slab(ctx, name: str, m: Mass, mat="cream", *, z=None, t=0.7, proud=0.55):
    """Thick white slab between stacked cubes / at a podium top."""
    zz = m.top if z is None else z
    ctx.box(f"{name}.trim", m.w + proud * 2, m.d + proud * 2, t, (m.x, m.y, zz + t / 2), mat, bevel=0.1, kind="facade")
    return zz + t


def pitched_cap(ctx, name: str, m: Mass, mat, *, rise=None, along="x", overhang=0.5, ridge_mat=None):
    """Chunky gable roof over a mass (triangular prism)."""
    rise = rise or min(m.w, m.d) * 0.42
    if along == "x":
        half = m.d / 2 + overhang
        outline = [(-half, 0.0), (half, 0.0), (0.0, rise)]
        ctx.prism(f"{name}.gable", outline, m.w + overhang * 2, (m.x, m.y, m.top), mat, kind="roof", rot=_PROFILE_ALONG_X)
        if ridge_mat:
            ctx.box(f"{name}.ridge", m.w + overhang * 2 + 0.2, 0.5, 0.3, (m.x, m.y, m.top + rise), ridge_mat, bevel=0.08, kind="roof")
    else:
        half = m.w / 2 + overhang
        outline = [(-half, 0.0), (half, 0.0), (0.0, rise)]
        ctx.prism(f"{name}.gable", outline, m.d + overhang * 2, (m.x, m.y, m.top), mat, kind="roof", rot=_PROFILE_ALONG_Y)
        if ridge_mat:
            ctx.box(f"{name}.ridge", 0.5, m.d + overhang * 2 + 0.2, 0.3, (m.x, m.y, m.top + rise), ridge_mat, bevel=0.08, kind="roof")
    return m.top + rise


def barrel_vault(ctx, name: str, x, y, z, length, span, mat_a, mat_b, *, slats=9, rise=None, end_mat=None, gap=0.04):
    """Striped barrel-vault roof running along X (Lovable): rotated slats + semicircle end gables."""
    r = span / 2
    rise = rise or r
    sy = rise / r  # vertical squash of the arch
    n = max(5, slats)
    step = math.pi / n
    for i in range(n):
        a0 = step * i
        a1 = step * (i + 1)
        am = (a0 + a1) / 2
        chord = 2 * r * math.sin(step / 2) * 1.02 - gap
        cy = y + r * math.cos(am)
        cz = z + r * math.sin(am) * sy
        thick = 0.32
        # rotate about X so the slat's +Y edge follows the (squashed) arch tangent
        tilt = math.atan2(-sy * math.cos(am), math.sin(am))
        mat = mat_a if i % 2 == 0 else mat_b
        ctx.box(f"{name}.slat.{i}", length, chord, thick, (x, cy, cz), mat, bevel=0.05, kind="roof", rot=(tilt, 0.0, 0.0))
    # end gables (filled half-discs; the diameter closes the polygon)
    pts = [(r * math.cos(a), r * math.sin(a) * sy) for a in [math.pi * k / 18 for k in range(19)]]
    ends = end_mat or mat_a
    for side, ex in (("l", x - length / 2 + 0.3), ("r", x + length / 2 - 0.3)):
        ctx.prism(f"{name}.gable.{side}", pts, 0.6, (ex, y, z), ends, kind="roof", rot=_PROFILE_ALONG_X)
    # eave lips along both long edges
    for side, ey in (("f", y - r), ("b", y + r)):
        ctx.box(f"{name}.eave.{side}", length + 0.4, 0.5, 0.42, (x, ey, z + 0.18), mat_b, bevel=0.08, kind="roof")
    return z + rise


def sawtooth_roof(ctx, name: str, m: Mass, units: int, mat_slope, mat_glass, mat_trim, *, rise=3.2):
    """Repeated wedge roof units along X with glazed vertical faces (north lights)."""
    uw = m.w / units
    for i in range(units):
        cx = m.x0 + uw * (i + 0.5)
        outline = [(-uw / 2, 0.0), (uw / 2, 0.0), (uw / 2, rise)]
        ctx.prism(f"{name}.tooth.{i}", outline, m.d, (cx, m.y, m.top), mat_slope, kind="roof", rot=_PROFILE_ALONG_Y)
        # glazed riser on the vertical (+X) face of each tooth
        ctx.box(f"{name}.tooth.{i}.glass", 0.22, m.d * 0.86, rise * 0.72, (cx + uw / 2 - 0.05, m.y, m.top + rise * 0.42), mat_glass, kind="window")
        ctx.box(f"{name}.tooth.{i}.frame", 0.3, m.d * 0.9, 0.3, (cx + uw / 2 - 0.02, m.y, m.top + rise * 0.8), mat_trim, kind="roof")
    return m.top + rise


def rotunda(ctx, name: str, x, y, z0, r, h, floors: int, body_mat, glass_mat, frame_mat, cap_mat, *, finial_mat=None):
    """Corner glass rotunda: banded cylinder + wide cap disc + finial."""
    ctx.cyl(f"{name}.shaft", r, h, (x, y, z0 + h / 2), body_mat, segs=32)
    sh = h / floors
    for i in range(floors):
        zc = z0 + sh * (i + 0.5)
        ctx.cyl(f"{name}.glass.{i}", r + 0.12, sh * 0.5, (x, y, zc), glass_mat, segs=32, kind="window")
        ctx.cyl(f"{name}.band.{i}", r + 0.28, 0.32, (x, y, z0 + sh * (i + 1) - 0.16), frame_mat, segs=32, kind="facade")
    ctx.cyl(f"{name}.cap", r + 0.6, 0.55, (x, y, z0 + h + 0.27), cap_mat, segs=32, kind="roof")
    ctx.cyl(f"{name}.cap.top", r * 0.72, 0.9, (x, y, z0 + h + 0.55 + 0.45), body_mat, segs=32, kind="roof")
    ctx.cyl(f"{name}.finial.pole", 0.12, 2.2, (x, y, z0 + h + 1.45 + 1.1), frame_mat, segs=12, kind="roof")
    ctx.ico(f"{name}.finial.orb", 0.42, (x, y, z0 + h + 3.75), finial_mat or "coral", subdiv=2, kind="brand")
    return z0 + h + 0.55


# ---------------------------------------------------------------------------
# Windows, storefronts, awnings, entrances
# ---------------------------------------------------------------------------


def window(ctx, name: str, face: Face, u: float, z: float, w: float, h: float, frame_mat, glass_mat, *, frame_t=0.2, proud=0.16, sill=True):
    """Oversized punched window: chunky frame proud of the wall + inset dark glass."""
    loc, dims = face.place(u, z, w, proud + 0.05, h)
    ctx.box(f"{name}.frame", *dims, loc, frame_mat, bevel=0.05, kind="window")
    gl, gd = face.place(u, z, w - frame_t * 2, 0.06, h - frame_t * 2, out=proud - 0.02)
    ctx.box(f"{name}.glass", *gd, gl, glass_mat, kind="window")
    # mid mullion for the two-pane read
    ml, md = face.place(u, z, 0.12, 0.05, h - frame_t * 2, out=proud + 0.03)
    ctx.box(f"{name}.mullion", *md, ml, frame_mat, kind="window")
    if sill:
        sl, sd = face.place(u, z - h / 2 - 0.08, w + 0.4, proud + 0.2, 0.16)
        ctx.box(f"{name}.sill", *sd, sl, frame_mat, bevel=0.03, kind="window")


def window_row(ctx, name: str, face: Face, z_floor: float, storey: float, cols: int, frame_mat, glass_mat, *, margin=1.2, win_w=None, win_h=None, skip=(), u0=None, span=None, z_frac=0.52, glass_bias=0.5):
    """A storey of evenly spaced oversized windows along one face."""
    span = span if span is not None else face.length - margin * 2
    u0 = 0.0 if u0 is None else u0
    pitch = span / cols
    win_w = win_w or min(pitch * (0.5 + 0.3 * glass_bias), storey * 0.7)
    win_h = win_h or storey * (0.5 + 0.2 * glass_bias)
    z = z_floor + storey * z_frac
    for c in range(cols):
        if c in skip:
            continue
        u = u0 - span / 2 + pitch * (c + 0.5)
        window(ctx, f"{name}.win.{c}", face, u, z, win_w, win_h, frame_mat, glass_mat)


def window_grid(ctx, name: str, face: Face, z0: float, storey: float, floors, cols: int, frame_mat, glass_mat, **kw):
    """Rows of windows for the listed floor indices (0 = ground)."""
    for f in floors:
        window_row(ctx, f"{name}.f{f}", face, z0 + storey * f, storey, cols, frame_mat, glass_mat, **kw)


def industrial_window(ctx, name: str, face: Face, u: float, z: float, w: float, h: float, frame_mat, glass_mat, *, panes_x=3, panes_y=2, proud=0.14):
    """Warehouse-style multi-pane window (startup loft)."""
    loc, dims = face.place(u, z, w, proud + 0.04, h)
    ctx.box(f"{name}.frame", *dims, loc, frame_mat, bevel=0.04, kind="window")
    gl, gd = face.place(u, z, w - 0.3, 0.06, h - 0.3, out=proud - 0.01)
    ctx.box(f"{name}.glass", *gd, gl, glass_mat, kind="window")
    for i in range(1, panes_x):
        ml, md = face.place(u - w / 2 + w * i / panes_x, z, 0.1, 0.05, h - 0.3, out=proud + 0.03)
        ctx.box(f"{name}.mx.{i}", *md, ml, frame_mat, kind="window")
    for j in range(1, panes_y):
        ml, md = face.place(u, z - h / 2 + h * j / panes_y, w - 0.3, 0.05, 0.1, out=proud + 0.03)
        ctx.box(f"{name}.my.{j}", *md, ml, frame_mat, kind="window")


def storefront(ctx, name: str, face: Face, z0: float, h: float, glass_mat, mullion_mat, base_mat, *, u0=0.0, span=None, cols=4, base_h=0.55, fascia_mat=None, fascia_h=0.0):
    """Ground-floor shop glass: big panels, thick mullions, kick plate, optional fascia beam."""
    span = span if span is not None else face.length - 1.6
    gz0 = z0 + base_h
    gh = h - base_h - fascia_h
    gl, gd = face.place(u0, gz0 + gh / 2, span, 0.12, gh, out=0.08)
    ctx.box(f"{name}.glass", *gd, gl, glass_mat, kind="window")
    bl, bd = face.place(u0, z0 + base_h / 2, span + 0.5, 0.5, base_h, out=0.0)
    ctx.box(f"{name}.base", *bd, bl, base_mat, bevel=0.06, kind="facade")
    for i in range(cols + 1):
        u = u0 - span / 2 + span * i / cols
        ml, md = face.place(u, gz0 + gh / 2, 0.3, 0.38, gh + 0.1, out=0.0)
        ctx.box(f"{name}.mullion.{i}", *md, ml, mullion_mat, bevel=0.05, kind="window")
    hl, hd = face.place(u0, gz0 + gh + 0.12, span + 0.5, 0.42, 0.26, out=0.0)
    ctx.box(f"{name}.head", *hd, hl, mullion_mat, bevel=0.05, kind="window")
    if fascia_mat and fascia_h > 0:
        fl, fd = face.place(u0, z0 + h - fascia_h / 2, span + 0.8, 0.36, fascia_h, out=0.0)
        ctx.box(f"{name}.fascia", *fd, fl, fascia_mat, bevel=0.06, kind="signage")
    return gz0 + gh


def awning(ctx, name: str, face: Face, u: float, z: float, span: float, mat, *, depth=1.9, drop=0.9, stripe_mat=None, stripes=4, glow_mat=None):
    """Fabric awning: sloped wedge + valance (+ optional stripes and a glow strip underneath)."""
    # wedge profile in the face's outward/up plane: attached at (0, drop) on the wall, falling to (depth, 0)
    if face.side in ("front", "back"):
        s = -1.0 if face.side == "front" else 1.0
        outline = [(0.0, drop), (s * depth, 0.0), (0.0, 0.0)]
        ctx.prism(f"{name}.wedge", outline, span, (face.point(u, z)[0], face.mass.y0 if face.side == "front" else face.mass.y1, z), mat, kind="canopy", rot=_PROFILE_ALONG_X)
        vx = face.point(u, z)[0]
        vy = (face.mass.y0 - depth + 0.14) if face.side == "front" else (face.mass.y1 + depth - 0.14)
        ctx.box(f"{name}.valance", span, 0.16, 0.42, (vx, vy, z - 0.18), mat, bevel=0.04, kind="canopy")
        if stripe_mat:
            for i in range(stripes):
                sx = vx - span / 2 + span * (i + 0.5) / stripes
                ctx.box(f"{name}.stripe.{i}", span / stripes * 0.42, 0.18, 0.44, (sx, vy, z - 0.18), stripe_mat, kind="canopy")
        if glow_mat:
            gy = (face.mass.y0 - depth * 0.45) if face.side == "front" else (face.mass.y1 + depth * 0.45)
            ctx.box(f"{name}.glow", span * 0.92, 0.22, 0.08, (vx, gy, z + 0.02), glow_mat, kind="canopy")
    else:
        s = -1.0 if face.side == "left" else 1.0
        outline = [(0.0, drop), (s * depth, 0.0), (0.0, 0.0)]
        px = face.mass.x0 if face.side == "left" else face.mass.x1
        py = face.point(u, z)[1]
        ctx.prism(f"{name}.wedge", outline, span, (px, py, z), mat, kind="canopy", rot=_PROFILE_ALONG_Y)
        vx = px + s * (depth - 0.14)
        ctx.box(f"{name}.valance", 0.16, span, 0.42, (vx, py, z - 0.18), mat, bevel=0.04, kind="canopy")
        if stripe_mat:
            for i in range(stripes):
                sy = py - span / 2 + span * (i + 0.5) / stripes
                ctx.box(f"{name}.stripe.{i}", 0.18, span / stripes * 0.42, 0.44, (vx, sy, z - 0.18), stripe_mat, kind="canopy")
        if glow_mat:
            ctx.box(f"{name}.glow", 0.22, span * 0.92, 0.08, (px + s * depth * 0.45, py, z + 0.02), glow_mat, kind="canopy")


def entrance(ctx, name: str, face: Face, u: float, z0: float, w: float, h: float, frame_mat, glass_mat, step_mat, *, canopy_mat=None, canopy_strip=None, steps=3, depth=0.7):
    """Proud glass entrance portal: dark surround box, double doors, steps and a slab canopy.

    (No booleans in this pipeline, so the portal projects from the wall instead of
    being carved into it — reads as a chunky toy doorway from the 3/4 view.)
    """
    pl, pd = face.place(u, z0 + (h + 0.3) / 2, w + 0.7, depth, h + 0.3, out=0.0)
    ctx.box(f"{name}.portal", *pd, pl, frame_mat, bevel=0.08, kind="door")
    dh = h * 0.76
    gl, gd = face.place(u, z0 + dh / 2 + 0.12, w - 0.3, 0.1, dh, out=depth - 0.02)
    ctx.box(f"{name}.doors", *gd, gl, glass_mat, kind="door")
    sl, sd = face.place(u, z0 + dh / 2 + 0.12, 0.16, 0.12, dh, out=depth + 0.02)
    ctx.box(f"{name}.stile", *sd, sl, frame_mat, kind="door")
    th = h - dh - 0.32
    tl, td = face.place(u, z0 + dh + 0.24 + th / 2, w - 0.3, 0.1, th, out=depth - 0.02)
    ctx.box(f"{name}.transom", *td, tl, glass_mat, kind="door")
    ml, md = face.place(u, z0 + dh + 0.18, w - 0.3, 0.12, 0.14, out=depth + 0.02)
    ctx.box(f"{name}.transom.bar", *md, ml, frame_mat, kind="door")
    # steps fanning out from the portal
    for i in range(steps):
        sw = w + 1.4 + i * 1.3
        sdp = 0.6
        ll, ld = face.place(u, z0 - 0.1 - i * 0.2, sw, sdp, 0.2, out=depth + 0.02 + i * sdp)
        ctx.box(f"{name}.step.{i}", *ld, ll, step_mat, bevel=0.04, kind="site")
    if canopy_mat:
        cd_depth = depth + 2.4
        cl, cd = face.place(u, z0 + h + 0.9, w + 2.6, cd_depth, 0.5, out=-0.3)
        ctx.box(f"{name}.canopy", *cd, cl, canopy_mat, bevel=0.1, kind="canopy")
        if canopy_strip:
            sl2, sd2 = face.place(u, z0 + h + 0.9, w + 2.2, 0.24, 0.66, out=cd_depth - 0.55)
            ctx.box(f"{name}.canopy.strip", *sd2, sl2, canopy_strip, kind="brand")
        for k, du in enumerate((-(w / 2 + 1.0), (w / 2 + 1.0))):
            col_l, col_d = face.place(u + du, z0 + (h + 0.65) / 2, 0.42, 0.42, h + 0.65, out=cd_depth - 0.9)
            ctx.box(f"{name}.canopy.post.{k}", *col_d, col_l, frame_mat, bevel=0.06, kind="canopy")


def vertical_fins(ctx, name: str, face: Face, z0: float, z1: float, count: int, mat, *, span=None, fin_w=0.34, depth=0.5):
    """Thick vertical fins between window columns — tower rhythm."""
    span = span if span is not None else face.length - 1.6
    h = z1 - z0
    for i in range(count):
        u = -span / 2 + span * i / max(1, count - 1)
        loc, dims = face.place(u, z0 + h / 2, fin_w, depth, h)
        ctx.box(f"{name}.fin.{i}", *dims, loc, mat, bevel=0.06, kind="facade")


def horizontal_bands(ctx, name: str, face: Face, levels, mat, *, span=None, band_h=0.4, depth=0.36):
    span = span if span is not None else face.length + 0.3
    for i, z in enumerate(levels):
        loc, dims = face.place(0.0, z, span, depth, band_h)
        ctx.box(f"{name}.band.{i}", *dims, loc, mat, bevel=0.05, kind="facade")


def accent_wall(ctx, name: str, face: Face, mat, *, t=0.42, inset=0.3, z0=None, z1=None):
    """Full-face coloured mural slab hugging one flank (paint the wordmark on it)."""
    m = face.mass
    z0 = m.z0 if z0 is None else z0
    z1 = m.top if z1 is None else z1
    loc, dims = face.place(0.0, (z0 + z1) / 2, face.length - inset * 2, t, z1 - z0)
    ctx.box(f"{name}.mural", *dims, loc, mat, bevel=0.08, kind="brand")
    return Face(Mass(loc[0], loc[1], z0, dims[0], dims[1], z1 - z0), face.side)


def sky_bridge(ctx, name: str, x0, x1, y, z, *, d=3.6, h=3.2, glass_mat="glass", frame_mat="cream", floor_mat="cream_dark"):
    """Glazed link bridge along X between two masses."""
    length = abs(x1 - x0)
    cx = (x0 + x1) / 2
    ctx.box(f"{name}.floor", length, d, 0.5, (cx, y, z + 0.25), floor_mat, bevel=0.08)
    ctx.box(f"{name}.glass", length - 0.6, d - 0.5, h - 0.9, (cx, y, z + 0.5 + (h - 0.9) / 2), glass_mat, kind="window")
    ctx.box(f"{name}.roof", length + 0.2, d + 0.2, 0.42, (cx, y, z + h + 0.21), frame_mat, bevel=0.08, kind="roof")
    for i, fx in enumerate((x0 + 0.4, cx, x1 - 0.4)):
        ctx.box(f"{name}.rib.{i}", 0.3, d + 0.1, h, (fx, y, z + h / 2 + 0.2), frame_mat, bevel=0.05, kind="facade")


def columns(ctx, name: str, points, z0, h, mat, *, size=0.55):
    for i, (x, y) in enumerate(points):
        ctx.box(f"{name}.col.{i}", size, size, h, (x, y, z0 + h / 2), mat, bevel=0.08)
