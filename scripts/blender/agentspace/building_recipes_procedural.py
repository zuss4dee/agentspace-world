"""Parametric Apple 3D Maps-style recipe implementations — rich silhouettes, seed-driven.

Visual target: docs/BUILDING_VISUAL_STYLE.md
"""
from __future__ import annotations

from typing import TYPE_CHECKING

from .mini_city_style import (
    bridge_connector,
    emissive_glow_band,
    glow_window_slots,
    hero_sculpture_rings,
    rounded_mass,
    shared_podium,
    signage_from_brand,
    site_composition,
    terrace_garden,
    tiered_setback_tower,
    toy_curtain_wall,
    toy_dome_cap,
    toy_pitch_cap,
    toy_roof_stack,
    toy_setback_tower,
    toy_window_band,
    vertical_fin_grooves,
)
from .mini_city_style_v2 import (
    apply_night_facade,
    arch_portal_entrance,
    balcony_ledge,
    cantilever_volume,
    cylinder_tower,
    diagonal_bridge,
    pod_tower,
    projecting_box,
    recessed_niche,
    roof_deck_platform,
    skewed_mass,
    slanted_wedge_roof,
    sky_bridge_platform,
    toy_spire,
    orb_sculpture_stack,
    wishbone_tower,
    zigzag_terrace,
)
from .param_rng import ParamRNG

if TYPE_CHECKING:
    from .company_building import BuildingContext

# Primary mass colours — brand/coral first; cream is trim-only (see BUILDING_VISUAL_STYLE.md).
MASS_SLOTS = ("brand", "coral", "cream_dark", "brand")


def _mass_key(ctx: "BuildingContext", index: int) -> str:
    slots = ctx.params.get("mass_slots") or MASS_SLOTS
    return slots[index % len(slots)]


def _rng(ctx: "BuildingContext") -> ParamRNG:
    return ParamRNG(ctx.seed)


def _p(ctx: "BuildingContext", key: str, default: float) -> float:
    v = ctx.params.get(key)
    return float(v) if v is not None else default


def _front(ctx: "BuildingContext") -> float:
    return -ctx.D / 2


def _plaza_y(ctx: "BuildingContext") -> float:
    return _front(ctx) + round(3.5 * ctx.scale, 3)


def _s(ctx: "BuildingContext", v: float) -> float:
    return round(v * ctx.scale, 3)


def _set_anchors(ctx: "BuildingContext", *, entrance, roof_center, roof_z: float) -> None:
    ctx.anchors["entrance"] = entrance
    ctx.anchors["roof_center"] = (*roof_center[:2], roof_z)
    ctx.anchors["roof_z"] = roof_z


def _fin(ctx: "BuildingContext"):
    return ctx.mats.get("fin", ctx.mats["charcoal"])


def _face_y(ctx: "BuildingContext", y: float, d: float) -> float:
    return y - d / 2 - 0.06


def recipe_bridge_complex_procedural(ctx: "BuildingContext") -> None:
    """Offset masses + sky bridges + round tower — parametric cousin of Echt."""
    m, part = ctx.mats, ctx.part
    rng = _rng(ctx)
    W, D = ctx.W, ctx.D
    front, plaza_y = _front(ctx), _plaza_y(ctx)
    root, col, site_z = ctx.root, ctx.col, ctx.site_z

    site_composition(
        part, "site", W, D, m, root, col,
        podium_w=W * 0.9, podium_d=D * 0.84,
        plaza_w=_s(ctx, 10.5), plaza_d=_s(ctx, 4.2), plaza_y=plaza_y, site_z=site_z,
    )
    base_z = shared_podium(part, "podium", W * 0.82, D * 0.72, site_z, m["cream_dark"], m["charcoal"], root, col, h=0.55, bevel=0.26)

    # Left skewed block — misaligned cap
    lx = -W * 0.28 + rng.uniform("mass.l.x", -2.0, 1.5)
    ly = rng.uniform("mass.l.y", -1.5, 2.5)
    lw, ld, lh = W * 0.38, D * 0.48, _p(ctx, "wing_height", rng.uniform("wing.l.h", 12.0, 18.0))
    skewed_mass(part, "mass.left", lw, ld, lh, lx, ly, base_z, m["brand"], root, col,
                skew_x=rng.uniform("skew.l", -2.2, 2.8), skew_y=rng.uniform("skew.ly", -1.0, 1.2), bevel=0.36)

    # Central round tower — non-rectangular anchor
    tr = min(W, D) * 0.16
    th = _p(ctx, "tower_height", rng.uniform("tower_h", 22.0, 32.0))
    cx, cy = rng.uniform("tower.x", -1.5, 2.0), rng.uniform("tower.y", 0.5, 3.0)
    cylinder_tower(part, "mass.tower", tr, th, cx, cy, base_z, m["brand"], m["glass"], m["charcoal"], root, col, bands=5, glow_mat=m["glow"])
    apply_night_facade(part, "facade.tower", cx, cy - tr - 0.08, base_z + 2.5, base_z + th - 1.0, tr * 1.8, m, root, col, style="mixed", seed=rng.randint("facade.tower", 0, 9999))
    toy_spire(part, "spire.tower", cx, cy + tr + 0.2, base_z + th, 3.2, m["charcoal"], m["coral"], root, col)

    # Right coral mass with terrace
    rx = W * 0.26 + rng.uniform("mass.r.x", -1.0, 2.5)
    ry = rng.uniform("mass.r.y", -2.0, 1.5)
    rw, rd, rh = W * 0.34, D * 0.44, rng.uniform("wing.r.h", 10.0, 16.0)
    rounded_mass(part, "mass.right", rw, rd, rh, rx, ry, base_z, m["coral"], root, col, bevel=0.34, cid="mass.right")
    apply_night_facade(part, "facade.right", rx, _face_y(ctx, ry, rd), base_z + 2.0, base_z + rh - 0.8, rw * 0.7, m, root, col, style="slots", seed=rng.randint("facade.r", 0, 9999))
    terrace_garden(part, "terrace.right", rx, ry - rd * 0.12, base_z + rh + 0.5, rw * 0.55, rd * 0.35, m, root, col)

    # Rear offset slab
    back_y = cy + D * 0.22
    rounded_mass(part, "mass.rear", W * 0.42, 4.2, 7.5, cx + 2.0, back_y, base_z, m["cream_dark"], root, col, bevel=0.2, cid="mass.rear")

    # Angled sky bridges at different heights
    diagonal_bridge(part, "link.left", (lx + cx) / 2, (ly + cy) / 2, base_z + lh * 0.55, 8.0, 2.8, 0.55, m["cream_dark"], root, col, rise=2.8)
    diagonal_bridge(part, "link.right", (rx + cx) / 2, (ry + cy) / 2, base_z + rh * 0.62, 7.5, 2.6, 0.5, m["charcoal"], root, col, rise=3.2)
    bridge_connector(part, "link.low", 0, front + 5.5, base_z + 2.2, W * 0.55, 2.4, 1.6, m["charcoal"], root, col)

    arch_portal_entrance(part, "entrance", 0, front + 2.4, base_z, m, root, col,
                         span=min(W * 0.38, 14.0), height=9.5 + rng.uniform("portal.h", -0.5, 1.5))
    signage_from_brand(part, "facade", ctx.brand, cx, cy - tr - 0.35, base_z + th * 0.45, m["sign"], root, col, s=0.55, d=0.22)

    toy_roof_stack(part, "roof.left", lw + 0.4, ld + 0.3, lx, ly, base_z + lh, m["roof"], m["charcoal"], root, col)
    toy_roof_stack(part, "roof.right", rw + 0.35, rd + 0.3, rx, ry, base_z + rh, m["roof"], m["charcoal"], root, col)
    projecting_box(part, "facade.proj", 5.5, 2.2, 8.0, lx, ly - ld / 2, base_z + 3.0, m["cream_dark"], root, col, proj_y=-1.0)
    balcony_ledge(part, "balcony.right", rw * 0.45, 1.0, rx, ry - rd / 2, base_z + rh * 0.55, m["coral"], m["charcoal"], root, col)
    roof_deck_platform(part, "roof.deck", 6.0, 4.5, cx, cy + 1.5, base_z + th, m["paver"], m["charcoal"], root, col)

    _set_anchors(ctx, entrance=(0, front + 2.4, base_z), roof_center=(cx, cy), roof_z=base_z + th + 3.5)


def recipe_tower_campus_procedural(ctx: "BuildingContext") -> None:
    """Landmark tower + cantilever wings + spire — vertical drama."""
    m, part = ctx.mats, ctx.part
    rng = _rng(ctx)
    W, D = ctx.W * _p(ctx, "width_ratio", 0.82), ctx.D * _p(ctx, "depth_ratio", 0.76)
    front = _front(ctx)
    base_z = shared_podium(part, "podium", W, D, ctx.site_z, m["cream_dark"], m["charcoal"], ctx.root, ctx.col, h=0.5, bevel=0.24)

    tower_style = ctx.params.get("tower_style") or rng.choice("tower_style", ["setback", "cylinder", "cantilever"])
    th = _p(ctx, "tower_height", rng.uniform("tower_h", 26.0, 38.0))
    tw, td = W * 0.34, D * 0.34
    tx, ty = rng.uniform("tower.x", -1.2, 1.8), rng.uniform("tower.y", 0.2, 2.5)

    if tower_style == "cylinder":
        cylinder_tower(part, "mass.tower", min(tw, td) * 0.48, th, tx, ty, base_z, m["brand"], m["glass"], m["charcoal"], ctx.root, ctx.col, bands=6, glow_mat=m["glow"])
    elif tower_style == "cantilever":
        cantilever_volume(part, "mass.tower", tw, td, th, tx, ty, base_z, m["brand"], m["coral"], ctx.root, ctx.col,
                          overhang=rng.uniform("overhang", 2.0, 4.5))
        apply_night_facade(part, "facade.tower", tx, _face_y(ctx, ty, td), base_z + 3.0, base_z + th - 1.0, tw * 0.75, m, ctx.root, ctx.col, style="fins", seed=rng.randint("facade.t", 0, 9999))
    elif tower_style == "wishbone":
        wishbone_tower(part, "mass.tower", tw, td, th, tx, ty, base_z, m["brand"], m["coral"], m["glass"], ctx.root, ctx.col, bevel=0.36)
    else:
        toy_setback_tower(part, "mass.tower", tw, td, th, tx, ty, base_z, m["brand"], ctx.root, ctx.col, bevel=0.4, cid="mass.tower",
                          glow_mat=m["glow"], fin_mat=_fin(ctx))
        apply_night_facade(part, "facade.tower", tx, _face_y(ctx, ty, td), base_z + 2.5, base_z + th - 1.0, tw * 0.7, m, ctx.root, ctx.col, style="mixed", seed=rng.randint("facade.t", 0, 9999))

    # Asymmetric wings — different heights and offsets
    wing_specs = (
        ("west", -W * 0.32, rng.uniform("wing.w.y", -2.0, 1.5), W * 0.28, D * 0.5, rng.uniform("wing.w.h", 6.0, 12.0), "cream"),
        ("east", W * 0.3, rng.uniform("wing.e.y", -1.0, 2.5), W * 0.26, D * 0.46, rng.uniform("wing.e.h", 8.0, 14.0), "coral"),
    )
    for name, sx, sy, sw, sd, sh, mk in wing_specs:
        skewed_mass(part, f"mass.{name}", sw, sd, sh, sx, sy, base_z, m[mk], ctx.root, ctx.col,
                    skew_x=rng.uniform(f"skew.{name}", -1.8, 2.2), skew_y=0.0, bevel=0.3)
        apply_night_facade(part, f"facade.{name}", sx, _face_y(ctx, sy, sd), base_z + 2.0, base_z + sh - 0.6, sw * 0.55, m, ctx.root, ctx.col,
                           style="slots" if name == "east" else "band", seed=rng.randint(f"facade.{name}", 0, 9999))
        slanted_wedge_roof(part, f"roof.{name}", sw, sd, sx, sy, base_z + sh, m["roof"], m["coral"], ctx.root, ctx.col,
                           rise=rng.uniform(f"wedge.{name}", 0.8, 1.8))
        if name == "east":
            balcony_ledge(part, f"balcony.{name}", sw * 0.5, 0.9, sx, sy - sd / 2, base_z + sh * 0.62, m["coral"], m["charcoal"], ctx.root, ctx.col)
        else:
            projecting_box(part, f"proj.{name}", sw * 0.35, 1.8, sh * 0.35, sx, sy - sd / 2, base_z + sh * 0.4, m["cream_dark"], ctx.root, ctx.col)

    roof_mod = ctx.params.get("roof_module", "stack")
    if roof_mod == "dome":
        toy_dome_cap(part, "roof.tower", min(tw, td) * 0.28, tx, ty, base_z + th, m["roof"], ctx.root, ctx.col)
    elif roof_mod == "pitch_cap":
        toy_pitch_cap(part, "roof.tower", tw, td, tx, ty, base_z + th, m["roof"], m["coral"], ctx.root, ctx.col)
    else:
        toy_roof_stack(part, "roof.tower", tw + 0.6, td + 0.6, tx, ty, base_z + th, m["roof"], m["charcoal"], ctx.root, ctx.col, lip=0.52)
        toy_spire(part, "spire", tx, ty + 0.4, base_z + th + 1.2, 4.5, m["charcoal"], m["brand"], ctx.root, ctx.col, r=0.65)

    arch_portal_entrance(part, "entrance", 0, front + 2.2, base_z, m, ctx.root, ctx.col, span=12.5, height=9.0)
    signage_from_brand(part, "facade", ctx.brand, tx, ty - td / 2 - 0.34, base_z + th * 0.4, m["sign"], ctx.root, ctx.col, s=0.54, d=0.22)
    site_composition(part, "site", ctx.W, ctx.D, m, ctx.root, ctx.col, podium_w=ctx.W * 0.94, podium_d=ctx.D * 0.9,
                     plaza_w=_s(ctx, 9.5), plaza_d=_s(ctx, 3.8), plaza_y=_plaza_y(ctx), site_z=ctx.site_z)
    roof_deck_platform(part, "roof.deck", tw * 0.85, td * 0.55, tx, ty - 1.2, base_z + th, m["paver"], m["charcoal"], ctx.root, ctx.col)
    _set_anchors(ctx, entrance=(0, front + 2.2, base_z), roof_center=(tx, ty), roof_z=base_z + th + 2.0)


def recipe_stepped_terrace_procedural(ctx: "BuildingContext") -> None:
    """Off-axis wedding cake + zigzag terraces — cascading silhouette."""
    m, part = ctx.mats, ctx.part
    rng = _rng(ctx)
    steps = int(_p(ctx, "step_count", rng.randint("steps", 4, 6)))
    ox = rng.uniform("base.ox", -3.5, 3.5)
    base_z = shared_podium(part, "podium", ctx.W * 0.86, ctx.D * 0.78, ctx.site_z, m["cream_dark"], m["charcoal"], ctx.root, ctx.col, h=0.44, bevel=0.22)
    z = base_z
    oy = rng.uniform("base.oy", -1.5, 2.0)

    for i in range(steps):
        t = i / max(1, steps - 1)
        sw = ctx.W * (0.98 - t * 0.22) + rng.uniform(f"step.{i}.sw", -0.6, 0.6)
        sd = ctx.D * (0.96 - t * 0.18) + rng.uniform(f"step.{i}.sd", -0.5, 0.5)
        sh = 3.8 + rng.uniform(f"step.{i}.h", 0.8, 2.8)
        step_ox = ox + rng.uniform(f"step.{i}.ox", -2.5, 2.5)
        step_oy = oy + i * 0.65 + rng.uniform(f"step.{i}.oy", -0.8, 0.8)
        mk = ["cream", "brand", "coral", "cream_dark"][i % 4]
        rounded_mass(part, f"step.{i}", sw, sd, sh, step_ox, step_oy, z, m[mk], ctx.root, ctx.col, bevel=0.24, cid=f"step.{i}")
        if i < steps - 1:
            emissive_glow_band(part, f"step.{i}.crown", step_ox, step_oy - sd / 2 - 0.06, z + sh - 0.32, sw * 0.82, 0.35, m["glow"], ctx.root, ctx.col)
        vertical_fin_grooves(part, f"step.{i}.fin", step_ox, step_oy - sd / 2 - 0.08, z + 1.2, z + sh - 0.5, sw * 0.7, _fin(ctx), ctx.root, ctx.col, count=4)
        if i % 2 == 0:
            zigzag_terrace(part, f"zig.{i}", step_ox + sw * 0.15, step_oy - sd / 2 - 0.5, z + sh * 0.55, sw * 0.55, sd * 0.3, m["cream_dark"], m["paver"], ctx.root, ctx.col, tiers=2)
        else:
            terrace_garden(part, f"terrace.{i}", step_ox - sw * 0.1, step_oy + sd * 0.08, z + sh + 0.35, sw * 0.4, sd * 0.32, m, ctx.root, ctx.col)
        toy_window_band(part, f"step.{i}.win", step_ox, step_oy - sd / 2 - 0.06, z + 1.6, sw * 0.32, 2.6, m["charcoal"], m["glass"], ctx.root, ctx.col)
        glow_window_slots(part, f"step.{i}.slots", step_ox, step_oy - sd / 2 - 0.04, z + 2.0, z + sh - 1.0, sw * 0.55, m["glass"], ctx.root, ctx.col,
                          cols=3, rows=4, fill=0.45, seed=rng.randint(f"step.{i}.seed", 0, 9999))
        z += sh - 0.22

    slanted_wedge_roof(part, "roof.crown", ctx.W * 0.35, ctx.D * 0.28, ox, oy + steps * 0.4, z, m["roof"], m["brand"], ctx.root, ctx.col, rise=2.2)
    toy_spire(part, "spire", ox, oy, z + 1.8, 3.8, m["charcoal"], m["coral"], ctx.root, ctx.col)
    arch_portal_entrance(part, "entrance", ox * 0.3, _front(ctx) + 2.0, base_z, m, ctx.root, ctx.col, span=11.0, height=8.0)
    signage_from_brand(part, "facade", ctx.brand, ox, _front(ctx) - 0.22, base_z + 8.0, m["sign"], ctx.root, ctx.col, s=0.48, d=0.2)
    site_composition(part, "site", ctx.W, ctx.D, m, ctx.root, ctx.col, podium_w=ctx.W, podium_d=ctx.D,
                     plaza_w=_s(ctx, 8.5), plaza_d=_s(ctx, 3.4), plaza_y=_plaza_y(ctx), site_z=ctx.site_z)
    _set_anchors(ctx, entrance=(ox * 0.3, _front(ctx) + 2.0, base_z), roof_center=(ox, oy + steps * 0.4), roof_z=z + 2.5)


def recipe_courtyard_block_procedural(ctx: "BuildingContext") -> None:
    """Open U-ring + corner turrets + gate tower — courtyard void."""
    m, part = ctx.mats, ctx.part
    rng = _rng(ctx)
    base_z = shared_podium(part, "podium", ctx.W * 0.9, ctx.D * 0.86, ctx.site_z, m["cream_dark"], m["charcoal"], ctx.root, ctx.col, h=0.54, bevel=0.26)
    ring_w, ring_d = ctx.W * 0.88, ctx.D * 0.82
    wall_t = max(4.2, ctx.W * 0.12)
    h_main = 12.0 + _p(ctx, "tower_height", rng.uniform("ring.h", 2.0, 6.0))
    open_side = ctx.params.get("open_side") or rng.choice("open", ["south", "east"])

    segments = (
        ("north", (0, ring_d / 2 - wall_t / 2), ring_w, wall_t),
        ("west", (-ring_w / 2 + wall_t / 2, 0), wall_t, ring_d - wall_t * 2),
        ("east", (ring_w / 2 - wall_t / 2, 0), wall_t, ring_d - wall_t * 2),
    )
    if open_side != "south":
        segments = (*segments, ("south", (0, -ring_d / 2 + wall_t / 2), ring_w * 0.55, wall_t))

    for name, loc, rw, rd in segments:
        rounded_mass(part, f"ring.{name}", rw, rd, h_main, loc[0], loc[1], base_z,
                     m["cream" if name in {"north", "west"} else "cream_dark"], ctx.root, ctx.col, bevel=0.22, cid=f"ring.{name}")
        toy_roof_stack(part, f"roof.{name}", rw + 0.25, rd + 0.25, loc[0], loc[1], base_z + h_main, m["roof"], m["charcoal"], ctx.root, ctx.col, lip=0.28)
        if name in {"north", "south"}:
            apply_night_facade(part, f"ring.{name}", loc[0], loc[1] - rd / 2 - 0.06, base_z + 2.5, base_z + h_main - 0.8, rw * 0.65, m, ctx.root, ctx.col,
                               style="slots", seed=rng.randint(f"ring.{name}", 0, 9999))

    # Corner round turrets
    for i, (tx, ty) in enumerate(((-ring_w / 2 + wall_t, ring_d / 2 - wall_t), (ring_w / 2 - wall_t, ring_d / 2 - wall_t))):
        tr = wall_t * 0.55
        th = h_main + rng.uniform(f"turret.{i}.h", 4.0, 9.0)
        cylinder_tower(part, f"turret.{i}", tr, th, tx, ty, base_z, m["brand"] if i == 0 else "coral", m["glass"], m["charcoal"], ctx.root, ctx.col, bands=3)

    gate_h = h_main + rng.uniform("gate.h", 5.0, 10.0)
    rounded_mass(part, "gate.tower", 8.5, 4.5, gate_h, 0, -ring_d / 2 + 2.0, base_z, m["brand"], ctx.root, ctx.col, bevel=0.2, cid="gate.tower")
    toy_curtain_wall(part, "gate.glass", 0, -ring_d / 2 - 0.08, base_z + 2.0, base_z + gate_h - 1.2, 6.5, m["glass"], m["charcoal"], ctx.root, ctx.col, depth=0.35, cols=2)
    arch_portal_entrance(part, "entrance", 0, _front(ctx) + 1.8, base_z, m, ctx.root, ctx.col, span=10.5, height=8.5)

    part(f"{ctx.asset_id}.court.pad", ring_w * 0.38, ring_d * 0.35, 0.14, (0, ring_d * 0.05, ctx.site_z + 0.06), m["paver"], ctx.root, ctx.col, "court.pad", bevel=0.03)
    signage_from_brand(part, "facade", ctx.brand, 0, -ring_d / 2 - 0.26, base_z + gate_h * 0.55, m["sign"], ctx.root, ctx.col, s=0.46, d=0.18)
    recessed_niche(part, "facade.niche", 5.0, 1.2, 6.5, -ring_w * 0.15, -ring_d / 2, base_z + 2.5, m["cream"], m["glass"], ctx.root, ctx.col)
    site_composition(part, "site", ctx.W, ctx.D, m, ctx.root, ctx.col, podium_w=ctx.W, podium_d=ctx.D,
                     plaza_w=_s(ctx, 7.5), plaza_d=_s(ctx, 3.0), plaza_y=_plaza_y(ctx), site_z=ctx.site_z)
    _set_anchors(ctx, entrance=(0, _front(ctx) + 1.8, base_z), roof_center=(0, 0), roof_z=base_z + gate_h + 1.0)


def recipe_pavilion_procedural(ctx: "BuildingContext") -> None:
    """Multi-level pilotis + stacked canopies — horizontal landmark."""
    m, part = ctx.mats, ctx.part
    rng = _rng(ctx)
    front = _front(ctx)
    base_z = ctx.site_z + 0.12
    site_composition(part, "site", ctx.W, ctx.D, m, ctx.root, ctx.col, podium_w=ctx.W, podium_d=ctx.D,
                     plaza_w=ctx.W * 0.78, plaza_d=_s(ctx, 4.5), plaza_y=_plaza_y(ctx), site_z=ctx.site_z)

    span_w, span_d = ctx.W * 0.78, ctx.D * 0.62
    lift = _p(ctx, "canopy_lift", rng.uniform("lift", 5.5, 8.5))
    ox = rng.uniform("canopy.ox", -2.5, 2.5)

    # Pilotis — irregular grid
    col_positions = [
        (-span_w * 0.38 + ox, -span_d * 0.28),
        (span_w * 0.35 + ox, -span_d * 0.32),
        (-span_w * 0.32 + ox, span_d * 0.25),
        (span_w * 0.4 + ox, span_d * 0.22),
        (ox, 0),
    ]
    for i, (px, py) in enumerate(col_positions):
        h_col = lift - 0.6 if i < 4 else lift * 0.5
        part(f"col.{i}", 0.78, 0.78, h_col, (px, py, base_z + h_col / 2), m["charcoal"], ctx.root, ctx.col, f"col.{i}", bevel=0.08)

    # Lower canopy slab + upper offset cap
    part("canopy.lower", span_w, span_d * 0.72, 1.1, (ox, -span_d * 0.06, base_z + lift * 0.72), m["brand"], ctx.root, ctx.col, "canopy.lower", bevel=0.12)
    part("canopy.upper", span_w * 0.72, span_d * 0.58, 0.95, (ox + rng.uniform("cap.ox", -2.0, 2.5), span_d * 0.08, base_z + lift), m["coral"], ctx.root, ctx.col, "canopy.upper", bevel=0.14)
    part("canopy.skylight", span_w * 0.28, span_d * 0.22, 0.2, (ox, -span_d * 0.05, base_z + lift + 0.58), m["glass"], ctx.root, ctx.col, "canopy.skylight")

    rounded_mass(part, "core", span_w * 0.24, span_d * 0.2, 3.2, ox, span_d * 0.12, base_z, m["cream_dark"], ctx.root, ctx.col, bevel=0.18, cid="core")
    skewed_mass(part, "core.cap", span_w * 0.18, span_d * 0.15, 2.4, ox + 1.2, span_d * 0.05, base_z + 3.0, m["cream"], ctx.root, ctx.col,
                skew_x=1.5, skew_y=-0.8, bevel=0.2)

    toy_spire(part, "beacon", ox + span_w * 0.25, -span_d * 0.15, base_z + lift + 0.8, 2.8, m["charcoal"], m["brand"], ctx.root, ctx.col, r=0.45)
    signage_from_brand(part, "facade", ctx.brand, ox, -span_d / 2 - 0.2, base_z + lift + 0.2, m["sign"], ctx.root, ctx.col, s=0.44, d=0.16)
    _set_anchors(ctx, entrance=(ox, front + 1.5, base_z), roof_center=(ox, 0), roof_z=base_z + lift + 1.2)


def recipe_stacked_volumes_procedural(ctx: "BuildingContext") -> None:
    """Pod stacks + skewed slabs + sky bridge — vertical collage."""
    m, part = ctx.mats, ctx.part
    rng = _rng(ctx)
    base_z = shared_podium(part, "podium", ctx.W * 0.74, ctx.D * 0.7, ctx.site_z, m["cream_dark"], m["charcoal"], ctx.root, ctx.col, h=0.42, bevel=0.2)

    # Primary pod tower
    px = rng.uniform("pod.x", -2.0, 2.5)
    py = rng.uniform("pod.y", -1.5, 2.0)
    pods = []
    n_pods = rng.randint("pods", 3, 5)
    for i in range(n_pods):
        scale = 1.0 - i * 0.12
        pods.append((ctx.W * 0.22 * scale, ctx.D * 0.2 * scale, 3.2 + rng.uniform(f"pod.{i}.h", 0.4, 1.8), _mass_key(ctx, i)))
    pod_tower(part, "stack.main", px, py, base_z, m, ctx.root, ctx.col, pods=pods)

    # Secondary skewed stack offset
    sx = px + rng.uniform("sec.x", 5.0, 9.0)
    sy = py + rng.uniform("sec.y", -3.0, 3.0)
    stacks = int(_p(ctx, "stack_count", rng.randint("stacks", 3, 5)))
    z = base_z
    for i in range(stacks):
        bw = ctx.W * (0.42 - i * 0.06)
        bd = ctx.D * (0.38 - i * 0.05)
        bh = 3.2 + rng.uniform(f"stack.{i}.h", 0.8, 2.2)
        jx = sx + rng.uniform(f"stack.{i}.ox", -1.5, 1.5)
        skewed_mass(part, f"stack.{i}", bw, bd, bh, jx, sy, z,
                    m[_mass_key(ctx, i + 1)], ctx.root, ctx.col,
                    skew_x=rng.uniform(f"skew.{i}", -2.0, 2.5), skew_y=0.0, bevel=0.26)
        apply_night_facade(part, f"stack.{i}.facade", jx, _face_y(ctx, sy, bd), z + 1.4, z + bh - 0.6, bw * 0.58, m, ctx.root, ctx.col,
                           style="slots" if i % 2 else "band", seed=rng.randint(f"stack.{i}.fac", 0, 9999))
        toy_roof_stack(part, f"stack.{i}.roof", bw + 0.25, bd + 0.2, jx, sy, z + bh, m["roof"], m["charcoal"], ctx.root, ctx.col, lip=0.32)
        z += bh - 0.2

    mid_z = base_z + (z - base_z) * 0.55
    diagonal_bridge(part, "link.sky", (px + sx) / 2, (py + sy) / 2, mid_z, 9.0, 2.5, 0.48, m["cream_dark"], ctx.root, ctx.col, rise=2.5)
    cantilever_volume(part, "stack.cant", ctx.W * 0.28, ctx.D * 0.22, 11.0, px - 6.0, py + 2.0, base_z, m["brand"], m["coral"], ctx.root, ctx.col,
                      overhang=rng.uniform("cant.over", 2.5, 4.0))

    arch_portal_entrance(part, "entrance", px * 0.2, _front(ctx) + 1.8, base_z, m, ctx.root, ctx.col, span=10.0, height=7.5)
    signage_from_brand(part, "facade", ctx.brand, px, _front(ctx) - 0.2, base_z + 6.0, m["sign"], ctx.root, ctx.col, s=0.5, d=0.2)
    projecting_box(part, "facade.short", ctx.W * 0.22, 2.0, 5.5, px - 3.0, _front(ctx) + 1.0, base_z + 1.5, m["brand"], ctx.root, ctx.col)
    site_composition(part, "site", ctx.W, ctx.D, m, ctx.root, ctx.col, podium_w=ctx.W * 0.88, podium_d=ctx.D * 0.82,
                     plaza_w=_s(ctx, 7.0), plaza_d=_s(ctx, 3.2), plaza_y=_plaza_y(ctx), site_z=ctx.site_z)
    _set_anchors(ctx, entrance=(px * 0.2, _front(ctx) + 1.8, base_z), roof_center=(px, py), roof_z=z + 0.5)


def recipe_asymmetric_campus_procedural(ctx: "BuildingContext") -> None:
    """Irregular cluster + bridges + round tower + sculpture plaza."""
    m, part = ctx.mats, ctx.part
    rng = _rng(ctx)
    base_z = shared_podium(part, "podium", ctx.W * 0.88, ctx.D * 0.74, ctx.site_z, m["cream_dark"], m["charcoal"], ctx.root, ctx.col, h=0.52, bevel=0.24)
    asym = _p(ctx, "asymmetry", rng.uniform("asym", 0.55, 1.0))

    blobs = [
        ("a", -ctx.W * 0.28, -2.0, ctx.W * 0.32, ctx.D * 0.38, rng.uniform("blob.a.h", 14.0, 18.0), "cream"),
        ("b", ctx.W * 0.12, 2.5, ctx.W * 0.28, ctx.D * 0.42, rng.uniform("blob.b.h", 22.0, 30.0), "brand"),
        ("c", ctx.W * 0.32, -3.0, ctx.W * 0.24, ctx.D * 0.34, rng.uniform("blob.c.h", 11.0, 15.0), "coral"),
        ("d", -ctx.W * 0.05, ctx.D * 0.22, ctx.W * 0.26, ctx.D * 0.28, rng.uniform("blob.d.h", 9.0, 13.0), "cream_dark"),
    ]
    positions: dict[str, tuple[float, float, float, float]] = {}
    for key, bx, by, bw, bd, bh, mk in blobs:
        jx = bx + rng.uniform(f"blob.{key}.x", -asym * 2.5, asym * 2.5)
        jy = by + rng.uniform(f"blob.{key}.y", -asym * 2.0, asym * 2.0)
        positions[key] = (jx, jy, bw, bd)
        shape = rng.choice(f"blob.{key}.shape", ["rounded", "skew", "cant"])
        if shape == "skew":
            skewed_mass(part, f"blob.{key}", bw, bd, bh, jx, jy, base_z, m[mk], ctx.root, ctx.col,
                        skew_x=rng.uniform(f"skew.{key}", -2.5, 3.0), skew_y=rng.uniform(f"skewy.{key}", -1.2, 1.5), bevel=0.28)
        elif shape == "cant" and bh > 14:
            cantilever_volume(part, f"blob.{key}", bw, bd, bh, jx, jy, base_z, m[mk], m["coral"], ctx.root, ctx.col,
                              overhang=rng.uniform(f"over.{key}", 2.0, 3.8))
        else:
            rounded_mass(part, f"blob.{key}", bw, bd, bh, jx, jy, base_z, m[mk], ctx.root, ctx.col, bevel=0.26 + asym * 0.1, cid=f"blob.{key}")
        apply_night_facade(part, f"facade.{key}", jx, _face_y(ctx, jy, bd), base_z + 2.5, base_z + bh - 1.0, bw * 0.55, m, ctx.root, ctx.col,
                           style="slots" if bh > 18 else "band", seed=rng.randint(f"facade.{key}", 0, 9999))
        if bh > 16:
            toy_curtain_wall(part, f"blob.{key}.glass", jx, jy - bd / 2 - 0.05, base_z + 2.5, base_z + bh - 1.2, bw * 0.5, m["glass"], m["charcoal"], ctx.root, ctx.col, depth=0.34, cols=2)
        slanted_wedge_roof(part, f"roof.{key}", bw, bd, jx, jy, base_z + bh, m["roof"], m["coral"] if key == "b" else m["charcoal"], ctx.root, ctx.col,
                           rise=rng.uniform(f"wedge.{key}", 0.6, 1.6))

    # Round satellite tower
    tb = positions["b"]
    cylinder_tower(part, "tower.sat", 2.8, 18.0, tb[0] + 4.5, tb[1] - 2.0, base_z, m["brand"], m["glass"], m["charcoal"], ctx.root, ctx.col, bands=4, glow_mat=m["glow"])
    ta, tb_pos = positions["a"], positions["b"]
    tc = positions["c"]
    sky_bridge_platform(part, "link.skydeck", (ta[0] + tb_pos[0]) / 2, (ta[1] + tb_pos[1]) / 2, base_z + 14.0, 11.0, 3.2, 0.65, m["brand"], m["glow"], ctx.root, ctx.col)
    toy_spire(part, "spire.sat", tb[0] + 4.5, tb[1] - 2.0, base_z + 18.0, 3.5, m["charcoal"], m["coral"], ctx.root, ctx.col)
    diagonal_bridge(part, "link.ab", (ta[0] + tb_pos[0]) / 2, (ta[1] + tb_pos[1]) / 2, base_z + 10.0, 10.0, 2.8, 0.52, m["cream_dark"], ctx.root, ctx.col, rise=3.0)
    bridge_connector(part, "link.bc", (tb_pos[0] + tc[0]) / 2, (tb_pos[1] + tc[1]) / 2, base_z + 8.5, 8.0, 2.6, 2.2, m["charcoal"], ctx.root, ctx.col)

    arch_portal_entrance(part, "entrance", tb_pos[0] * 0.3, _front(ctx) + 2.0, base_z, m, ctx.root, ctx.col, span=12.0, height=8.5)
    signage_from_brand(part, "facade", ctx.brand, tb_pos[0], _front(ctx) - 0.24, base_z + 14.0, m["sign"], ctx.root, ctx.col, s=0.52, d=0.2)
    roof_deck_platform(part, "roof.deck", blobs[1][3] * 0.5, blobs[1][4] * 0.35, tb_pos[0], tb_pos[1], base_z + blobs[1][5], m["paver"], m["charcoal"], ctx.root, ctx.col)
    site_composition(part, "site", ctx.W, ctx.D, m, ctx.root, ctx.col, podium_w=ctx.W, podium_d=ctx.D,
                     plaza_w=_s(ctx, 10.0), plaza_d=_s(ctx, 3.8), plaza_y=_plaza_y(ctx), site_z=ctx.site_z)
    _set_anchors(ctx, entrance=(tb_pos[0] * 0.3, _front(ctx) + 2.0, base_z), roof_center=(tb_pos[0], tb_pos[1]), roof_z=base_z + blobs[1][5] + 1.5)


def recipe_sculpture_hq_procedural(ctx: "BuildingContext") -> None:
    """A low, gallery-like HQ whose identity is carried by sculpture."""
    m, part = ctx.mats, ctx.part
    rng = _rng(ctx)
    base_z = shared_podium(
        part,
        "podium",
        ctx.W * 0.86,
        ctx.D * 0.74,
        ctx.site_z,
        m["cream_dark"],
        m["charcoal"],
        ctx.root,
        ctx.col,
        h=0.5,
        bevel=0.24,
    )
    wing_h = rng.uniform("wing.h", 8.0, 13.0)
    left_x = -ctx.W * 0.22 + rng.uniform("left.x", -1.5, 1.5)
    right_x = ctx.W * 0.23 + rng.uniform("right.x", -1.0, 2.0)
    rounded_mass(part, "mass.gallery.left", ctx.W * 0.38, ctx.D * 0.48, wing_h, left_x, 0.8, base_z, m["cream"], ctx.root, ctx.col, bevel=0.34, cid="mass.gallery.left")
    skewed_mass(
        part,
        "mass.gallery.right",
        ctx.W * 0.34,
        ctx.D * 0.44,
        wing_h * 0.82,
        right_x,
        -0.2,
        base_z,
        m["coral"],
        ctx.root,
        ctx.col,
        skew_x=rng.uniform("right.skew", -2.5, 2.8),
        skew_y=0.8,
        bevel=0.34,
    )
    toy_curtain_wall(part, "gallery.glass", 0, -ctx.D * 0.32, base_z + 1.5, base_z + wing_h * 0.78, ctx.W * 0.34, m["glass"], m["charcoal"], ctx.root, ctx.col, depth=0.36, cols=3)
    terrace_garden(part, "gallery.terrace", right_x, 0.8, base_z + wing_h * 0.82 + 0.45, ctx.W * 0.22, ctx.D * 0.25, m, ctx.root, ctx.col)

    sculpture_scale = rng.uniform("sculpture.scale", 0.9, 1.3)
    sculpture = rng.choice("sculpture.kind", ["rings", "orbs"])
    if sculpture == "orbs":
        orb_sculpture_stack(part, "sculpture", -ctx.W * 0.18, _plaza_y(ctx) + 0.2, ctx.site_z + 0.1, m, ctx.root, ctx.col, count=rng.randint("sculpture.count", 3, 5), scale=sculpture_scale)
    else:
        hero_sculpture_rings(part, "sculpture", -ctx.W * 0.18, _plaza_y(ctx) + 0.2, ctx.site_z + 0.1, m["brand"], m["coral"], ctx.root, ctx.col, scale=sculpture_scale)
    arch_portal_entrance(part, "entrance", 0, _front(ctx) + 2.1, base_z, m, ctx.root, ctx.col, span=12.5, height=8.5)
    signage_from_brand(part, "facade", ctx.brand, 0, _front(ctx) - 0.22, base_z + 6.7, m["sign"], ctx.root, ctx.col, s=0.5, d=0.2)
    slanted_wedge_roof(part, "roof.left", ctx.W * 0.38, ctx.D * 0.48, left_x, 0.8, base_z + wing_h, m["roof"], m["brand"], ctx.root, ctx.col, rise=1.3)
    slanted_wedge_roof(part, "roof.right", ctx.W * 0.34, ctx.D * 0.44, right_x, -0.2, base_z + wing_h * 0.82, m["roof"], m["coral"], ctx.root, ctx.col, rise=1.0)
    site_composition(part, "site", ctx.W, ctx.D, m, ctx.root, ctx.col, podium_w=ctx.W * 0.95, podium_d=ctx.D * 0.9, plaza_w=_s(ctx, 11.0), plaza_d=_s(ctx, 4.2), plaza_y=_plaza_y(ctx), site_z=ctx.site_z)
    _set_anchors(ctx, entrance=(0, _front(ctx) + 2.1, base_z), roof_center=(left_x, 0.8), roof_z=base_z + wing_h + 1.6)


def recipe_vertical_landmark_procedural(ctx: "BuildingContext") -> None:
    """A deliberately singular skyline element with a compact supporting base."""
    m, part = ctx.mats, ctx.part
    rng = _rng(ctx)
    base_z = shared_podium(part, "podium", ctx.W * 0.82, ctx.D * 0.72, ctx.site_z, m["cream_dark"], m["charcoal"], ctx.root, ctx.col, h=0.5, bevel=0.24)
    tx = rng.uniform("landmark.x", -2.0, 2.0)
    ty = rng.uniform("landmark.y", 0.5, 2.5)
    th = rng.uniform("landmark.height", 29.0, 40.0)
    style = ctx.params.get("landmark_style") or rng.choice("landmark.style", ["wishbone", "cylinder"])
    if style == "wishbone":
        wishbone_tower(part, "landmark", ctx.W * 0.32, ctx.D * 0.34, th, tx, ty, base_z, m["brand"], m["coral"], m["glass"], ctx.root, ctx.col, bevel=0.36)
    else:
        cylinder_tower(part, "landmark", min(ctx.W, ctx.D) * 0.19, th, tx, ty, base_z, m["brand"], m["glass"], m["charcoal"], ctx.root, ctx.col, bands=7, glow_mat=m["glow"])
    toy_spire(part, "landmark.spire", tx, ty, base_z + th, 5.0, m["charcoal"], m["coral"], ctx.root, ctx.col, r=0.7)
    rounded_mass(part, "base.west", ctx.W * 0.3, ctx.D * 0.46, 8.5, -ctx.W * 0.27, 0.3, base_z, m["cream"], ctx.root, ctx.col, bevel=0.3, cid="base.west")
    rounded_mass(part, "base.east", ctx.W * 0.25, ctx.D * 0.4, 11.0, ctx.W * 0.28, -0.8, base_z, m["coral"], ctx.root, ctx.col, bevel=0.3, cid="base.east")
    diagonal_bridge(part, "landmark.link", (tx + ctx.W * 0.18) / 2, (ty - 0.5) / 2, base_z + 7.0, 8.5, 2.6, 0.52, m["cream_dark"], ctx.root, ctx.col, rise=2.5)
    arch_portal_entrance(part, "entrance", 0, _front(ctx) + 2.0, base_z, m, ctx.root, ctx.col, span=11.5, height=8.5)
    signage_from_brand(part, "facade", ctx.brand, tx, ty - ctx.D * 0.18, base_z + th * 0.42, m["sign"], ctx.root, ctx.col, s=0.48, d=0.2)
    site_composition(part, "site", ctx.W, ctx.D, m, ctx.root, ctx.col, podium_w=ctx.W * 0.94, podium_d=ctx.D * 0.88, plaza_w=_s(ctx, 9.5), plaza_d=_s(ctx, 3.8), plaza_y=_plaza_y(ctx), site_z=ctx.site_z)
    _set_anchors(ctx, entrance=(0, _front(ctx) + 2.0, base_z), roof_center=(tx, ty), roof_z=base_z + th + 3.0)


def recipe_hybrid_procedural(ctx: "BuildingContext") -> None:
    """Controlled hybrid: a campus base with one selected landmark language."""
    rng = _rng(ctx)
    mode = ctx.params.get("hybrid_mode") or rng.choice("hybrid.mode", ["tower", "sculpture", "terrace"])
    if mode == "sculpture":
        recipe_sculpture_hq_procedural(ctx)
        return
    if mode == "terrace":
        recipe_stepped_terrace_procedural(ctx)
        return
    recipe_tower_campus_procedural(ctx)
    # A single branded bridge makes this a hybrid rather than a duplicate of
    # tower_campus while keeping the silhouette controlled.
    diagonal_bridge(ctx.part, "hybrid.link", 0, _front(ctx) + 5.0, ctx.site_z + 9.0, ctx.W * 0.42, 2.4, 0.5, ctx.mats["coral"], ctx.root, ctx.col, rise=2.0)
