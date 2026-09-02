"""Rooftop + street props — the "crowded roof" and "lived-in plot" Silicon City read."""
from __future__ import annotations

import math

from .primitives import Face, Mass
from .signage import logo_flat, wordmark_on_face


def deg(v: float) -> float:
    return math.radians(v)


# ---------------------------------------------------------------------------
# Rooftop
# ---------------------------------------------------------------------------


def solar_array(ctx, name: str, x, y, z, rows: int, cols: int, *, panel_w=1.6, panel_d=1.0, tilt=22.0, gap=0.18, mat="solar", frame="metal"):
    """Tilted dark-blue panels on short rails (south-facing = toward -Y)."""
    pw, pd = panel_w, panel_d
    total_w = cols * pw + (cols - 1) * gap
    total_d = rows * (pd * math.cos(deg(tilt)) + gap)
    for r in range(rows):
        for c in range(cols):
            px = x - total_w / 2 + pw / 2 + c * (pw + gap)
            py = y - total_d / 2 + (pd * math.cos(deg(tilt)) + gap) * (r + 0.5)
            pz = z + 0.32 + pd * math.sin(deg(tilt)) / 2
            ctx.box(f"{name}.panel.{r}.{c}", pw, pd, 0.08, (px, py, pz), mat, kind="prop", rot=(deg(tilt), 0.0, 0.0))
        ctx.box(f"{name}.rail.{r}", total_w + 0.2, 0.12, 0.3, (x, y - total_d / 2 + (pd * math.cos(deg(tilt)) + gap) * (r + 0.5) + pd * 0.35, z + 0.15), frame, kind="prop")


def hvac_unit(ctx, name: str, x, y, z, *, w=2.2, d=1.6, h=1.3, mat="metal", dark="charcoal"):
    ctx.box(f"{name}.body", w, d, h, (x, y, z + h / 2), mat, bevel=0.08, kind="prop")
    ctx.cyl(f"{name}.fan", min(w, d) * 0.34, 0.12, (x, y, z + h + 0.06), dark, segs=20, kind="prop")
    ctx.box(f"{name}.grill", w * 0.7, 0.08, h * 0.45, (x, y - d / 2 - 0.02, z + h * 0.5), dark, kind="prop")


def satellite_dish(ctx, name: str, x, y, z, *, r=0.9, mat="cream", pole="metal", aim_yaw=-35.0):
    ctx.cyl(f"{name}.post", 0.1, 1.4, (x, y, z + 0.7), pole, segs=12, kind="prop")
    ctx.cyl(f"{name}.dish", r, 0.14, (x, y - 0.35, z + 1.55), mat, segs=24, kind="prop", rot=(deg(-55), 0.0, deg(aim_yaw)))
    ctx.box(f"{name}.arm", 0.08, 0.7, 0.08, (x, y - 0.55, z + 1.5), pole, kind="prop")


def water_tank(ctx, name: str, x, y, z, *, r=1.15, h=2.2, mat="cream", legs="charcoal", cap="coral"):
    for i, (dx, dy) in enumerate(((-0.6, -0.6), (0.6, -0.6), (-0.6, 0.6), (0.6, 0.6))):
        ctx.box(f"{name}.leg.{i}", 0.14, 0.14, 1.1, (x + dx * r, y + dy * r, z + 0.55), legs, kind="prop")
    ctx.cyl(f"{name}.drum", r, h, (x, y, z + 1.1 + h / 2), mat, segs=24, kind="prop")
    ctx.cyl(f"{name}.band", r + 0.06, 0.16, (x, y, z + 1.1 + h * 0.5), legs, segs=24, kind="prop")
    ctx.cone(f"{name}.cap", r + 0.1, 0.7, (x, y, z + 1.1 + h + 0.35), cap, segs=24, kind="prop")


def vent_stack(ctx, name: str, x, y, z, *, h=1.6, mat="metal"):
    ctx.cyl(f"{name}.pipe", 0.22, h, (x, y, z + h / 2), mat, segs=12, kind="prop")
    ctx.cyl(f"{name}.cap", 0.34, 0.18, (x, y, z + h + 0.08), mat, segs=12, kind="prop")


def roof_access_box(ctx, name: str, x, y, z, *, w=2.4, d=2.0, h=2.3, mat="cream", door="charcoal"):
    ctx.box(f"{name}.box", w, d, h, (x, y, z + h / 2), mat, bevel=0.1, kind="roof")
    ctx.box(f"{name}.door", w * 0.36, 0.08, h * 0.72, (x, y - d / 2 - 0.04, z + h * 0.38), door, kind="roof")


def helipad(ctx, name: str, x, y, z, *, r=4.2, mat="charcoal", ring="cream", h_mat="cream"):
    """Helipad disc with ring + block H."""
    ctx.cyl(f"{name}.disc", r, 0.2, (x, y, z + 0.1), mat, segs=40, kind="roof")
    ctx.cyl(f"{name}.ring", r * 0.86, 0.06, (x, y, z + 0.23), ring, segs=40, kind="roof")
    ctx.cyl(f"{name}.ring.inner", r * 0.76, 0.07, (x, y, z + 0.24), mat, segs=40, kind="roof")
    hw = r * 0.62
    bar = hw * 0.22
    ctx.box(f"{name}.h.l", bar, hw, 0.08, (x - hw / 2 + bar / 2, y, z + 0.29), h_mat, kind="roof")
    ctx.box(f"{name}.h.r", bar, hw, 0.08, (x + hw / 2 - bar / 2, y, z + 0.29), h_mat, kind="roof")
    ctx.box(f"{name}.h.m", hw - bar, bar, 0.08, (x, y, z + 0.29), h_mat, kind="roof")


def rooftop_billboard(ctx, name: str, x, y, z, text: str, *, w=9.0, h=3.4, panel="cream", frame="charcoal", letters="charcoal", yaw=0.0, lift=2.2):
    """Billboard on two posts (faces the street, -Y)."""
    for i, dx in enumerate((-w * 0.32, w * 0.32)):
        ctx.box(f"{name}.post.{i}", 0.26, 0.26, lift + h * 0.5, (x + dx, y, z + (lift + h * 0.5) / 2), frame, kind="prop", rot=(0, 0, yaw))
    panel_mass = Mass(x, y, z + lift, w, 0.36, h)
    ctx.box(f"{name}.panel", w, 0.36, h, (x, y, z + lift + h / 2), panel, bevel=0.08, kind="signage", rot=(0, 0, yaw))
    ctx.box(f"{name}.frame", w + 0.3, 0.2, h + 0.3, (x, y + 0.1, z + lift + h / 2), frame, bevel=0.05, kind="signage", rot=(0, 0, yaw))
    if yaw == 0.0:
        face = Face(panel_mass, "front")
        wordmark_on_face(ctx, f"{name}.text", text, face, 0.0, z + lift + h * 0.28, letters, s=(h * 0.46), depth=0.16, max_w=w * 0.84)
    for i, dx in enumerate((-w * 0.3, 0.0, w * 0.3)):
        ctx.box(f"{name}.lamp.{i}", 0.5, 0.5, 0.18, (x + dx, y - 0.75, z + lift + h + 0.45), frame, kind="prop", rot=(0, 0, yaw))
        ctx.box(f"{name}.lamp.{i}.arm", 0.08, 0.8, 0.08, (x + dx, y - 0.35, z + lift + h + 0.4), frame, kind="prop", rot=(0, 0, yaw))


def beacon_mast(ctx, name: str, x, y, z, *, h=6.0, mat="charcoal", orb="glow", ring="coral", motion=True):
    """Antenna mast with glow orb (+ ring when the brand site has motion)."""
    ctx.cyl(f"{name}.mast", 0.14, h, (x, y, z + h / 2), mat, segs=12, kind="prop")
    ctx.ico(f"{name}.orb", 0.55, (x, y, z + h + 0.4), orb, subdiv=2, kind="brand")
    if motion:
        ctx.cyl(f"{name}.ring", 1.25, 0.16, (x, y, z + h * 0.72), ring, segs=32, kind="brand", rot=(deg(28), 0.0, deg(20)))
        ctx.cyl(f"{name}.ring.hole", 0.95, 0.2, (x, y, z + h * 0.72), mat, segs=32, kind="prop", rot=(deg(28), 0.0, deg(20)))
    for i in range(3):
        ctx.box(f"{name}.guy.{i}", 0.05, 0.05, h * 0.55, (x + math.cos(i * 2.1) * 0.9, y + math.sin(i * 2.1) * 0.9, z + h * 0.28), mat, kind="prop")


def roof_deck(ctx, name: str, x, y, z, w, d, *, deck="paver", rail="cream", planter_mat="charcoal"):
    """Roof terrace: paver deck, rail posts, corner planters with blob shrubs."""
    ctx.box(f"{name}.deck", w, d, 0.18, (x, y, z + 0.09), deck, kind="roof")
    for i, (dx, dy) in enumerate(((-w / 2 + 0.9, -d / 2 + 0.9), (w / 2 - 0.9, -d / 2 + 0.9), (-w / 2 + 0.9, d / 2 - 0.9), (w / 2 - 0.9, d / 2 - 0.9))):
        planter(ctx, f"{name}.planter.{i}", x + dx, y + dy, z + 0.18, w=1.4, mat=planter_mat)
    for i in range(3):
        bench(ctx, f"{name}.bench.{i}", x - w * 0.25 + i * w * 0.25, y, z + 0.18)


# ---------------------------------------------------------------------------
# Street / plot
# ---------------------------------------------------------------------------


def blob_tree(ctx, name: str, x, y, z, *, s=1.0, canopy="canopy", bark="bark"):
    th = 1.9 * s
    r = 1.35 * s
    ctx.cyl(f"{name}.trunk", 0.2 * s, th, (x, y, z + th / 2), bark, segs=10, kind="landscape")
    ctx.ico(f"{name}.canopy", r, (x, y, z + th + r * 0.75), canopy, subdiv=2, kind="landscape")
    ctx.ico(f"{name}.canopy.b", r * 0.7, (x + r * 0.55, y - r * 0.2, z + th + r * 0.45), canopy, subdiv=2, kind="landscape")
    ctx.ico(f"{name}.canopy.c", r * 0.62, (x - r * 0.5, y + r * 0.3, z + th + r * 0.55), canopy, subdiv=2, kind="landscape")
    ctx.ico(f"{name}.canopy.top", r * 0.6, (x, y, z + th + r * 1.35), canopy, subdiv=2, kind="landscape")


def shrub(ctx, name: str, x, y, z, *, s=1.0, mat="canopy"):
    ctx.ico(f"{name}.a", 0.62 * s, (x, y, z + 0.5 * s), mat, subdiv=1, kind="landscape")
    ctx.ico(f"{name}.b", 0.46 * s, (x + 0.45 * s, y + 0.1 * s, z + 0.38 * s), mat, subdiv=1, kind="landscape")


def hedge(ctx, name: str, x, y, z, length, *, along="x", mat="canopy", h=0.9, t=0.9):
    if along == "x":
        ctx.box(f"{name}.hedge", length, t, h, (x, y, z + h / 2), mat, bevel=0.22, kind="landscape")
    else:
        ctx.box(f"{name}.hedge", t, length, h, (x, y, z + h / 2), mat, bevel=0.22, kind="landscape")


def planter(ctx, name: str, x, y, z, *, w=1.3, mat="charcoal", plant="canopy"):
    ctx.box(f"{name}.box", w, w, 0.7, (x, y, z + 0.35), mat, bevel=0.08, kind="landscape")
    ctx.ico(f"{name}.plant", w * 0.5, (x, y, z + 0.7 + w * 0.32), plant, subdiv=1, kind="landscape")


def bench(ctx, name: str, x, y, z, *, along="x", seat="cream_dark", legs="charcoal"):
    if along == "x":
        ctx.box(f"{name}.seat", 2.0, 0.55, 0.14, (x, y, z + 0.5), seat, bevel=0.04, kind="landscape")
        ctx.box(f"{name}.back", 2.0, 0.1, 0.5, (x, y + 0.22, z + 0.85), seat, bevel=0.03, kind="landscape")
        for i, dx in enumerate((-0.8, 0.8)):
            ctx.box(f"{name}.leg.{i}", 0.12, 0.5, 0.45, (x + dx, y, z + 0.22), legs, kind="landscape")
    else:
        ctx.box(f"{name}.seat", 0.55, 2.0, 0.14, (x, y, z + 0.5), seat, bevel=0.04, kind="landscape")
        ctx.box(f"{name}.back", 0.1, 2.0, 0.5, (x + 0.22, y, z + 0.85), seat, bevel=0.03, kind="landscape")
        for i, dy in enumerate((-0.8, 0.8)):
            ctx.box(f"{name}.leg.{i}", 0.5, 0.12, 0.45, (x, y + dy, z + 0.22), legs, kind="landscape")


def lamp(ctx, name: str, x, y, z, *, h=4.2, mat="charcoal", glow="glow"):
    ctx.cyl(f"{name}.pole", 0.11, h, (x, y, z + h / 2), mat, segs=10, kind="landscape")
    ctx.box(f"{name}.arm", 0.1, 1.1, 0.1, (x, y - 0.5, z + h - 0.1), mat, kind="landscape")
    ctx.box(f"{name}.head", 0.5, 0.7, 0.24, (x, y - 1.0, z + h - 0.25), mat, bevel=0.04, kind="landscape")
    ctx.box(f"{name}.light", 0.4, 0.55, 0.06, (x, y - 1.0, z + h - 0.4), glow, kind="landscape")


def bollard(ctx, name: str, x, y, z, *, mat="charcoal", cap="cream"):
    ctx.cyl(f"{name}.post", 0.16, 0.9, (x, y, z + 0.45), mat, segs=12, kind="landscape")
    ctx.cyl(f"{name}.cap", 0.18, 0.12, (x, y, z + 0.94), cap, segs=12, kind="landscape")


def car(ctx, name: str, x, y, z, *, body="brand", cabin="glass", along="x", yaw=None, length=4.6, width=2.1):
    """Chunky toy car: body + cabin + 4 wheel discs. `along` = parking direction."""
    rot_z = yaw if yaw is not None else (0.0 if along == "x" else math.pi / 2)
    rot = (0.0, 0.0, rot_z)
    L, Wd = length, width
    ctx.box(f"{name}.body", L, Wd, 0.78, (x, y, z + 0.62), body, bevel=0.22, kind="prop", rot=rot)
    ctx.box(f"{name}.cabin", L * 0.5, Wd * 0.86, 0.66, (x - L * 0.05 * math.cos(rot_z), y - L * 0.05 * math.sin(rot_z), z + 1.3), cabin, bevel=0.2, kind="prop", rot=rot)
    ctx.box(f"{name}.roof", L * 0.42, Wd * 0.8, 0.12, (x - L * 0.05 * math.cos(rot_z), y - L * 0.05 * math.sin(rot_z), z + 1.66), body, bevel=0.04, kind="prop", rot=rot)
    for i, (ax, ay) in enumerate(((-L * 0.3, -Wd * 0.5), (L * 0.3, -Wd * 0.5), (-L * 0.3, Wd * 0.5), (L * 0.3, Wd * 0.5))):
        wx = x + ax * math.cos(rot_z) - ay * math.sin(rot_z)
        wy = y + ax * math.sin(rot_z) + ay * math.cos(rot_z)
        ctx.cyl(f"{name}.wheel.{i}", 0.42, 0.34, (wx, wy, z + 0.42), "rubber", segs=16, kind="prop", rot=(math.pi / 2, 0.0, rot_z))
        ctx.cyl(f"{name}.hub.{i}", 0.2, 0.36, (wx, wy, z + 0.42), "cream", segs=12, kind="prop", rot=(math.pi / 2, 0.0, rot_z))
    # lights
    fx = x + (L / 2) * math.cos(rot_z)
    fy = y + (L / 2) * math.sin(rot_z)
    ctx.box(f"{name}.lights", 0.12, Wd * 0.7, 0.18, (fx, fy, z + 0.72), "sign", kind="prop", rot=rot)


def pole_sign(ctx, name: str, x, y, z, text: str, *, h=8.5, panel_w=5.2, panel_h=2.4, panel="brand", letters=None, pole="charcoal", with_logo=True):
    """Street pole sign: tall post + brand panel with wordmark (+ small logo tile above)."""
    letters = letters or ctx.letters_on_brand
    ctx.cyl(f"{name}.pole", 0.22, h, (x, y, z + h / 2), pole, segs=14, kind="signage")
    ctx.cyl(f"{name}.base", 0.55, 0.3, (x, y, z + 0.15), pole, segs=14, kind="signage")
    pm = Mass(x, y, z + h - panel_h - 0.2, panel_w, 0.36, panel_h)
    ctx.box(f"{name}.panel", pm.w, pm.d, pm.h, pm.loc, panel, bevel=0.1, kind="signage")
    ctx.box(f"{name}.panel.frame", pm.w + 0.24, 0.2, pm.h + 0.24, (x, y + 0.1, pm.cz), "cream", bevel=0.05, kind="signage")
    face = Face(pm, "front")
    wordmark_on_face(ctx, f"{name}.text", text, face, 0.0, pm.z0 + pm.h * 0.24, letters, s=pm.h * 0.5, depth=0.16, max_w=panel_w * 0.86)
    if with_logo:
        logo_flat(ctx, f"{name}.cap", x, y, z + h + 0.05, panel_h * 0.8, backing_mat="cream")


def avatar_orbs(ctx, name: str, x, y, z, count: int, *, spacing=3.2):
    """Plaza sculptures — one orb on a pedestal per team avatar (capped by caller)."""
    mats = ("brand", "coral", "cream")
    for i in range(count):
        ox = x + (i - (count - 1) / 2) * spacing
        ctx.cyl(f"{name}.{i}.ped", 0.8, 0.5, (ox, y, z + 0.25), "cream", segs=20, kind="brand")
        ctx.cyl(f"{name}.{i}.stem", 0.3, 1.2, (ox, y, z + 0.5 + 0.6), "charcoal", segs=12, kind="brand")
        ctx.ico(f"{name}.{i}.orb", 1.05 - i * 0.1, (ox, y, z + 1.7 + 1.0), mats[i % 3], subdiv=2, kind="brand")


def parking_row(ctx, name: str, x0, x1, y, z, count: int, *, colours=("brand", "coral", "cream", "charcoal"), rng=None):
    """Cars parked nose-in along a curb line (along X)."""
    span = x1 - x0
    for i in range(count):
        cx = x0 + span * (i + 0.5) / count
        c = colours[i % len(colours)]
        if rng is not None:
            c = rng.choice(f"{name}.car.{i}", list(colours))
        car(ctx, f"{name}.car.{i}", cx, y, z, body=c, along="y")


def lawn_tile(ctx, name: str, w, d, *, grass="grass", edge="cream_dark", h=0.28):
    """Fresh green lawn tile with a light edge lip (the Silicon City plot base)."""
    ctx.box(f"{name}.edge", w, d, h * 0.6, (0, 0, h * 0.3), edge, bevel=0.06, kind="site")
    ctx.box(f"{name}.grass", w - 0.5, d - 0.5, h, (0, 0, h / 2 + 0.02), grass, bevel=0.05, kind="site")
    return h + 0.02


def paver_apron(ctx, name: str, x, y, z, w, d, *, mat="paver", t=0.12):
    ctx.box(f"{name}.pavers", w, d, t, (x, y, z + t / 2), mat, bevel=0.03, kind="site")
    return z + t


def sidewalk(ctx, name: str, W, D, z, *, depth=3.4, mat="paver", curb="cream"):
    """Street-side paver strip along the front edge + curb."""
    ctx.box(f"{name}.walk", W - 0.6, depth, 0.14, (0, -D / 2 + depth / 2 + 0.3, z + 0.07), mat, kind="site")
    ctx.box(f"{name}.curb", W - 0.6, 0.3, 0.22, (0, -D / 2 + 0.45, z + 0.11), curb, bevel=0.04, kind="site")
    return -D / 2 + depth + 0.3
