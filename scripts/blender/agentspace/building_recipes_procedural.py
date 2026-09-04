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
from .building_architecture import (
    alive_entrance,
    mass_mat,
    punched_facade,
    roof_finish,
    setback_terrace,
    site_life,
    storefront_frontage,
)
from .param_rng import ParamRNG

if TYPE_CHECKING:
    from .company_building import BuildingContext

# Primary masses: brand + cream. Coral is reserved for awnings / accents.
MASS_SLOTS = ("brand", "cream", "cream_dark", "brand")


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


def _storey(ctx: "BuildingContext") -> float:
    return _p(ctx, "storey_h", 3.4)


def _ground_h(ctx: "BuildingContext") -> float:
    return _p(ctx, "ground_storey_h", 4.6)


def _bay(ctx: "BuildingContext") -> float:
    return _p(ctx, "window_bay", 2.8)


def _street_facade(ctx: "BuildingContext", prefix: str, cx: float, face_y: float, z0: float, z1: float, span: float, *, skip_ground: bool = True) -> None:
    punched_facade(
        ctx.part,
        prefix,
        cx,
        face_y,
        z0,
        z1,
        span,
        ctx.mats,
        ctx.root,
        ctx.col,
        storey_h=_storey(ctx),
        bay=_bay(ctx),
        skip_ground=skip_ground,
        ground_h=_ground_h(ctx),
        seed=(int(ctx.seed) + sum(ord(ch) for ch in prefix) * 17) & 0xFFFFFFFF,
    )


def _shop(ctx: "BuildingContext", prefix: str, cx: float, face_y: float, z0: float, span: float) -> None:
    storefront_frontage(
        ctx.part,
        prefix,
        cx,
        face_y,
        z0,
        min(span, ctx.W * 0.55),
        ctx.mats,
        ctx.root,
        ctx.col,
        height=min(_ground_h(ctx) * 0.78, 4.2),
        cols=max(3, int(span / _bay(ctx))),
        canopy_depth=_p(ctx, "canopy_depth", 1.8),
    )


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
    _street_facade(ctx, "facade.tower", cx, cy - tr - 0.08, base_z, base_z + th, tr * 1.8)
    toy_spire(part, "spire.tower", cx, cy + tr + 0.2, base_z + th, 3.2, m["charcoal"], m["coral"], root, col)

    # Right coral mass with terrace
    rx = W * 0.26 + rng.uniform("mass.r.x", -1.0, 2.5)
    ry = rng.uniform("mass.r.y", -2.0, 1.5)
    rw, rd, rh = W * 0.34, D * 0.44, rng.uniform("wing.r.h", 10.0, 16.0)
    rounded_mass(part, "mass.right", rw, rd, rh, rx, ry, base_z, m["cream_dark"], root, col, bevel=0.34, cid="mass.right")
    _street_facade(ctx, "facade.right", rx, _face_y(ctx, ry, rd), base_z, base_z + rh, rw * 0.7)
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
    site_life(ctx, front_y=front, width=ctx.W, density=_p(ctx, "prop_density", 0.75))

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
        _street_facade(ctx, "facade.tower", tx, _face_y(ctx, ty, td), base_z, base_z + th, tw * 0.75)
    elif tower_style == "wishbone":
        wishbone_tower(part, "mass.tower", tw, td, th, tx, ty, base_z, m["brand"], m["coral"], m["glass"], ctx.root, ctx.col, bevel=0.36)
    else:
        toy_setback_tower(part, "mass.tower", tw, td, th, tx, ty, base_z, m["brand"], ctx.root, ctx.col, bevel=0.4, cid="mass.tower",
                          glow_mat=m["glow"], fin_mat=_fin(ctx))
        _street_facade(ctx, "facade.tower", tx, _face_y(ctx, ty, td), base_z, base_z + th, tw * 0.7)

    # Asymmetric wings — different heights and offsets
    wing_specs = (
        ("west", -W * 0.32, rng.uniform("wing.w.y", -2.0, 1.5), W * 0.28, D * 0.5, rng.uniform("wing.w.h", 6.0, 12.0), "cream"),
        ("east", W * 0.3, rng.uniform("wing.e.y", -1.0, 2.5), W * 0.26, D * 0.46, rng.uniform("wing.e.h", 8.0, 14.0), "cream_dark"),
    )
    for name, sx, sy, sw, sd, sh, mk in wing_specs:
        skewed_mass(part, f"mass.{name}", sw, sd, sh, sx, sy, base_z, m[mk], ctx.root, ctx.col,
                    skew_x=rng.uniform(f"skew.{name}", -1.8, 2.2), skew_y=0.0, bevel=0.3)
        _street_facade(ctx, f"facade.{name}", sx, _face_y(ctx, sy, sd), base_z, base_z + sh, sw * 0.7)
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

    _shop(ctx, "ground.shop", 0, front + 0.2, base_z, min(W * 0.62, 18.0))
    alive_entrance(ctx, 0, front + 2.2, base_z, span=_p(ctx, "entrance_span", 11.5), height=_ground_h(ctx) + 1.2, canopy_d=_p(ctx, "canopy_depth", 2.0))
    signage_from_brand(part, "facade", ctx.brand, tx, ty - td / 2 - 0.34, base_z + th * 0.4, m["sign"], ctx.root, ctx.col, s=0.54, d=0.22)
    site_composition(part, "site", ctx.W, ctx.D, m, ctx.root, ctx.col, podium_w=ctx.W * 0.94, podium_d=ctx.D * 0.9,
                     plaza_w=_s(ctx, 9.5), plaza_d=_s(ctx, 3.8), plaza_y=_plaza_y(ctx), site_z=ctx.site_z)
    site_life(ctx, front_y=front, width=ctx.W, density=_p(ctx, "prop_density", 0.8))
    roof_deck_platform(part, "roof.deck", tw * 0.85, td * 0.55, tx, ty - 1.2, base_z + th, m["paver"], m["charcoal"], ctx.root, ctx.col)
    _set_anchors(ctx, entrance=(0, front + 2.2, base_z), roof_center=(tx, ty), roof_z=base_z + th + 2.0)


def recipe_stepped_terrace_procedural(ctx: "BuildingContext") -> None:
    """Receding campus: wide podium, set-back main mass, side wing, roof terraces."""
    m, part = ctx.mats, ctx.part
    rng = _rng(ctx)
    front = _front(ctx)
    storey, ground = _storey(ctx), _ground_h(ctx)
    setback = _p(ctx, "setback_m", 2.6)
    base_z = shared_podium(part, "podium", ctx.W * 0.9, ctx.D * 0.82, ctx.site_z, m["cream_dark"], m["charcoal"], ctx.root, ctx.col, h=0.46, bevel=0.22)

    pod_w, pod_d, pod_h = ctx.W * 0.9, ctx.D * 0.52, ground + storey * max(0, int(_p(ctx, "podium_storeys", 1)) - 1)
    rounded_mass(part, "mass.podium", pod_w, pod_d, pod_h, 0, front + pod_d / 2 + 1.2, base_z, mass_mat(ctx, "secondary"), ctx.root, ctx.col, bevel=0.26, cid="mass.podium")
    _shop(ctx, "ground.shop", 0, front + 1.1, base_z, min(pod_w * 0.7, 20.0))
    _street_facade(ctx, "facade.podium", 0, front + 1.1, base_z, base_z + pod_h, pod_w * 0.72)

    main_w, main_d = ctx.W * 0.58, ctx.D * 0.42
    main_h = storey * rng.randint("main.floors", 2, 3)
    main_y = front + pod_d + setback * 0.35 + main_d / 2
    rounded_mass(part, "mass.main", main_w, main_d, main_h, rng.uniform("main.x", -2.2, 2.2), main_y, base_z + pod_h * 0.15, mass_mat(ctx, "primary"), ctx.root, ctx.col, bevel=0.3, cid="mass.main")
    _street_facade(ctx, "facade.main", 0, main_y - main_d / 2 - 0.06, base_z + pod_h * 0.15, base_z + pod_h * 0.15 + main_h, main_w * 0.7, skip_ground=False)
    setback_terrace(ctx, "terrace.front", 0, front + pod_d * 0.55, base_z + pod_h + 0.2, pod_w * 0.4, 3.2)
    roof_finish(part, "roof.main", main_w + 0.3, main_d + 0.25, 0, main_y, base_z + pod_h * 0.15 + main_h, m, ctx.root, ctx.col, parapet_h=_p(ctx, "parapet_h", 0.55))

    wing_w, wing_d = ctx.W * 0.28, ctx.D * 0.62
    wing_h = storey * rng.randint("wing.floors", 1, 2) + ground * 0.35
    wing_x = ctx.W * 0.28 * (1 if rng.choice("wing.side", ["L", "R"]) == "R" else -1)
    rounded_mass(part, "mass.wing", wing_w, wing_d, wing_h, wing_x, front + wing_d / 2 + 1.6, base_z, mass_mat(ctx, "tertiary"), ctx.root, ctx.col, bevel=0.24, cid="mass.wing")
    _street_facade(ctx, "facade.wing", wing_x, front + 1.5, base_z, base_z + wing_h, wing_w * 0.8)
    balcony_ledge(part, "balcony.wing", wing_w * 0.55, 0.95, wing_x, front + 1.4, base_z + wing_h * 0.55, m["cream_dark"], m["charcoal"], ctx.root, ctx.col)

    alive_entrance(ctx, 0, front + 2.0, base_z, span=_p(ctx, "entrance_span", 11.0), height=ground + 0.8, canopy_d=_p(ctx, "canopy_depth", 2.0))
    signage_from_brand(part, "facade", ctx.brand, 0, front - 0.18, base_z + pod_h + 1.4, m["sign"], ctx.root, ctx.col, s=0.48, d=0.2)
    site_composition(part, "site", ctx.W, ctx.D, m, ctx.root, ctx.col, podium_w=ctx.W, podium_d=ctx.D,
                     plaza_w=_s(ctx, 8.5), plaza_d=_s(ctx, 3.4), plaza_y=_plaza_y(ctx), site_z=ctx.site_z)
    site_life(ctx, front_y=front, width=ctx.W, density=_p(ctx, "prop_density", 0.8))
    _set_anchors(ctx, entrance=(0, front + 2.0, base_z), roof_center=(0, main_y), roof_z=base_z + pod_h * 0.15 + main_h + 1.0)


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
            _street_facade(ctx, f"ring.{name}", loc[0], loc[1] - rd / 2 - 0.06, base_z, base_z + h_main, rw * 0.65)

    # Corner round turrets
    for i, (tx, ty) in enumerate(((-ring_w / 2 + wall_t, ring_d / 2 - wall_t), (ring_w / 2 - wall_t, ring_d / 2 - wall_t))):
        tr = wall_t * 0.55
        th = h_main + rng.uniform(f"turret.{i}.h", 4.0, 9.0)
        cylinder_tower(part, f"turret.{i}", tr, th, tx, ty, base_z, m["brand"] if i == 0 else m["cream_dark"], m["glass"], m["charcoal"], ctx.root, ctx.col, bands=3)

    gate_h = h_main + rng.uniform("gate.h", 5.0, 10.0)
    rounded_mass(part, "gate.tower", 8.5, 4.5, gate_h, 0, -ring_d / 2 + 2.0, base_z, m["brand"], ctx.root, ctx.col, bevel=0.2, cid="gate.tower")
    toy_curtain_wall(part, "gate.glass", 0, -ring_d / 2 - 0.08, base_z + 2.0, base_z + gate_h - 1.2, 6.5, m["glass"], m["charcoal"], ctx.root, ctx.col, depth=0.35, cols=2)
    arch_portal_entrance(part, "entrance", 0, _front(ctx) + 1.8, base_z, m, ctx.root, ctx.col, span=10.5, height=8.5)

    part(f"{ctx.asset_id}.court.pad", ring_w * 0.38, ring_d * 0.35, 0.14, (0, ring_d * 0.05, ctx.site_z + 0.06), m["paver"], ctx.root, ctx.col, "court.pad", bevel=0.03)
    signage_from_brand(part, "facade", ctx.brand, 0, -ring_d / 2 - 0.26, base_z + gate_h * 0.55, m["sign"], ctx.root, ctx.col, s=0.46, d=0.18)
    recessed_niche(part, "facade.niche", 5.0, 1.2, 6.5, -ring_w * 0.15, -ring_d / 2, base_z + 2.5, m["cream"], m["glass"], ctx.root, ctx.col)
    site_composition(part, "site", ctx.W, ctx.D, m, ctx.root, ctx.col, podium_w=ctx.W, podium_d=ctx.D,
                     plaza_w=_s(ctx, 7.5), plaza_d=_s(ctx, 3.0), plaza_y=_plaza_y(ctx), site_z=ctx.site_z)
    site_life(ctx, front_y=_front(ctx), width=ctx.W, density=_p(ctx, "prop_density", 0.75))
    _set_anchors(ctx, entrance=(0, _front(ctx) + 1.8, base_z), roof_center=(0, 0), roof_z=base_z + gate_h + 1.0)


def recipe_pavilion_procedural(ctx: "BuildingContext") -> None:
    """Low studio HQ + detached glass pavilion + garden court — side-by-side, not stacked."""
    m, part = ctx.mats, ctx.part
    rng = _rng(ctx)
    front = _front(ctx)
    storey, ground = _storey(ctx), _ground_h(ctx)
    base_z = shared_podium(part, "podium", ctx.W * 0.92, ctx.D * 0.82, ctx.site_z, m["cream_dark"], m["charcoal"], ctx.root, ctx.col, h=0.4, bevel=0.2)
    site_composition(part, "site", ctx.W, ctx.D, m, ctx.root, ctx.col, podium_w=ctx.W, podium_d=ctx.D,
                     plaza_w=ctx.W * 0.7, plaza_d=_s(ctx, 4.2), plaza_y=_plaza_y(ctx), site_z=ctx.site_z)

    main_w, main_d = ctx.W * 0.52, ctx.D * 0.58
    main_h = ground + storey * rng.randint("main.floors", 1, 2)
    main_x = -ctx.W * 0.18
    main_y = front + main_d / 2 + 2.2
    rounded_mass(part, "mass.studio", main_w, main_d, main_h, main_x, main_y, base_z, mass_mat(ctx, "secondary"), ctx.root, ctx.col, bevel=0.28, cid="mass.studio")
    _shop(ctx, "ground.shop", main_x, front + 1.8, base_z, min(main_w * 0.72, 16.0))
    _street_facade(ctx, "facade.studio", main_x, front + 1.8, base_z, base_z + main_h, main_w * 0.78)
    vertical_fin_grooves(part, "facade.studio.fins", main_x, front + 1.7, base_z + ground * 0.15, base_z + main_h - 0.3, main_w * 0.72, _fin(ctx), ctx.root, ctx.col, count=max(4, int(main_w / 3.2)), depth=0.28)
    recessed_niche(part, "facade.studio.niche", min(5.2, main_w * 0.28), 0.85, ground * 0.72, main_x - main_w * 0.18, front + 2.0, base_z + 0.35, m["cream"], m["glass"], ctx.root, ctx.col)
    balcony_ledge(part, "balcony.studio", main_w * 0.42, 1.05, main_x + main_w * 0.08, front + 1.7, base_z + ground + 0.15, m["cream_dark"], m["charcoal"], ctx.root, ctx.col)
    projecting_box(part, "proj.studio", main_w * 0.22, 1.6, storey * 0.7, main_x + main_w * 0.22, front + 1.5, base_z + ground + storey * 0.15, m["cream_dark"], ctx.root, ctx.col)
    slanted_wedge_roof(part, "roof.studio", main_w, main_d, main_x, main_y, base_z + main_h, m["roof"], m["charcoal"], ctx.root, ctx.col, rise=rng.uniform("studio.roof", 0.9, 1.6))

    pav_w, pav_d = ctx.W * 0.26, ctx.D * 0.34
    pav_h = ground * 0.92
    pav_x = ctx.W * 0.26
    pav_y = front + pav_d / 2 + 3.4
    rounded_mass(part, "mass.pavilion", pav_w, pav_d, pav_h, pav_x, pav_y, base_z, mass_mat(ctx, "primary"), ctx.root, ctx.col, bevel=0.22, cid="mass.pavilion")
    toy_curtain_wall(part, "facade.pavilion", pav_x, pav_y - pav_d / 2 - 0.08, base_z + 0.35, base_z + pav_h - 0.35, pav_w * 0.78, m["glass"], m["charcoal"], ctx.root, ctx.col, depth=0.34, cols=3)
    toy_curtain_wall(part, "facade.pavilion.side", pav_x - pav_w / 2 - 0.06, pav_y, base_z + 0.35, base_z + pav_h - 0.35, pav_d * 0.7, m["glass"], m["charcoal"], ctx.root, ctx.col, depth=0.28, cols=2)
    roof_finish(part, "roof.pavilion", pav_w + 0.2, pav_d + 0.16, pav_x, pav_y, base_z + pav_h, m, ctx.root, ctx.col, parapet_h=0.4)
    terrace_garden(part, "terrace.pavilion", pav_x, pav_y, base_z + pav_h + 0.45, pav_w * 0.55, pav_d * 0.4, m, ctx.root, ctx.col)

    court_x = (main_x + main_w * 0.42 + pav_x - pav_w * 0.35) / 2
    court_y = front + 5.2
    part("court.pad", ctx.W * 0.16, 6.4, 0.12, (court_x, court_y, ctx.site_z + 0.06), m["paver"], ctx.root, ctx.col, "court.pad", bevel=0.03)
    link_y = front + 3.8
    part("link.canopy", abs(pav_x - main_x) * 0.55, 2.6, 0.22, (court_x, link_y, base_z + ground * 0.78), m["charcoal"], ctx.root, ctx.col, "link.canopy", bevel=0.04)
    for i, px in enumerate((main_x + main_w * 0.38, court_x, pav_x - pav_w * 0.32)):
        part(f"link.col.{i}", 0.38, 0.38, ground * 0.74, (px, link_y, base_z + ground * 0.36), m["charcoal"], ctx.root, ctx.col, f"link.col.{i}", bevel=0.04)

    alive_entrance(ctx, main_x, front + 2.2, base_z, span=min(_p(ctx, "entrance_span", 9.5), main_w * 0.52), height=ground * 0.95, canopy_d=_p(ctx, "canopy_depth", 1.8))
    signage_from_brand(part, "facade", ctx.brand, main_x, front + 1.4, base_z + ground + 0.8, m["sign"], ctx.root, ctx.col, s=0.42, d=0.16)
    site_life(ctx, front_y=front, width=ctx.W, density=_p(ctx, "prop_density", 0.8))
    _set_anchors(ctx, entrance=(main_x, front + 2.2, base_z), roof_center=(main_x, main_y), roof_z=base_z + main_h + 1.2)


def recipe_stacked_volumes_procedural(ctx: "BuildingContext") -> None:
    """Mixed-height campus: side-by-side volumes of different heights, not a cake."""
    m, part = ctx.mats, ctx.part
    rng = _rng(ctx)
    front = _front(ctx)
    storey, ground = _storey(ctx), _ground_h(ctx)
    base_z = shared_podium(part, "podium", ctx.W * 0.86, ctx.D * 0.76, ctx.site_z, m["cream_dark"], m["charcoal"], ctx.root, ctx.col, h=0.44, bevel=0.2)

    left_w, left_d = ctx.W * 0.42, ctx.D * 0.58
    left_h = ground + storey * rng.randint("left.floors", 1, 2)
    rounded_mass(part, "mass.left", left_w, left_d, left_h, -ctx.W * 0.22, front + left_d / 2 + 1.4, base_z, mass_mat(ctx, "secondary"), ctx.root, ctx.col, bevel=0.28, cid="mass.left")
    _shop(ctx, "ground.shop", -ctx.W * 0.1, front + 1.2, base_z, min(left_w * 0.85, 14.0))
    _street_facade(ctx, "facade.left", -ctx.W * 0.22, front + 1.2, base_z, base_z + left_h, left_w * 0.7)

    right_w, right_d = ctx.W * 0.36, ctx.D * 0.48
    right_h = storey * rng.randint("right.floors", 3, 4)
    rounded_mass(part, "mass.right", right_w, right_d, right_h, ctx.W * 0.24, front + right_d / 2 + 2.4, base_z, mass_mat(ctx, "primary"), ctx.root, ctx.col, bevel=0.3, cid="mass.right")
    _street_facade(ctx, "facade.right", ctx.W * 0.24, front + 2.3, base_z, base_z + right_h, right_w * 0.72, skip_ground=False)
    roof_finish(part, "roof.right", right_w + 0.28, right_d + 0.22, ctx.W * 0.24, front + right_d / 2 + 2.4, base_z + right_h, m, ctx.root, ctx.col, parapet_h=_p(ctx, "parapet_h", 0.5))

    link_w = ctx.W * 0.18
    rounded_mass(part, "mass.link", link_w, ctx.D * 0.28, ground * 0.85, 0.0, front + 4.5, base_z, mass_mat(ctx, "tertiary"), ctx.root, ctx.col, bevel=0.18, cid="mass.link")
    bridge_connector(part, "link.deck", 0.0, front + 5.2, base_z + ground * 0.7, ctx.W * 0.22, 2.2, 0.45, m["cream_dark"], ctx.root, ctx.col)

    alive_entrance(ctx, -ctx.W * 0.08, front + 2.0, base_z, span=_p(ctx, "entrance_span", 10.0), height=ground + 0.6, canopy_d=_p(ctx, "canopy_depth", 1.9))
    signage_from_brand(part, "facade", ctx.brand, ctx.W * 0.24, front + 1.8, base_z + right_h * 0.45, m["sign"], ctx.root, ctx.col, s=0.48, d=0.2)
    site_composition(part, "site", ctx.W, ctx.D, m, ctx.root, ctx.col, podium_w=ctx.W * 0.9, podium_d=ctx.D * 0.84,
                     plaza_w=_s(ctx, 7.5), plaza_d=_s(ctx, 3.2), plaza_y=_plaza_y(ctx), site_z=ctx.site_z)
    site_life(ctx, front_y=front, width=ctx.W, density=_p(ctx, "prop_density", 0.75))
    _set_anchors(ctx, entrance=(-ctx.W * 0.08, front + 2.0, base_z), roof_center=(ctx.W * 0.24, front + 4.0), roof_z=base_z + right_h + 0.8)


def recipe_asymmetric_campus_procedural(ctx: "BuildingContext") -> None:
    """Irregular cluster + bridges + round tower + sculpture plaza."""
    m, part = ctx.mats, ctx.part
    rng = _rng(ctx)
    base_z = shared_podium(part, "podium", ctx.W * 0.88, ctx.D * 0.74, ctx.site_z, m["cream_dark"], m["charcoal"], ctx.root, ctx.col, h=0.52, bevel=0.24)
    asym = _p(ctx, "asymmetry", rng.uniform("asym", 0.55, 1.0))

    blobs = [
        ("a", -ctx.W * 0.28, -2.0, ctx.W * 0.32, ctx.D * 0.38, rng.uniform("blob.a.h", 14.0, 18.0), "cream"),
        ("b", ctx.W * 0.12, 2.5, ctx.W * 0.28, ctx.D * 0.42, rng.uniform("blob.b.h", 22.0, 30.0), "brand"),
        ("c", ctx.W * 0.32, -3.0, ctx.W * 0.24, ctx.D * 0.34, rng.uniform("blob.c.h", 11.0, 15.0), "cream_dark"),
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
        _street_facade(ctx, f"facade.{key}", jx, _face_y(ctx, jy, bd), base_z, base_z + bh, bw * 0.62)
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
    site_life(ctx, front_y=_front(ctx), width=ctx.W, density=_p(ctx, "prop_density", 0.75))
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
        m["cream_dark"],
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
    site_life(ctx, front_y=_front(ctx), width=ctx.W, density=_p(ctx, "prop_density", 0.8))
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
    rounded_mass(part, "base.east", ctx.W * 0.25, ctx.D * 0.4, 11.0, ctx.W * 0.28, -0.8, base_z, m["cream_dark"], ctx.root, ctx.col, bevel=0.3, cid="base.east")
    diagonal_bridge(part, "landmark.link", (tx + ctx.W * 0.18) / 2, (ty - 0.5) / 2, base_z + 7.0, 8.5, 2.6, 0.52, m["cream_dark"], ctx.root, ctx.col, rise=2.5)
    arch_portal_entrance(part, "entrance", 0, _front(ctx) + 2.0, base_z, m, ctx.root, ctx.col, span=11.5, height=8.5)
    signage_from_brand(part, "facade", ctx.brand, tx, ty - ctx.D * 0.18, base_z + th * 0.42, m["sign"], ctx.root, ctx.col, s=0.48, d=0.2)
    site_composition(part, "site", ctx.W, ctx.D, m, ctx.root, ctx.col, podium_w=ctx.W * 0.94, podium_d=ctx.D * 0.88, plaza_w=_s(ctx, 9.5), plaza_d=_s(ctx, 3.8), plaza_y=_plaza_y(ctx), site_z=ctx.site_z)
    site_life(ctx, front_y=_front(ctx), width=ctx.W, density=_p(ctx, "prop_density", 0.75))
    _set_anchors(ctx, entrance=(0, _front(ctx) + 2.0, base_z), roof_center=(tx, ty), roof_z=base_z + th + 3.0)


def recipe_hybrid_procedural(ctx: "BuildingContext") -> None:
    """Two topologies composed: L-campus, courtyard+tower, or podium+pavilion."""
    rng = _rng(ctx)
    mode = ctx.params.get("hybrid_mode") or rng.choice("hybrid.mode", ["l_campus", "court_tower", "podium_pavilion"])
    if mode in {"sculpture", "podium_pavilion"}:
        recipe_sculpture_hq_procedural(ctx)
        rounded_mass(
            ctx.part,
            "mass.pavilion",
            ctx.W * 0.22,
            ctx.D * 0.2,
            _ground_h(ctx),
            ctx.W * 0.32,
            _front(ctx) + 3.2,
            ctx.site_z + 0.5,
            mass_mat(ctx, "primary"),
            ctx.root,
            ctx.col,
            bevel=0.22,
            cid="mass.pavilion",
        )
        return
    if mode in {"terrace", "court_tower"}:
        recipe_courtyard_block_procedural(ctx)
        return
    recipe_tower_campus_procedural(ctx)
    diagonal_bridge(ctx.part, "hybrid.link", 0, _front(ctx) + 5.0, ctx.site_z + 9.0, ctx.W * 0.42, 2.4, 0.5, ctx.mats["cream_dark"], ctx.root, ctx.col, rise=2.0)
